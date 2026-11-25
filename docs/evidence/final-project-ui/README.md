# Final Project UI verification

Image 1 is the visual reference. Image 2 shows the starting Lab04 implementation. Image 3 identifies the analytical-mode regression. The three-column comparisons use the supplied reference, the earlier clean Lab04 capture from the worktree, and a fresh Chrome capture with real ngspice results.

## Supported pages

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Overview | [Overview](overview.png) | |
| Fixed Bias | [1085px](fixed-1085.png) | [390px](fixed-390.png) |
| Emitter Bias (Unbypassed) | [1085px](emitter-1085.png) | [390px](emitter-390.png) |
| Analytical Voltage Divider Bias | [1085px](divider-1085.png) | [390px](divider-390.png) |
| Simulation / Lab04 Voltage Divider CE | [1085px](lab04-1085.png), [1440px](lab04-1440.png), [1920px](lab04-1920.png) | [390px](lab04-390.png) |
| Validation | [Lab03](validation-lab03.png), [Lab04](validation-lab04.png) | |
| Reports | [Lab03](reports-lab03.png), [Lab04](reports-lab04.png) | |

Overview opens the default analytical workspace. Validation and Reports are section links within the current workspace. The [bias-page contact sheet](supported-biases.png) shows how the two labs share the same frame and controls.

## Component comparison

- [Full workspace at 1085 × 613](comparisons/full-workspace.png)
- [Header and typography](comparisons/header.png), [workspace navigation](comparisons/sidebar-icons.png), [bias icons and selection](comparisons/bias-icons.png), [Function Generator](comparisons/generator.png)
- [Circuit geometry](comparisons/schematic.png), [orange current arrows](comparisons/dc-arrows.png), [input and output overlays](comparisons/ac-signals.png), [node labels and Q-point](comparisons/annotations.png)
- [Configuration](comparisons/configuration.png), [results tabs](comparisons/results-heading.png), [DC results](comparisons/dc-results.png), [Bode plot](comparisons/bode.png), [transient plot](comparisons/transient.png), [validation](comparisons/validation.png)

The shared geometry and typography follow the reference. The mode list includes separate Lab03 and Lab04 voltage-divider entries. Lab04 shows the existing unbypassed 2N3904 model, its actual gain and waveforms, and the benchmark's **Not run** status. The analytical pages show their own DC results and operating-region assessment. SVG icons were redrawn from the raster reference.

## Motion evidence

The [schematic animation](schematic-motion.gif), [timestamped browser frames](animation-frames.png), and [paused workspace](animation-paused.png) show the presentation of actual ngspice time samples. The two traces use the same sample window and voltage scale. Playwright exercised pause, resume, return to the initial phase, reduced motion, and clearing the overlay after a source edit.

## Reproducing the checks

The Flask and Node checks run with `python -B -m unittest discover -s tests -v`. Configure the existing local ngspice executable and trusted 2N3904 file to include the real-solver paths. The Playwright MCP scenarios in `tests/bias_navigation_browser.js` and `tests/final_project_browser.js` accept `baseURL` and `artifactDir`. The [browser report](browser-results.json) records assertions, actual sampled results, and viewport measurements. Mobile captures use Chrome viewport emulation.

- All 64 automated regression tests passed with ngspice and the local model configured. [Test output](unit-regression.txt)
- Playwright MCP passed 733 navigation assertions, 30 visual and motion assertions, and the 59 interaction and 14 review assertions from the existing reference UI suites. The navigation and motion runs recorded zero browser console errors. [Current browser report](browser-results.json)
- All five historical browser scripts ran successfully, including 16 B1–B8 acceptance cases, numerical comparisons against independent ngspice netlists, and keyboard and layout scans. [Historical browser report](legacy-browser-results.json)
