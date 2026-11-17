# Lab 03: BJT DC Bias Web App

## เกี่ยวกับโปรเจกต์

โปรเจกต์สำหรับรายวิชา **ENG29 2121 – Computer Programming for Electrical Engineers** ต่อยอด Flask จาก Lab 02 เพื่อคำนวณจุดทำงานกระแสตรงของทรานซิสเตอร์ NPN Common-Emitter แบบ Voltage Divider, Fixed Bias และ Emitter Bias แบบแหล่งจ่ายเดียว

พัฒนาด้วย Python, Flask, HTML, CSS และ JavaScript โดย Flask รับข้อมูลจากหน้าเว็บ เรียกฟังก์ชันคำนวณของ Python แล้วส่งผลกลับมาแสดงในเบราว์เซอร์

## ความสามารถ

- เลือกโหมดวงจร รับค่า VCC, RC, β, VBE และฟิลด์เฉพาะวงจร: Divider ใช้ R1, R2, RE; Fixed ใช้ RB; Emitter ใช้ RB, RE พร้อมตรวจข้อมูลและแสดงข้อความใต้ช่องที่ผิด
- เลือกหน่วยแรงดัน V หรือ mV และความต้านทาน Ω, kΩ หรือ MΩ; เมื่อเปลี่ยนหน่วย ตัวเลขจะปรับตามเพื่อคงค่าทางไฟฟ้าเดิม
- แสดงแผนภาพวงจร NPN และค่า VB, VE, VC, VCE, IB, IC และ IE พร้อมหน่วย
- แจ้งเตือนเมื่อผลอาจอยู่นอกสมมติฐาน Forward-Active และมี automated tests ตรวจสูตรและการทำงานของเว็บ

## ติดตั้งและใช้งาน

**สิ่งที่ต้องมี:** Python 3 และ Git คำสั่งต่อไปนี้รันใน PowerShell หรือ Terminal บนเครื่องของคุณ

### 1. เปิดโฟลเดอร์โปรเจกต์

```bash
cd BJT-DC-Bias-Lab03
```

### 2. สร้างและเปิดใช้ virtual environment

Virtual environment ช่วยแยกไลบรารีของโปรเจกต์ออกจาก Python ส่วนอื่นในเครื่อง

**Windows PowerShell:**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Linux / macOS:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. ติดตั้งไลบรารีและเริ่มเว็บ

เมื่อเปิดใช้ virtual environment แล้ว ให้รันจากโฟลเดอร์โปรเจกต์:

```bash
python -m pip install -r requirements.txt
python -m flask --app app run
```

เปิด <http://127.0.0.1:5000/> ในเบราว์เซอร์ เลือก **Bias mode** กรอกฟิลด์ที่แสดง เลือกหน่วย แล้วกด **Calculate DC Bias** เมื่อเปลี่ยนค่าหรือโหมดให้กดคำนวณใหม่ เมื่อต้องการหยุดเซิร์ฟเวอร์ให้กด `Ctrl+C` ใน Terminal หากพอร์ต 5000 ถูกใช้อยู่ ให้ใช้พอร์ตอื่น เช่น `python -m flask --app app run --port 5001` และเปิด URL ที่แสดง

> Flask development server ใช้สำหรับทดลองบนเครื่องของตนเอง ไม่เหมาะสำหรับให้บริการสาธารณะ

## หลักการคำนวณ DC Bias

โปรแกรมสมมติว่า β และ VBE คงที่ในย่าน Forward-Active ก่อนคำนวณ Flask แปลงแรงดันเป็น V และความต้านทานเป็น Ω แล้ว Python ส่งกระแสเป็น A ให้หน้าเว็บแปลงแสดงเป็น mA

**วงจรสมมูล Thevenin**

$$V_{TH}=\frac{V_{CC}R_2}{R_1+R_2}, \qquad R_{TH}=\frac{R_1R_2}{R_1+R_2}$$

**กระแสทรานซิสเตอร์**

Fixed: $I_B=(V_{CC}-V_{BE})/R_B$; Emitter: $I_B=(V_{CC}-V_{BE})/[R_B+(\beta+1)R_E]$; Divider: $I_B=(V_{TH}-V_{BE})/[R_{TH}+(\beta+1)R_E]$.

ทั้งสามโหมดใช้ $I_C=\beta I_B$ และ $I_E=(\beta+1)I_B$.

**แรงดันในวงจร**

$$V_E=I_ER_E\ (\text{Emitter/Divider}),\quad V_E=0\ (\text{Fixed}),\quad V_B=V_E+V_{BE},\quad V_C=V_{CC}-I_CR_C,\quad V_{CE}=V_C-V_E$$

## การตรวจสอบข้อมูลและข้อจำกัด

- ช่องที่จำเป็นต้องกรอกต้องไม่ว่าง และข้อมูลต้องเป็นตัวเลขที่มีค่าจำกัด (finite)
- VCC, ความต้านทาน และ β ต้องมากกว่า 0 ส่วน VBE ต้องไม่ติดลบ
- ค่าที่เล็กหรือใหญ่มากจน floating-point คำนวณได้ไม่น่าเชื่อถือจะถูกปฏิเสธ ดูรายละเอียดใน `docs/validation.md`
- **Cutoff:** เมื่อ `IB ≤ 0` (สำหรับ Divider เทียบได้กับ `VTH ≤ VBE`) โปรแกรมเตือนว่าสมมติฐาน Forward-Active อาจใช้ไม่ได้
- **Saturation:** เมื่อ `VCE ≤ 0.2 V` โปรแกรมเตือนว่าอาจใกล้หรือเข้าสู่ saturation โดย 0.2 V เป็นเกณฑ์ประมาณ ไม่ใช่แบบจำลอง saturation ที่แม่นยำ

โปรแกรมยังแสดงค่าที่คำนวณจากสมการ Forward-Active เมื่อมีคำเตือน แต่ค่าเหล่านั้น **อาจใช้ไม่ได้หรือไม่ตรงกับวงจรจริง** โปรแกรมนี้ไม่ใช่ตัวจำลองทรานซิสเตอร์แบบสมบูรณ์

## การทดสอบ

หลังติดตั้ง dependencies และเปิดใช้ virtual environment ให้รัน:

```bash
python -m unittest discover -s tests -v
```

ชุด regression เดิมตรวจสมการ Flask routes การแปลงหน่วย ข้อมูลผิด และคำเตือน ผลตรวจล่าสุด **24/24 tests ผ่าน**; `docs/test-log.txt` เป็นบันทึกผล Lab 02 ในอดีต ดูผล A1–A5 และภาพจริงจาก Playwright MCP ใน `docs/validation.md`

## โครงสร้างโปรเจกต์

```text
BJT-DC-Bias-Lab03/
├── .gitignore
├── README.md
├── app.py
├── dc_bias.py
├── requirements.txt
├── opencode.json
├── templates/
│   └── index.html
├── static/
│   └── style.css
├── tests/
│   ├── test_dc_bias.py
│   └── test_web.py
└── docs/
    ├── browser-demo.png
    ├── lab03-a1-playwright.png
    ├── design-note.md
    ├── reflection.md
    ├── test-log.txt
    ├── validation.md
    └── superpowers/
        └── plans/
            └── 2026-11-10-bjt-dc-bias.md
```

- `app.py` รับ HTTP requests; `dc_bias.py` คำนวณวงจร; `templates/` และ `static/` จัดการหน้าเว็บ
- `docs/design-note.md` และ `docs/superpowers/plans/` บันทึกแนวคิดและแผนพัฒนา
- `docs/validation.md` บันทึกการตรวจสูตร; `docs/test-log.txt` และ `docs/browser-demo.png` เป็นหลักฐานการทดสอบและภาพหน้าเว็บ
- `docs/reflection.md` เป็นร่าง reflection สำหรับให้นักศึกษาตรวจและปรับตามประสบการณ์จริง

## GitHub Repository

Lab 03: <https://github.com/B6829292/BJT-DC-Bias-Lab03>

Commit SHA: **รอสร้าง commit หลังได้รับอนุมัติ**

Repository ต้นทาง Lab 02: <https://github.com/B6829292/BJT-DC-Bias-Lab02>
