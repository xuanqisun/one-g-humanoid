# Sources and evidence

Checked 2026-11-10. Company identity: **ONE-G**.

## Visual reference

- https://supermimic.github.io/
- Observed design: white background, oversized centered headline, restrained navigation, demonstration-led chapters, progressive technical disclosure.
- Hero source: `https://supermimic.github.io/media/hero/hero_montage_desktop.mp4`.
- `ffprobe`: H.264, yuv420p, 2112 × 1188. This is an opaque white-background simulation video, not an alpha-channel animation. The site also includes live robot footage and interactive simulation.
- The design reference's source was inspected, and its rendered landing page was viewed. No REA engine execution was needed for ordinary public source analysis. The requested `reverse-engineer-anything` skill was installed from `morluto/rea/.agents/skills/reverse-engineer-anything`.
- The website in this repository is independently implemented. Reference footage is not included.

## Research references

### SONIC

- Project: https://nvlabs.github.io/GEAR-SONIC/
- Paper: https://arxiv.org/abs/2511.07820
- Code: https://github.com/NVlabs/GR00T-WholeBodyControl
- Figure: https://nvlabs.github.io/GEAR-SONIC/static/images/overview.png
- Local: `assets/papers/sonic-overview.png`
- Attribution: Luo et al.; original method overview. Paper license: CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/ . The figure is reproduced without modifying its contents.
- User states the ONE-G three-point and whole-body demonstrations are based on SONIC. Other integration details are not established by this page.

### Any2Any

- Project: https://any2any.top/
- Paper: https://arxiv.org/abs/2605.23733
- Example official transfer code: https://github.com/Ming827/any2any_sonic2Oli
- Figure: https://any2any.top/assets/figures/figure2-architecture.png?v=method-crop-20260617
- Local: `assets/papers/any2any-architecture.png`
- Original architecture figure. Approximately 1% data/compute is a result of specific transfer experiments, not a universal guarantee. The H2/X2 clips are not evidence of Any2Any experiments.

### MorphMimic

- Project: https://lzyang2000.github.io/morphmimic/
- Paper: https://lzyang2000.github.io/morphmimic/static/morphmimic.pdf
- Code: https://github.com/lzyang2000/morphmimic
- Figure: https://lzyang2000.github.io/morphmimic/static/images/fig2.png
- Local: `assets/papers/morphmimic-framework.png`
- Attribution: Yang et al., 2026, original paper Figure 2 (project page calls it Figure 1).
- Paper: unified model, 3 H100 NVL GPUs, 5 h 26 min, 16.3 GPU-hours; G1, X2 Ultra, T2; real-world G1. Separate experts total 13.9 GPU-hours, so do not claim the shared model uses less compute than all experts.
- H2 is a user-supplied ONE-G extension demonstration outside the paper's evaluated embodiment set. X2 source label is preserved without adding an unverified hardware submodel.

### SuperMimic

- Project: https://supermimic.github.io/
- Paper: https://arxiv.org/abs/2610.28480
- PDF: https://arxiv.org/pdf/2610.28480
- Local figure: `assets/papers/supermimic-training-loop.png`
- Attribution: Liao et al., 2026, Figure 2 on page 4. Extracted from the original PDF; crop removes surrounding text, retaining the complete figure. No redrawing or relabeling.
- Paper: 1 H100, 3 hours to exceed the released SONIC checkpoint's normalized return; 2 H100s, 9.8 hours for zero failures on 129,514 benchmark motions. The benchmark includes training motions and measures motion coverage, not unseen-task generalization. Hardware and dataset differ from SONIC's original training.
- No ONE-G SuperMimic training run is claimed.

## Figure rights

The figures remain the work of their original authors. The page cites and links each source beside the image. No blanket open-source license is assigned to third-party figures or supplied media. Any2Any and SuperMimic arXiv records use nonexclusive distribution licenses; no separate blanket permission for their figure reuse was established. MorphMimic code and template licenses are not treated as a license grant for research figures.

## Demonstration assets

Existing clips: `https://github.com/xuanqisun/g1-humanoid-teleoperation`, source commit `5fd85d0d4d6f8db84ade4b481da13a98b7e36f86`.

User-supplied clips: `H2_morphmimic.mp4`, `X2_morphmimic.mp4`, `双模式三点遥操真机.mp4`.

The site distinguishes real hardware and simulation. Reported durations are rounded from ffprobe. Paper training measurements are labeled as paper results. No company benchmark numbers are invented.
