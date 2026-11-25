# Reference calculation

Worksheet example: VCC=12 V, R1=100 kΩ, R2=22 kΩ, RC=2.2 kΩ, RE=1 kΩ, β=100, VBE=0.70 V.

Using the worksheet equations independently: VTH = 12 × 22/122 = 2.163934 V; RTH = 100 × 22/122 = 18.032787 kΩ. Thus IB = (2.163934 − 0.7)/(18.032787 kΩ + 101 kΩ) = 0.0122986 mA. IC = 1.229858 mA, IE = 1.242157 mA, VE = 1.242157 V, VB = 1.942157 V, VC = 9.294312 V, VCE = 8.052155 V. These rounded values are used as independent test expectations.

## Lab 03 browser acceptance A1–A5

วันที่ตรวจ 17 พฤศจิกายน 2026; วิธีตรวจทุกกรณี: **Playwright MCP** เปิด `http://127.0.0.1:5000/` เลือกโหมด กรอกฟอร์ม กด Calculate และอ่าน snapshot หลังแต่ละกรณี โดยใช้เกณฑ์ผลต่าง IC ≤ 0.01 mA และ VCE ≤ 0.02 V เทียบกับค่าอ้างอิงก่อนปัดเศษ อินพุตร่วม: VCC = 12 V, RC = 2.2 kΩ, β = 100, VBE = 0.70 V

| กรณี | โหมดและอินพุตเพิ่มเติม | ค่าอ้างอิง IC / VCE | ผลที่เห็นจริง IC / VCE หรือข้อความ | วิธี | สถานะ |
|---|---|---|---|---|---|
| A1 | Divider; R1 = 100 kΩ, R2 = 22 kΩ, RE = 1 kΩ | 1.229858 mA / 8.052155 V | 1.2299 mA / 8.0522 V | Playwright MCP | PASS |
| A2 | Fixed; RB = 1 MΩ | 1.1300 mA / 9.5140 V | 1.1300 mA / 9.5140 V | Playwright MCP | PASS |
| A3 | Emitter; RB = 1 MΩ, RE = 1 kΩ | 1.026340 mA / 8.705450 V | 1.0263 mA / 8.7054 V | Playwright MCP | PASS |
| A4 | Emitter; RB = 1 MΩ, RE = 2 kΩ | 0.940100 mA / 8.032779 V | 0.9401 mA / 8.0328 V | Playwright MCP | PASS |
| A5 | Fixed; RB = 0 MΩ | แจ้งแก้ RB ไม่ล่ม ไม่แสดงผลเก่า | “Enter a value greater than zero.”; ตารางผลเก่าถูกซ่อน | Playwright MCP | PASS |

A1 ตรง baseline Lab 02 ก่อนแก้ที่ผู้ใช้บันทึก: IC = 1.2299 mA, VCE = 8.0522 V. ภาพหลักฐาน A1: [lab03-a1-playwright.png](lab03-a1-playwright.png) จับผ่าน Playwright MCP หลังกรอกฟอร์มและกด Calculate โดยแสดง Lab 03 Goal.

## การตรวจซ้ำด้วยตนเองโดยนักศึกษา: A2

นักศึกษารายงานว่าได้ตรวจ Fixed Bias ด้วยตนเองในเบราว์เซอร์ โดยกรอก VCC = 12 V, RB = 1 MΩ, RC = 2.2 kΩ, β = 100 และ VBE = 0.70 V ผลที่สังเกตคือ IC = 1.1300 mA, VCE = 9.5140 V, VB = 0.7000 V และ VE = 0.0000 V; ผลการตรวจด้วยตนเอง: **PASS**. รายการนี้เป็นรายงานของนักศึกษา แยกจากผล Playwright MCP ในตารางข้างต้น.

**ข้อจำกัด A5:** JavaScript ของเบราว์เซอร์ป้องกันการส่งฟอร์ม จึงไม่ใช่หลักฐานว่าคำขอนั้นถึง Flask. ระหว่าง Stage 1 มีการตรวจ Flask test client แบบชั่วคราวด้วย Fixed `rb=0` และพบข้อความ `greater than zero` โดยไม่มีผลเดิม; ไม่ใช่ browser test และไม่ได้บันทึกเป็นไฟล์ test ใหม่. ชุดเดิม `tests/test_web.py::WebTests.test_invalid_inputs` ตรวจ Flask ฝั่งเซิร์ฟเวอร์สำหรับข้อมูล Divider ที่ผิด รวมถึง `re=0` แต่ **ไม่ได้ทดสอบ Fixed `rb=0` โดยตรง**.

## ตัวอย่างคำนวณมืออิสระ: A2 Fixed Bias

ใช้สมการในใบงาน ไม่อ้างค่าจากโปรแกรม: VCC = 12 V, VBE = 0.70 V, RB = 1 MΩ = 1,000,000 Ω, RC = 2.2 kΩ = 2,200 Ω, β = 100 และ VE = 0 V

- IB = (VCC − VBE) / RB = (12 − 0.70) V / 1,000,000 Ω = 0.0000113 A = 0.0113 mA
- IC = βIB = 100 × 0.0113 mA = **1.1300 mA**
- VC = VCC − IC RC = 12 V − (0.00113 A × 2,200 Ω) = 9.5140 V
- VCE = VC − VE = 9.5140 V − 0 V = **9.5140 V**

## เส้นทางข้อมูล RE: A3 → A4

ในฟอร์ม Emitter ผู้ใช้กรอก `re` เป็น 1 แล้วเปลี่ยนเป็น 2 โดยคงหน่วย kΩ และค่าอื่นเดิม `app.py` ตรวจเฉพาะฟิลด์ของโหมด Emitter แล้วคูณตัวประกอบหน่วย 1,000 เพื่อส่ง RE = 1,000 Ω หรือ 2,000 Ω ให้ `calculate_emitter_bias` ใน `dc_bias.py`. ฟังก์ชันใช้ IB = (VCC − VBE) / [RB + (β + 1)RE] แล้วคำนวณ IC = βIB และ VCE = VCC − IC RC − IE RE. การเพิ่ม RE ทำให้ตัวหารเพิ่มขึ้นและ IC ลดลง; snapshot แสดง 1.0263 → 0.9401 mA และ VCE 8.7054 → 8.0328 V ตามลำดับ.

## การใช้ AI และสิ่งที่นักศึกษาต้องตรวจเอง

AI ช่วยเพิ่มฟังก์ชัน Fixed และ Emitter ใน `dc_bias.py`, การเลือกโหมดและแปลงหน่วยใน `app.py`, ฟอร์มและภาพวงจรใน `templates/index.html`, และใช้ Playwright MCP ตรวจ A1–A5 ตามตารางข้างต้น โดยคงสมการ Divider เดิมไว้

MCP เป็นช่องทางให้ OpenCode เรียกเครื่องมือของ Playwright MCP เพื่อควบคุมเบราว์เซอร์และอ่านผลหน้าเว็บ ส่วนเบราว์เซอร์ส่งข้อมูลฟอร์มไปยัง Flask ผ่าน HTTP และ Flask เรียกฟังก์ชัน Python เพื่อคำนวณผล

นักศึกษาได้ตรวจซ้ำ A2 ด้วยตนเองในเบราว์เซอร์และรายงานค่าตามข้างต้น ก่อนส่งงานควรตรวจสมการ เครื่องหมายและหน่วย ทวนการเลือกฟังก์ชันและการแปลงหน่วยในโค้ด รวมถึงตรวจตารางและหลักฐานอีกครั้ง

GitHub Lab 03: <https://github.com/B6829292/BJT-DC-Bias-Lab03>

Lab 03 submission commit: `2f26decb29ffad3be4bf9d1233532d2a6cd0d850` (commit ของงานที่ส่ง ไม่จำเป็นต้องเป็น commit ล่าสุด)

## Numeric range

Python floating-point arithmetic has limited precision. Nonzero subnormal inputs and intermediate results are rejected because they have reduced precision; nonzero products or quotients that round to zero are also rejected. The threshold is the platform's smallest positive normal float (`sys.float_info.min`), not a circuit-design limit. Text values that round to zero and underflow during unit conversion are rejected before calculation. Exact zero remains permitted for VBE and valid zero-valued intermediate results. Very large inputs can also be rejected when arithmetic overflows.

---

# Historical Phase 6 — Official Lab 04 acceptance testing

**Date:** 23 November 2026. **Method:** real Playwright MCP browser interaction with local Flask and real ngspice; no production-code changes during this phase. The earlier Lab 03 record above is preserved as historical evidence, not presented as a new test run.

**Historical result (superseded for final submission by Phase 7 below):** B1–B8 **PASS at both 1280px and 390px** (16 executions), within the fixture/model qualifications below. Full regression: **48 passed, 0 failed, 0 skipped**. No uncaught page errors in the acceptance or accessibility runs. These results do **not** constitute instructor-model certification or a complete WCAG audit.

## Authority, environment and reproducibility

- Functional authority: the instructor-provided Lab 04 handout, section 09, B1–B8 (source lines 535–568). It is distributed separately and is not republished with this repository. Its inputs are fixtures, not predetermined simulation outputs.
- Visual direction: the user-provided Final Project reference image, not redistributed here. Its bypass topology, gains and illustrative values are not acceptance targets for the unbypassed Lab 04 circuit.
- Existing worktree/branch: `feature/lab04-spice-engine`, Windows, Python 3.12. Browser: Chromium **157.0.8103.79** through Playwright MCP.
- Solver: **ngspice 47**, KLU build; executable configured through `NGSPICE_PATH`.
- Model: configured **2N3904, documented Virginia Tech OPEL fallback, not instructor-verified**; model SHA-256 `ab02e9b61ef31c8833b0abec5c36945ec46f4ee54778a8a72507eea9d2dec6ed`. The model itself and its local path are not included in the public evidence. Redistribution permission remains unresolved.
- Working app: `http://127.0.0.1:5157`; separate missing-model instance: port **5158**, `BJT_MODEL_PATH=C:\missing-lab04-model.lib`. Both verification servers were temporary.
- Viewports: **1280 × 900** and **390 × 844** for B1–B8; accessibility scans used widths 1280/390 with height 900. Phone verification is desktop Chromium viewport emulation, not a physical phone/touch test.

SPICE fixture: VCC **12 V**, R1 **100 kΩ**, R2 **22 kΩ**, RC **2.2 kΩ**, RE **1 kΩ**, RL **10 kΩ**, Cin/Cout **10 µF** each. Source **10 mV peak, 1000 Hz**. Unbypassed emitter. Vin is source-side of Cin, node `in`; Vout is load-side of Cout, node `out`; voltages relative to ground. AC transfer is **V(out)/V(in)**, with AC source magnitude 1 V.

### Historical evidence note

The Phase 6 browser captures and raw evidence were generated in the local verification environment and are not included in the public submission bundle. Their historical observations are retained in this section; the curated, portable final evidence is in the Phase 7 section below. Reproduction sources remain in `tests/phase6_reference.py`, `tests/phase6_browser_check.js`, and `tests/phase6_accessibility_check.js`.

To reproduce independent runs and regression in PowerShell (with the local model available):

```powershell
$env:BJT_MODEL_PATH='C:\path\to\compatible-2N3904.lib'
$env:NGSPICE_PATH='C:\path\to\ngspice.exe'
python -B tests/phase6_reference.py
python -B -m unittest discover -s tests -v
```

The reference generator can create a temporary browser runner with reference data for Playwright MCP. That generated runner and its raw output are local test artifacts and are not part of the published evidence. The checks submit actual forms, read actual responses and DOM/SVG output, and do not inject results into the app.

## Official B1–B8 matrix

Every row was executed in Playwright MCP at **both widths**. Fresh snapshots were read around navigation/actions, followed by form submission, result reads, independent comparisons and screenshots. Detailed raw snapshots are not included in the public package; the historical results below are superseded by the final Phase 7 matrix.

| Case | Exact input/action | Expected/reference | Observed | 1280px | 390px | Evidence |
|---|---|---|---|---|---|---|
| **B1 Regression** | Open Fixed, Emitter and Divider; explicitly fill Lab 03 values: VCC 12 V, RC 2.2 kΩ, β 100, VBE 0.7 V; RB 1000 kΩ for Fixed/Emitter, RE 1 kΩ where applicable; Divider R1 100/R2 22 kΩ | Original analytical IC/VCE from independently evaluated worksheet equations | Fixed **1.1300 mA / 9.5140 V**; Emitter **1.0263 mA / 8.7054 V**; Divider **1.2299 mA / 8.0522 V**. Mode switching and active fields correct | **PASS** | **PASS** | Browser `B1`; analytical screenshots below |
| **B2 DC SPICE** | CE reference fixture; Run DC; open provenance disclosure | VB/VE/VC/VCE/IC agree with direct ngspice, model and execution status visible | **2.0037 V / 1.3329 V / 9.0872 V / 7.7543 V / 1.3240 mA**; current ngspice-completed state; fallback caveat and real log present | **PASS** | **PASS** | Browser `B2`, direct `dc/ngspice.log`, dashboard screenshots |
| **B3 Change RE** | Change **only RE from 1 to 2 kΩ**; rerun DC | Old run becomes stale, new operating point follows direct RE=2 kΩ simulation | Before IC **1.3240 mA**, VCE **7.7543 V**; after IC **0.7053 mA**, VCE **9.0315 V**. Raw browser VC **10.45039 V**, VCE **9.031532 V** | **PASS** | **PASS** | Browser `B3` includes before/after netlists/logs; direct `dc_re2/` |
| **B4 AC** | Restore RE=1 kΩ and rerun DC; Run AC | Genuine Bode magnitude/phase with Hz/dB/degrees and defined transfer | **321 samples, 1 Hz–100 MHz**; at **1 kHz**, gain **4.889590822 dB**, wrapped phase **−179.871168441°**. Both plots and units visible; all samples/vertices independently compared | **PASS** | **PASS** | Browser `B4`; direct `ac/samples.txt`, dashboard screenshots |
| **B5 Transient** | Run transient at **10 mV peak, 1 kHz** | Real Vin/Vout versus time, correct units and CE inversion | **508 samples, 0–5 ms**; Vin **−9.99845249 to +9.99845249 mV**; Vout **−17.5191315 to +17.5917128 mV**. At **4.2428 ms**, Vin **+9.98976894 mV**, Vout **−17.5063479 mV** | **PASS** | **PASS** | Browser `B5`; direct `tran/samples.txt`; baseline screenshots |
| **B6 Change Source** | Change amplitude **10→20 mV peak** and frequency **1000→2000 Hz**, rerun transient | Source changes stale only transient; new waveform agrees with direct changed-source run | DC/AC stay current; transient becomes stale then current. Duration **2.5 ms**, Vin peak **19.996905 mV**, Vout **−35.077419 to +35.1436775 mV**. All changed samples/vertices independently compared | **PASS** | **PASS** | Browser `B6`; direct `tran_changed/`; changed-source screenshots |
| **B7 Invalid / Fail** | Set RE=0 and submit transient; restore RE and run; submit AC against genuine missing-model instance | Explicit error, no hung request or false success, affected old graph removed | “**RE: enter a finite positive number.**”; missing-model: “**2N3904 model not found; set BJT_MODEL_PATH.**”. Failed analysis graph removed; other retained runs remain labeled independently; subsequent recovery restores all plots | **PASS** | **PASS** | Browser `B7`; invalid/missing-model screenshots |
| **B8 UI** | Both viewport sizes; switch all bias/analysis modes, inspect units/buttons/graphs | Essential content reachable without page clipping; readable plots/units and functioning controls | No horizontal **page** overflow or out-of-viewport cards/controls. Mobile plots intentionally scroll inside focusable regions; keyboard scroll/exit verified. Three actual retained graphs visible; small text is a readability caveat, not a claim of ideal typography | **PASS** | **PASS** | Browser `B8`, accessibility evidence, both dashboard screenshots |

**B7 method detail:** Playwright temporarily forwarded the AC POST to the separate Flask server with the nonexistent model path, fulfilling the browser request with that server's **unchanged real error response**. This tests a model disappearing between successful retained runs without changing production configuration or fabricating error payloads. The route interception was removed before recovery. Invalid RE went to the normal working server.

## Independent engineering comparisons

`tests/phase6_reference.py` imports **neither `app.py` nor `spice_engine.py`**. It constructs its own equivalent CE netlists, directly invokes ngspice `-b`, retains stdout/stderr and raw `wrdata`, and parses the output independently. It uses `numdgt=15` for reference output precision; the app retains its existing default print precision. This independently checks the Flask/adapter/parser/rendering path, **not the correctness of ngspice or the external model itself**.

### DC values (baseline)

| Quantity | Direct ngspice reference | Browser payload | Display | Unit |
|---|---:|---:|---:|---|
| VB | 2.003674496296638 | 2.003674 | 2.0037 | V |
| VE | 1.332879743773820 | 1.332880 | 1.3329 | V |
| VC | 9.087216255157696 | 9.087216 | 9.0872 | V |
| VCE = VC − VE | 7.754336511383876 | 7.754336 | 7.7543 | V |
| IC | 0.001324034769551 | 0.001324035 | 1.3240 | payload A; display mA |

At RE=2 kΩ, direct reference VB **2.072695258789149 V**, VE **1.418858148196376 V**, VC **10.45038719242099 V**, VCE **9.031529044224614 V**, IC **0.000705299375543 A**. The largest DC voltage payload difference across both fixtures is **2.9558 µV**; the largest IC difference is **2.3045 × 10⁻¹⁰ A**.

Lab 03 Divider IC **1.229858 mA** is not expected to equal nonlinear SPICE IC **1.324035 mA**: the analytical path assumes β=100 and VBE=0.7 V; SPICE solves the configured device model. No solver mathematics was changed to match the illustration.

### AC/transient array and rendering checks

Gain is independently computed as `20 log10(|Vout/Vin|)` from raw complex output/input columns; phase uses the complex argument in degrees. Direct **1 kHz** reference: **4.889590840911379 dB**, **−179.8711684410731°**.

| Comparison, all samples at both widths | Maximum absolute difference | Acceptance tolerance | Result |
|---|---:|---:|---|
| DC voltages, both fixtures | 2.9558 × 10⁻⁶ V | 1 × 10⁻⁵ V | PASS |
| DC collector current | 2.3045 × 10⁻¹⁰ A | 1 × 10⁻⁹ A | PASS |
| AC frequency array | 0.049689 Hz (at high sweep frequencies) | 0.1 Hz | PASS |
| AC gain array | 3.0102 × 10⁻⁸ dB | 1 × 10⁻⁵ dB | PASS |
| AC wrapped phase array | 1.5500 × 10⁻⁷ ° | 1 × 10⁻⁵ ° | PASS |
| Transient time, both fixtures | 3.4695 × 10⁻¹⁷ s | 1 × 10⁻¹⁰ s | PASS |
| Transient Vin/Vout, both fixtures | 4.9964 × 10⁻¹¹ V | 1 × 10⁻⁸ V | PASS |
| AC SVG vertices, 642 total | ≤0.005001 SVG coordinate units | 0.02 units | PASS |
| Baseline transient SVG vertices, 1016 total | ≤0.004998 units | 0.02 units | PASS |
| Changed transient SVG vertices, 1016 total | ≤0.004999 units | 0.02 units | PASS |

SVG comparisons independently transform the reference samples into plot coordinates (including logarithmic frequency and padded Y limits), read the actual rendered polyline points, and compare them all. This is stronger than a screenshot-only check. Units here are SVG viewBox coordinates, not necessarily physical screen pixels after responsive scaling. Phase wrapping remains split at ±180°; no underlying samples are altered.

**Test-development finding:** the first strict comparison used a **2 µV** DC tolerance and stopped at RE=2 kΩ VC (difference **2.807579 µV**). The captured browser log prints `1.045039e+01` while the higher-precision direct run gives `10.45038719242099`. The final **10 µV** tolerance accounts for the app's existing printed precision and VCE subtraction. This was a test-tolerance correction, not an application defect or numerical code change. Earlier incomplete runs are not counted as passes; the final complete evidence has 16 passed cases.

## Retention, staleness and validation

- DC, AC and transient remain visible simultaneously after three real runs; all have independent current states and expandable recorded inputs/time/netlist/log.
- Source changes leave DC/AC current and mark transient stale before submission.
- Editing RE marks every retained run stale. Rerunning one analysis does not silently refresh others.
- Invalid RE and missing model clear only the failed analysis output. Other analyses retain their own explicit states; error status is not hidden by old graphs.
- Successful recovery restores the failed graph through a new real engine run.
- Runs remain document-local and clear on reload/navigation. This is deliberate, not save/export functionality.
- Server-side validation, unknown analysis, missing executable, timeout, malformed/empty outputs and unit/numeric boundaries additionally have automated regression coverage; that is not equivalent to live browser execution of each failure mode.

## Accessibility and Impeccable audit

| Check | Method / observed | Status |
|---|---|---|
| Keyboard navigation | 45 successive Tab presses per analytical/SPICE route at each width reached links, inputs, selects and buttons. First Tab reached Skip to workspace, 3px visible outline | PASS for tested traversal |
| Keyboard activation | Real DC/AC/transient runs activated using focused submit button + Space | PASS |
| Focus visibility | Skip link and chart region computed outline 3px; CSS focus indication present on inputs/selects/buttons/links | PASS for sampled elements |
| Graph navigation | Mobile AC region scrolled with ArrowRight (`scrollLeft` advanced), Tab exited region; desktop region needed no horizontal scroll | PASS |
| Labels and units | No visible enabled input/select without a label; no broken `aria-describedby` targets in 14 scans; units associated with SPICE controls | PASS |
| Contrast | Computed foreground/fill against resolved solid backgrounds: no below-4.5:1 normal-text or below-3:1 large-text findings in tested ready/completed/stale/failed SPICE states and ready analytical modes at both widths | PASS for sampled states; not pixel certification |
| Essential clipping | No page overflow or out-of-viewport card/form controls across scanned states | PASS |
| Graph semantics | Chart SVG has accessible name and description with sample count/ranges; region is named/focusable; visual legends/units present | PASS for inspected structure |
| Screen-reader use | No physical assistive-technology session | **NOT RUN** |
| Physical phone/touch / Safari / Firefox | Chromium emulated widths only | **NOT RUN** |
| Full WCAG certification / exhaustive zoom and all states | No axe/Lighthouse install; computed scan and manual inspection only | **NOT RUN** |

**Readability limitation:** small computed rendered text was observed (minimum about **9.10px** on the completed desktop view, **7.43px** on mobile, including scaled schematic annotations). Plot regions can be horizontally scrolled on mobile and are keyboard accessible, but dense labels/long pages remain a **P2 usability finding**, not an ideal readability result. No universal font-size conformance claim is made. Mobile input heights are 40px, above the 24px WCAG 2.2 minimum but below the preferred 44px target.

Impeccable source detector was rerun over `templates`: **6 findings**, exit **1** (2 flat-type warnings and 4 palette advisories). It cannot resolve Jinja stylesheet links or standalone partial context. Its reported black/16px defaults do not represent the live page; live heading sizes and computed contrast were inspected instead. This limitation prevents calling the source scan clean.

Provisional Impeccable technical rubric: Accessibility **3/4**, Performance **3/4** (source inspection, no profiling), Theming **0/4** (literal colors, no runtime token/theme system), Responsive **3/4**, Integrity **3/4** = **12/20**. This is an engineering audit score, not the official B1–B8 score. Deferred P2 findings: small text/mobile density and literal-color/CSS-override maintenance debt. Recommended follow-up, if authorized: `/impeccable adapt`, `/impeccable document`, then `/impeccable polish`.

## Updated screenshots and reference comparison

The Phase 6 captures referenced in the original local report were stored in the ignored Playwright output folder and are not included in the public bundle. Do not treat those local-only paths as published evidence. Current actual dashboard screenshots are linked in the Phase 7 section below.

Actual screenshots were inspected against the Final Project reference. The current app matches its narrow left rail, circuit-first center, right configuration panel, restrained teal/blue-gray palette and simultaneous lower result panels. Differences remain:

1. The page is taller; AC magnitude and wrapped phase are separate rather than a compact combined dual-axis plot.
2. Signal controls are ordinary numeric inputs on the right, not left-rail knobs. No animated circuit waveform/current overlays or overlay toggles.
3. Baseline topology correctly omits emitter bypass; no save/export/reset/validate toolbar or fabricated “all tests passed” circuit badge.
4. Analytical modes use their own route in the shared shell; they are not SPICE simulations of all bias types.
5. Reference values/gains are illustrative and differ from actual fallback-model output. Matching them numerically would violate the lab's correctness requirement.
6. Mobile requires vertical page scrolling and horizontal **in-chart** scrolling. Typography and schematic details are denser than ideal.

## Unperformed or qualified acceptance work

| Item | Status | Reason |
|---|---|---|
| Rerun B2–B6 with instructor-verified starter model | **NOT RUN** | No instructor-verified model available; fallback results cannot certify its device characteristics |
| Manual student/instructor rerun of Phase 6 | **NOT RUN** | No new human verification reported; earlier Lab 03 human report remains separate above |
| Live browser missing-executable / forced timeout / malformed solver file | **NOT RUN** | Invalid RE and real missing-model browser failures tested; remaining paths covered by automated tests, not live fault injection |
| −3 dB cutoff extraction | **NOT RUN** | No cutoff result claimed; outside explicit B1–B8 acceptance actions |
| Publication / repository submission / commit | **NOT RUN** | User withheld approval; no install, commit, push or merge |

## Historical Phase 6 regression and scope

The Phase 6 full command was `python -B -m unittest discover -s tests -v` with the local model configured. **48 tests passed**; this included actual DC, AC and transient ngspice tests, analytical/unit/validation regressions and Node freshness/wrapped-phase checks. The historical output and raw captures are not in the public evidence bundle. Browser scenarios were separate from that count: **16 official case executions**, plus accessibility checks.

Phase 6 is retained here as historical validation context. Its local-only review/evidence archives are not published. Existing application work was preserved; no production files changed during Phase 6.

**Stop point:** Phase 6 testing/reporting complete for review with the explicit NOT RUN qualifications above. No next phase or Git integration started.

---

## Historical Phase 6.1 stabilization addendum — 23 November 2026

Focused review confirmed and fixed one client-side freshness defect: JavaScript radix notation such as R1=`0x64` could leave a result labeled current although the server rejects it; equivalent server-accepted separator notation such as `1_00` could be falsely stale. Decimal/scientific syntax checking now precedes freshness comparison. No calculations, solver behavior or UI design changed.

The reproducing Node assertion failed before the fix and passed afterward. Targeted real-ngspice browser checks passed at 1280px and 390px, including stale states, validation failure isolation and equivalent input notation. Complete regression: **49 passed, no failures/skips**. The Phase 6 B1–B8 results above remain historical and were not replaced or claimed as a newly rerun 16-case sweep.

The Phase 6.1 review and regression artifact remain local development records and are not bundled. No redesign, installs, commits, pushes or merges were performed in that phase.

## Historical Phase 6.2 visual refinement addendum — 24 November 2026

Approved compact dashboard and combined dual-axis Bode chart implemented without changing solver/analytical algorithms. **50 regression tests passed, no skips**, retaining all 49 previous test intentions and adding the source-control/form-association regression. Presentation assertions now reflect one AC chart rather than two.

Real browser checks passed at **1085×613, 1280×900 and 390×844**, including all analytical modes, baseline/changed DC/AC/transient data, sidebar input propagation, retained/stale states, invalid inputs and real missing-model response/recovery. New independent ngspice data and all rendered vertices were compared. The Phase 6.1 numeric-freshness browser regression also passed. No historical Phase 6 evidence was overwritten.

Reference-width document reduced from 1310px to **784px**; no page overflow at requested widths. **21 accessibility state checks** recorded no sampled contrast/label/description-target failures. Not a full WCAG/physical-device certification. Final Impeccable design score **28/40**, audit **15/20**; Jinja stylesheet detector limitations and dense small text remain. Instructor-verified model still unavailable/NOT RUN.

The Phase 6.2 review, detailed browser artifacts and before/after captures remain local development records and are not bundled. No install, commit, push or merge was performed in that phase. The final Phase 7 evidence below is the submission record.

---

## Final Phase 7 — verification and documentation — 24 November 2026

This is a fresh rerun against the approved final dashboard. Phase 6 and 6.2 records above are preserved as historical evidence; Phase 7 outputs are in [`evidence/phase7/`](evidence/phase7/). No solver or analytical formula changes were made during this verification.

### Environment and commands

- Windows worktree; Python 3.12; Playwright MCP Chromium **157.0.8103.79**.
- ngspice **47**, KLU build; executable configured through `NGSPICE_PATH`.
- Virginia Tech OPEL 2N3904 fallback model, SHA-256 `ab02e9b61ef31c8833b0abec5c36945ec46f4ee54778a8a72507eea9d2dec6ed`. It remains a **fallback, not instructor-verified**. Neither the model nor its local filesystem path is included in the published evidence; redistribution permission remains unresolved.
- Regression command: `python -B -m unittest discover -s tests -v`, with `BJT_MODEL_PATH` configured to the local fallback and `NGSPICE_PATH` at the executable above. **51 tests passed, 0 failed, 0 skipped**. Output: [`regression.txt`](evidence/phase7/regression.txt).
- Fresh direct-ngspice reference generator: `BJT_ACCEPTANCE_EVIDENCE=phase7`, `BJT_ACCEPTANCE_BROWSER=tests/phase62_browser_check.js`, then `python -B tests/phase6_reference.py`. It imports neither app nor adapter. The public evidence contains a portable numerical summary, regression output and screenshots; generated netlists, raw outputs, and model-specific local paths are intentionally excluded.
- Temporary Flask instances: working model on port 5157; intentionally missing model on port 5158. Both were local verification servers only.
- Requested viewport sizes: **1085×613, 1280×900, 390×844**. Mobile is desktop Chromium viewport emulation, not a physical phone or touch test.

### Official B1–B8 results

The browser harness executed all eight behavior groups at each requested viewport, with actual form submissions and solver runs. Its 27 simulation POSTs included repeated DC/AC/transient runs, changed RE/source, invalid input, missing-model failure and recovery. All three viewports reported no uncaught page errors, no page-level horizontal overflow, and current retained DC/AC/transient results after successful recovery.

| Case | Action / check | Observed result | 1085×613 | 1280×900 | 390×844 |
|---|---|---|---|---|---|
| **B1 Regression** | Open Fixed, Emitter and Divider analytical modes with the Lab 03 reference values. | IC: Fixed **1.1300 mA**, Emitter **1.0263 mA**, Divider **1.2299 mA**; mode navigation and values remained correct. | PASS | PASS | PASS |
| **B2 DC** | Submit reference CE operating point and inspect run status/data. | VB **2.003674 V**, VE **1.332880 V**, VC **9.087216 V**, VCE **7.754337 V**, IC **1.324035 mA**; real ngspice status/provenance shown. | PASS | PASS | PASS |
| **B3 Change RE** | Change only RE from 1 to 2 kΩ and rerun DC. | Prior results stale on edit; direct result agrees: VC **10.450387 V**, VCE **9.031529 V**, IC **0.705299 mA**. | PASS | PASS | PASS |
| **B4 AC** | Run logarithmic AC response and check values/rendered plot samples. | **321** samples from 1 Hz to 100 MHz; at 1 kHz gain **4.889591 dB**, phase **−179.871168°**; actual rendered vertices preserve samples and phase discontinuity. | PASS | PASS | PASS |
| **B5 Transient** | Run 10 mV peak, 1 kHz transient. | **508** samples over 0–5 ms; actual Vin/Vout arrays and chart vertices agree with direct reference. | PASS | PASS | PASS |
| **B6 Change source** | Change amplitude 10→20 mV peak and frequency 1000→2000 Hz. | Only transient becomes stale from source edit; new duration **2.5 ms** and arrays agree with independent direct run. | PASS | PASS | PASS |
| **B7 Invalid / failure / recovery** | Submit RE=0; submit AC against a genuinely missing-model instance; rerun successfully. | RE error: `RE: enter a finite positive number.` Missing model: `2N3904 model not found; set BJT_MODEL_PATH.` Failed result graph is removed; unrelated results remain; successful new run recovers. | PASS | PASS | PASS |
| **B8 UI** | Inspect content reachability, units, charts, controls and viewport overflow. | No page-level horizontal overflow; 390px plots remain within scrollable chart regions. Desktop result dashboard begins at y≈433px; mobile remains vertically scrollable. | PASS | PASS | PASS |

Screenshots are real populated dashboard captures from the same working app and model, not generated images: [1085×613](evidence/phase7/dashboard-1085.png), [1280×900](evidence/phase7/dashboard-1280.png), [390×844](evidence/phase7/dashboard-390.png). These represent the successful retained-results state; invalid and missing-model states are confirmed by browser assertions and are not depicted in these three final dashboard captures. The portable comparison summary is [`summary.json`](evidence/phase7/summary.json); full raw solver artifacts are deliberately not published.

### Independent numerical comparison

The fresh direct references use independent equivalent netlists, invoke ngspice directly in batch mode, and retain raw `wrdata` output. The browser harness compares actual HTTP response arrays and sampled SVG vertices against those direct references at all three viewport sizes.

| Quantity | Maximum absolute difference | Tolerance | Result |
|---|---:|---:|---|
| Baseline DC voltages | 0.512 µV | 10 µV | PASS |
| Baseline DC IC | 2.305×10⁻¹⁰ A | 1×10⁻⁹ A | PASS |
| AC frequency | 0.049689 Hz | 0.1 Hz | PASS |
| AC gain | 3.011×10⁻⁸ dB | 1×10⁻⁵ dB | PASS |
| AC wrapped phase | 1.550×10⁻⁷ degrees | 1×10⁻⁵ degrees | PASS |
| Transient time | 3.470×10⁻¹⁷ s | 1×10⁻¹⁰ s | PASS |
| Transient Vin/Vout | 4.997×10⁻¹¹ V | 1×10⁻⁸ V | PASS |
| AC rendered SVG vertices | max 0.005001 viewBox units | 0.02 units | PASS |
| Transient rendered SVG vertices | max 0.004992 viewBox units | 0.02 units | PASS |

RE=2 kΩ, changed-source arrays and their plots were also independently checked by assertions at all viewports. The fallback model and ngspice themselves are the reference environment; this verifies the app/adapter/parser/rendering path against that environment, not the external model's correctness or instructor acceptance.

### State, security, dependencies and artifact review

- Real retained DC/AC/transient results, per-analysis stale states, invalid-input clearing, true missing-model error isolation and recovery were exercised by the browser harness. Automated tests additionally cover missing executable, timeout, malformed/empty output, unknown analysis and numerical/input boundaries; those specific fault paths were not separately forced in the live browser.
- Source inspection found no checked-in credentials or use of shell-string process invocation in the inspected application path. The solver invokes an executable with an argument list, validates finite/bounded numeric values, uses a temporary directory and cleans it via `TemporaryDirectory`; the configured model is copied to that temporary directory. The local Flask development server has no authentication and is not suitable for public exposure. Solver logs are retained in result provenance and may include environment-specific diagnostics; keep the app local and do not expose sensitive logs.
- Runtime dependency declaration is only Flask (`Flask>=3.0,<4.0`); Playwright/Node are verification environment tools, not declared runtime dependencies. No lockfile or license inventory was found. No project-level license was established in this review. ngspice is an external tool; model origin is identified as Virginia Tech OPEL fallback, but redistribution permission was not established. Do not bundle/redistribute it until terms are confirmed.
- Temporary solver artifacts are created under a unique temporary directory and automatically cleaned. `.gitignore` covers `.venv`, Python bytecode, `.env*` and `.playwright-mcp`; only the three final screenshots, regression output, and path-free summary are retained in the curated Phase 7 folder. No model file was added to the repository.
- `git diff --check` reported no whitespace errors (Git emitted only CRLF-normalization warnings). The worktree contained extensive uncommitted/untracked user work; it was preserved. No commit, push, merge, install or application-code cleanup was performed.
- Impeccable's mechanical detector was rerun over changed files. It exited nonzero with extensive design-token advisories (literal colors, type sizes and radii) in the existing CSS, plus flat-type warnings and false/raw-Jinja findings in templates. The dashboard was not edited in Phase 7; this source detector result is recorded, not treated as a clean scan or as proof of a rendered defect. Actual rendered captures were inspected at the requested viewport sizes.

### Known limitations and submission status

- Instructor-verified model and its numeric rerun: **NOT RUN**; no verified model was available. Fallback data is explicitly qualified in the dashboard and this report.
- Physical phone/touch, Firefox/Safari, assistive technology, exhaustive zoom, complete WCAG certification: **NOT RUN**. No full accessibility conformance claim is made.
- Model redistribution permission and project license selection: **UNRESOLVED**; obtain clarification before redistributing model content or making licensing claims.
- Final Project optional features (bypass, animation, save/export, cutoff/reference validation): not implemented and not claimed.
- Repository remote confirmed: <https://github.com/B6829292/BJT-Amplifier-Lab04>. Final commit SHA: **not assigned** because no commit was made. After the user approves and creates their commit, run `git rev-parse HEAD` to obtain its full SHA.

**Submission checklist:** obtain/verify the instructor's model and terms; review the complete Git status/diff including untracked files; keep only authorized assets; run tests using the intended model; verify evidence links and README setup; commit only after approval; then record the remote URL and SHA returned by `git rev-parse HEAD`. No repository integration action is authorized or performed in this phase.

**Final resume verification:** the complete suite was rerun: **51 passed, 0 failed, 0 skipped**. The Playwright MCP B1–B8 harness was rerun at all three viewports: **27 simulation submissions, zero uncaught page errors**, all assertions passed. Direct ngspice DC/AC/transient references were freshly generated; only the portable summary is published. The protected `spice_engine.py` SHA-256 remains `7A72907E0611F80E494C8C03F614B66A54705B9AA94B33669271FF90EB03931C`.

## Post-merge submission record — 24 November 2026

PR [#1](https://github.com/B6829292/BJT-Amplifier-Lab04/pull/1) was merged into `main`. The refreshed `origin/main` was verified at merge commit `ee2f3a4b7a1c68aebee727e1b0159d2ee73fb92f`, which includes feature commit `a7c63e10e2f4ceac406b56876dc210dbae2faa3c`. The historical Phase 6, 6.1, 6.2 and Phase 7 verification results above are retained unchanged; earlier submission-status notes describe the state at the Phase 7 stop point and are superseded by this record.

The Virginia Tech OPEL 2N3904 remains a fallback model and **not instructor-verified**. No instructor verification is claimed, and model redistribution permission remains unresolved; the model file is not included.

## Lab04 reference-UI replication — 25 November 2026

The new high-fidelity UI revision is separate from the historical verification-only Phase 7 record above. It preserves Lab04 scope, the unbypassed CE netlist, existing Flask routes, device handling and analytical calculations. The source reference is design evidence, never a screenshot background. See the [implementation summary, component checklist, comparison method and remaining differences](reference-ui.md).

New live verification uses actual local ngspice and the configured fallback 2N3904. The complete automated suite, browser results and screenshots are in [reference-UI evidence](evidence/reference-ui/README.md). Desktop captures cover 1085×613, 1920×1080, 1440×900 and 1366×768. The mobile capture uses 390×844 Chromium mobile emulation; physical-device certification is not claimed.

The browser checks include real DC/AC/transient results, mouse/keyboard/emulated-touch rotary inputs, numeric synchronization, current/stale/pending/failure isolation, switches across redraw, animation reset, sampled SVG overlays, chart tooltips, real JSON downloads, no-JavaScript DC submission and canonical Reset following a native POST. Frontend converted-unit bounds are contract-tested against the unchanged engine. IE is derived from simulated VE/RE. The bias-region indicator is a junction/current consistency check, not instructor validation.

Final results: **58 Python tests passed, 0 failed, 0 skipped**, including the original 51. Playwright MCP passed **59 main interaction assertions** and **14 review-regression assertions**. The independent visual finish review returned **ship**, with only minor tab-position/header-lettering differences deferred; see the [review scope and findings](evidence/reference-ui/review.md). The detector's final 270 token-use advisories and Jinja-related hierarchy warning are recorded there, not reported as a clean source scan.

Reference benchmarks and instructor validation remain **NOT RUN**. No visual similarity percentage is claimed: the documented raw static-region RGB errors are not a perceptual score. The independent review findings and their reproducing checks are retained in the reference-UI report. No historical evidence files were overwritten. No commit, push or merge was performed.

## Shared lab UI and schematic refinement — 25 November 2026

The shared layout covers Lab03 Fixed, Emitter, and Voltage Divider Bias and the Lab04 ngspice simulator. The Lab04 workspace shows animated circuit overlays and supports local JSON downloads from Save Project and Export. The supplied README records the earlier Phase 7 workspace.

All 65 automated tests passed with the local ngspice configuration. Playwright checked navigation and calculation behavior, real DC/AC/transient data, overlay controls and reduced motion, and the final current arrows and Q-Point placement. [Shared UI verification](evidence/final-project-ui/README.md) · [Schematic verification](evidence/schematic-fidelity/README.md) · [Final current arrows and Q-Point comparison](evidence/schematic-fidelity/current-q-point-comparison.png)
