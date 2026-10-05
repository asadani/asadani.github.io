# Audio edition

Updated for the October 5, 2026 follow-up with [narrate-your-writing](https://github.com/asadani/narrate-your-writing), Kokoro ONNX, the `bm_george+bm_fable` blend, British English and speed `0.9`. Tracks 10 and 11 were regenerated locally on October 5; the unchanged tracks 00 through 09 retain their October 4 renders. There are 11 numbered sections plus the introduction: 12 audio parts in total.

These twelve scripts are an adaptation for listening, not a verbatim HTML extraction. They retain the opening argument, both attributed quotes and the numerical comparisons from the remaining pilot table, plus the worked refund-recovery example. Navigation, visual mind-map labels, raw code, checkpoint hashes and source-link labels are omitted. Numbers are written as spoken words. The written article remains the source for executable commands and linked evidence. The spoken introduction and visible player identify the voice as synthetic.

The October 5 addition in track 10 explains the runtime-independent three-scenario pilot, its six declared fault injections and its limitations. Track 11 updates the spoken evidence boundary. The earlier comparison results are unchanged. Both updated tracks rendered successfully on CUDA with CPU retry disabled; the player durations and cache keys were refreshed from the new files.

The verified render used `CUDAExecutionProvider` on an NVIDIA GTX 1650 with 4 GB VRAM, ONNX Runtime GPU 1.22.0 and cuDNN 9.10.2.21. Inference-time CPU retry was disabled. An initial attempt with cuDNN 9.27 failed during convolution and attempted CPU fallback; it was stopped and all tracks were regenerated with `--force`. Those initial results are not published.

[The render manifest](../audio/render.json) records package versions, model/voice hashes, per-track script/audio hashes and measured durations. It records a SHA-256 hash of the revised article content (with its scope declared) and the parent Git commit, separately from the audio addition. These are narration provenance records, not framework benchmark results.

To rerender from a checkout of `narrate-your-writing`, using its GPU environment:

```sh
python narrate.py ../asadani.github.io/decision-firewall-building-and-narrowing/narration \
  --out ../asadani.github.io/decision-firewall-building-and-narrowing/audio \
  --engine kokoro --device cuda --voice bm_george+bm_fable --speed 0.9
```

The article reuses the site's existing `/assets/player.css` and `/assets/player.js`. Its player is inserted before the opening prose, since the article uses semantic `section` elements rather than the extractor/player's older `div.section` placement convention. After editing the article, review the spoken adaptation and regenerate affected tracks before refreshing the player durations and manifest. Do not regenerate scripts blindly: the default extractor drops comparison tables and opening prose.
