# ไปต่อ (paito) — Personal Trip Dashboard

ชื่อแอปที่แสดงผล: **ไปต่อ** · ชื่อ repo/package: `paito`

PWA ส่วนตัวสำหรับใช้บน iPhone ระหว่างเที่ยว ตอบ 3 คำถาม: อยู่ไหน · ไปไหนต่อ · ต้องออกกี่โมง
ผู้ใช้คนเดียว ขับรถเที่ยวคนเดียว ต้องใช้ได้ตอนไม่มีสัญญาณ

- สเปกเต็ม: `docs/SPEC.md` (แหล่งความจริงเดียว)
- ลำดับงาน: `docs/PROMPTS.md`
- ข้อมูลทริปแรก: `docs/seed-trip.json`

## Stack
Next.js (App Router, เวอร์ชัน stable ล่าสุด) · TypeScript strict · Tailwind CSS · lucide-react · Supabase (Postgres, Auth, RLS) · IndexedDB (Dexie) · Vitest · Vercel

## โครงสร้าง
โค้ดทั้งหมดอยู่ใน `src/` (alias `@/*` → `src/*`) · รายละเอียดใน SPEC ข้อ 13
- `src/app` route · `src/components` UI · `src/hooks` React hooks
- `src/services` I/O: Supabase, IndexedDB/outbox/sync, auth
- `src/lib` pure เท่านั้น (schedule, clock, time, maps, import) ห้าม import จาก services/hooks/components
- path ที่เขียนว่า `lib/...` ในเอกสารหมายถึง `src/lib/...`

## Commands
<!-- อัปเดตเมื่อมีคำสั่งใหม่ -->
- dev: `npm run dev`
- build: `npm run build` (= `next build` + สร้าง `public/sw.js`) · ดู production + service worker: `npm run build && npm start`
- ไอคอน: แก้ `src/app/icon.svg` / `scripts/make-icons.mjs` แล้วรัน `node scripts/make-icons.mjs`
- แผงนักพัฒนา: เปิดหน้าตั้งค่าด้วย `?dev=1` (ปิดด้วย `?dev=0`)
- lint: `npm run lint`
- typecheck: `npm run typecheck` (รัน `next typegen` ก่อน เพราะ `LayoutProps`/`PageProps` เป็น type ที่ Next สร้าง)
- test: `npm test` · watch: `npm run test:watch` · coverage: `npm run test:coverage`
- เทสต์รันด้วย `TZ=America/New_York` (ตั้งใน `vitest.config.mts`) เพื่อจับโค้ดที่พึ่ง timezone ของเครื่อง · เทสต์ที่ใช้ DOM ใส่ `// @vitest-environment happy-dom` และเรียก `cleanup()` ใน `afterEach` (ไม่ได้เปิด vitest globals)
- นาฬิกาจำลอง: เปิดด้วย `?now=2026-12-31T07:50` (เวลาของทริป) · ปิดด้วย `?now=off` หรือปุ่ม "ใช้เวลาจริง"
- db: โปรเจกต์ link แล้ว (ref `mcoudtofkmldnabpzslu`, Tokyo) · คำสั่ง Supabase ที่ไปยังโปรเจกต์จริงต้องใส่ `--remote`
  - สร้าง migration: `npm run db:new -- <name>` · ดูสถานะ: `npm run db:status` · push: `npm run db:push`
- generate types: `npm run db:types` → `src/services/supabase/types.ts` (ห้ามแก้มือ)
- ตรวจ RLS ด้วย anon key: `npm run check:rls`
- deploy: Vercel (region `sin1`, cron ใน `vercel.json`) · ทดสอบ keep-alive: `curl -i -H "Authorization: Bearer $CRON_SECRET" https://<โดเมน>/api/keepalive`
- ทดสอบบน iPhone: `docs/TEST-CHECKLIST.md` · ทดลองใช้จริง: `docs/FIELD-TEST.md`

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
- ปิด sign-up · login ด้วย email OTP 8 หลัก (ต้องตรงกับ Email OTP Length ใน Supabase) (`shouldCreateUser: false`)
- ห้าม sign out เองเมื่อ refresh token ล้มเหลวเพราะ network

### UI
- Mobile-first สำหรับ iPhone จอแนวตั้ง · รองรับ safe area · ไม่ปิดการซูม
- ปุ่มแตะ ≥ 44px · สถานะต้องมีข้อความกำกับ ไม่ใช้สีอย่างเดียว
- ตัวเลขนับถอยหลังใช้ `tabular-nums` · ฟอนต์ระบบ + Mali ที่ฝังในแอป (หัวข้อ/ตราประทับเท่านั้น ห้ามใช้กับเวลาและข้อความเตือน) · ไม่โหลดฟอนต์จาก origin อื่น
- ธีมสว่างอย่างเดียว (สมุดเดินทาง) ไม่มีโหมดมืด · ไม่ใส่ animation ที่ไม่จำเป็น
- ไอคอนวาดมืออยู่ใน `src/components/ui/icons/` · ภาพโปสการ์ดเลือกด้วย `src/lib/scene` (pure)
- การเตือนเป็นข้อความในแอปเท่านั้น ไม่มีเสียง ไม่ใช้ Notification API · ไม่เตือนตอนกำลังเดินทาง

### Component ต้องเขียนเองทั้งหมด (กฎสำคัญ)
- ทุก control ที่ผู้ใช้เห็นต้องออกแบบและเขียนเองให้เข้ากับธีมของแอป ห้ามปล่อยหน้าตา default ของ browser/iOS ได้แก่ dropdown/select, ช่องค้นหา, ช่องกรอก, textarea, checkbox, toggle, radio/segmented, stepper, ตัวเลือกวันที่และเวลา, bottom sheet, dialog ยืนยัน, toast, tooltip, scrollbar, focus ring, skeleton, empty state
- ห้ามใช้ UI kit สำเร็จรูป (shadcn, MUI, Headless UI, Radix ฯลฯ) · ไอคอนใช้ชุดวาดมือของแอป (lucide-react ใช้ได้เฉพาะหน้าที่ยังไม่ออกแบบใหม่)
- ทุก component อยู่ใน `src/components/ui/` ใช้ design tokens เดียวกัน · หน้าต่าง ๆ ต้องเรียกใช้ตัวกลางนี้ ห้ามสร้าง control แบบเฉพาะหน้า
- เขียนเองแล้วต้องไม่เสียการเข้าถึง: ใช้ element ที่ถูกความหมาย (`button`, `input`, `label`) เป็นฐานแล้วตกแต่ง หรือใส่ role/aria และรองรับคีย์บอร์ดให้ครบ · โฟกัสต้องมองเห็นได้ · แตะได้ ≥ 44px
- ช่องกรอกตัวอักษรขนาด ≥ 16px (กัน iOS ซูมเองตอนโฟกัส) · คง `inputmode`/`autocomplete` ที่ถูกต้องไว้ เพื่อให้ได้แป้นพิมพ์และการกรอกรหัส OTP อัตโนมัติของ iOS
- ทุก component มีสถานะครบ: ปกติ, กด, โฟกัส, ปิดใช้งาน, error
