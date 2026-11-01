# อย่าหันกลับไป — Chase Long Take

คลิปสั้นแนวไล่ล่าสยองขวัญ 16.8 วินาที แนวตั้ง 1080×1920 ถ่ายแบบ **ช็อตเดียวไม่มีคัต**
ตัวละคร stick figure วาดด้วย Canvas 2D บน [Remotion](https://remotion.dev) ส่วนช็อตโดรนตอนจบเรนเดอร์ 3D ด้วย [ManimGX](https://github.com/academa-labs/manimgx)
จุดต่อ 2D→3D ซ่อนอยู่ในหมอกตอนกล้องเครนขึ้น (เฟรม 385)

## เรนเดอร์บน GitHub Actions

1. ไปที่แท็บ **Actions** → **Render Chase** → **Run workflow**
2. workflow แบ่งคลิปเป็น 8 ชุด เรนเดอร์พร้อมกัน แล้วต่อไฟล์ (ไม่ encode ซ้ำ) + มิกซ์เสียงพากย์กับเสียงประกอบ
3. เสร็จแล้วดาวน์โหลด artifact **chase_longtake** จากหน้ารันนั้น (เก็บไว้ 14 วัน)

## โครงสร้าง

```text
src/Chase.tsx          ไทม์ไลน์ กล้องเสมือน run cycle เสียง (คอมโพสิชัน Chase)
src/chaseWorld.ts      ฉากซอยไทยตอนตีสาม: ตึกแถว ไฟถนน เสาไฟ สิ่งไล่ล่า
src/draw.ts            ตัวละคร stick figure (รองรับท่าวิ่งด้านข้าง + rim light)
public/mgx/aerial.mp4  ช็อตโดรน 3D ที่เรนเดอร์แล้ว (ซอร์สอยู่ที่ manimgx/aerial.py)
public/vo, public/sfx  เสียงพากย์ และเสียงประกอบที่สร้างด้วย Python (scripts/)
scripts/mix_chase.py   มิกซ์เสียงตามคิวเดียวกับในคอมโพสิชัน
```

## รันในเครื่อง (Linux / macOS)

```bash
npm ci
npx remotion studio            # พรีวิว
npx remotion render src/index.ts Chase out/chase.mp4
```

ฉาก 3D เรนเดอร์ใหม่ได้ด้วย `pip install manimgx` แล้ว
`manimgx render manimgx/aerial.py Aerial -r 1080x1920 --fps 30 -o public/mgx/aerial.mp4`
