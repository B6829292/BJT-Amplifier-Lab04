# Lab04 high-fidelity reference UI

This revision reproduces the supplied laboratory workspace while retaining **Lab04**, the existing unbypassed 2N3904 circuit and real ngspice calculations. It does not convert the project into the full Final Project. No reference screenshot is used as a UI background or shipping asset.

## Implementation and file map

| Files | Responsibility |
|---|---|
| `templates/simulation.html`, `templates/reference-schematic.html` | Reference layout, canonical defaults metadata, editable electrically connected SVG, configuration, guide, result panels and honest check states |
| `templates/lab-header.html`, `templates/lab-sidebar.html`, `templates/icons.html` | Shared chip branding, Lab04/Lab03 identity, existing route links, engineering SVG icons and generator controls |
| `static/lab-compact.css`, shared icon rules in `static/style.css` | Reference palette, panel proportions, type, native controls, metallic knobs, responsive grid/flex, focus and reduced-motion states |
| `static/dashboard.js` | Real retained analyses, current/stale/pending/error aggregate state, IE = VE/RE, actual overlays, input/result checks and export snapshot |
| `static/lab-controls.js`, `static/lab-parameters.js` | Pointer/touch/keyboard knobs, canonical Reset, overlays, animation reset, guide/expand, genuine JSON downloads and converted engine-bound input checks |
| `static/plots.js`, `static/run-history.js` | Blue/green numerical plots, phase-wrap breaks, pointer/keyboard sample tooltips and shared decimal parsing |
| `tests/test_reference_ui.py`, `tests/reference_*`, `tests/plot_wrap_check.js`, `tests/compare_reference_ui.py` | Template, numeric contract, interaction, geometry and reproducible comparison coverage; existing assertions retained |
| `README.md`, `docs/validation.md`, `docs/reference-ui.md`, `docs/evidence/reference-ui/` | Updated usage/limitations, review report, component checklist and actual verification artifacts |
| `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `.impeccable/surfaces/reference-ui.md`, `docs/superpowers/` | Product truth, extracted design tokens, pinned direction, implementation spec/plan and execution ledger |

`app.py`, `dc_bias.py` and `spice_engine.py` remain unchanged. No dependencies were added to the application. Pillow is used only by the optional development comparison script.

## Reference component checklist

| Reference component | Implemented behavior / qualification |
|---|---|
| Chip logo, title, subtitle, course badge | Authored SVG chip and matching compact header |
| Project badge/name/version/repository | Lab04 identity; analytical pages retain Lab03 identity; repository link is real |
| Save Project | Downloads actual inputs, retained results, provenance, freshness and overlay preferences as JSON; no import or server persistence is claimed |
| Overview / Simulation / Validation / Reports | Existing analytical page, simulation route and real result/status anchors; no fictitious report route |
| Common emitter bias selection | Existing analytical Fixed/Emitter/Divider routes and supported SPICE Divider circuit; bypass option is explicitly unsupported |
| Function Generator | Metallic CSS rotary sliders; logarithmic adjustment, mouse drag, touch-pointer drag, arrow/Page/Home/End keys, synchronized numeric source values |
| Source units | Existing mV peak and Hz semantics retained; circuit unit dropdowns contain their actual fixed supported unit |
| Schematic | VCC, R1, R2, RC, RE, RL, Cin, Cout, Q1, source, ground and nodes are editable SVG, including continuous emitter-to-ground connectivity |
| DC overlay | Actual VB/VC/VE, actual IC, IE derived from VE/RE, conventional current arrows and actual IC/VCE Q-point box; hidden when stale/pending/failed |
| AC signal overlay | Shared-window actual transient samples, common voltage scale, input settings, actual output peak and peak-ratio gain; hidden until a current transient result exists |
| Legend and annotation styling | Orange bias, blue input, green output, pink nodes, purple Q-point and diagram key |
| Overlay toolbar | Working DC/AC/animation switches, pause/resume, timeline reset and viewport expansion; Escape restores schematic |
| Configuration | Reference two-column arrangement with all supported circuit parameters and normalized units; model-controlled beta/VBE are disabled, not editable |
| Run Simulation | Runs all three real analyses sequentially, or one selected analysis; native no-JavaScript submission remains DC-compatible |
| Validate | Checks converted values against the existing engine bounds and current result freshness; never claims instructor/benchmark validation |
| Reset | Restores canonical defaults, including on a page returned from a native POST, without manufacturing new results |
| Export | Downloads actual retained solver arrays, inputs, provenance and explicit freshness as JSON |
| DC table | Actual VB, VE, VC, VCE, IC; IE = VE/RE; active region derived from VC > VB > VE and positive IC |
| Bode chart | Actual log-frequency samples, blue dB gain, green dashed degree phase, grid, legend, pointer/keyboard tooltip, preserved discontinuity handling |
| Transient chart | Actual Vin/Vout versus time, units, legend and sample tooltip; dashed output retained for non-color distinction |
| Validation panel | Separate input/DC/AC/transient solved/check indicators and unrun reference benchmark, with model/instructor provenance |
| Operation Guide | Circuit, parameter units, individual analyses, overlays, freshness, interpretation, controls and limitations |
| Responsive layout | Desktop hierarchy maintained at all requested sizes; mobile stacks panels and provides contained schematic panning rather than shrinking the whole UI |

## Visual evidence and measurement

- [Before](evidence/reference-ui/before-1085.png): historical **1070×888** full-page bitmap from a 1085×613 desktop viewport (scrollbar excluded). It is not a pixel-matched before/after metric.
- After: [1085×613](evidence/reference-ui/dashboard-1085.png), [1920×1080](evidence/reference-ui/dashboard-1920.png), [1440×900](evidence/reference-ui/dashboard-1440.png), [1366×768](evidence/reference-ui/dashboard-1366.png).
- Mobile: [390px full page](evidence/reference-ui/dashboard-390.png), [390×844 first viewport](evidence/reference-ui/viewport-390.png). Mobile captures use a real Chromium mobile-emulation context, not a physical phone.
- [Reference/app side by side](evidence/reference-ui/comparison.png), [50% blend](evidence/reference-ui/overlay.png), [3×-contrast absolute difference](evidence/reference-ui/difference.png).
- [Raw static-region comparison](evidence/reference-ui/comparison.json): mean absolute RGB error on a 0–255 scale at fixed coordinates, **not a perceptual similarity percentage**. Branding 40.75, navigation 11.63, schematic tabs 32.16, configuration heading 29.70 and results heading 30.52. Dynamic electrical values/plots, intentional Lab04 labels and unsupported engineering controls are excluded. Text antialiasing and small positional differences affect this metric strongly; no 95% claim is made.
- At reference size the actual sidebar is about 152px wide, schematic region 555×316, configuration 323×316, and results 887×214 beginning near y=382. Reference estimates are 152px, 553×319, 324×320 and 886×203 near y=385. The results retain extra current-run and truthful validation/provenance information.

Several captured/inspected implementation passes corrected panel height, short-desktop density, sidebar spacing, unit clipping, typography, icon sizing and mobile circuit panning. Captures are from equivalent populated solver states; the reference's electrical numbers are not reproduced artificially.

## Verification

See [regression output](evidence/reference-ui/regression.txt), [regression summary](evidence/reference-ui/regression.json), [browser assertions](evidence/reference-ui/browser.json) and [review-regression assertions](evidence/reference-ui/review-checks.json). The browser harness covers real solver runs, empty/error/stale states, source/circuit freshness isolation, knob synchronization, touch emulation, switches across redraw, animation reset, tooltips, downloads, POST-origin Reset, pending edits, canonical defaults, native form fallback and all requested viewport sizes. Engine boundary contracts include immediately adjacent out-of-bound floats and existing unit factors.

Final verification: **58 Python tests passed without skips; 59 main browser assertions and 14 review-regression assertions passed**. The independent visual review disposition is **ship**, at screenshot-review scope. [Review record and detector qualifications](evidence/reference-ui/review.md).

To reproduce, configure `NGSPICE_PATH` and `BJT_MODEL_PATH` as in the README, run `python -B -m unittest discover -s tests -v`, and start the local Flask server on port 5088. Through Playwright MCP, execute `tests/reference_ui_browser.js`, `tests/reference_ui_review_browser.js` and `tests/reference_ui_capture.js` using the browser code runner's `filename` parameter. The scripts target `http://127.0.0.1:5088/simulation`. To regenerate comparisons with development-only Pillow available, run `python -B tests/compare_reference_ui.py --reference <path-to-final-project-reference.png>`. The source reference is only read, never modified.

## Remaining differences and limitations

- Native font antialiasing, dropdown/spinner chrome, some authored icon shapes and a few-pixel alignment/spacing differences are not pixel-identical to the supplied image.
- The result band is about 11px taller at reference width, retaining explicit freshness and truthful validation metadata. Larger desktop text/control sizes prioritize readability over literal screenshot scaling.
- The reference's CE bypass, editable beta/VBE and high bypassed gain are not supported by Lab04. They are not connected to the circuit or made editable. Actual unbypassed results, chart ranges and waveform amplitudes differ intentionally.
- Source waveforms are sampled from real data and normalized for the diagram; wire-flow animation is illustrative, not a measured propagation-speed visualization.
- Benchmark/instructor checks remain **Not run**. The configured 2N3904 is a fallback model, not instructor-verified; model redistribution terms remain unresolved.
- No physical-device, assistive-technology, Safari/Firefox or full WCAG certification is claimed. Expanded schematic is an in-app viewport overlay, not OS/browser fullscreen.
- Save/Export are local JSON downloads. Project import, cloud persistence and user accounts are not implemented.
- All work is local and uncommitted for review. No push or merge is authorized or performed.
