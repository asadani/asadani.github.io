# SynthID Can't Tell You Who Made It: What the 5-Second AI Check Actually Verifies

> Google wired AI-media detection straight into Gemini, and it works. It also answers a narrower question than most people think, and a screenshot still walks right past it.

You can now drop an image into Gemini, ask "is this made with AI?", and read an answer in about five seconds. No portal, no upload to a forensics service, no waiting. The check is real, and it is the best one available to a normal person today. It also tells you whether a participating model generated the pixels, not who made the image or whether it is authentic human work. Those are different questions, and the gap between them is where most of the confusion lives.

I want to walk through what SynthID actually does, the one technical detail that decides everything else, and where I think it earns its keep versus where it leaks.

## The five-second check is real, and placement is why

The workflow is genuinely four steps: open Gemini, drop the image in, ask the question, read the answer. That sounds trivial, and the triviality is the point.

I have watched good detection tools die because they lived one tab away from where the doubt actually happened. A check that fires inside the chat you already have open is a check people will use. Google says the Gemini verification flow has already been run around [50 million times](https://blog.google/innovation-and-ai/products/identifying-ai-generated-media-online/), and at I/O 2026 it confirmed it is expanding both Content Credentials and SynthID verification to Search and Chrome. The friction was always the product. The math was never the hard part.

## What SynthID actually is: a signal, not a label

SynthID embeds a statistical pattern into the content itself at generation time. For images and video, it nudges pixels in a way that survives common edits like cropping, filters, frame-rate changes, and lossy compression. For audio, it shifts the waveform in a band you cannot hear, and Google says it holds up through MP3 compression, added noise, and speed changes. For text, it biases the token probabilities the model samples from, so the wording itself carries a faint signature ([Google DeepMind, SynthID](https://deepmind.google/models/synthid/)).

The key word is *signal*. The mark is not a field you can read with a hex editor. It is spread across the content the way a watermark is spread across a banknote. That is why ordinary edits do not remove it, and also why the detector reports a confidence rather than a clean yes or no. Treat the output as "likely AI-generated, at this confidence," not a verdict.

## The exiftool question, answered

This is the first thing an engineer reaches for, and the answer reveals the whole design. `exiftool` edits metadata. SynthID does not live in metadata. So the obvious attack misses the target entirely.

```bash
# Wipe every scrap of metadata from the file
$ exiftool -all= photo.png

# EXIF camera tags ...... gone
# XMP / IPTC fields ..... gone
# C2PA content manifest . gone (it was metadata)
# SynthID signal ........ still in the pixels
```

That is the cleanest way to see the landscape. There are three separate layers of "where the truth about a file lives," and they fail to different attacks.

| Layer | Lives in | exiftool strips it? | Answers |
|---|---|:---:|---|
| EXIF / XMP | Metadata block | Yes | Camera, time, edits |
| C2PA Content Credentials | Signed manifest | Yes | Who made or edited it |
| SynthID | The pixels / waveform | No | Was a model involved |

Notice the trade. SynthID is hard to strip because it is baked into the signal, but for the same reason it carries almost no information. It cannot tell you who, when, or on which model. C2PA can carry all of that, because it is a signed manifest, but a signed manifest is easy to drop. You strip C2PA by deleting it, and the file is silently unsigned. The robust layer is dumb, and the rich layer is fragile. That tension is the real story, not the watermark itself.

## Why a screenshot still wins

If `exiftool` cannot touch it, why does a screenshot defeat it? Because a screenshot is not an edit. It is a re-capture. The original signal gets rendered to a screen, recomposited by the operating system, and re-rasterized into a new file at a new resolution. Each step adds noise, and the watermark is a faint pattern trying to stay above a confidence threshold. Push it down far enough and the detector stops trusting it.

The second gap is simpler. The mark is only present if a participating model put it there. An image painted by a model that never adopted SynthID has nothing to detect, so the check comes back clean. A negative result means "no mark found," which is not the same as "a human made this." The cleanest way to evade the check is not to attack the watermark at all. It is to generate with a tool that never wrote one.

This produces an asymmetry worth internalizing. A positive is strong, because the signature is hard to forge, so a confident hit means a participating model almost certainly made it. A negative is weak, because it only rules out the marked tools, and the marked tools are a shrinking slice of everything out there.

## The question it doesn't answer

Here is where the popular framing needs a correction. The dream people describe is a single check that confirms an image is "real human work" versus AI. SynthID does not do that, and by design it never will. It only sees its own ink. It is blind to a photo a human actually took, because there is no mark to find, and a clean result there proves nothing about authenticity.

The question of *who made this, and can I trust them* is provenance, and provenance needs identity, not a watermark. That is the job C2PA Content Credentials are built for: a manifest signed by the camera, the editor, or the publisher, binding the file to an issuer you can verify. The asset effectively says "this newsroom captured me, then this editor adjusted me," and a chain of signatures backs the claim.

Google is already shipping this side, not just the watermark. The Pixel 10 camera writes Content Credentials at capture, so a photo can carry a signed claim that it came off a real lens and was never edited, marking a frame as an [unaltered original](https://blog.google/innovation-and-ai/products/identifying-ai-generated-media-online/). That signed-at-capture identity is the "authentic human work" signal SynthID structurally cannot give you, because a watermark only knows about its own ink and a real camera leaves none. So the instinct that we need central, identity-bound verification is the right one. It just is not SynthID's job.

## Where it genuinely earns its keep: video and audio

The screenshot loophole is mostly an image problem, and it largely dissolves for video and audio. You can grab one frame of a clip, but you cannot screenshot motion or sound. The SynthID mark is carried across the temporal signal, re-stamped frame after frame and second after second, so capturing a usable copy means re-recording the stream rather than snapping a still.

Re-recording is a much taller fence than a screenshot. Run a watermarked clip through a screen-and-mic recapture and you keep the temporal structure the detector keys on while picking up new noise, rather than cleanly erasing the mark. For audio especially, a watermark that lives in an inaudible band and survives MP3 compression means the obvious laundering paths leave it intact.

This is the part I would underline hardest. For static images, watermarking is a useful but leaky check. For synthetic video and cloned voice, which is exactly where deepfakes do the real damage, the watermark has the most room to work, because the signal you would have to destroy is spread across time and a single frame cannot capture it.

## What still beats it today

I would rather state the limits plainly than oversell the check. Here is what gets past SynthID right now.

- **Generate with a non-participating model.** No mark written, nothing to detect. The simplest evasion, and it needs zero skill.
- **Screenshot or re-capture a still image.** Re-rasterizing pushes the signal below the detector's confidence on a single frame.
- **Heavy generative editing.** Run the image through a second, unmarked model that repaints it, and you can dilute the original mark.
- **The analog hole.** Print it and photograph it, or aggressively crop and rescale, and a faint image watermark can drop out.

It is also worth noting what Google has not published: I have not seen disclosed false-positive or false-negative rates for the detector. None of this makes the check worthless. It makes it a filter, not a verdict, and a filter that catches the lazy majority of synthetic media is genuinely valuable as long as nobody reads a clean result as proof of a human hand.

## The two-layer system I'd actually trust

If the goal is "tell me whether to trust what I am looking at," no single watermark gets there. What I want is two layers paired and verified together at the point of viewing.

Layer one is the statistical watermark, SynthID and its industry siblings, answering "did a machine make this" with a confidence. It is the robust, low-information layer that survives ordinary handling. The adoption numbers are what make it matter: Google says SynthID has [now watermarked](https://blog.google/innovation-and-ai/sundar-pichai-io-2026/) over 100 billion images and videos plus 60,000 years of audio, with OpenAI, Kakao, and ElevenLabs named as adopters at I/O 2026. A watermark one lab honors is a marketing line. A watermark several major labs write is closer to infrastructure.

Layer two is signed provenance, C2PA bound to a real issuer identity, answering "who captured or published this" with a verifiable signature. It is the high-information, fragile layer that carries the meaning. The viewer's job then collapses to a single readout: watermark present means a model was involved; valid signature present means a known party stands behind it; both absent means treat it as unverified and do not let it move you. That last state, unverified, is where we sit for most of what we scroll past, and it is the honest default until provenance is the boring norm rather than the exception.

## The Short Version

SynthID is the best AI-media check most people have, and the five-second Gemini workflow is real. It lives in the signal, so `exiftool` cannot strip it, but a screenshot or an unmarked model walks right past it.

It answers "did a machine make this," not "who made this" or "is this authentic." That second question needs signed provenance like C2PA, and the two layers only add up to trust when they work together.

For images, treat a hit as strong and a miss as nearly meaningless. For video and voice, take it more seriously, because the mark rides the whole stream and you cannot screenshot your way out. Check before you share. Just know exactly what the check did and did not tell you.

---

*Sources: [Google DeepMind, SynthID](https://deepmind.google/models/synthid/); [Sundar Pichai, Google I/O 2026 keynote](https://blog.google/innovation-and-ai/sundar-pichai-io-2026/); [Google, identifying AI-generated media online](https://blog.google/innovation-and-ai/products/identifying-ai-generated-media-online/); C2PA Content Credentials spec.*
