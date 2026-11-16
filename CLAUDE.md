# ไปต่อ (paito) — Personal Trip Dashboard

ชื่อแอปที่แสดงผล: **ไปต่อ** · ชื่อ repo/package: `paito`

PWA ส่วนตัวสำหรับใช้บน iPhone ระหว่างเที่ยว ตอบ 3 คำถาม: อยู่ไหน · ไปไหนต่อ · ต้องออกกี่โมง
ผู้ใช้คนเดียว ขับรถเที่ยวคนเดียว ต้องใช้ได้ตอนไม่มีสัญญาณ

- สเปกเต็ม: `docs/SPEC.md` (แหล่งความจริงเดียว)
- ลำดับงาน: `docs/PROMPTS.md`
- ข้อมูลทริปแรก: `docs/seed-trip.json`

## Stack
Next.js (App Router, เวอร์ชัน stable ล่าสุด) · TypeScript strict · Tailwind CSS · lucide-react · Supabase (Postgres, Auth, RLS) · IndexedDB (Dexie) · Vitest · Vercel

## Commands
<!-- เติมให้ครบตอนจบขั้นที่ 1 แล้วอัปเดตเมื่อมีคำสั่งใหม่ -->
- dev:
- build:
- lint:
- typecheck:
- test:
- db migration / push:
- generate types:

## วิธีทำงาน
- ทำทีละขั้นตาม `docs/PROMPTS.md` จบขั้นแล้วหยุด รายงาน: ทำอะไรไป, วิธีทดสอบเอง, สิ่งที่ค้างหรือตัดสินใจเอง แล้วรอผมตรวจ
- ก่อนบอกว่าเสร็จ: typecheck, lint, test และ build ต้องผ่าน
- ห้ามเพิ่มฟีเจอร์นอกสเปก ถ้าเห็นว่าควรเพิ่มหรือสเปกขัดกันเอง ให้ถามก่อน
- คุยกับผมเป็นภาษาไทย · โค้ด ชื่อไฟล์ ตัวแปร คอมเมนต์ และ commit message เป็นภาษาอังกฤษ · ข้อความใน UI เป็นภาษาไทย
- dependency ใหม่ต้องบอกเหตุผล เลือกตัวที่เล็กและดูแลอยู่
- สร้าง migration ใหม่เสมอ ห้ามแก้ migration ที่ push ไปแล้ว
- ห้ามแก้ `docs/seed-trip.json` เพื่อให้เทสต์ผ่าน

## กฎที่ห้ามละเมิด

### เวลา
- ห้ามใช้ `setInterval` เป็นแหล่งเวลา ให้คำนวณ `target − now` ทุกครั้ง · tick มีไว้ re-render อย่างเดียว
- "ตอนนี้" ต้องมาจาก `lib/clock` เท่านั้น (รองรับนาฬิกาจำลอง) · `lib/schedule` รับ `now` เป็นพารามิเตอร์ ห้ามเรียก `Date.now()`
- แสดงเวลาผ่าน `lib/time` ที่ใช้ `Intl` + `timeZone` ของทริป (`Asia/Bangkok`) เสมอ ห้ามพึ่ง timezone ของเครื่องหรือ server (Vercel เป็น UTC)
- ค่าที่ขึ้นกับเวลา render ฝั่ง client หลัง mount เท่านั้น
- เก็บเวลาเป็น `timestamptz` / วันที่ ค.ศ. · แสดงผลเป็น พ.ศ. ด้วย locale `th-TH`
- วันของทริปตัดรอบตี 4 ไม่ใช่เที่ยงคืน · ถ้ามี stop ที่ `in_progress` ให้ยึดวันของ stop นั้น
- คำนวณใหม่ทันทีเมื่อ `visibilitychange`, `pageshow`, `focus`

### ตรรกะ
- logic ตาราง/สถานะ/countdown/alerts อยู่ใน `lib/schedule` เป็น pure function และมี unit test
- สถานะสถานที่เปลี่ยนเมื่อผู้ใช้กดเท่านั้น ห้ามเปลี่ยนเองตามเวลา · เวลาที่บันทึก (`started_at`, `completed_at`) ใช้นาฬิกาเครื่องตอนกด
- แผนเปลี่ยนเมื่อผู้ใช้แก้ไขหรือสั่งเลื่อนเท่านั้น และ fixed stop ห้ามขยับอัตโนมัติ

### ข้อมูลและ offline
- UI อ่านจาก IndexedDB เสมอ แล้ว sync กับ Supabase เบื้องหลัง
- ทุกการแก้ไขเขียนลงเครื่องก่อน แล้วเข้าคิว outbox · ห้ามทำให้ข้อมูลหายตอน offline
- iOS ไม่มี Background Sync → sync ตอนเปิดแอป, `online`, `visibilitychange`
- หน้า UI ต้องเปิดได้ตอน offline จาก service worker → ห้ามใช้ server-side data fetching, auth หรือ redirect ในหน้า UI
- service worker แคชเฉพาะ app shell และ static assets ไม่แคช response ของ Supabase

### ความปลอดภัย
- เปิด RLS ทุกตาราง policy `user_id = (select auth.uid())`
- ฝั่ง client ใช้ publishable/anon key เท่านั้น ห้ามมี service/secret key ใน `NEXT_PUBLIC_*` หรือ commit ลง repo
- ปิด sign-up · login ด้วย email OTP 6 หลัก (`shouldCreateUser: false`)
- ห้าม sign out เองเมื่อ refresh token ล้มเหลวเพราะ network

### UI
- Mobile-first สำหรับ iPhone จอแนวตั้ง · รองรับ safe area · ไม่ปิดการซูม
- ปุ่มแตะ ≥ 44px · สถานะต้องมีข้อความกำกับ ไม่ใช้สีอย่างเดียว
- ตัวเลขนับถอยหลังใช้ `tabular-nums` · ฟอนต์ระบบ ไม่โหลดเว็บฟอนต์
- โหมดมืดตามระบบ · ไม่ใส่ animation ที่ไม่จำเป็น
- การเตือนเป็นข้อความในแอปเท่านั้น ไม่มีเสียง ไม่ใช้ Notification API · ไม่เตือนตอนกำลังเดินทาง
