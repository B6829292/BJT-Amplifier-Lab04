# Transistor Circuit Virtual Lab

<!-- impeccable:product-schema 1 -->

## Platform
web

## Product Purpose
Continue BJT-Amplifier-Lab04: an electrical-engineering lab with analytical bias calculations and real ngspice DC, AC and transient analyses.

## Capabilities and Constraints
Flask routes, external 2N3904 device model, input validation, per-analysis run retention and input freshness must remain functional. Simulation completion is not instructor validation. Emitter bypass, editable transistor beta and VBE are not supported by the existing SPICE engine and must not be presented as working controls.

## Brand Commitments
The user-supplied final-project-reference.png is the visual authority. Reproduce its laboratory workspace, not a new dashboard interpretation. No screenshot backgrounds; the schematic must be editable SVG.

## Evidence on Hand
51 existing automated tests; configured local ngspice and 2N3904 model. Reference screenshot in the original feature worktree is read-only. No invented electrical results or validation passes.
