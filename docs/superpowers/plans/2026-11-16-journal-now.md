# Journal Theme + "ตอนนี้" Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เปลี่ยนธีมกลางเป็น "สมุดเดินทาง" (กระดาษ, ฟอนต์ Mali, ไอคอนวาดมือ, สว่างอย่างเดียว) และเปลี่ยนหน้า "ตอนนี้" ให้การ์ดหลักเป็นโปสการ์ดที่ภาพเปลี่ยนตามช่วงเวลา × เหตุการณ์

**Architecture:** แก้ token ใน `globals.css` แล้วทุกหน้าจะได้ธีมใหม่ไปเอง · การเลือกภาพเป็น pure function ใน `src/lib/scene/` (มีเทสต์) · ภาพวาดเป็น SVG inline ใน `src/components/now/scene/` ใช้ `Record<Key, Component>` ให้ TypeScript บังคับว่าวาดครบทุก key · หน้า "ตอนนี้" ประกอบจาก component ใหม่ (`Postcard`, `PaperNote`, `Stamp`) โดยข้อความและพฤติกรรมยังเหมือนเดิมทุกอย่าง

**Tech Stack:** Next.js 16 App Router · React 19 · Tailwind 4 · `next/font/local` · Vitest + Testing Library (happy-dom)

**Spec:** `docs/superpowers/specs/2026-11-16-journal-now-design.md` (อ่านคู่กับแผนนี้)

## Global Constraints
- ข้อความ UI ทุกคำที่มีอยู่ในหน้า "ตอนนี้" (state, การเตือน, ปุ่ม) ต้องคงเดิม · `now.test.tsx` เดิมต้องผ่าน
- ใช้ Mali (`--font-hand`) เฉพาะหัวข้อ ตราประทับ และคำบรรยาย · ห้ามใช้กับเวลา ตัวเลขนับถอยหลัง ข้อความเตือน และปุ่ม
- ตัวเลขนับถอยหลัง: `--font-rounded` + `tabular-nums`
- ธีมสว่างอย่างเดียว: ห้ามมี `prefers-color-scheme: dark` เหลืออยู่ใน `src/`
- สถานะต้องมีข้อความกำกับ · ปุ่มแตะได้ ≥ 44px · ข้อความต้องมีคอนทราสต์ ≥ 4.5:1 บนพื้นที่วางจริง
- ห้ามมี animation หรือ transition ใหม่ · ห้ามมีไฟล์รูปหรือฟอนต์ที่โหลดจาก origin อื่นตอน runtime
- `src/lib/**` ต้อง pure: ห้าม import จาก components/hooks/services และห้ามเรียก `Date.now()`
- ห้ามเพิ่ม npm dependency
- โค้ด คอมเมนต์ และ commit message เป็นภาษาอังกฤษ · ข้อความ UI เป็นภาษาไทย
- CLAUDE.md: จบงานแล้วหยุดรายงานผู้ใช้ **commit เมื่อผู้ใช้ตรวจแล้วเท่านั้น** (Task 9) · ก่อนบอกว่าเสร็จ typecheck, lint, test และ build ต้องผ่าน

## Review Focus
1. **ชื่อสถานที่ยาวมาก** (≥ 35 ตัวอักษร) ในตราประทับ แสตมป์ หัวหน้า และรายการ → ต้องตัดบรรทัดหรือตัดคำ ไม่ล้นกรอบหรือทับปุ่ม (Task 6, 7)
2. **`day.title` เป็น null หรือไม่มี " · "** → หัวหน้าใช้ทั้ง title หรือ fallback เป็นชื่อทริป (Task 6)
3. **ชื่อภาษาอังกฤษ ตัวพิมพ์ปนกัน หรือไม่มีคำค้นเลย** → ได้ภาพ fallback ของประเภทนั้น ไม่ได้ภาพผิดเหตุการณ์ (Task 3)
4. **ข้ามเที่ยงคืนคืน 31 ธ.ค.** (00:30 น. ของ 1 ม.ค. วันทริปยังเป็น 31 ธ.ค.) → ฟ้าดึก + พลุ (Task 3)
5. **มีการเตือน + กล่องช้ากว่าแผน + staleInProgress พร้อมกัน** บนจอ 390×844 → ส่วน 0–4 ยังอยู่เหนือแถบเมนู ภาพเหลือ 72px (Task 6, 8)

---

### Task 1: ธีมกระดาษ, ฟอนต์ Mali, ปุ่ม และแก้กฎในเอกสาร

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/manifest.ts`, `src/components/ui/Button.tsx`
- Create: `src/app/fonts/Mali-Medium.ttf`, `Mali-SemiBold.ttf`, `Mali-Bold.ttf`, `src/app/fonts/OFL.txt`
- Modify docs: `docs/SPEC.md` (10.1, 10.2, เพิ่ม U9–U11 ในข้อ 18), `CLAUDE.md` (หมวด UI), memory `ui-direction-not-generic.md`

**Interfaces:**
- Produces: CSS tokens `--paper` `#efe7d6`, `--card` `#fffdf7`, `--ink-red` `#c2562f` (+ `--color-*` ใน `@theme`), utility class `.paper-bg` (noise + เส้นบรรทัด 30px), `.paper-margin` (เส้นขอบแดงซ้าย), font var `--font-hand` (Tailwind: `font-hand`) · `buttonClasses(variant, size, extra)` signature เดิม

- [ ] **Step 1:** ดาวน์โหลด Mali 3 น้ำหนักและ `OFL.txt` จาก `https://github.com/google/fonts/tree/main/ofl/mali` มาไว้ใน `src/app/fonts/` · ตรวจว่าไฟล์เป็น TrueType จริง (`file src/app/fonts/*.ttf`)
- [ ] **Step 2:** ใน `layout.tsx` ใช้ `localFont({ src: [{path:"./fonts/Mali-Medium.ttf",weight:"500"},{…600},{…700}], variable: "--font-hand", display: "swap", preload: true })` แล้วใส่ `.variable` ที่ `<html>` · เปลี่ยน `themeColor` เหลือค่าเดียว `#efe7d6` · ใน `manifest.ts` เปลี่ยน `background_color`/`theme_color` เป็น `#efe7d6`
- [ ] **Step 3:** ใน `globals.css`
  - ลบบล็อก `@media (prefers-color-scheme: dark)` ทั้งหมด
  - ตั้ง canvas เป็นกระดาษ และเพิ่ม token ตาม Interfaces
  - `--font-hand: var(--font-hand), var(--font-sans)` ใน `@theme`
  - `body` ใช้ `.paper-bg` (SVG `feTurbulence` แบบ data-URI ที่ alpha ≤ 0.09 + `repeating-linear-gradient` เส้นบรรทัด `rgb(110 90 50 / .13)` ทุก 30px)
  - คง token `--tint-*` ไว้ก่อน (Task 6 จะลบ)
- [ ] **Step 4:** `Button.tsx` เปลี่ยน VARIANTS เป็นแบบกระดาษกดได้
  - primary: `bg-primary text-on-primary shadow-[0_3px_0_var(--primary-pressed)]`
  - secondary: `bg-card text-ink border-[1.5px] border-line-strong shadow-[0_3px_0_var(--line-strong)]`
  - ทุก variant ที่กดได้: `active:translate-y-[2px] active:shadow-none` · disabled: ไม่มีเงา ไม่เลื่อน
  - danger/ghost: คงเดิม เปลี่ยนแค่สีให้เข้ากับกระดาษ
- [ ] **Step 5:** แก้เอกสารตามข้อ 4 ของ spec
  - SPEC 10.1: ฟอนต์ / โหมดมืด / ไอคอน / สีกระดาษ
  - SPEC 10.2: ไอคอนแท็บ
  - SPEC ข้อ 18: เพิ่มแถว U9 ไม่มีโหมดมืด, U10 Mali, U11 ไอคอนวาดมือ + ภาพโปสการ์ด
  - CLAUDE.md หมวด UI: "ฟอนต์ระบบ ไม่โหลดเว็บฟอนต์" → "ฟอนต์ระบบ + Mali ที่ฝังในแอป (หัวข้อเท่านั้น)" และ "โหมดมืดตามระบบ" → "ธีมสว่างอย่างเดียว"
  - memory: แทนที่บรรทัดที่บอกว่า dark mode เป็นสีดำ และ countdown/ไม่ใช้เว็บฟอนต์
- [ ] **Step 6:** ตรวจว่าไม่เหลือ dark: `grep -rn "prefers-color-scheme" src/` ต้องไม่มีผลลัพธ์ · รัน `npm run typecheck && npm run lint && npm test` ต้องผ่าน

### Task 2: ชุดไอคอนวาดมือ + แถบเมนู + ไอคอนประเภทสถานที่

**Files:**
- Create: `src/components/ui/icons/index.tsx`, `src/components/ui/icons/icons.test.tsx`
- Modify: `src/components/ui/TabBar.tsx`, `src/components/plan/stop-visuals.tsx`

**Interfaces:**
- Produces: `type HandIconName = "now"|"plan"|"settings"|"sight"|"food"|"rest"|"lodging"|"navigate"|"check"|"clock"|"skip"|"arrive"|"calendar"|"close"|"bell"|"warning"|"lock"|"car"|"phone"|"notebook"|"party"` · `function HandIcon(props: { name: HandIconName; size?: number; className?: string; strokeWidth?: number; "aria-label"?: string }): JSX.Element` (viewBox 24, `stroke="currentColor"`, round caps/joins, `aria-hidden` เมื่อไม่มี aria-label) · `const HAND_ICON_PATHS: Record<HandIconName, ReactNode>`
- `StopTypeIcon` / `STOP_TYPES[].icon` เปลี่ยนเป็น `HandIconName` · API ของ `StopTypeIcon({type,size})` เดิม

- [ ] **Step 1: เขียนเทสต์ที่ล้ม** `icons.test.tsx`:
  - `it("renders every icon as an aria-hidden svg")` วนทุก key ของ `HAND_ICON_PATHS` → render `<HandIcon name={k}/>` แล้ว `expect(svg.getAttribute("aria-hidden")).toBe("true")` และ `svg.children.length > 0`
  - `it("exposes a label when given one")` → `getByRole("img",{name:"ล็อกเวลาถึง"})`
- [ ] **Step 2:** รัน `npx vitest run src/components/ui/icons` ต้อง FAIL (หาโมดูลไม่เจอ)
- [ ] **Step 3:** เขียน `HandIcon` และ path ทุกตัว
  - สไตล์ตาม mockup: เส้นไม่ตรงเป๊ะ ใช้ Q/โค้งเล็ก ๆ มุมเหลื่อมกัน ~0.3–0.6
  - แท็บ: now = นาฬิกา, plan = สมุดมีเส้น, settings = แถบปรับ 3 เส้น
- [ ] **Step 4:** รันเทสต์ต้อง PASS
- [ ] **Step 5:** แก้ `TabBar`
  - ใช้ `HandIcon` แทน lucide
  - แท็บที่เลือก: ไม่มีพื้นทึบ ใช้ข้อความ `text-primary` + ขีดหมึกใต้คำ (span สูง 4px กว้าง 22px `bg-primary` `-rotate-2`)
  - พื้นแถบ `bg-bar` = กระดาษโปร่ง
  - คงจุดเตือนและ sr-only เดิม
- [ ] **Step 6:** แก้ `stop-visuals.tsx` ให้ `StopTypeIcon` render `HandIcon` · รัน `npm test` (plan/now/settings tests) ต้องผ่าน

### Task 3: `pickScene` (pure, TDD)

**Files:**
- Create: `src/lib/scene/index.ts`, `src/lib/scene/scene.test.ts`

**Interfaces:**
- Consumes: `NowState["kind"]` และ `StopType` จาก `@/lib/schedule/...`
- Produces:
```ts
export type SkySlot = "dawn" | "morning" | "day" | "evening" | "night" | "late";
export type SceneSubject =
  | "temple" | "viewpoint" | "waterfall" | "museum" | "market" | "farm" | "sight"
  | "breakfast" | "lunch" | "dinner" | "late_meal" | "cafe" | "rest_stop"
  | "lodging" | "departing" | "driving" | "arriving" | "night_in"
  | "before_trip" | "trip_done" | "empty";
export type SceneExtra = "fireworks" | "new_year" | "alarm";
export interface SceneInput {
  kind: NowState["kind"] | "no_trip";
  /** at_stop→current, pre_departure→origin, in_transit→next, day_done→lodging */
  stop: { name: string; stop_type: StopType } | null;
  probablyArrived?: boolean;
  /** overdue / late / in-transit late — adds the alarm sticker */
  behind?: boolean;
}
export interface LocalTime { month: number; day: number; hour: number }
export interface Scene { sky: SkySlot; subject: SceneSubject; extras: SceneExtra[] }
export function skySlot(hour: number): SkySlot;
export function pickScene(input: SceneInput, local: LocalTime): Scene;
```

**กฎที่ต้องใช้ตามนี้ (จาก spec ข้อ 7):**
- **skySlot:** 5–6 dawn · 7–9 morning · 10–15 day · 16–18 evening · 19–22 night · 23–4 late
- **day_done:** sky = `late` ถ้า slot เป็น late นอกนั้นเป็น `night` · subject = `night_in`
- **kind อื่น:** before_trip → before_trip · after_trip → trip_done · no_trip → empty · pre_departure → departing · in_transit → `probablyArrived ? arriving : driving`
- **at_stop ตาม stop_type:**
  - lodging → lodging
  - rest → cafe ถ้าชื่อตรงคำค้น cafe ไม่งั้น rest_stop
  - food → cafe ถ้าตรงคำค้น cafe ไม่งั้นตาม slot: dawn/morning breakfast · day lunch · evening/night dinner · late late_meal
  - sight → คำค้นตามลำดับ temple, viewpoint, waterfall, museum, market, farm แล้ว fallback เป็น sight
- **คำค้น** (เทียบแบบ `name.toLowerCase().includes`):
  - temple: วัด, พระธาตุ, temple
  - viewpoint: ดอย, ภู, จุดชมวิว, ม่อน, viewpoint
  - waterfall: น้ำตก, ทะเลสาบ, บ่อน้ำร้อน, hot spring, waterfall
  - museum: พิพิธภัณฑ์, หอศิลป์, museum, art
  - market: ตลาด, ถนนคนเดิน, market
  - farm: ไร่, สวน, ฟาร์ม, farm
  - cafe: คาเฟ่, กาแฟ, coffee, cafe
- **extras** (ตามลำดับ):
  - `fireworks` เมื่อ (12/31 และ slot เป็น night หรือ late) หรือ (1/1 และ hour < 5)
  - `new_year` เมื่อ 1/1 และ slot เป็น dawn หรือ morning
  - `alarm` เมื่อ `behind`

- [ ] **Step 1: เขียนเทสต์ที่ล้ม** `scene.test.ts` (ใช้ `it.each`):
  - `skySlot` ที่ขอบทุกช่วง: 4→late, 5→dawn, 6→dawn, 7→morning, 9→morning, 10→day, 15→day, 16→evening, 18→evening, 19→night, 22→night, 23→late, 0→late
  - ชื่อจาก seed: "วัดพระธาตุลำปางหลวง"→temple · "พิพิธภัณฑ์เซรามิคธนบดี"→museum · "ดอยตุง"→viewpoint · "Wat Rong Khun Temple"→temple · "Blue Coffee"(food, 13h)→cafe · "ร้านข้าวซอย"(food, 12h)→lunch · food 08h→breakfast · food 20h→dinner · food 01h→late_meal · rest "ปั๊ม ปตท."→rest_stop · sight "หอนาฬิกา"→sight · lodging at_stop→lodging
  - kinds: pre_departure→departing · in_transit→driving · in_transit+probablyArrived→arriving · day_done 18h→`{sky:"night",subject:"night_in"}` · day_done 01h→sky late · before_trip · after_trip · no_trip(stop null)→empty
  - extras: `{month:12,day:31,hour:21}`→["fireworks"] · `{1,1,0}`→["fireworks"] (Review Focus 4) · `{1,1,7}`→["new_year"] · `{12,31,14}`→[] · behind→มี "alarm"
- [ ] **Step 2:** `npx vitest run src/lib/scene` ต้อง FAIL
- [ ] **Step 3:** เขียน `skySlot` และ `pickScene` ใน `src/lib/scene/index.ts`
- [ ] **Step 4:** เทสต์ต้อง PASS · `npm run lint` ต้องไม่มี import ข้ามชั้น

### Task 4: ภาพวาดโปสการ์ด

**Files:**
- Create: `src/components/now/scene/sky.tsx`, `ground.tsx`, `subjects.tsx`, `extras.tsx`, `PostcardScene.tsx`, `scene.test.tsx`
- Modify: `src/components/ui/EmptyIllustration.tsx` (ลบได้ถ้าไม่มีที่ใช้แล้วหลัง Task 6)

**Interfaces:**
- Consumes: `Scene`, `SkySlot`, `SceneSubject`, `SceneExtra` (Task 3)
- Produces:
  - `SKY: Record<SkySlot, () => JSX.Element>` · `SUBJECTS: Record<SceneSubject, () => JSX.Element>` · `EXTRAS: Record<SceneExtra, () => JSX.Element>` · ทั้งหมดเป็น `<g>` ใน viewBox `0 0 320 150`
  - `function PostcardScene(props: { scene: Scene; height: number; className?: string }): JSX.Element` → `<svg aria-hidden viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice" style={{height}}>` วางชั้นตามลำดับ sky → ground → subject → extras
  - `ground` ซ่อนได้: subject `before_trip`, `trip_done` และ `empty` ใช้พื้นโต๊ะ/กระดาษแทนภูเขา

**สไตล์ (ทุกภาพต้องตรงกัน):**
- เส้นหมึก `#3a3428` 2px ปลายมน
- ใช้สีพื้นแบนจากชุดเดียวกับ mockup ไม่มี gradient ในตัวเรื่อง (gradient ใช้ได้แค่ท้องฟ้า)
- ตัวเรื่องวางกลางล่าง สูงไม่เกิน ~70% ของภาพ
- ภาพต้องอ่านออกแม้ crop เหลือ 72px: ตัวเรื่องต้องอยู่ในแถบ y 60–140

**ท้องฟ้า:**
- dawn: ชมพูม่วง + พระอาทิตย์ครึ่งดวง + หมอก
- morning: ฟ้าอ่อนอมส้ม + ดวงอาทิตย์
- day: ฟ้าใส + ดวงอาทิตย์สูง + เมฆ
- evening: ส้มแดง + ดวงอาทิตย์ต่ำ
- night: น้ำเงินเข้ม + จันทร์เสี้ยว + ดาว
- late: เกือบดำ + ดาวเยอะ

**ตัวเรื่อง:** ตามตารางข้อ 7 ของ spec
- departing: รถหน้าบ้านพัก + กระเป๋า
- arriving: รถหยุดข้างหมุดธง
- trip_done: กองรูปถ่าย + รถ
- empty: โปสการ์ดเปล่า + ดินสอ

**ของแต่ง:** fireworks = พลุ 3 ดอกบนฟ้า · new_year = ธงราวมีคำ "สวัสดีปีใหม่" (ใช้ font-hand) · alarm = นาฬิกาปลุกมุมขวาบน

- [ ] **Step 1: เขียนเทสต์ที่ล้ม** `scene.test.tsx`: `it.each(allSubjects × ["dawn","late"])` render `PostcardScene` ต้องไม่ throw, svg เป็น `aria-hidden="true"` และมี `<g>` อย่างน้อย 3 ชั้น · `it("renders extras on top")` ด้วย extras ทั้งสาม
- [ ] **Step 2:** รันแล้วต้อง FAIL
- [ ] **Step 3:** วาด SKY, ground, SUBJECTS, EXTRAS และเขียน PostcardScene (TypeScript จะ error ถ้าวาดไม่ครบทุก key)
- [ ] **Step 4:** เทสต์ต้อง PASS
- [ ] **Step 5:** ตรวจด้วยตา: ทำหน้าทดลองชั่วคราว `src/app/(app)/dev-scenes/page.tsx` เป็นกริดของทุก subject × 6 ท้องฟ้า (ใส่ `?dev=1` หรือไม่ link จากไหน) แล้วดูใน `npm run dev` · **ลบหน้านี้ก่อนจบ Task 8**

### Task 5: `Stamp` และ `PaperNote`

**Files:**
- Create: `src/components/ui/Stamp.tsx`, `src/components/ui/PaperNote.tsx`, `src/components/ui/paper.test.tsx`
- Modify: `src/components/now/AlertBanner.tsx`

**Interfaces:**
- Produces:
  - `Stamp({ children, size: "sm" | "md", tone: "red" | "blue" | "white", rotate?: number, className? })` → วงกลมขอบ 2px, font-hand, ตัดบรรทัดได้ (`sm` 52px, `md` 76px), ตัดคำยาวด้วย `line-clamp-3` + `break-words`, ค่าตั้งต้น rotate −12
  - `PaperNote({ children, role?, className? })` → กระดาษโน้ตพื้น `bg-warning-soft` ข้อความ `text-warning-ink` มีเทปมุมซ้ายบน เอียง 0.5°
- `AlertBanner` ใช้ `PaperNote role="alert"` · ข้อความ ไอคอน (`HandIcon "bell"`) และปุ่ม "ปิดการเตือน" เหมือนเดิม

- [ ] **Step 1: เขียนเทสต์ที่ล้ม** `paper.test.tsx`
  - `Stamp` กับชื่อยาว "พิพิธภัณฑ์เซรามิคธนบดีและศูนย์การเรียนรู้ลำปาง" ต้องมี class `line-clamp-3` และ `break-words` (Review Focus 1)
  - `PaperNote role="alert"` ต้องหาเจอด้วย `getByRole("alert")`
- [ ] **Step 2:** รันแล้วต้อง FAIL → เขียน component → รันแล้วต้อง PASS
- [ ] **Step 3:** แก้ AlertBanner · `npx vitest run src/components/now` ต้องผ่าน

### Task 6: หน้า "ตอนนี้" แบบสมุด

**Files:**
- Create: `src/components/now/Postcard.tsx`, `src/components/now/JournalHeader.tsx`
- Modify: `src/components/now/NowScreen.tsx`, `NextCard.tsx`, `RouteDots.tsx`, `InfoSheet.tsx`, `src/lib/schedule/format.ts`, `src/lib/schedule/format.test.ts`, `src/components/now/now.test.tsx`, `src/app/globals.css` (ลบ `--tint-*`)

**Interfaces:**
- Consumes: `pickScene` (Task 3), `PostcardScene` (Task 4), `Stamp`/`PaperNote` (Task 5), `HandIcon` (Task 2)
- Produces:
  - ใน `format.ts`: `formatDayOrdinal(dayNumber: number, totalDays: number): string` → 1 = "วันแรก", n === total และ total > 1 = "วันสุดท้าย", อื่น ๆ = `วันที่ ${n}`
  - ใน `format.ts`: `routeTitle(title: string | null | undefined): string | null` → ส่วนก่อน " · " ตัวแรก ตัดช่องว่าง · ว่างแล้วคืน null
  - `Postcard({ scene, pictureHeight, postmark?: string[], stamp?: { label: string; value: string }, children })` → `<section aria-label="ตอนนี้">` (เทสต์เดิมหาด้วย region "ตอนนี้"), เอียง −1.2°, มีเทป, `PostcardScene` + `Stamp tone="white"` สำหรับ postmark + แสตมป์มุมขวาบน
  - `JournalHeader({ dayNumber, totalDays, date, title, fallback })`
  - ลบ `tintFor` (และเทสต์ของมัน) ไปใช้ `skySlot` แทน

- [ ] **Step 1: เขียนเทสต์ที่ล้ม** ใน `format.test.ts`
  - `formatDayOrdinal`: (1,4)→"วันแรก", (2,4)→"วันที่ 2", (4,4)→"วันสุดท้าย", (1,1)→"วันแรก"
  - `routeTitle`: "ลำพูน → ลำปาง · เที่ยวเมืองลำปาง + ส่งท้ายปีเก่า"→"ลำพูน → ลำปาง", "เชียงราย"→"เชียงราย", null→null, " · x"→null (Review Focus 2)
- [ ] **Step 2:** รันแล้วต้อง FAIL → เขียนสองฟังก์ชันนี้ → รันแล้วต้อง PASS
- [ ] **Step 3: เพิ่มเทสต์ที่ล้ม** ใน `now.test.tsx`
  - 10:08 (at_stop ที่วัด) → หัวหน้ามี "วันแรก" และ "ลำพูน → ลำปาง" · การ์ด "ตอนนี้" มี "ถึง 09:20" (ในตราประทับ) และ "10:50"
  - 2026-12-31T21:00 ที่พัก (day_done) → การ์ดยังมี "จบวันนี้แล้ว"
  - ลบ `describe("tintFor")` เดิม
- [ ] **Step 4:** สร้าง `JournalHeader`, `Postcard` แล้วแก้ `NowScreen`
  - ทุก state ใช้ `Postcard` แทน `Card` ข้อความเดิมย้ายเข้าไปใน children ทั้งหมด
  - ตราประทับและแสตมป์ตามตารางข้อ 6 ของ spec
  - เลือก stop ส่ง `pickScene` ตามคอมเมนต์ใน `SceneInput`
  - `behind` = `overdue || late` (at_stop) หรือ `late` (in_transit)
  - local time จาก `getZonedParts(nowMs, tz)`
- [ ] **Step 5:** ความสูงภาพ: นับ `notes` = (alerts.length > 0) + (กล่องช้า/เลยเวลา) + (staleInProgress) → 0: 150, 1: 96, ≥2: 72
  - กล่องช้า/เลยเวลา และ stale ใช้ `PaperNote`
  - ตัวเลขใหญ่ (`Big`) ใช้ `text-primary` ปกติ ถ้าเลยเวลาใช้ `text-warning-ink`
- [ ] **Step 6:** แก้ส่วนอื่นของหน้า
  - `NextCard`: แถบต้นขั้วตั๋ว ขอบซ้ายเป็นรอยปรุ (radial-gradient เจาะครึ่งวงกลมบน/ล่าง + เส้นประ) ใช้ไอคอน `car`/`lock` แบบวาดมือ
  - `RouteDots`: ไม่มีกรอบการ์ด ถนนประวาดมือ (SVG path) หมุดเสร็จเป็นวงหมึกแดงมี ✓, กำลังอยู่เป็นน้ำเงินมีวง, ข้ามเป็นวงประ ข้อความเดิม
  - `InfoButton`: แถบดัชนีสมุด (มุมขวาบนตัดเฉียง, พื้นการ์ด) ใช้ไอคอน `notebook`
  - Skeleton และ NoTrip ตาม spec ข้อ 6 (NoTrip ใช้ `PostcardScene` subject `empty`)
  - ปุ่มทั้งหมดเปลี่ยนไปใช้ `HandIcon`
  - เพิ่ม `.paper-margin` ที่ root ของหน้า
- [ ] **Step 7:** ลบ `--tint-*` ออกจาก `globals.css` และ `@theme` · รัน `npm test` ทั้งหมดต้องผ่าน (เทสต์เดิม + ใหม่)

### Task 7: รายการ "แผนของวันนี้" แบบสมุด

**Files:**
- Modify: `src/components/now/TodayList.tsx`
- Test: `src/components/now/now.test.tsx` (เพิ่ม describe ของ TodayList, render ตรงด้วย stop ตัวอย่าง)

**Interfaces:**
- Consumes: `Stamp` (Task 5), `HandIcon`/`StopTypeIcon` (Task 2)
- Produces: `TodayList({ stops, dayNumber, timeZone })` props เดิม

- [ ] **Step 1: เขียนเทสต์ที่ล้ม**
  - stop completed `completed_at` 09:21 → มีข้อความ "เสร็จ 09:21" และชื่อมี class `line-through`
  - origin (index 0) completed → "ออก 08:02"
  - in_progress → "อยู่ที่นี่"
  - skipped → "ข้าม"
  - not_started → เวลาแผน "11:20"
  - ชื่อยาว 40 ตัวอักษร → ชื่อมี `truncate` หรือ `break-words` (Review Focus 1)
  - ยังมีลิงก์ "ดูทั้งหมด" → `/plan?day=1`
- [ ] **Step 2:** รันแล้วต้อง FAIL
- [ ] **Step 3:** เขียนใหม่ตามข้อ 6.7 ของ spec
  - หัวข้อ font-hand ไม่มีกรอบการ์ด
  - เส้นประแนวตั้งใช้ `StopTypeIcon` เป็นหมุด
  - แถวสูง ≥ 44px
  - ตราประทับเป็น `Stamp size="sm" tone="red"` ข้อความ "เสร็จ\nHH:MM" ที่อ่านเป็น textContent ได้ "เสร็จ 09:21" (ใช้ช่องว่าง + `<br>`)
  - ไม่ใช้ `StatusChip` แล้ว
- [ ] **Step 4:** เทสต์ต้อง PASS

### Task 8: ตรวจทั้งระบบ

**Files:** ไม่มีโค้ดใหม่ (แก้ตามที่เจอ) · ลบ `src/app/(app)/dev-scenes/`

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm test && npm run build` ต้องผ่านทั้งหมด
- [ ] **Step 2:** `npm run dev` แล้วเปิดที่ 390×844 ด้วยนาฬิกาจำลอง ส่วน 0–4 ต้องอยู่เหนือแถบเมนูในทุก state
  - `2026-11-20T10:00` before_trip
  - `2026-12-31T07:50` pre_departure + การเตือน
  - เวลากำลังขับ (in_transit)
  - `T10:08` at_stop
  - at_stop ที่ช้าและเลยเวลา (`T11:05`) + การเตือน → ภาพ 72px (Review Focus 5)
  - `T21:00` day_done
  - `2027-01-01T00:30` พลุ + ฟ้าดึก
  - `2027-01-01T07:30` ธงปีใหม่
  - หลังทริป และไม่มีทริป
- [ ] **Step 3:** ตรวจหน้าแผนเที่ยว ตั้งค่า และ login ที่ 390×844: อ่านได้ ไม่มีพื้นดำหรือสีค้างจากโหมดมืด ปุ่มแบบใหม่ไม่ล้น
- [ ] **Step 4:** `npm run build && npm start` เปิดหน้าแรก แล้วปิด network ใน DevTools และ reload → Mali ยังแสดง (ดูใน Network ว่าไฟล์ฟอนต์มาจาก ServiceWorker)
- [ ] **Step 5:** ตรวจคอนทราสต์: ข้อความ ink-2 บนกระดาษ, warning-ink บน warning-soft, ขาวบน primary ต้อง ≥ 4.5:1 (คำนวณจากค่า hex ใส่ในรายงาน)

### Task 9: รายงานและ commit

- [ ] **Step 1:** รายงานผู้ใช้เป็นภาษาไทย: ทำอะไรไป, วิธีทดสอบเอง (URL นาฬิกาจำลองของแต่ละ state), การตัดสินใจที่ทำเอง แล้วหยุดรอผู้ใช้ตรวจ
- [ ] **Step 2:** เมื่อผู้ใช้อนุมัติแล้วเท่านั้น:
```bash
git add -A src docs CLAUDE.md .gitignore
git commit -m "Journal theme and postcard Now page"
```
