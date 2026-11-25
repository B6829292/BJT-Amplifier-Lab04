# Lab04 reference-replication evidence

This directory contains actual Playwright MCP captures of the running Flask application. No generated UI images or screenshot backgrounds are used in the implementation.

- `before-1085.png`: original application, captured before UI changes at a 1085×613 browser viewport. Its full-page bitmap is **1070×888**, excluding the desktop scrollbar. It is historical context, not a viewport-matched pixel comparison.
- `dashboard-1085.png`: populated reference-aspect viewport, 1085×613.
- `dashboard-1920.png`, `dashboard-1440.png`, `dashboard-1366.png`: requested desktop viewports.
- `dashboard-390.png`: complete scrollable mobile page at 390×844 viewport.
- `viewport-390.png`: mobile first viewport.
- `comparison.png`, `overlay.png`, `difference.png`: original reference beside, blended with, and differenced against the 1085×613 application capture.
- `comparison.json`: raw RGB error measurements in explicitly named static-only regions. These are not a perceptual similarity percentage.

The reference file is read from the original feature worktree without altering it. It is not shipped as a UI asset. The screenshots intentionally retain Lab04 branding, unbypassed-emitter topology, real calculated values, actual solver traces and honest unrun benchmark states. Those intentional content differences are excluded from the static-region measurements.
