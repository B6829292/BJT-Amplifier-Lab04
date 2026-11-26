---
name: Transistor Circuit Virtual Lab
description: Reference-led workspace for Lab03 analytical bias and real Lab04 ngspice simulations.
colors:
  lab-line: "#cddfe9"
  lab-wash: "#e7f3f9"
  lab-text: "#152833"
  lab-action: "#008a9d"
  lab-muted: "#405969"
  lab-panel: "#f8fcfe"
  lab-ok: "#16643a"
  focus: "#00768d"
  action-top: "#007e91"
  action-bottom: "#006f83"
  white: "#fff"
  wire: "#283d42"
  dc-current: "#f09c09"
  ac-input-overlay: "#00a4ea"
  ac-output-overlay: "#1cbb24"
  key-node: "#c947a2"
  node-text: "#a32674"
  q-point-text: "#613885"
  plot-input-gain: "#284de0"
  plot-phase: "#228344"
  plot-output: "#20a92d"
  stale-background: "#fff0d8"
  stale-text: "#724412"
typography:
  body:
    fontFamily: "Roboto, Arial, sans-serif"
    fontSize: "clamp(10px, .94vw, 16px)"
    lineHeight: 1.35
  brand:
    fontFamily: "Roboto, Arial, sans-serif"
    fontSize: "clamp(15px, 1.46vw, 25px)"
    fontWeight: 700
    lineHeight: 1.05
  title:
    fontFamily: "Roboto, Arial, sans-serif"
    fontSize: "clamp(13px, 1.23vw, 22px)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0px"
  circuit-symbol:
    fontFamily: "'Times New Roman', Georgia, serif"
    fontSize: "13px"
  circuit-value:
    fontFamily: "'Times New Roman', Georgia, serif"
    fontSize: "11.7px"
  plot-label:
    fontFamily: "Roboto, Arial, sans-serif"
    fontSize: "14px"
rounded:
  frame: "8px"
  panel: "4px"
  field: "3px"
  switch: "10px"
  circular: "50%"
spacing:
  fluid: "clamp(6px, .65vw, 12px)"
  compact: "4px"
  panel-gap: "9px"
  layout-gap: "10px"
components:
  button-primary:
    backgroundColor: "linear-gradient(#007e91,#006f83)"
    textColor: "{colors.white}"
    rounded: "{rounded.panel}"
    padding: "5px 6px"
  button-secondary:
    backgroundColor: "linear-gradient(#fff,#eff6fb)"
    textColor: "#29424f"
    rounded: "{rounded.panel}"
    padding: "5px 6px"
  parameter-field:
    backgroundColor: "linear-gradient(#fff,#f7fafc)"
    rounded: "{rounded.field}"
    padding: "1px 5px"
    height: "18px"
  card:
    backgroundColor: "linear-gradient(110deg,#fafdff,#f2f8fc)"
    rounded: "{rounded.panel}"
  result-link-selected:
    backgroundColor: "linear-gradient(#007e91,#006f83)"
    textColor: "{colors.white}"
    rounded: "{rounded.field}"
    padding: "3px 12px"
---

# Transistor Circuit Virtual Lab Design System

## Overview

**Creative North Star: "The reference laboratory workspace"**

The supplied Final Project reference defines the visual direction for the Lab03 analytical and Lab04 simulation workspaces. They share the header, navigation, circuit panel, configuration and operating-point styles. The circuit topology, controls and result panels reflect each mode's capabilities.

The system is code-led: Flask/Jinja, native form controls, vanilla JavaScript and SVG. The source comp is read-only evidence, never a rendered background. Qualitative language here describes the artifact under the delegated brief; no new visual-world interview or creative approval is implied.

**Key Characteristics:**
- Circuit-first, dense laboratory workspace.
- Ice-blue tonal layering and teal actions.
- Electrical color semantics, not decorative chart colors.
- Real, independently retained analyses with explicit freshness.

`templates/lab-shell.html` and `static/lab-compact.css` establish the common layout and controls. The two workspaces use the same panel styles and schematic symbols. See the fresh Lab03 and Lab04 captures and component comparisons in `docs/evidence/final-project-ui/`.

## Colors

### Primary

Laboratory teal is the action family: primary run/export-save treatments, selected result navigation, caret and switch accents. The action gradient is retained rather than flattened into the custom-property color. Focus uses a distinct darker teal outline.

### Secondary

Electrical overlays use orange for conventional DC current, bright blue for AC input, green for AC output, magenta for key nodes/voltage annotations and purple for the Q-point. Dark wire ink keeps circuit topology separate from overlays. The actual plotted traces have their own blue gain/input, green phase and green output values; they are not identical to the brighter schematic colors.

### Neutral

Pale blue-white panel gradients, blue-gray dividers, dark laboratory ink and muted annotations establish hierarchy. Green success, amber warning/stale and red failure treatments are meaningful states, not decorative badges. `lab-*` entries preserve declared custom properties; some declarations are palette inventory rather than universally consumed aliases. Literal gradients and local colors still exist in the CSS.

**The Electrical Meaning Rule.** Use color, labels and line styles consistently. The green solver state identifies results that completed with the current inputs and model.

**The Solver Truth Rule.** Show actual input checks, run freshness, model file availability, solver load status and eligible reference benchmark results.

## Typography

The UI uses locally hosted Roboto in regular, medium and bold weights. Times New Roman supplies italic circuit symbols and upright component values. The SVG labels scale with each diagram and chart.

- Body follows the fluid frontmatter role; tabular numerals apply throughout the simulation surface.
- Brand and workspace title use the fluid roles above. The title's trailing topology text is normal weight (400).
- Configuration heading is (1.05em), results heading (1.12em), run headings (.98em), field labels (.94em), freshness text (.76em).
- Italic circuit symbols sit above upright component values. Plot labels use Roboto. Tooltips report the selected numerical sample.
- At 761–1050px the workspace title is (11px). At ≤760px body becomes (14px), brand (17px), subtitle (9px), workspace title (14px/1.4), field labels (12px), editable parameter values (16px), model-controlled values (12px), plot labels (14px).

The tight reference desktop and several mobile supporting labels are intentionally recorded as existing density, not a new minimum legibility standard for future surfaces.

## Layout

Scope is the simulation body (`.lab-page.simulation-page`). The compact stylesheet loads second. Most overrides begin with `.simulation-page`; SVG annotation classes and shared `.ui-icon`, `.lab-mark > .ui-icon`, `.sr-only` are exceptions. Do not copy the simulation overrides into analytical Lab03 or assume they replace its legacy rules. `style.css` remains the source of shared resets, form/table defaults, validation states and analytical-page behavior.

Desktop frame has margins (10px 16px 6px 6px), a thin border and rounded corners. The outer grid allocates (14.5%) to the sidebar and the remainder to main content, with a (10px) gap. Main workspace uses (1.72fr / 1fr) schematic/configuration columns with (6px 9px) row/column gaps. Results span both columns; their four columns are (22% / 29.5% / 27.5% / 21%) for DC, AC, transient and validation. The declared fluid spacing property is inventory, not proof of a universal spacing scale.

### Responsive cascade

| Condition | Implemented behavior |
| --- | --- |
| Reference desktop / below 1250px | Compact parameter controls (18px), analysis/bias selectors (23px), run actions at least (26px); source readouts (20px). Fluid body/title sizing, not document zoom. |
| ≥1250px | Final parameter height is `clamp(22px,1.7vw,32px)`; form gap `clamp(5px,.5vw,9px)`; field row gap `clamp(4px,.45vw,8px)`; unit column `clamp(52px,4.3vw,76px)`. Selectors use `clamp(26px,2.2vw,39px)`; run actions minimum `clamp(32px,2.7vw,48px)`; DC rows `clamp(22px,1.6vw,30px)`. Header/nav spacing and source readouts (28px) also grow. These are final overrides, not earlier superseded declarations. |
| ≥1250px and height ≤800px | Short-desktop form and field row gaps become (4px); columns and fluid control sizing remain. This includes the 1366×768 evidence. |
| 761–1050px | Hide Lab04 vision badge, reduce title and toolbar labels, tighten toolbar/actions and permit unsupported-bias text wrapping. |
| ≤760px | Remove frame margin/radius; wrap header and hide auxiliary badges/caption/repository. Navigation becomes a horizontal row. Bias/source share two columns. Stack schematic, configuration and all four result panels. Sidebar project section is hidden. |
| ≤360px | Sidebar and configuration fields become single-column; navigation and result links wrap. No screenshot evidence at this width was supplied. |

On mobile, navigation targets are at least (44px) high, schematic tabs (38px), overlay labels (30px), icon buttons (36×32px), parameter fields (40px) with (16px) editable values, analysis (40px), bias selector (36px), and run/secondary actions at least (40px). The primary run action spans its row. These are heterogeneous actual target sizes, not a claim that every control meets 44px. Source readouts remain (26px) with (12px) values and (16px) unit rows; rotary controls are (52×52px).

Lab04 defaults to Fit on mobile, with the entire SVG scaled to the stage. Turning Fit off restores the 550px diagram inside a focusable horizontal scroller. Expand uses a 600px minimum for close inspection. Numerical plots fit the stacked mobile result panels.

## Elevation & Depth

Depth is light structural layering: near-white gradients, thin blue-gray borders and restrained ambient shadows. Header shadow is (`0 2px 5px #294f5910`), cards (`0 2px 5px #3459780b`), sidebar panels (`0 2px 3px #3e5e7210`). Physical rotary dials are the deliberate exception: conic metallic fill with (`2px 3px 4px #293e5166,inset 1px 1px 2px #fff`). Guide, opened provenance and expanded circuit have stronger temporary elevation; exact values are in the sidecar.

## Shapes

Soft rectangular frame, compact panels and small field corners use the frontmatter radii. One-pixel borders organize the dense grid; results are contiguous columns separated by dividers rather than individual floating cards. Circular knobs, node markers, switch thumbs and state indicators belong to instrument/electrical semantics. The SVG is a real (550×235) viewBox with resistor, capacitor, transistor and ground geometry, not an image overlay or a freeform circuit editor.

## Components

### Actions and navigation

Run Simulation is a teal gradient, flexible primary action; Validate, Reset and Export use pale secondary gradients and strokes. Save Project uses its own teal gradient (`#0096a7` to `#007c8d`). Result links use a selected teal treatment; they navigate to retained analysis panels rather than hiding the other results. Sidebar selection is a pale cyan gradient. Shared icon macros render inline SVG.

Focus is a visible (2px) teal outline offset (3px); custom switch focus is on its visible track. No bespoke hover or press animation is established for ordinary buttons/links: preserve native behavior rather than inventing one. Disabled buttons use the existing wait cursor and muted blue; model-controlled inputs instead use `not-allowed` and a pale gray-blue fill.

### Configuration and source controls

Two-column labeled parameter rows pair numeric fields with units. The Lab04 bypass setting controls whether the capacitance field is active. Short desktop viewports place the bypass controls beside the analysis selector. β and VBE show model-controlled values. Source controls combine accessible rotary sliders, editable values and unit selectors that preserve the physical signal on conversion.

### Schematic and overlays

Native SVG carries live parameter text, named nodes, a legend and separately controlled overlays. Each mode uses the same four solid orange arrows and staggered highlights for its current DC results. Lab03 shows current flow for active-region calculations. Lab04 determines each branch's arrow direction from the simulated current and uses a common time window and scale for the transient traces. Pause, Restart and the animation switch share the same behavior across modes. Reduced motion retains the static arrows and circuit annotations.

### Results, freshness and validation

DC values, AC gain and wrapped phase, and transient input/output retain independent result panels. Stale runs receive amber freshness treatment. A current Bode plot pins the measured or interpolated response at the generator frequency and restores that marker after pointer or keyboard inspection. Provenance details disclose the solver netlist, log and eligible reference measurements.

Lab04 uses a voltage-divider biased 2N3904 common emitter with coupling capacitors, a load and an optional CE across RE. The other bias links open the analytical Lab03 calculations. Save and Export download the actual configuration and solver results. The reference benchmark applies to the documented default unbypassed circuit and matching 2N3904 model.

## Do's and Don'ts

### Do:
- **Do** preserve Lab04 identity and the supplied comp's laboratory visual hierarchy.
- **Do** preserve electrical colors, units, editable SVG and real solver provenance.
- **Do** retain analytical Lab03 links and clearly distinguish model-controlled fields.
- **Do** apply responsive rules through the scoped final cascade, not whole-page scaling.

### Don't:
- **Don't** use the reference screenshot as a UI background or generate replacement imagery.
- **Don't** fabricate solver results, benchmark passes or circuit capabilities.
- **Don't** treat reference-specific tiny labels as a universal legibility standard.
- **Don't** spread compact simulation overrides into analytical pages without checking their existing styles.
