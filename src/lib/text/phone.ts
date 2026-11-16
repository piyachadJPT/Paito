/**
 * Split free text into plain parts and Thai phone numbers so the "ข้อมูลสำคัญ"
 * note can render tappable tel: links (SPEC §10.3 item 6). Pure.
 */

export type NotePart = { kind: "text"; text: string } | { kind: "phone"; text: string; tel: string };

// 0XX-XXX-XXXX, 0X-XXX-XXXX, +66 X XXXX XXXX, short hotlines like 1669 / 1584
const PHONE_RE = /(?:\+66[\s-]?\d(?:[\s-]?\d){7,8}|0\d(?:[\s-]?\d){7,8}|\b1\d{3}\b)/g;

export function splitPhones(text: string): NotePart[] {
  const parts: NotePart[] = [];
  let last = 0;
  for (const m of text.matchAll(PHONE_RE)) {
    const start = m.index!;
    if (start > last) parts.push({ kind: "text", text: text.slice(last, start) });
    const raw = m[0];
    parts.push({ kind: "phone", text: raw, tel: raw.replace(/[\s-]/g, "") });
    last = start + raw.length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}
