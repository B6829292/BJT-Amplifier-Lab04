# Independent review record

## Code review and corrections

Five findings were independently identified and reproduced before correction:

1. Shared SVG icons were unsized on analytical pages. Shared CSS/explicit SVG dimensions now apply there; Lab03 identity is retained.
2. A completion banner could remain green after input edits, including edits while requests were pending. Aggregate status now derives from pending/error/freshness state, not merely historical request completion.
3. Validate checked positive finite syntax but not converted SI bounds. Frontend limits now match the unchanged engine and are pinned by exact-bound/adjacent-float and unit-factor contract tests.
4. Native POST responses made submitted values the HTML defaults. Reset now reads canonical field defaults separately from current values.
5. The SVG emitter-resistor path ended four units before its ground lead. Its endpoint now joins the grounded lead; no netlist change was made.

The review reproducer initially reported eight failed assertions. After correction it passed **14/14**, with no failures. The full suite passes **58 tests**, including all original 51; the main live-browser harness passes **59 assertions**. These counts describe separate harnesses, not 73 independent engineering benchmarks. [Review assertions](review-checks.json) · [Main assertions](browser.json) · [Regression](regression.json).

## Visual finish review

Initial disposition: **recapture**, not a design failure. The original mobile full-page bitmap excluded a 15px desktop scrollbar; it was replaced with an exact **390×2619** full-document screenshot from a **390×844 Chromium mobile context**. The baseline's actual **1070×888** bitmap geometry is documented rather than represented as viewport-matched.

Fresh full-review disposition: **ship**, with **no material fixes**. The reviewer independently reopened the reference, comparison images and all required captures, checked their dimensions, and classified the reference composition, sidebar, typography, materials and ground as matching; Lab04 identity, real unbypassed circuitry/data, configuration and honest result metadata as intentional adaptations.

Deferred minor differences: schematic tabs are roughly 4–5px higher than the reference; header lettering is slightly wider/heavier. These are documented, not hidden behind a fabricated similarity score. The review covers screenshot fidelity; it does not independently certify the browser/solver interactions or accessibility.

## Mechanical detector qualification

The first Impeccable source scan reported one flat-type warning because Jinja `url_for` stylesheet references could not be resolved, defaulting measured roles to 16px. Actual CSS and screenshots have a visible hierarchy.

After the design-token inventory was extracted, the final scan reported **270 token-use advisories** (219 color, 38 font-size, 13 radius) and the same flat-type warning. Literal component/legacy values remain; the record is not a claim that the codebase is fully tokenized. No screenshot-backed material defect was established by these source advisories, and no clean detector pass is claimed. The supplied reference remains authoritative over a speculative token-cleanup redesign.

## Verification scope

Real local ngspice/2N3904, existing analytical routes, current/stale/pending/error states, SVG connectivity, bounds, real JSON content, native POST and emulated touch are covered. Physical devices, Safari/Firefox, assistive technology, full WCAG certification, instructor model verification and reference benchmarks are **not** certified by this work. No commit, push or merge was performed.
