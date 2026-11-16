# ลำดับ prompt สำหรับ Claude Code

ใช้คู่กับ `CLAUDE.md` และ `docs/SPEC.md` · copy ทีละกล่องไปวางใน Claude Code
ทริค: เริ่มแต่ละขั้นด้วย `/clear` เพื่อให้ context สะอาด และ commit ทุกครั้งที่จบขั้น

---

## ก่อนเริ่ม (ทำเอง ~30 นาที)

1. สร้าง GitHub repo แบบ private ชื่อ `paito` แล้ว clone ลงเครื่อง
2. วางไฟล์: `CLAUDE.md` ไว้ที่ root · `docs/SPEC.md`, `docs/PROMPTS.md`, `docs/seed-trip.json` ไว้ใน `docs/` แล้ว commit
3. Supabase → สร้างโปรเจกต์ใหม่ เลือก region **Southeast Asia (Singapore)** · จด Project ref, Project URL, anon/publishable key และเก็บ database password
4. Supabase → Authentication
   - เพิ่มผู้ใช้ตัวเองใน Users (Add user · ติ๊ก auto confirm) ใช้อีเมลเดียวกับบัญชี Supabase เพราะ SMTP ค่าเริ่มต้นส่งได้เฉพาะสมาชิกทีม
   - ปิด "Allow new users to sign up"
   - Email template "Magic Link" → เปลี่ยนเนื้อหาเป็น `รหัสเข้าสู่ระบบ: {{ .Token }}`
5. ติดตั้ง Supabase CLI แล้ว `supabase login`
6. (ขั้นที่ 9) บัญชี Vercel ที่เชื่อม GitHub ไว้แล้ว

---

## Kickoff

```
อ่าน CLAUDE.md, docs/SPEC.md, docs/PROMPTS.md และ docs/seed-trip.json ให้ครบ
ยังไม่ต้องเขียนโค้ด ตอบเป็นภาษาไทย:
1. สรุปสิ่งที่จะสร้างไม่เกิน 10 บรรทัด
2. จุดที่สเปกกำกวม ขัดกันเอง หรือมีความเสี่ยง พร้อมข้อเสนอ
3. dependency ทั้งหมดที่จะใช้ พร้อมเหตุผล (เช่น Dexie, zod, Vitest, library ของ service worker)
4. แผนละเอียดของขั้นที่ 1
แล้วรอผมยืนยัน
```

---

## ขั้นที่ 1 — วางโครงโปรเจกต์

```
ขั้นที่ 1 — วางโครงโปรเจกต์ (SPEC ข้อ 10.1, 10.2, 13)
- สร้าง Next.js (App Router, TypeScript strict, Tailwind, ESLint) ในโฟลเดอร์นี้
- ติดตั้ง lucide-react และ Vitest · script: dev, build, lint, typecheck, test
- layout: lang="th", viewport-fit=cover, theme-color สว่าง/มืด, ฟอนต์ระบบ, สีตาม SPEC 10.1 เป็น design tokens (CSS variables + Tailwind)
- app shell: แถบเมนูล่าง 3 แท็บ (ตอนนี้ / แผนเที่ยว / ตั้งค่า) + หน้าเปล่าของแต่ละแท็บ + หน้า /login เปล่า · รองรับ safe area
- lib/time: format เวลา "13:30 น." และวันที่ "ศ. 1 ม.ค. 2570" ด้วย timeZone ของทริป + unit test
- lib/clock: now() ที่รองรับนาฬิกาจำลองผ่าน ?now=YYYY-MM-DDTHH:MM (จำใน localStorage แบบ offset ให้เวลาเดินต่อ, ?now=off เพื่อยกเลิก, มีแถบเตือน "นาฬิกาจำลอง" ค้างทุกหน้า) + hook useNow() (src/hooks) ที่ re-render ทุก 1 วินาทีและคำนวณใหม่เมื่อ visibilitychange/pageshow/focus + unit test
- เติมหัวข้อ Commands ใน CLAUDE.md
เสร็จเมื่อ: build, lint, typecheck, test ผ่าน · จอ 390×844 เห็นแถบเมนูถูกตำแหน่งทั้งโหมดสว่างและมืด
หยุดแล้วรายงาน
```

## ขั้นที่ 2 — ฐานข้อมูล

```
ขั้นที่ 2 — ฐานข้อมูล Supabase (SPEC ข้อ 4)
Project ref ของผม: <ใส่ project ref>
- supabase init แล้ว link กับโปรเจกต์
- migration ตาม SPEC 4.1–4.4 ครบ: enums, ตาราง, constraints, indexes, trigger updated_at, RLS, keepalive()
- push migration · generate TypeScript types ไปที่ src/services/supabase/types.ts (+ script ใน package.json)
- src/services/supabase/client.ts: browser client (persistSession, autoRefreshToken) จาก env NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY + ไฟล์ .env.example
- วิธีทดสอบ RLS ให้ผมรัน: anon อ่านได้ 0 แถว, insert โดยไม่ล็อกอินล้มเหลว
- ตรวจกับผมว่าตั้งค่า Dashboard ตาม "ก่อนเริ่ม" ข้อ 3–4 ครบหรือยัง
เสร็จเมื่อ: push migration ผ่าน, generate types ได้, ทดสอบ RLS ผ่าน
หยุดแล้วรายงาน
```

## ขั้นที่ 3 — เข้าสู่ระบบ

```
ขั้นที่ 3 — เข้าสู่ระบบ (SPEC ข้อ 8, 10.6)
- หน้า /login 2 ขั้น: อีเมล → รหัส OTP 8 หลัก (signInWithOtp shouldCreateUser:false → verifyOtp type:'email') · ส่งใหม่ได้หลัง 60 วินาที · error ภาษาไทย
- AuthProvider ฝั่ง client: อ่าน session, ฟัง onAuthStateChange, ไม่ sign out เมื่อ refresh ล้มเพราะ network
- gate ฝั่ง client: ไม่มี session และไม่มีข้อมูลในเครื่อง → /login · session เสียแต่มีข้อมูลในเครื่อง → โหมดอ่านอย่างเดียว + แถบ "เข้าสู่ระบบอีกครั้ง" (ตอนนี้ยังไม่มีข้อมูลในเครื่อง ให้เตรียม interface ไว้ก่อน)
- ปุ่มออกจากระบบในหน้าตั้งค่า (ยืนยันก่อน)
- ห้ามใช้ middleware/proxy หรือ server redirect สำหรับ auth
เสร็จเมื่อ: ล็อกอินได้บน desktop และ iPhone Safari · reload แล้วยังล็อกอินอยู่ · อีเมลที่ไม่มีในระบบล็อกอินไม่ได้
หยุดแล้วรายงาน
```

## ขั้นที่ 4 — Schedule engine

```
ขั้นที่ 4 — Schedule engine (SPEC ข้อ 5, 6, 9, 11, 14.1) · pure TypeScript ไม่แตะ UI
- lib/schedule: types, recalculateDay, shiftFrom (+ preview), getServiceDate, getNowState (6 state), computeProgress, computeDueAlerts, formatDuration
- lib/maps: buildNavUrl, parseLocationInput
- src/lib/import/import-schema.ts: zod schema ของไฟล์นำเข้า + ฟังก์ชันแปลง JSON → แถว trip/days/stops พร้อมเวลาที่คำนวณแล้ว (ยังไม่บันทึก)
- unit test ครบตาม SPEC 14.1 ใช้ docs/seed-trip.json เป็น fixture:
  · เวลาหลังแปลงตรงกับ _expect_* ทุกจุด
  · Lampang Festival มี gap 20 นาที และออก 00:30 ของวันถัดไป
  · 2027-01-01T00:30 ยังเป็น Day 1
- coverage ของ lib/schedule ≥ 90%
เสร็จเมื่อ: test ผ่านทั้งหมด และไม่มี Date.now() ใน lib/schedule
หยุดแล้วรายงาน พร้อมตารางสรุปกรณีที่เทสต์ครอบคลุม
```

## ขั้นที่ 5 — ข้อมูลในเครื่องและ sync

```
ขั้นที่ 5 — ข้อมูลในเครื่องและ sync (SPEC ข้อ 7, 10.5, 11)
- IndexedDB ด้วย Dexie: trips, trip_days, trip_stops, outbox, meta + repositories สำหรับ UI (live query)
- outbox: เขียนลงเครื่องก่อนแล้วเข้าคิว · flush ตามลำดับเมื่อ online · backoff เมื่อ network ล้ม · 4xx ติดธง failed
- pull: ตอนเปิดแอป, online, visibilitychange (ห่างกัน ≥ 30 วินาที) · merge โดยไม่ทับแถวที่มี op ค้าง
- หน้าตั้งค่า: สร้างทริปใหม่ (สร้าง days อัตโนมัติ), สลับทริป, นำเข้า JSON, ส่งออก JSON, แก้ trip.note และนาทีเตือนก่อนออก, แผง sync (สถานะ, รายการค้าง/ล้มเหลว, ปุ่ม sync ตอนนี้)
- ตัวบอกสถานะ sync บน header (ออนไลน์ / ออฟไลน์ / รอส่ง N)
- เชื่อม gate ของขั้นที่ 3 เข้ากับข้อมูลในเครื่อง
เสร็จเมื่อ: นำเข้า docs/seed-trip.json แล้วข้อมูลขึ้นใน Supabase ครบ · ปิด network ใน DevTools แล้วแก้ trip.note ได้ เปิด network แล้ว sync ครบ · มี test ของ outbox และ merge
หยุดแล้วรายงาน
```

## ขั้นที่ 6 — หน้า "แผนเที่ยว"

```
ขั้นที่ 6 — หน้า "แผนเที่ยว" (SPEC ข้อ 10.4, 5.2, 5.5)
- แถบเลือกวัน, หัวของวัน, timeline แนวตั้ง, แถวเวลาขับ, gap, conflict, ป้ายตรวจเวลาขับ, stop ที่ข้าม/ปัจจุบัน
- bottom sheet แก้ไข stop ครบทุกช่อง รวมช่องตำแหน่งที่ใช้ parseLocationInput
- เพิ่ม, ลบ (ยืนยัน), เลื่อนขึ้น/ลง, ย้ายไปวันอื่น → recalculateDay อัตโนมัติ + travel_needs_review
- ปุ่มสถานะ + toast ย้อนกลับ 8 วินาที (ทั้งการเปลี่ยนสถานะและการคำนวณเวลาใหม่)
- ทุกการแก้ไขผ่าน repositories/outbox ของขั้นที่ 5
เสร็จเมื่อ:
- แก้ระยะเวลาวัดพระธาตุลำปางหลวงจาก 90 เป็น 120 นาที → จุดถัดไปเลื่อน 30 นาที, Lampang Festival ยังเป็น 19:00 และขึ้น "จะถึงช้ากว่าเวลาที่ล็อก 10 นาที"
- สลับลำดับแล้วมีป้าย "ตรวจเวลาขับ"
- ใช้งานบนจอ 390×844 ได้สบาย
หยุดแล้วรายงาน พร้อม screenshot ถ้าทำได้
```

## ขั้นที่ 7 — หน้า "ตอนนี้"

```
ขั้นที่ 7 — หน้า "ตอนนี้" (SPEC ข้อ 10.3, 5.3, 5.4, 6, 9)
- ใช้ getNowState แสดงครบ 6 state ตาม SPEC 10.3 · ตัวเลขเวลาที่ต้องออกใหญ่ที่สุดของหน้า
- ปุ่มตาม state: [เสร็จ · นำทางไปต่อ], [ถึง {next} แล้ว], [นำทาง], [ข้าม], [ปรับเวลา]
- กล่อง lateBy พร้อม [ออกตามแผน] และ [เลื่อนแผนที่เหลือ +N] · sheet ปรับเวลา (+15 / +30 / กำหนดเอง) พร้อม preview
- alert banner + badge บนแท็บตาม SPEC 6 รวมการแจ้งที่พลาดเมื่อกลับเข้าแอป
- ปุ่มข้อมูลสำคัญ (trip.note), progress, รายการย่อของวัน
เสร็จเมื่อ (ใช้ข้อมูล seed + นาฬิกาจำลอง):
- 2026-11-20T10:00 → before_trip "อีก 41 วันถึงทริป"
- 2026-12-31T07:50 → pre_departure ออกจากบ้านในอีก 10 นาที + มี alert เตือนก่อนออก
- 2026-12-31T08:30 → in_transit ไปวัดพระธาตุลำปางหลวง ถึงประมาณ 09:20 น.
- 09:30 กด "ถึงแล้ว" → at_stop · ต้องออก 10:50 น. · เวลาเที่ยวเหลือ 1 ชม. 30 นาที · กล่อง "จะช้ากว่าแผน 10 นาที"
- ปรับนาฬิกาเป็น 10:36 → alert "อีก 14 นาทีต้องออก" (หรือข้อความเทียบเท่า)
- จบทุกจุดของ Day 1 → day_done "พรุ่งนี้ออก 09:30 น. จาก ที่พักลำปาง"
- 2027-01-04T10:00 → after_trip
หยุดแล้วรายงาน พร้อม screenshot ของแต่ละ state
```

## ขั้นที่ 8 — PWA และ offline

```
ขั้นที่ 8 — PWA และ offline (SPEC ข้อ 12, 7)
- app/manifest.ts, ไอคอน (หมุดแผนที่ขาวบนพื้นน้ำเงิน: SVG → PNG 180/192/512 + maskable), metadata appleWebApp
- service worker (เสนอ library ก่อนลงมือ): precache app shell + static, navigation fallback, ลงทะเบียนเฉพาะ production, แจ้ง "มีเวอร์ชันใหม่ · โหลดใหม่"
- ทุกหน้าเปิดได้ตอน offline หลังเปิดครั้งแรกแล้ว
- แผงนักพัฒนาในหน้าตั้งค่า (?dev=1): นาฬิกาจำลอง (ตั้งค่า, +15 นาที, +1 ชม., รีเซ็ต), เวอร์ชัน build
- ตรวจโหมดมืด, safe area และสถานะ loading/empty/error/offline ครบทุกหน้า
เสร็จเมื่อ: รัน production build ในเครื่อง → ปิด network → reload แล้วเห็นหน้า "ตอนนี้" พร้อมข้อมูล · กดเปลี่ยนสถานะตอน offline ได้ → เปิด network แล้ว sync · Lighthouse ผ่านเกณฑ์ installable
หยุดแล้วรายงาน
```

## ขั้นที่ 9 — Deploy และทดสอบบน iPhone

```
ขั้นที่ 9 — Deploy และทดสอบบน iPhone (SPEC ข้อ 14.2, 15)
- vercel.json: "regions": ["sin1"] และ cron { "path": "/api/keepalive", "schedule": "0 3 * * *" }
- app/api/keepalive/route.ts: ตรวจ Authorization: Bearer ${CRON_SECRET} แล้วเรียก rpc('keepalive') คืน 200
- บอกขั้นตอนที่ผมต้องทำใน Vercel: import repo, env ที่ต้องตั้ง, วิธีตรวจ cron
- docs/TEST-CHECKLIST.md: เช็กลิสต์ภาษาไทยจาก SPEC 14.2 (AC-01…AC-13) สำหรับทดสอบบน iPhone ทีละข้อ พร้อมวิธีใช้นาฬิกาจำลอง
- docs/FIELD-TEST.md: สิ่งที่ต้องลองตอนทดลองใช้จริงวันที่ 19–20 ธ.ค.
เสร็จเมื่อ: deploy ผ่าน · เรียก /api/keepalive โดยไม่มี secret ได้ 401 และมี secret ได้ 200
หยุดแล้วรายงาน
```

---

## แจ้งบั๊กหลังทดสอบ

```
บั๊ก: <อธิบายสั้นๆ>
ขั้นตอนทำซ้ำ: 1) … 2) … 3) …
ที่คาดไว้: …
ที่เกิดจริง: …
อุปกรณ์: iPhone (แอปบน Home Screen / Safari) · ออนไลน์หรือออฟไลน์ · เวลาที่ตั้งในนาฬิกาจำลอง (ถ้ามี)
ให้หาสาเหตุ เขียน test ที่ล้มก่อน แล้วค่อยแก้ ห้ามแก้เกินขอบเขตของบั๊กนี้
```
