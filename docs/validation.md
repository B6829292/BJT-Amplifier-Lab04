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
