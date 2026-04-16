# asadani.github.io

Personal blog — standalone articles on AI engineering, infrastructure, and security.

Live at **[asadani.github.io](https://asadani.github.io)**

---

## Articles

### [The 2026 AI Coding Agent Stack — Five Layers That Actually Matter](https://asadani.github.io/ai-coding-agent-stack/)
`AI Engineering` `Open-Source` `2026`

The AI coding agent ecosystem has matured past prompt engineering. An architectural map of the five layers — context, methodology, memory, review, and orchestration — and which tools belong where.

---

### [AI Coding Agent Stack — Interactive Mind Map](https://asadani.github.io/ai-agent-stack-map/)
`Interactive` `Mind Map` `Tools`

Companion to the article above. 37 tools across 6 clusters, pan/zoom SVG, filter by cluster, GitHub links on every node. Built with vanilla JS, no dependencies.

---

### [AI Shrinkflation — The Silent Regression Your Team Won't See Coming](https://asadani.github.io/ai-shrinkflation/)
`AI Engineering` `Production` `Observability`

The model you deployed last quarter is not the model running today. Quality can degrade silently between API versions. How to detect it, log it, and defend against it.

---

### [Amazon S3 Files: Breaking the Object-File Barrier](https://asadani.github.io/amazon-s3-files/)
`AWS` `S3` `Infrastructure` `GA`

Native NFS v4.1 access directly on S3 buckets — backed by EFS-powered caching — erases the decade-old object vs. file storage divide. What changed, what it costs, and when to use it.

---

### [Gemini Flex & Priority Inference — Service Tier Benchmarks](https://asadani.github.io/gemini-flex-inference/)
`Gemini API` `Cost Optimization` `Latency`

Optimize cost, reliability, and latency for production workloads by choosing between Flex and Priority inference tiers. Benchmarks, trade-offs, and batch API patterns.

---

### [AI Writes the Code. You Own Everything. — Linux Kernel AI Policy](https://asadani.github.io/linux-ai-ownership/)
`Linux` `Policy` `IP` `Open-Source`

The Linux kernel's first official rules for AI-assisted code contributions — redefining what authorship, ownership, and the Developer Certificate of Origin mean in the age of LLMs.

---

### [The LiteLLM PyPI Attack: A Supply Chain Postmortem](https://asadani.github.io/litellm-supply-chain-attack/)
`Security` `Supply Chain` `CVE` `PyPI`

How a hijacked maintainer account, a malicious `.pth` file, and the booming MCP plugin ecosystem combined into one of the most targeted credential-theft campaigns in the Python ecosystem. 95M downloads at risk.

---

## Design

Two themes — warm-light (analysis, how-to) and dark-cyberpunk (security) — both fully inline CSS, no external stylesheets. See [`CLAUDE.md`](CLAUDE.md) for the complete design system.
