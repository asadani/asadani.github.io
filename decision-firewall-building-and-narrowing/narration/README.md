# Audio edition

Generated locally on October 4, 2026 with [narrate-your-writing](https://github.com/asadani/narrate-your-writing), Kokoro ONNX, the `bm_george+bm_fable` blend, British English and speed `0.9`.

These twelve scripts are an adaptation for listening, not a verbatim HTML extraction. They retain the opening argument, both attributed quotes and the numerical comparisons from all three tables. Navigation, visual mind-map labels, raw code, checkpoint hashes and source-link labels are omitted. Numbers are written as spoken words. The written article remains the source for executable commands and linked evidence. The spoken introduction and visible player identify the voice as synthetic.

The verified render used `CUDAExecutionProvider` on an NVIDIA GTX 1650 with 4 GB VRAM, ONNX Runtime GPU 1.22.0 and cuDNN 9.10.2.21. Inference-time CPU retry was disabled. An initial attempt with cuDNN 9.27 failed during convolution and attempted CPU fallback; it was stopped and all tracks were regenerated with `--force`. Those initial results are not published.

[The render manifest](../audio/render.json) records package versions, model/voice hashes, per-track script/audio hashes and measured durations. It identifies the article's text commit separately from this audio addition. These are narration provenance records, not framework benchmark results.

To rerender from a checkout of `narrate-your-writing`, using its GPU environment:

```sh
python narrate.py ../asadani.github.io/decision-firewall-building-and-narrowing/narration \
  --out ../asadani.github.io/decision-firewall-building-and-narrowing/audio \
  --engine kokoro --device cuda --voice bm_george+bm_fable --speed 0.9
```

The article reuses the site's existing `/assets/player.css` and `/assets/player.js`. Its player is inserted before the opening prose, since the article uses semantic `section` elements rather than the extractor/player's older `div.section` placement convention. After editing the article, review the spoken adaptation and regenerate affected tracks before refreshing the player durations and manifest. Do not regenerate scripts blindly: the default extractor drops comparison tables and opening prose.
