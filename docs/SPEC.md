# ไปต่อ (paito) — Personal Trip Dashboard · สเปก v1.0

ชื่อแอป: **ไปต่อ** (ชื่อใต้ไอคอนบน Home Screen) · ชื่อ repo/package: `paito`

> อัปเดต 16 พ.ย. 2569 · ใช้คู่กับ `CLAUDE.md`, `docs/PROMPTS.md`, `docs/seed-trip.json`
> เอกสารนี้เป็นแหล่งความจริงเดียวของโปรเจกต์ ถ้าโค้ดกับเอกสารขัดกัน ให้ถามก่อนแก้

---

## 1. ภาพรวม

เว็บแอปส่วนตัวแบบ PWA สำหรับใช้บน iPhone ระหว่างเดินทาง ต้องตอบ 3 คำถามได้ในแวบเดียว:

**ตอนนี้อยู่ที่ไหน · ต้องไปไหนต่อ · ต้องออกเดินทางเมื่อไหร่**

- ผู้ใช้คนเดียว (เจ้าของ) ขับรถเที่ยวคนเดียว
- ใช้ผ่านแอปที่เพิ่มลง Home Screen ของ iPhone เป็นหลัก จอแนวตั้งเท่านั้น
- ต้องใช้งานได้แม้ไม่มีสัญญาณ
- ใช้ซ้ำกับทริปอื่นได้ ห้าม hardcode ข้อมูลทริป
- ทริปแรก: ปีใหม่ 31 ธ.ค. 2569 – 3 ม.ค. 2570 (2026-12-31 – 2027-01-03)
  ลำพูน → ลำปาง (2 คืน) → เชียงราย (1 คืน) → ลำพูน · ข้อมูลอยู่ใน `docs/seed-trip.json`

ความปลอดภัย: แอปต้องไม่ชวนให้ใช้ขณะขับรถ ไม่มีการเตือนในสถานะ "กำลังเดินทาง" และปุ่มนำทางส่งต่อให้ Google Maps ทันที

---

## 2. ขอบเขต

### Phase 1 — MVP (ต้องเสร็จก่อนทริป)
- ล็อกอินด้วย email OTP 6 หลัก ล็อกอินครั้งเดียวแล้วอยู่ถาวร
- สร้างทริป (สร้างวันอัตโนมัติจากช่วงวันที่) และนำเข้า/ส่งออกทริปเป็น JSON
- แผนเที่ยวรายวัน: เพิ่ม แก้ ลบ สลับลำดับ ย้ายไปวันอื่น คำนวณเวลาใหม่อัตโนมัติ และล็อกเวลาบางจุดได้
- สถานะสถานที่ (กดเท่านั้น) พร้อมย้อนกลับได้
- หน้า "ตอนนี้" (รวม Dashboard กับ Trip Mode เป็นหน้าเดียว)
- นับถอยหลัง 2 ตัว และการเตือนในแอปแบบข้อความ
- เลื่อนแผนเมื่อถึงช้าหรือเที่ยวเกินเวลา
- ปุ่มนำทางด้วย Google Maps
- Offline: ดูแผนและแก้ไขได้ แล้ว sync ภายหลัง
- PWA: ติดตั้งบน Home Screen และเปิดได้ตอนไม่มีสัญญาณ
- โหมดมืดตามการตั้งค่าของ iPhone
- นาฬิกาจำลองสำหรับทดสอบ
- keep-alive กันโปรเจกต์ Supabase แผนฟรีถูก pause

### Phase 2 (ห้ามทำตอนนี้ แต่ห้ามออกแบบให้ขวาง)
บันทึกค่าใช้จ่าย (ตาราง `trip_expenses` ในข้อ 4.5), พยากรณ์อากาศ, Web Push, บันทึกรูปและความทรงจำ, รายการของที่ต้องเตรียม

### ไม่ทำ
จองโรงแรมหรือตั๋ว, ค้นหาสถานที่สาธารณะ, รีวิว, แชร์ทริปกับคนอื่น, AI assistant, คำนวณเส้นทางหรือเวลาขับเอง, แผนที่ในแอป, เสียงเตือน, Notification API, รับประกันการเตือนตอนปิดแอป

---

## 3. คำศัพท์

| คำ | ความหมาย |
|---|---|
| Trip | ทริปหนึ่งครั้ง |
| Day | วันหนึ่งของทริป (Day 1…N) |
| Stop | จุดหนึ่งในวัน: ต้นทาง สถานที่เที่ยว ร้านอาหาร จุดแวะพัก หรือที่พัก |
| Origin | stop แรกของวัน คือจุดออกเดินทาง (บ้านหรือที่พัก) |
| Planned time | เวลาตามแผน: `planned_arrival_at`, `planned_departure_at` |
| Actual time | เวลาที่ผู้ใช้กดจริง: `started_at`, `completed_at` |
| Fixed stop | stop ที่ล็อกเวลาถึงไว้ เลื่อนอัตโนมัติไม่ได้ เช่น งานเคานต์ดาวน์ |
| Service day | "วันของทริป" ที่ตัดรอบตี 4 ไม่ใช่เที่ยงคืน |
| lateBy | จำนวนเวลาที่จะช้ากว่าแผน (บวก = ช้า) |

---

## 4. Data model (Supabase Postgres)

หลักการ:
- ทุกตารางมี `user_id` (default `auth.uid()`) เพื่อให้ RLS ตรงไปตรงมาและ sync ง่าย
- `id` เป็น uuid ที่สร้างฝั่ง client ได้ (`crypto.randomUUID()`) เพื่อให้สร้างข้อมูลตอน offline ได้
- เวลาเหตุการณ์เป็น `timestamptz` ส่วนวันที่ของวันทริปเป็น `date` (ค.ศ. เสมอ)
- `updated_at` อัปเดตด้วย trigger
- `sort_order` เป็น double precision ไม่มี unique constraint (แทรกระหว่างกลางได้ สลับได้โดยไม่ชน) เรียงด้วย `(sort_order, created_at)`

### 4.1 Enums และตาราง

```sql
create type stop_type as enum ('sight', 'food', 'rest', 'lodging');
create type stop_status as enum ('not_started', 'in_progress', 'completed', 'skipped');

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  timezone text not null default 'Asia/Bangkok',
  day_cutoff_hour smallint not null default 4 check (day_cutoff_hour between 0 and 12),
  departure_alert_minutes smallint not null default 15 check (departure_alert_minutes between 0 and 120),
  note text,                          -- ข้อมูลสำคัญ: เลขจอง เบอร์โทร ประกันรถ
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.trip_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  trip_id uuid not null references public.trips on delete cascade,
  day_number smallint not null check (day_number >= 1),
  date date not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, day_number),
  unique (trip_id, date)
);

create table public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  trip_id uuid not null references public.trips on delete cascade,
  trip_day_id uuid not null references public.trip_days on delete cascade,
  sort_order double precision not null,
  name text not null,
  stop_type stop_type not null default 'sight',
  maps_query text,                    -- ข้อความค้นหา Google Maps (ใช้เมื่อไม่มีพิกัด)
  maps_url text,                      -- ลิงก์ Google Maps ที่ผู้ใช้วางเอง
  latitude numeric(9,6),
  longitude numeric(9,6),
  travel_minutes integer check (travel_minutes >= 0),   -- เวลาขับจาก stop ก่อนหน้า (origin = null)
  travel_needs_review boolean not null default false,   -- true เมื่อ stop ก่อนหน้าเปลี่ยน
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  is_fixed boolean not null default false,              -- ล็อก planned_arrival_at
  planned_arrival_at timestamptz,                       -- origin = null
  planned_departure_at timestamptz,
  status stop_status not null default 'not_started',
  started_at timestamptz,
  completed_at timestamptz,
  note text,                          -- ที่จอดรถ ค่าเข้า สิ่งที่ต้องเตรียม
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null)),
  check (not is_fixed or planned_arrival_at is not null)
);

-- กำลังเที่ยวได้ทีละ 1 จุดต่อทริป
create unique index trip_stops_one_in_progress
  on public.trip_stops (trip_id) where status = 'in_progress';
create index trip_stops_day_order on public.trip_stops (trip_day_id, sort_order);
create index trip_stops_trip on public.trip_stops (trip_id);
create index trips_user on public.trips (user_id);
```

### 4.2 Trigger `updated_at`

```sql
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
-- สร้าง trigger before update ... for each row ให้ทั้ง 3 ตาราง
```

### 4.3 RLS (เปิดทุกตาราง)

ใช้ `(select auth.uid())` เพื่อให้ Postgres คำนวณครั้งเดียวต่อ statement และระบุชื่อตารางเต็มใน subquery ทุกครั้ง (กันคอลัมน์ชื่อซ้ำถูกตีความผิด)

```sql
alter table public.trips enable row level security;
create policy trips_own on public.trips for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table public.trip_days enable row level security;
create policy days_own on public.trip_days for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.trips t
                where t.id = trip_days.trip_id and t.user_id = (select auth.uid()))
  );

alter table public.trip_stops enable row level security;
create policy stops_own on public.trip_stops for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.trip_days d
                where d.id = trip_stops.trip_day_id
                  and d.trip_id = trip_stops.trip_id
                  and d.user_id = (select auth.uid()))
  );
```

### 4.4 Keep-alive

```sql
create function public.keepalive() returns timestamptz
language sql stable as $$ select now() $$;
grant execute on function public.keepalive() to anon;
```

### 4.5 Phase 2 (ยังไม่สร้าง)

`trip_expenses`: `id, user_id, trip_id, trip_day_id (nullable), description, amount numeric(12,2), category, spent_at timestamptz, created_at, updated_at` พร้อม RLS แบบเดียวกัน

---

## 5. Schedule engine — `lib/schedule/`

ทั้งหมดเป็น pure function รับ `now` เป็นพารามิเตอร์ ห้ามเรียก `Date.now()` ข้างใน และต้องมี unit test ครอบคลุม

### 5.1 โครงสร้างของวัน
- stop แรกของวัน (sort_order ต่ำสุด) คือ origin ต้องเป็นประเภท `lodging` (บ้านหรือที่พัก) มีแค่ `planned_departure_at` (เวลาออกจากต้นทาง) ไม่มี `travel_minutes` และไม่นับใน progress
- origin ไม่มีสถานะให้กด ไม่แสดง chip สถานะ แสดงเป็น "ออกเดินทาง 08:00 น." แทน
- stop สุดท้ายของวันควรเป็นที่พักหรือบ้าน (ไม่บังคับ) ถ้าเป็น `lodging` การกด "ถึงแล้ว" จะเป็น `completed` ทันที (`started_at = completed_at = now`) เพื่อจบวัน
- ที่พักกลางวัน (เช่น เช็กอินแล้วพักก่อนงานกลางคืน) เป็น stop ปกติ มี countdown เหมือนสถานที่อื่น
- ที่พักเดียวกันเป็นได้ทั้ง stop สุดท้ายของวันหนึ่งและ origin ของวันถัดไป (เก็บเป็น 2 แถว)

### 5.2 คำนวณเวลาแผนใหม่ — `recalculateDay(stops, fromIndex)`
ทำงานเมื่อ: แก้ช่องที่เกี่ยวกับเวลา, เพิ่ม/ลบ/สลับ/ย้าย stop, แก้เวลาออกของ origin และเมื่อสั่งเลื่อนแผน

```
for each stop i > fromIndex (เรียงตามลำดับ):
  ข้าม stop ที่ status เป็น completed, in_progress, skipped (ไม่แตะเวลาของสิ่งที่เกิดขึ้นแล้ว)
  prev = stop ก่อนหน้าที่ไม่ใช่ skipped
  computedArrival = prev.planned_departure_at + (travel_minutes ?? 0)
      (travel_minutes เป็น null → แจ้ง "ยังไม่กรอกเวลาขับ")
  if is_fixed:
      arrival = planned_arrival_at            # ไม่เปลี่ยน
      if computedArrival > arrival → conflict { stopId, lateMinutes }
      if computedArrival < arrival → gap { stopId, minutes }  (แสดง "ว่าง x นาที")
  else:
      arrival = computedArrival
  departure = arrival + duration_minutes
```
ผลลัพธ์: รายการแถวที่เวลาเปลี่ยน, conflicts, gaps · บันทึกเป็น batch เดียวผ่าน outbox
เวลาเดินจากแผนเท่านั้น เวลาจริง (`completed_at`) ไม่ทำให้แผนเปลี่ยนเอง จนกว่าผู้ใช้จะสั่งเลื่อนแผน

### 5.3 เลื่อนแผน — `shiftFrom(stops, anchorStopId, newDeparture)`
1. ตั้ง `planned_departure_at` ของ anchor = `newDeparture` (ปัดขึ้นเป็นช่วง 5 นาที)
   - อยู่ที่สถานที่แล้วเที่ยวเกิน: `newDeparture = max(started_at + duration, now)`
   - ปุ่ม +15/+30/กำหนดเอง ขณะอยู่ที่สถานที่: บวกทั้ง `planned_departure_at` และ `duration_minutes`
   - กำลังเดินทางแต่ช้า: anchor = stop ก่อนหน้า, `newDeparture = completed_at ?? now`
   - ก่อนออกจาก origin: anchor = origin, `newDeparture = เวลาเดิม + N`
2. เรียก `recalculateDay` ต่อจาก anchor (เลื่อนทุก stop ที่ยังไม่เริ่มของวันนั้น ยกเว้น fixed)
3. ก่อนยืนยันต้องแสดง preview: "ถึง {stop สุดท้ายของวัน} 19:40 น. (เดิม 19:05 น.)" และ conflict กับ fixed: "จะถึง {ชื่อ} ช้ากว่าเวลาที่ล็อกไว้ 25 นาที"
4. ไม่เลื่อนข้ามไปวันถัดไป
5. ย้อนกลับได้ (เก็บ snapshot ของแถวที่เปลี่ยน)

### 5.4 สถานะหน้าจอ — `getNowState(trip, days, stops, now)`
คืนค่าเป็น discriminated union:

| state | ข้อมูลหลัก |
|---|---|
| `before_trip` | วันที่เหลือก่อนทริป, เวลาออกของ Day 1 |
| `pre_departure` | origin, next, departureAt, departureLeft |
| `in_transit` | from, next, eta, lateBy |
| `at_stop` | current, next, activityEnd, activityLeft, departureAt, departureLeft, lateBy |
| `day_done` | ที่พักคืนนี้, เวลาออกของวันถัดไป (ถ้ามี) |
| `after_trip` | สรุปทริป |

ทุก state มี `serviceDay`, `progress`, `alerts` ด้วย

กติกา:
1. หาวันปัจจุบัน
   - ถ้ามี stop ที่ `in_progress` → ใช้วันของ stop นั้นเสมอ
   - ไม่งั้น serviceDate = วันที่ตาม `trip.timezone` ของ `(now − day_cutoff_hour ชม.)`
   - serviceDate ก่อนวันแรก → `before_trip` · หลังวันสุดท้าย → `after_trip`
2. ภายในวัน (ไม่นับ origin)
   - มี `in_progress` → `at_stop` (next = stop ถัดไปที่ `not_started`)
   - ไม่เหลือ stop ที่ `not_started` → `day_done`
   - ยังไม่มี stop ใดเริ่ม/เสร็จ/ข้าม และ `now < origin.planned_departure_at` → `pre_departure`
   - นอกนั้น → `in_transit` (from = stop ล่าสุดที่ completed หรือ origin)
3. `in_transit`: `eta = (from.completed_at ?? from.planned_departure_at) + next.travel_minutes` · `lateBy = eta − next.planned_arrival_at` · ถ้า `now > eta` แสดง "น่าจะถึงแล้ว — กด 'ถึงแล้ว'"
4. `at_stop`: `activityEnd = started_at + duration_minutes` · `departureAt = current.planned_departure_at` · `lateBy = activityEnd − departureAt` (เตือนเมื่อ > 0)
   - ถ้าผู้ใช้เลือก "ออกตามแผน" ให้ activity countdown เปลี่ยนเป้าไปที่ `departureAt` (เก็บตัวเลือกไว้ในเครื่อง key = stopId + started_at ไม่ต้อง sync)
   - ถ้า `now > departureAt` แสดง "เลยเวลาออกมา x นาที" พร้อมปุ่มเลื่อนแผน
5. Progress: total = stop ประเภท `sight` และ `food` ของวัน · done = ที่ `completed` · skipped นับแยกและแสดงเป็น "ข้าม 1"

### 5.5 การเปลี่ยนสถานะ (เกิดจากการกดเท่านั้น)

| จาก | ปุ่ม | ไป | บันทึก |
|---|---|---|---|
| not_started | ถึงแล้ว | in_progress | `started_at = now` · ถ้ามี stop อื่น in_progress อยู่ ให้ถาม "ปิด {ชื่อ} เป็นเสร็จแล้วไหม" |
| not_started (ที่พักท้ายวัน) | ถึงแล้ว | completed | `started_at = completed_at = now` |
| in_progress | เสร็จ | completed | `completed_at = now` |
| not_started / in_progress | ข้าม | skipped | — |
| completed | ย้อนสถานะ | in_progress | ล้าง `completed_at` |
| in_progress / skipped | ย้อนสถานะ | not_started | ล้าง `started_at` |

- ทุกครั้งที่กด แสดง toast "บันทึกแล้ว · ย้อนกลับ" 8 วินาที (ย้อนกลับ = คืนค่า snapshot เดิมทั้งแถว)
- เวลาที่บันทึกใช้นาฬิกาของเครื่องตอนกด (สำคัญตอน offline)
- ห้ามเปลี่ยนสถานะอัตโนมัติตามเวลา

### 5.6 รูปแบบตัวเลข — `formatDuration(ms)`
- ≥ 60 นาที → "1 ชม. 52 นาที" (0 นาที → "2 ชม.")
- 10–59 นาที → "42 นาที"
- < 10 นาที → "08:42" (นาที:วินาที)
- ติดลบ → "เกินมา 7 นาที" (ใช้กติกาเดียวกันกับค่าสัมบูรณ์)
- นาทีปัดลง (เผื่อเวลาให้ผู้ใช้)
- re-render ทุก 1 วินาที และคำนวณใหม่ทันทีเมื่อ `visibilitychange`, `pageshow`, `focus`

### 5.7 วันของทริปและการข้ามเที่ยงคืน
- service day ตัดรอบตี 4 (`trip.day_cutoff_hour`)
- stop ที่เลยเที่ยงคืนยังอยู่ในวันเดิม เช่น Lampang Festival 19:00–00:30 และกลับที่พัก 00:45 ยังเป็น Day 1
- หัวข้อวันที่บนหน้าจอใช้ `trip_days.date` ไม่ใช่วันที่ตามปฏิทินของ `now`

---

## 6. การเตือน (ในแอป · ข้อความอย่างเดียว · ไม่มีเสียง)

| Trigger | ข้อความ | ใช้ใน state |
|---|---|---|
| ก่อนเวลาออก `departure_alert_minutes` นาที (ค่าเริ่มต้น 15) | "อีก 15 นาทีต้องออกไป {next}" | pre_departure, at_stop |
| ถึงเวลาออก | "ถึงเวลาออกไป {next} แล้ว" | pre_departure, at_stop |
| ครบเวลาเที่ยว (`activityEnd`) | "ครบเวลาเที่ยวที่ {current} แล้ว" | at_stop |

- แสดงเป็น banner ค้างบนสุดของหน้า "ตอนนี้" จนกว่าจะกดปิด และมี badge บนแท็บ "ตอนนี้"
- ตรวจทุก tick และทันทีเมื่อกลับเข้าแอป ถ้าพลาดไปแล้วให้บอกเวลาที่ผ่านมา เช่น "เลยเวลาออกมา 7 นาที"
- จำว่าเตือนอะไรไปแล้วในเครื่อง (key = trigger + stopId + targetTime) ถ้าเวลาเป้าหมายเปลี่ยน ให้เตือนใหม่ได้
- ไม่เตือนในสถานะ `in_transit`
- Phase 1 ไม่ใช้ Notification API, Web Push และเสียง

---

## 7. Offline และการ sync

- Local store: IndexedDB (เช่น Dexie) เก็บ `trips`, `trip_days`, `trip_stops`, `outbox`, `meta`
- UI อ่านจาก local store เสมอ (live query) จึงแสดงผลได้ทันทีแม้ offline
- Pull: ตอนเปิดแอป, เมื่อ `online`, เมื่อ `visibilitychange` (ห่างกันอย่างน้อย 30 วินาที) ให้ดึงข้อมูลของทริปที่ใช้อยู่ทั้งหมด (ข้อมูลน้อย) แล้ว merge โดยแถวที่ยังมี op ค้างใน outbox ให้คงค่าในเครื่อง
- Push: ทุกการแก้ไขเขียนลงเครื่องทันที (optimistic) แล้วเพิ่ม op ใน outbox `{ id, table, op: 'upsert' | 'delete', rows, createdAt, attempts, lastError }` แล้ว flush ตามลำดับเมื่อ online
- การแก้หลายแถวพร้อมกัน (recalc, shift, reorder) เป็น op เดียวที่ upsert หลายแถว
- Conflict: ผู้ใช้คนเดียว ใช้ last write wins
- Error: ปัญหา network ให้หยุดแล้วลองใหม่แบบ backoff · error 4xx ให้ติดธง failed และแสดงในหน้าตั้งค่า พร้อมปุ่ม "ลองอีกครั้ง" กับ "ทิ้ง"
- แสดงสถานะ: "ออฟไลน์ · อัปเดตล่าสุด 10:42 น." และ "รอส่ง 3 รายการ"
- iOS ไม่มี Background Sync จึง sync เฉพาะตอนแอปเปิดอยู่
- Service worker แคชเฉพาะ app shell และ static assets ไม่แคช response ของ Supabase (ข้อมูลอยู่ใน IndexedDB)

---

## 8. Auth และ session

- Email OTP 6 หลัก: `signInWithOtp({ email, options: { shouldCreateUser: false } })` แล้ว `verifyOtp({ email, token, type: 'email' })`
- หน้า login 2 ขั้น: กรอกอีเมล → กรอกรหัส (`inputmode="numeric"`, `autocomplete="one-time-code"`) · ส่งรหัสใหม่ได้หลัง 60 วินาที
- ล็อกอินครั้งเดียวแล้วอยู่ถาวร: `persistSession: true`, `autoRefreshToken: true` และห้ามเปิด time-box หรือ inactivity timeout ของ session ใน Supabase
- ถ้า refresh token ล้มเพราะ network ห้าม sign out ให้ใช้ข้อมูลในเครื่องต่อ
- ถ้า session ใช้ไม่ได้จริง ยังแสดงข้อมูลในเครื่องแบบอ่านอย่างเดียว พร้อมแถบ "เข้าสู่ระบบอีกครั้ง" · ล้าง IndexedDB เฉพาะเมื่อกด "ออกจากระบบ"
- ตรวจ session ฝั่ง client เท่านั้น ห้ามใช้ server-side redirect เพราะต้องเปิดได้ตอน offline
- iOS: Safari กับแอปบน Home Screen ไม่แชร์ storage กัน ต้องล็อกอินในแอปที่ติดตั้งแล้ว (OTP พิมพ์เองจึงทำได้)

สิ่งที่ผู้ใช้ตั้งค่าเองใน Supabase Dashboard (ดู PROMPTS ขั้นที่ 2):
- ปิด "Allow new users to sign up" แล้วเพิ่มผู้ใช้ตัวเองใน Authentication → Users
- ถ้ายังใช้ SMTP ค่าเริ่มต้น อีเมลที่ล็อกอินต้องเป็นสมาชิกทีมของ Supabase organization
- แก้ email template "Magic Link" ให้มี `{{ .Token }}`

---

## 9. Google Maps

ลำดับการสร้างลิงก์นำทาง (`lib/maps/buildNavUrl`):
1. มีพิกัด → `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}&travelmode=driving&dir_action=navigate`
2. ไม่มีพิกัดแต่มี `maps_url` → เปิด `maps_url`
3. นอกนั้น → `https://www.google.com/maps/dir/?api=1&destination={encodeURIComponent(maps_query ?? name)}&travelmode=driving&dir_action=navigate`

ช่องตำแหน่ง (`lib/maps/parseLocationInput`) รับได้ 3 แบบ:
- ลิงก์ Google Maps แบบยาว: ดึงพิกัดจาก `!3d{lat}!4d{lng}` ก่อน ถ้าไม่มีค่อยใช้ `@{lat},{lng}`
- ลิงก์สั้น (`maps.app.goo.gl`, `goo.gl/maps`): เก็บเป็น `maps_url` ไม่ต้องแกะ
- "lat,lng" → พิกัด · ข้อความอื่น → `maps_query`

ต้องทดสอบบน iPhone (จากแอปบน Home Screen) ว่าปุ่มเปิดแอป Google Maps จริง ถ้าเปิดเป็นหน้าเว็บในแอป ให้ทดลอง `comgooglemaps://?daddr={lat},{lng}&directionsmode=driving` แล้ว fallback เป็นลิงก์ https

---

## 10. UI

### 10.1 หลักทั่วไป
- ข้อความ UI ภาษาไทยทั้งหมด เวลา 24 ชม. "13:30 น." วันที่ปี พ.ศ. ผ่าน `Intl.DateTimeFormat('th-TH', { timeZone: trip.timezone })`
- สไตล์ iOS + รายละเอียดแบบสมุดเดินทาง: พื้นครีมกระดาษ `#F4F1EA` / การ์ด `#FFFEFB` (dark: พื้นดำ / การ์ด `#1C1C1E`), การ์ดมุมโค้ง 16px, เส้นแบ่งบาง, เงาน้อย · ค่าสีทั้งหมดเป็น token ใน `src/app/globals.css`
- สีหลักน้ำเงินอมเขียวแบบป้ายทางหลวง: light `#12608F` / dark `#6CB4E0` ใช้กับปุ่มหลักและสิ่งที่กดได้
- สีสถานะ (ต้องมีข้อความกำกับทุกครั้ง ไม่ใช้สีอย่างเดียว):
  - ยังไม่เริ่ม → เทา
  - กำลังเที่ยว → น้ำเงิน
  - เสร็จแล้ว → เขียว + ✓
  - ข้าม → เทา + ขีดฆ่าชื่อ
  - เลยเวลา / ช้ากว่าแผน → ส้ม light `#EA580C` / dark `#FB923C`
- ฟอนต์ระบบ `system-ui, -apple-system, "Helvetica Neue", sans-serif` ไม่โหลดเว็บฟอนต์
- ตัวเลขนับถอยหลังตัวใหญ่ หนา ใช้ฟอนต์ระบบแบบมน (`ui-rounded` / SF Pro Rounded) และ `tabular-nums`
- โหมดมืดตาม `prefers-color-scheme`
- จอแนวตั้ง รองรับ safe area (`viewport-fit=cover`, `env(safe-area-inset-*)`) และไม่ปิดการซูม
- ปุ่มแตะได้ ≥ 44×44 px ปุ่มหลักสูง 52–56 px เต็มความกว้าง
- ไม่มี animation ที่ไม่จำเป็น และเคารพ `prefers-reduced-motion`
- ไอคอนจาก lucide-react
- ทุกหน้ามีสถานะ loading (skeleton), empty, error และ offline
- **Component เขียนเองทั้งหมด:** ทุก control (dropdown/select, ช่องค้นหา, ช่องกรอก, textarea, toggle, checkbox, segmented, stepper, ตัวเลือกวันที่/เวลา, bottom sheet, dialog, toast, skeleton, empty state, scrollbar, focus ring) ออกแบบใหม่ให้เข้ากับธีม ไม่ใช้หน้าตา default ของ browser/iOS และไม่ใช้ UI kit สำเร็จรูป · รวมไว้ที่ `src/components/ui/` · ต้องคงการเข้าถึง (semantic element หรือ role/aria, คีย์บอร์ด, โฟกัสมองเห็นได้) และช่องกรอกขนาด ≥ 16px

### 10.2 โครงหน้า
แถบเมนูด้านล่าง 3 แท็บ แบบแถบลอยมุมมน พื้นโปร่งแบบ blur (ลอยเหนือ home indicator):
1. **ตอนนี้** (`/`) — หน้าแรก ไอคอน `Navigation`
2. **แผนเที่ยว** (`/plan?day=2`) — ไอคอน `CalendarDays`
3. **ตั้งค่า** (`/settings`) — ไอคอน `Settings`

มี badge จุดส้มบนแท็บ "ตอนนี้" เมื่อมี alert ค้าง · หน้า `/login` ไม่มีแถบเมนู · ทริปที่ใช้อยู่เก็บในเครื่อง (`activeTripId`)

### 10.3 หน้า "ตอนนี้"
ต้องเห็นส่วนที่ 0–4 โดยไม่ต้องเลื่อนบนจอ 390×844

0. **Header เล็ก**: "Day 2 · ศ. 1 ม.ค. 2570" ด้านขวาเป็นสถานะ sync (ออนไลน์ / ออฟไลน์ / รอส่ง 3)
1. **Alert banner** (ถ้ามี): พื้นส้มอ่อน มีปุ่มปิด
2. **การ์ดหลัก** ตาม state
   - `at_stop`
     - label เล็ก "ตอนนี้อยู่ที่" + ชื่อสถานที่ (20px, semibold)
     - "ต้องออกในอีก" + **ตัวเลขใหญ่สุดของหน้า** (56–64px) เช่น "18 นาที" + บรรทัดเล็ก "ออก 13:30 น."
     - แถวรอง "เวลาเที่ยวเหลือ" + "42 นาที" (24px)
     - ถ้า lateBy > 0: กล่องส้ม "ถ้าเที่ยวครบเวลา จะช้ากว่าแผน 24 นาที" + ปุ่ม [ออกตามแผน] [เลื่อนแผนที่เหลือ +25 นาที]
   - `pre_departure`: "ออกจาก {origin} ในอีก" + ตัวเลขใหญ่ + "ออก 08:00 น."
   - `in_transit`: "กำลังไป" + ชื่อ next (ตัวใหญ่) + "ถึงประมาณ 11:25 น." · ถ้าช้า: "ช้ากว่าแผน 20 นาที" + ปุ่ม [เลื่อนแผนที่เหลือ]
   - `day_done`: "จบวันนี้แล้ว" + "เที่ยว 4 จาก 5 ที่ · ข้าม 1" + "พรุ่งนี้ออก 09:30 น. จาก {origin}"
   - `before_trip`: "อีก 45 วันถึงทริป" + "Day 1 ออก 08:00 น. จาก {origin}"
   - `after_trip`: "จบทริปแล้ว" + สรุปจำนวนที่ไป/ข้าม
3. **การ์ด "ต่อไป"**: ชื่อ next + ไอคอนประเภท + "ขับประมาณ 25 นาที · ถึง 13:55 น." (+ ไอคอนล็อกถ้า fixed)
4. **ปุ่ม**
   - `at_stop`: ปุ่มหลัก [เสร็จ · นำทางไปต่อ] (ทำเครื่องหมายเสร็จแล้วเปิด Google Maps ไป next) · แถวรอง [ปรับเวลา] [ข้าม]
   - `pre_departure`: ปุ่มหลัก [นำทางไป {next}] · รอง [ปรับเวลา]
   - `in_transit`: ปุ่มหลัก [ถึง {next} แล้ว] · รอง [นำทาง]
   - `day_done`: [ดูแผนพรุ่งนี้]
5. **Progress**: แถบ + "เที่ยวแล้ว 2 จาก 5 ที่"
6. **ข้อมูลสำคัญ**: ปุ่มเปิด `trip.note` (เบอร์โทรกดโทรได้ด้วย `tel:`)
7. **รายการย่อของวันนี้**: เวลา + ชื่อ + สถานะ (อยู่ใต้ fold ได้)

Bottom sheet "ปรับเวลา": [+15 นาที] [+30 นาที] [กำหนดเอง] → preview ผลกระทบ (ข้อ 5.3) → [ยืนยัน]

### 10.4 หน้า "แผนเที่ยว"
- แถบเลือกวันด้านบน (segmented เลื่อนแนวนอนได้) "D1 31 ธ.ค." "D2 1 ม.ค." … เปิดมาที่วันปัจจุบัน
- หัวของวัน: ชื่อวัน + "ออก 08:00 น. · ถึงที่พัก 00:45 น." + จำนวนจุด
- Timeline แนวตั้ง
  - คอลัมน์ซ้าย (~56px): เวลาถึง (ตัวหนา) และเวลาออก (ตัวเล็ก)
  - เส้นแนวตั้งพร้อมจุดสีตามสถานะ
  - การ์ดขวา: ไอคอนประเภท + ชื่อ + chip สถานะ + "อยู่ 90 นาที" + โน้ตย่อ 1 บรรทัด + ไอคอนล็อกถ้า fixed
  - ระหว่างการ์ด: แถวเวลาขับ (ไอคอน `Car`) "~25 นาที" หรือป้ายส้ม "ตรวจเวลาขับ" / "ยังไม่กรอกเวลาขับ"
  - ก่อน fixed stop ที่มีเวลาว่าง: "ว่าง 1 ชม. 45 นาที"
  - conflict: ป้ายส้ม "จะถึงช้ากว่าเวลาที่ล็อก 25 นาที"
  - stop ที่ข้าม: ชื่อขีดฆ่าและสีจาง · stop ปัจจุบัน: กรอบน้ำเงิน
- ท้ายวัน: ปุ่ม [+ เพิ่มสถานที่] (ค่าเริ่มต้น: sight, อยู่ 60 นาที, ยังไม่กรอกเวลาขับ)
- แตะการ์ดแล้วเปิด bottom sheet แก้ไข
  - ช่อง: ชื่อ, ประเภท (4 ปุ่ม), ตำแหน่ง (ช่องเดียวรับลิงก์/พิกัด/ข้อความ), อยู่นาน (stepper ±15 หรือพิมพ์), เวลาขับจากจุดก่อน (stepper ±5), ล็อกเวลาถึง (toggle + เลือกเวลา), โน้ต
  - เวลาที่คำนวณได้แสดงแบบอ่านอย่างเดียว ยกเว้น fixed stop และเวลาออกของ origin
  - ปุ่มสถานะ: [ถึงแล้ว] [เสร็จ] [ข้าม] [ย้อนสถานะ] · จัดลำดับ: [เลื่อนขึ้น] [เลื่อนลง] [ย้ายไปวันอื่น] · [ลบ] (ต้องยืนยัน)
  - บันทึกแล้ว recalc อัตโนมัติ + toast "คำนวณเวลาใหม่แล้ว · ย้อนกลับ"
- สลับลำดับ/ลบ/ย้ายวัน: ตั้ง `travel_needs_review = true` ให้ stop ที่ stop ก่อนหน้าเปลี่ยน และล้างธงเมื่อผู้ใช้แก้หรือกดยืนยันเวลาขับ
- ย้ายไปวันอื่น: วางก่อนที่พักท้ายวันปลายทาง แล้ว recalc ทั้งสองวัน

### 10.5 หน้า "ตั้งค่า"
- ทริปที่ใช้อยู่: ชื่อ ช่วงวันที่ timezone (แสดงอย่างเดียว)
- ข้อมูลสำคัญของทริป (`trip.note`): textarea
- เตือนก่อนออก: 5 / 10 / 15 / 20 / 30 นาที (ค่าเริ่มต้น 15)
- ทริปทั้งหมด: สลับทริป · สร้างทริปใหม่ (ชื่อ + วันเริ่ม + วันจบ แล้วสร้าง days ให้อัตโนมัติ)
- นำเข้าทริปจากไฟล์ JSON (รูปแบบเดียวกับ `docs/seed-trip.json`) · ส่งออกทริปเป็น JSON (ใช้เป็น backup)
- Sync: สถานะ, รายการค้าง/ล้มเหลว, ปุ่ม "sync ตอนนี้"
- บัญชี: อีเมล · ออกจากระบบ (ยืนยัน แล้วล้างข้อมูลในเครื่อง)
- นักพัฒนา (แสดงเมื่อเปิด `?dev=1` แล้วจำไว้ในเครื่อง): นาฬิกาจำลอง (ตั้งวันเวลา, +15 นาที, +1 ชม., รีเซ็ต), เวอร์ชัน build

### 10.6 หน้า Login
ชื่อแอป "ไปต่อ" → ช่องอีเมล → [ส่งรหัส] → ช่องรหัส 6 หลัก (ตัวใหญ่) → [เข้าสู่ระบบ] · ข้อความ error ภาษาไทย (รหัสผิด, หมดอายุ, ขอถี่เกินไป)

---

## 11. รูปแบบไฟล์นำเข้าทริป (JSON)

ดูตัวอย่างจริงที่ `docs/seed-trip.json`
- เวลาเขียนเป็นเวลาท้องถิ่นของทริปแบบไม่มี offset `YYYY-MM-DDTHH:MM` แล้วแปลงด้วย `trip.timezone`
- origin ของแต่ละวันมี `depart_at` · stop อื่นมี `travel_minutes`, `duration_minutes` และอาจมี `fixed_arrive_at`
- ตอนนำเข้า: ตรวจรูปแบบด้วย zod → สร้าง trip, days, stops (sort_order = index × 1000) → คำนวณเวลาด้วย `recalculateDay` → บันทึกผ่าน outbox
- ฟิลด์ที่ขึ้นต้นด้วย `_` เป็นคำอธิบาย ให้ข้ามไป

---

## 12. PWA

- `app/manifest.ts`: name/short_name "ไปต่อ", display "standalone", orientation "portrait", start_url "/", theme และ background color, icons 192/512 + maskable
- iOS: `apple-touch-icon` 180×180 และ metadata `appleWebApp` (capable, title "ไปต่อ")
- ไอคอน: หมุดแผนที่สีขาวบนพื้นน้ำเงิน `#12608F` (เขียนเป็น SVG แล้ว export PNG)
- Service worker (เช่น Serwist หรือเขียนเอง): precache app shell + static assets, navigation fallback ไปที่ shell ที่แคชไว้, ลงทะเบียนเฉพาะ production, มีเวอร์ชันใหม่แล้วแสดง "มีเวอร์ชันใหม่ · โหลดใหม่"
- เปิดจาก Home Screen ตอนอยู่ในโหมดเครื่องบิน ต้องเห็นหน้า "ตอนนี้" พร้อมข้อมูลล่าสุด

---

## 13. สถาปัตยกรรม (แนวทาง)

```
src/
  app/
    layout.tsx              # metadata, viewport, theme
    manifest.ts
    (app)/                  # client app shell + tab bar
      page.tsx              # ตอนนี้
      plan/page.tsx
      settings/page.tsx
    login/page.tsx
    api/keepalive/route.ts  # route handler เดียวของระบบ
  components/               # ui/, now/, plan/, sheets/
  hooks/                    # React hooks: useNow, useAuth, live queries
  services/                 # I/O และ side effects
    supabase/               # browser client + generated types
    data/                   # IndexedDB (Dexie) schema, repositories, outbox, sync, import/export
    auth/                   # AuthProvider, session gate
  lib/                      # pure (ไม่มี I/O ไม่มี React)
    schedule/               # recalc, shift, nowState, serviceDay, progress, alerts, format
    clock/                  # now() + นาฬิกาจำลอง
    maps/                   # buildNavUrl, parseLocationInput
    time/                   # Intl formatters (th-TH + timeZone), แปลงเวลาท้องถิ่น ↔ UTC
    import/                 # zod schema ของไฟล์นำเข้า + แปลง JSON → แถว (ยังไม่บันทึก)
supabase/migrations/
docs/
```
- path alias `@/*` ชี้ไปที่ `src/*`
- `lib/` ห้าม import จาก `services/`, `hooks/` หรือ `components/`

- หน้า UI เป็น client components ทั้งหมด ไม่มี server-side data fetching หรือ auth ในหน้า UI
- ค่าที่ขึ้นกับเวลา render หลัง mount เท่านั้น (กัน hydration mismatch และกันเวลาเพี้ยนเพราะ server เป็น UTC)
- Supabase client ฝั่ง browser ใช้ publishable/anon key เท่านั้น · types generate จาก Supabase CLI

---

## 14. การทดสอบและเกณฑ์ผ่าน

### 14.1 Unit tests (Vitest)
- `recalculateDay`: ต่อเวลาเป็นลูกโซ่, fixed gap/conflict, ข้าม skipped, ไม่แตะ completed/in_progress, travel เป็น null
- `shiftFrom`: ทุกกรณีในข้อ 5.3, ปัด 5 นาที, preview, ไม่ข้ามวัน
- `getNowState`: ครบ 6 state, in_progress มาก่อนวันที่, ตัดรอบตี 4, Day 1 เวลา 00:30 ของ 1 ม.ค. ยังเป็น Day 1
- lateBy, "ออกตามแผน", เลยเวลาออก
- progress (ไม่นับ lodging/rest, skipped แยก)
- `formatDuration`: 2 ชม., 1 ชม. 52 นาที, 59 นาที, 10 นาที, 09:59, 00:01, ค่าติดลบ
- alerts: เกิดครั้งเดียว, เกิดใหม่เมื่อเวลาเปลี่ยน, พลาดแล้วแสดงตอนกลับเข้าแอป
- `buildNavUrl` และ `parseLocationInput` ทุกรูปแบบ
- import: `docs/seed-trip.json` ผ่าน validation และได้เวลาตรงกับตัวอย่างในไฟล์
- ใช้ `docs/seed-trip.json` เป็น fixture

### 14.2 Acceptance (ทดสอบบน iPhone จริงที่ติดตั้งจาก Home Screen)

| ID | เกณฑ์ |
|---|---|
| AC-01 | สร้างทริปจากช่วงวันที่ แล้วได้ days ครบ · นำเข้า `seed-trip.json` ได้ |
| AC-02 | เพิ่ม แก้ ลบ สลับ ย้ายวัน แล้วเวลาคำนวณใหม่ถูกต้อง fixed ไม่ขยับ |
| AC-03 | เปลี่ยนสถานะและย้อนกลับได้ |
| AC-04 | หน้า "ตอนนี้" แสดงครบ 6 state ถูกต้อง (ทดสอบด้วยนาฬิกาจำลอง) |
| AC-05 | ปิดแอป 10 นาทีแล้วเปิดใหม่ countdown ลดลง 10 นาทีพอดี |
| AC-06 | Day 1 เวลา 00:30 น. ของ 1 ม.ค. ยังเป็น Day 1 |
| AC-07 | เที่ยวเกินแผน → เลือกออกตามแผน หรือเลื่อนแผน แล้วผลกระทบถูกต้อง |
| AC-08 | เตือน 15 นาทีก่อนออก, ตอนถึงเวลาออก, ตอนครบเวลาเที่ยว · พลาดแล้วแสดงตอนกลับเข้าแอป |
| AC-09 | โหมดเครื่องบิน: เปิดแอปได้ เห็นแผน กดสถานะได้ → กลับมาออนไลน์แล้ว sync ครบ |
| AC-10 | ล็อกอินในแอปบน Home Screen ด้วย OTP · ปิดแอปแล้วเปิดใหม่ยังล็อกอินอยู่ |
| AC-11 | anon อ่านข้อมูลไม่ได้ · ผู้ใช้อื่นอ่านไม่ได้ · สมัครสมาชิกใหม่ไม่ได้ |
| AC-12 | ปุ่มนำทางเปิดแอป Google Maps จากแอปบน Home Screen |
| AC-13 | ใช้งานสบายบน 390×844 ทั้งโหมดสว่างและมืด · ส่วนสำคัญของหน้า "ตอนนี้" ไม่ต้องเลื่อน |

---

## 15. Deploy และการดูแล

- Supabase: โปรเจกต์ "Paito" (ref `mcoudtofkmldnabpzslu`) region Northeast Asia (Tokyo, ap-northeast-1) สร้างผ่าน Vercel Marketplace · migrations ผ่าน Supabase CLI (ดู D12)
- Vercel: เชื่อม GitHub repo · function region `sin1` (`vercel.json` → `"regions": ["sin1"]`) · ใช้โดเมนฟรี `.vercel.app`
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (รองรับ `NEXT_PUBLIC_SUPABASE_ANON_KEY` แบบเดิมเป็นทางสำรอง), `CRON_SECRET` · ห้ามมี service/secret key ใน `NEXT_PUBLIC_*` · ตัวอย่างใน `.env.example`
- Keep-alive: Vercel Cron วันละครั้ง (Hobby ทำได้ถี่สุดวันละครั้ง) เรียก `/api/keepalive` → ตรวจ `Authorization: Bearer ${CRON_SECRET}` → เรียก `rpc('keepalive')` · ตั้ง `"schedule": "0 3 * * *"` (10:00 น. เวลาไทย)
- ใช้แผนฟรีทั้งหมด

---

## 16. Milestones

| ช่วง | เป้าหมาย |
|---|---|
| 17–18 พ.ย. | เตรียม repo, Supabase, ตั้งค่า Auth |
| ภายใน อา. 29 พ.ย. | ขั้นที่ 1–4: scaffold, ฐานข้อมูล, auth, schedule engine |
| ภายใน อา. 6 ธ.ค. | ขั้นที่ 5–6: data layer/sync, หน้าแผนเที่ยว |
| ภายใน อา. 13 ธ.ค. | ขั้นที่ 7–8: หน้า "ตอนนี้", PWA/offline |
| ภายใน พ. 16 ธ.ค. | ขั้นที่ 9: deploy และทดสอบบน iPhone |
| ส.–อา. 19–20 ธ.ค. | ทดลองใช้จริงกับทริปสั้น |
| 21–27 ธ.ค. | แก้บั๊กอย่างเดียว + กรอกข้อมูลจริง |
| พ. 30 ธ.ค. 18:00 | ตรวจแผนก่อนออกทริป |

---

## 17. ข้อมูลทริปแรก

`docs/seed-trip.json` มี 14 สถานที่ตามแผนของผู้ใช้ เพิ่มบ้าน/ที่พักเป็น stop ประเภท `lodging`
**เวลา ระยะเวลา และเวลาขับในไฟล์เป็นค่าประมาณสำหรับร่างแผน** ผู้ใช้จะแก้ในแอปภายหลัง
ห้ามแก้ไฟล์นี้เพื่อให้เทสต์ผ่าน ถ้าเทสต์ต้องการข้อมูลเฉพาะ ให้สร้าง fixture แยก

---

## 18. การตัดสินใจหลัง kickoff (16 พ.ย. 2569)

ผู้ใช้ยืนยันแล้ว มีผลเหนือข้อความเดิมในข้อก่อนหน้าถ้าขัดกัน

### ตรรกะ
| # | เรื่อง | ข้อตกลง |
|---|---|---|
| D1 | next.config | ปิด `cacheComponents`, `partialPrefetching`, `experimental.agentFeedback` |
| D2 | นาฬิกาจำลอง | เก็บใน localStorage แบบ offset (`{ simulatedAt, realAt }`) ให้เวลาจำลองเดินต่อตามจริง · `?now=` ตีความตาม timezone ของทริป · มีแถบ "นาฬิกาจำลอง" + ปุ่ม "ใช้เวลาจริง" ค้างทุกหน้าที่มีแถบเมนู |
| D3 | เวลาที่บันทึกตอนกด | `started_at` / `completed_at` ใช้ `clock.now()` (= นาฬิกาเครื่องเมื่อไม่ได้จำลอง) |
| D4 | `formatDuration` ค่าติดลบ | แสดงเป็นนาทีเสมอ ไม่มีวินาที เช่น "เกินมา 7 นาที" (นาทีปัดลง) |
| D5 | ข้อความเตือน | ตัวเลขในข้อความคำนวณสดทุก tick (เช่น 10:36 → "อีก 14 นาที…") · ถ้าพลาดหลายการเตือนของ stop เดียวกัน แสดงเฉพาะอันล่าสุด |
| D6 | วันที่ไม่มี origin | สร้าง origin ให้อัตโนมัติทุกวัน: "จุดออกเดินทาง" ประเภท `lodging` ออก 08:00 |
| D7 | ป้องกัน origin | ลบ เลื่อนขึ้นลง หรือย้ายวันไม่ได้ และห้ามเลื่อน stop อื่นขึ้นไปเหนือ origin · แก้ได้เฉพาะชื่อ ตำแหน่ง เวลาออก โน้ต |
| D8 | กดข้าม | ตั้ง `travel_needs_review = true` ให้ stop ถัดไปที่ไม่ใช่ skipped (ไม่เปลี่ยนเวลา) |
| D9 | stop ค้าง `in_progress` ข้ามวัน | ถ้าวันของ stop นั้นก่อน serviceDate ปัจจุบัน แสดงแถบ "ยังเปิด {ชื่อ} ค้างจากเมื่อวาน · ปิดเป็นเสร็จ" กดครั้งเดียวแล้วไปวันนี้ |
| D10 | Backup JSON | รูปแบบส่งออกเพิ่มฟิลด์ optional: `maps_url`, `latitude`, `longitude`, `status`, `started_at`, `completed_at`, `travel_needs_review`, เวลาแผนที่เลื่อนแล้ว · ไฟล์รูปแบบ seed เดิมยังนำเข้าได้ |
| D11 | ปัด 5 นาทีใน `shiftFrom` | ปัดที่ตัวเวลา `newDeparture` ขึ้นไปช่วง :00/:05/… ไม่ใช่ปัดส่วนต่าง |

### UI
| # | เรื่อง | ข้อตกลง |
|---|---|---|
| U1 | บุคลิก | โครง iOS + รายละเอียดแบบสมุดเดินทาง · ต้องไม่ดูเหมือนเว็บที่ AI สร้างทั่วไป |
| U2 | สี | ดูข้อ 10.1 (ครีมกระดาษ + น้ำเงินอมเขียว) · สีข้อความต้องผ่านคอนทราสต์ 4.5:1 |
| U3 | การ์ดหลักหน้า "ตอนนี้" | เปลี่ยนโทนพื้นอ่อน ๆ ตามช่วงเวลาของวัน (เช้า / กลางวัน / เย็น / กลางคืน) ตัวหนังสืออ่านชัดเท่าเดิม |
| U4 | ตัวเลขนับถอยหลัง | `ui-rounded` (SF Pro Rounded) |
| U5 | แถบเมนู | แถบลอยมุมมน blur |
| U6 | รายละเอียด | สีและไอคอนตามประเภทสถานที่ · เส้นทางย่อแบบหมุดบนการ์ดหลัก (แทนแถบ progress ธรรมดา แต่ยังมีข้อความ "เที่ยวแล้ว x จาก y ที่") · หัววันแบบตั๋วเดินทางในหน้าแผนเที่ยว · empty state ภาพเส้น SVG วาดเอง |
| U7 | น้ำเสียง | กันเองและสั้นเฉพาะ empty / จบวัน / ก่อนทริป · ข้อความเวลาและการเตือนตามสเปก |
| U8 | Component | เขียนเองทั้งหมด (ข้อ 10.1) |

### ฐานข้อมูล (ขั้นที่ 2)
| # | เรื่อง | ข้อตกลง |
|---|---|---|
| D12 | Region | ใช้โปรเจกต์ที่ Tokyo ต่อ (แทน Singapore) เพราะแอป offline-first ความหน่วงมีผลแค่ตอน sync |
| D13 | สิทธิ์ตาราง | default privileges ของโปรเจกต์ให้ `anon` ทุกสิทธิ์ migration จึง `revoke all ... from anon` และ grant เฉพาะ select/insert/update/delete ให้ `authenticated` (RLS ยังเป็นด่านหลัก) · `set_updated_at()` ห้าม role ทั่วไปเรียก · `keepalive()` ให้ anon และ authenticated |
| D14 | Index เพิ่ม | `trip_days(user_id)`, `trip_stops(user_id)` เพื่อรองรับ FK และ RLS |
| D15 | ฟังก์ชัน | ทุกฟังก์ชันตั้ง `search_path = ''` ตามคำแนะนำ security advisor |
