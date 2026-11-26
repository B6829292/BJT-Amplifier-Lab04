# Transistor Circuit Virtual Lab

<!-- impeccable:product-schema 1 -->

## Platform
web

## Product Purpose
Continue BJT-Amplifier-Lab04: an electrical-engineering lab with analytical bias calculations and real ngspice DC, AC and transient analyses.

## Capabilities and Constraints
The Lab04 voltage-divider circuit supports an optional emitter bypass capacitor. The project's configured 2N3904 model determines beta and VBE. Flask routes, model availability and provenance, input validation, per-analysis run retention and input freshness are part of the simulation contract. The Lab03 circuits share the DC overlay and playback controls for their analytical results.

## Brand Commitments
The user-supplied final-project-reference.png is the visual authority. Reproduce its laboratory workspace, not a new dashboard interpretation. No screenshot backgrounds; the schematic must be editable SVG.

## Evidence on Hand
51 existing automated tests; configured local ngspice and 2N3904 model. Reference screenshot in the original feature worktree is read-only. No invented electrical results or validation passes.
