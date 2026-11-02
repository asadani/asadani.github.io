#!/usr/bin/env python3
"""Prepare and schedule syndicated copies (DEV.to, Medium) of a published tech.anujsadani.in article.

  syndicate.py prepare SLUG [--refresh] [--source FILE]
  syndicate.py slot
  syndicate.py schedule SLUG [--at ISO8601] [--dry-run]

Reads the article entry from data/articles.json and its page from <slug>/index.html. Packages are written to
<data dir>/articles/<slug>/ (devto.md, medium.md, medium.html, metadata.json, cover.png, devto-state.json) and
the slot plan to <data dir>/schedule.csv. The data dir is $SYNDICATION_DIR, else the `tech-site-syndication`
row of the private project registry ($REPO_REGISTRY, default ~/Projects/asadani/tools/project-registry/repos.json). Medium is never posted by this script: its rules ban automated posting, so the
package is a hand-off for the Medium editor. DEV.to is scheduled through its API.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urljoin
from urllib.request import HTTPRedirectHandler, Request, build_opener

SITE = Path(__file__).resolve().parents[3]
REGISTRY = Path(os.environ.get("REPO_REGISTRY", "~/Projects/asadani/tools/project-registry/repos.json")).expanduser()
KEY_PATH = Path.home() / ".config/devto/api-key"
API_ROOT = "https://dev.to/api"
SLOT_HOURS = 4
TZ_NAME = "Asia/Kolkata"
IST = timezone(timedelta(hours=5, minutes=30))
MEDIUM_TOPICS = ["Artificial Intelligence", "Technology", "Software Development", "Programming"]
AI_NOTE = "This story was written with the assistance of an AI writing program."
DROP = {"script", "style", "button", "select", "textarea", "svg", "audio", "video", "canvas", "form"}
KEEP = {"h1", "h2", "h3", "h4", "p", "a", "strong", "b", "em", "i", "ul", "ol", "li", "blockquote", "pre", "code",
        "img", "figure", "figcaption", "br", "hr", "sup", "sub", "table", "thead", "tbody", "tfoot", "tr", "th", "td"}
SELF_CLOSING = {"img", "br", "hr"}


def data_dir() -> Path:
    if os.environ.get("SYNDICATION_DIR"):
        return Path(os.environ["SYNDICATION_DIR"]).expanduser()
    registry = json.loads(REGISTRY.read_text())["repos"]
    return Path("~/Projects").expanduser() / registry["tech-site-syndication"]["path"]


def article_entry(slug: str) -> dict:
    for entry in json.loads((SITE / "data/articles.json").read_text()):
        if entry["slug"] == slug:
            return entry
    sys.exit(f"{slug}: not in data/articles.json (register the article first)")


class Sections(HTMLParser):
    """Collects the readable text of .section/.chapter blocks, keeping a safe subset of tags."""

    def __init__(self, base_url: str) -> None:
        super().__init__(convert_charrefs=False)
        self.base_url, self.sections = base_url, []
        self.buf: list[str] | None = None
        self.depth = self.drop = 0

    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        classes = set((attr.get("class") or "").split())
        if self.buf is None and tag in {"section", "div"} and classes & {"section", "chapter"}:
            self.buf, self.depth = [], 1
        elif self.buf is not None and tag in {"section", "div"}:
            self.depth += 1
        if self.buf is None:
            return
        if tag in DROP:
            self.drop += 1
        if self.drop or tag not in KEEP:
            return
        picked = ""
        for name in ("href",) if tag == "a" else ("src", "alt", "title") if tag == "img" else ():
            value = attr.get(name)
            if value is not None:
                if name in {"href", "src"} and not value.startswith(("#", "http://", "https://", "data:")):
                    value = urljoin(self.base_url, value)
                picked += f' {name}="{html.escape(value, quote=True)}"'
        self.buf.append(f"<{tag}{picked}>")

    def handle_endtag(self, tag):
        if self.buf is None:
            return
        if tag in DROP and self.drop:
            self.drop -= 1
        if not self.drop and tag in KEEP and tag not in SELF_CLOSING:
            self.buf.append(f"</{tag}>")
        if tag in {"section", "div"}:
            self.depth -= 1
            if self.depth == 0:
                self.sections.append("".join(self.buf))
                self.buf = None

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_data(self, data):
        if self.buf is not None and not self.drop:
            self.buf.append(html.escape(data))

    def handle_entityref(self, name):
        if self.buf is not None and not self.drop:
            self.buf.append(f"&{name};")

    def handle_charref(self, name):
        if self.buf is not None and not self.drop:
            self.buf.append(f"&#{name};")


def table_to_list(md: str) -> str:
    """Medium and DEV.to render pipe tables poorly; turn each row into a bullet."""
    lines, out, i = md.splitlines(), [], 0
    while i < len(lines):
        if i + 1 < len(lines) and "|" in lines[i] and re.match(r"\s*\|?\s*:?-{2,}", lines[i + 1]):
            headers = [x.strip() for x in lines[i].strip().strip("|").split("|")]
            i += 2
            while i < len(lines) and "|" in lines[i]:
                cells = [x.strip() for x in lines[i].strip().strip("|").split("|")]
                if len(cells) == len(headers):
                    rest = "; ".join(f"**{h}:** {v}" for h, v in zip(headers[1:], cells[1:]) if v)
                    out.append(f"- **{cells[0] or 'Item'}**" + (f": {rest}" if rest else ""))
                i += 1
            continue
        out.append(lines[i])
        i += 1
    return "\n".join(out)


def essay_body(source: Path, base_url: str) -> str:
    parser = Sections(base_url)
    parser.feed(source.read_text(encoding="utf-8"))
    if not parser.sections:
        return ""
    md = subprocess.run(["pandoc", "-f", "html", "-t", "gfm", "--wrap=none"], input="\n".join(parser.sections),
                        text=True, capture_output=True, check=True).stdout.strip()
    return re.sub(r"(?m)^# .+\n+", "", table_to_list(md), count=1).strip()  # title is already the post title


def learning_map(source: Path, base_url: str) -> str:
    """Tutorials and interactive guides: a concise map of section links, not a copy of the page."""
    page = source.read_text(encoding="utf-8")
    items = []
    for m in re.finditer(r'<(?:section|div)[^>]*\bid="([^"]+)"[^>]*class="[^"]*(?:section|chapter)[^"]*"|'
                         r'<(?:section|div)[^>]*class="[^"]*(?:section|chapter)[^"]*"[^>]*\bid="([^"]+)"', page):
        sid = m.group(1) or m.group(2)
        h = re.search(r"<h[23][^>]*>(.*?)</h[23]>", page[m.end():m.end() + 1500], re.S)
        if h:
            items.append((sid, html.unescape(re.sub(r"<[^>]+>", "", h.group(1))).strip()))
    if not items:
        return ""
    return "**The learning path:**\n\n" + "\n".join(f"- [{t}]({base_url}#{i})" for i, t in items)


def tags_for(entry: dict) -> list[str]:
    text = " ".join([entry["slug"], entry["title"], entry["desc"], " ".join(entry["tags"])]).lower()
    if any(w in text for w in ("supply-chain", "security", "rce", "synthid")):
        return ["ai", "security", "opensource", "programming"]
    if "mcp" in text:
        return ["ai", "mcp", "security", "programming"]
    if any(w in text for w in ("data", "retrieval", "idp", "ocr")):
        return ["ai", "data", "architecture", "programming"]
    if any(w in text for w in ("s3", "gpu", "inference", "latency", "speed")):
        return ["ai", "devops", "cloud", "architecture"]
    return ["ai", "machinelearning", "technology", "programming"]


def clip(text: str, limit: int = 155) -> str:
    return text if len(text) <= limit else text[:limit - 3].rsplit(" ", 1)[0].rstrip(" ,;:") + "..."


def cover_card(entry: dict, out: Path) -> Path | None:
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("note: Pillow missing, no cover generated (use ~/.venvs/explainer-video/bin/python)", file=sys.stderr)
        return None
    accent = ["#B77734", "#26766D", "#9A4E3F", "#506A9A", "#7A6538", "#6A547F"][hashlib.sha256(entry["slug"].encode()).digest()[0] % 6]
    words, lines, cur = entry["title"].split(), [], ""
    for w in words:
        if cur and len(cur) + len(w) + 1 > 28:
            lines.append(cur), None
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    lines.append(cur)
    lines = lines[:2] + [" ".join(lines[2:])] if len(lines) > 3 else lines
    fonts = "/System/Library/Fonts/Supplemental/"
    def font(name, size):
        p = Path(fonts + name)
        return ImageFont.truetype(str(p), size) if p.exists() else ImageFont.load_default()
    img = Image.new("RGB", (1000, 420), "#F4EFE5")
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 12, 420), fill=accent)
    d.text((72, 48), (entry["tags"][0] if entry["tags"] else "essay").upper(), font=font("Arial.ttf", 15), fill=accent)
    d.line((72, 86, 248, 86), fill="#D8CDBA", width=1)
    for n, line in enumerate(lines):
        d.text((72, 124 + 54 * n), line, font=font("Georgia.ttf", 44), fill="#171612")
    d.text((72, 346), "ANUJ SADANI  /  TECH", font=font("Arial.ttf", 17), fill="#625D53")
    img.save(out, format="PNG", optimize=True)
    return out


def prepare(slug: str, refresh: bool, source: Path | None) -> None:
    entry = article_entry(slug)
    folder = data_dir() / "articles" / slug
    if (folder / "devto.md").exists() and not refresh:
        sys.exit(f"{folder} exists; pass --refresh to regenerate (hand edits will be lost)")
    page = source or SITE / slug / "index.html"
    if not source and entry.get("external"):  # page lives in its own repo; find it through the registry
        row = json.loads(REGISTRY.read_text())["repos"].get(slug)
        if row:
            page = Path("~/Projects").expanduser() / row["path"] / "index.html"
    if not page.is_file():
        sys.exit(f"{slug}: no page at {page}" + (" (external article; pass --source)" if entry.get("external") else ""))
    url = entry["shareUrl"]
    desc = re.sub(r"\s+", " ", html.unescape(entry["desc"])).strip()
    guide = bool({"tutorial", "interactive"} & set(entry["tags"]))
    body = learning_map(page, url) if guide else essay_body(page, url)
    if len(body) < (80 if guide else 1500):
        sys.exit(f"{slug}: could not extract enough content ({len(body)} chars); review the page structure by hand")
    note = ("This is a concise map of the original guide; use the source link for the interactive material."
            if guide else "This is an adapted edition of the original article. It preserves the section argument and evidence; use the source link for the published version and any interactive material.")
    title = entry["title"].rstrip(".")
    folder.mkdir(parents=True, exist_ok=True)
    cover = cover_card(entry, folder / "cover.png")
    meta = {"source_slug": slug, "source_url": url, "canonical_url": url,
            "devto": {"title": entry["title"], "tags": tags_for(entry), "ai_disclosure_level": "some_ai"},
            "medium": {"title": title, "subtitle": clip(desc), "topics_to_select": MEDIUM_TOPICS,
                       "ai_assistance_disclosure": AI_NOTE, "skip_existing_story": False},
            "cover_image_path": str(cover) if cover else ""}
    (folder / "metadata.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (folder / "devto.md").write_text(
        f"# {entry['title']}\n\n{desc}\n\n{note}\n\n[Read the original article]({url})\n\n{body}\n\n---\n\n"
        f"[Read the original on Anuj Sadani | Tech]({url})\n", encoding="utf-8")
    (folder / "medium.md").write_text(
        f"# {title}\n\n*{meta['medium']['subtitle']}*\n\n{AI_NOTE}\n\n{desc}\n\n{body}\n\n[Read the original article]({url})\n",
        encoding="utf-8")
    render_html(folder / "medium.md")
    print(f"prepared {folder}\nnext: review devto.md and medium.md, then `syndicate.py schedule {slug} --dry-run`")


def render_html(md_path: Path) -> None:
    """Medium paste/import HTML, rendered by pandoc from the Medium Markdown."""
    out = subprocess.run(["pandoc", "-f", "gfm", "-t", "html", "-s", "--metadata", "pagetitle=Medium draft", str(md_path)],
                         text=True, capture_output=True, check=True).stdout
    md_path.with_name("medium.html").write_text(out, encoding="utf-8")


def read_rows(schedule: Path) -> list[dict]:
    return list(csv.DictReader(schedule.open(newline="", encoding="utf-8"))) if schedule.exists() else []


def next_slot(rows: list[dict]) -> datetime:
    soonest = (datetime.now(IST) + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    last = max((datetime.fromisoformat(r["scheduled_local"]) for r in rows), default=None)
    return max(soonest, last + timedelta(hours=SLOT_HOURS)) if last else soonest


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        raise RuntimeError("Refusing API redirect")


def api(path: str, key: str, method="GET", data=None):
    req = Request(API_ROOT + path, data=json.dumps(data).encode() if data is not None else None, method=method,
                  headers={"api-key": key, "User-Agent": "AsadaniTechPublish/1.0",
                           "Content-Type": "application/json", "Accept": "application/json"})
    try:
        with build_opener(NoRedirect).open(req, timeout=45) as r:
            return json.load(r)
    except HTTPError as exc:
        detail = exc.read(1500).decode(errors="replace").replace(key, "[REDACTED]")
        raise RuntimeError(f"DEV.to returned HTTP {exc.code}: {detail}") from None


def own_articles(key: str) -> list[dict]:
    out = []
    for page in range(1, 20):
        batch = api(f"/articles/me/all?per_page=100&page={page}", key)
        out += batch
        if len(batch) < 100:
            return out
    raise RuntimeError("pagination safety bound exceeded")


def schedule(slug: str, at: str | None, dry: bool) -> None:
    root = data_dir()
    folder = root / "articles" / slug
    if not (folder / "devto.md").exists():
        sys.exit(f"{slug}: no package; run `syndicate.py prepare {slug}` first")
    meta = json.loads((folder / "metadata.json").read_text(encoding="utf-8"))
    md = (folder / "devto.md").read_text(encoding="utf-8")
    title, body = md.split("\n", 1)[0].removeprefix("# ").strip(), md.split("\n", 1)[1].lstrip()
    if title != meta["devto"]["title"]:
        sys.exit(f"{slug}: title in devto.md differs from metadata.json")
    rows = read_rows(root / "schedule.csv")
    when = datetime.fromisoformat(at) if at else next_slot(rows)
    if when.tzinfo is None:
        when = when.replace(tzinfo=IST)
    if when <= datetime.now(timezone.utc):
        sys.exit("slot is not in the future")
    desc = html.unescape(article_entry(slug)["desc"])
    payload = {"article": {"title": title, "body_markdown": body, "published": True,
                           "published_at": when.astimezone(timezone.utc).isoformat(), "tags": meta["devto"]["tags"],
                           "description": desc, "canonical_url": meta["canonical_url"],
                           "ai_disclosure_level": meta["devto"].get("ai_disclosure_level", "some_ai")}}
    if dry:
        shown = dict(payload["article"], body_markdown=f"<{len(body)} chars>")
        print(json.dumps({"dry_run": True, "slot_local": when.isoformat(timespec="minutes"), "article": shown}, indent=2))
        return
    key = KEY_PATH.read_text().strip() if KEY_PATH.exists() else ""
    if not key:
        sys.exit(f"no DEV.to API key at {KEY_PATH}")
    api("/users/me", key)  # fails fast on 401 / suspension
    state_path = folder / "devto-state.json"
    state = json.loads(state_path.read_text()) if state_path.exists() else {}
    existing = own_articles(key)
    hits = [a for a in existing if str(a["id"]) == str(state.get("id")) or (not state and a.get("title") == title)]
    if len(hits) > 1:
        sys.exit(f"{slug}: multiple matches on DEV.to; refusing to guess")
    now = datetime.now(timezone.utc)
    if hits:
        a = hits[0]
        if a.get("published") and not (a.get("published_at") and datetime.fromisoformat(a["published_at"].replace("Z", "+00:00")) > now):
            sys.exit(f"{slug}: already live on DEV.to without a future schedule; refusing to modify")
        method, path = "PUT", f"/articles/{a['id']}"
    else:
        method, path = "POST", "/articles"
    result = api(path, key, method, payload)
    back = next((a for a in own_articles(key) if a["id"] == result["id"]), None)
    ok = (back and back.get("published") is True and back.get("title") == title
          and datetime.fromisoformat(back["published_at"].replace("Z", "+00:00")) == when.astimezone(timezone.utc)
          and back.get("canonical_url") == meta["canonical_url"])
    state_path.write_text(json.dumps({"id": result["id"], "url": (back or result).get("url"),
                                      "published_at": (back or result).get("published_at"), "verified": bool(ok)}, indent=2) + "\n")
    if not ok:
        sys.exit(f"{slug}: API readback did not confirm the scheduled article; see {state_path}")
    row = {"slot": len(rows) + 1, "scheduled_local": when.isoformat(timespec="minutes"), "medium_scheduled_local": when.isoformat(timespec="minutes"),
           "timezone": TZ_NAME, "slug": slug, "source_title": article_entry(slug)["title"], "devto_title": title,
           "medium_title": meta["medium"]["title"], "devto_tags": ";".join(meta["devto"]["tags"]),
           "medium_topics": ";".join(meta["medium"]["topics_to_select"]), "cover_image_path": meta.get("cover_image_path", ""),
           "devto": "scheduled", "medium": "schedule (manual)", "source_url": meta["source_url"]}
    sched = root / "schedule.csv"
    fields = list(rows[0].keys()) if rows else list(row.keys())
    with sched.open("a" if rows else "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        if not rows:
            w.writeheader()
        w.writerow(row)
    print(f"scheduled {slug} on DEV.to for {when.isoformat(timespec='minutes')}: {(back or result).get('url')}")
    print("Medium: post by hand from medium.md / medium.html (automated posting breaks Medium's rules)")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("prepare"); a.add_argument("slug"); a.add_argument("--refresh", action="store_true"); a.add_argument("--source", type=Path)
    sub.add_parser("slot")
    s = sub.add_parser("schedule"); s.add_argument("slug"); s.add_argument("--at"); s.add_argument("--dry-run", action="store_true")
    args = p.parse_args()
    if args.cmd == "prepare":
        prepare(args.slug, args.refresh, args.source)
    elif args.cmd == "slot":
        print(next_slot(read_rows(data_dir() / "schedule.csv")).isoformat(timespec="minutes"))
    else:
        schedule(args.slug, args.at, args.dry_run)


if __name__ == "__main__":
    main()
