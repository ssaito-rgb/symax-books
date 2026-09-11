import type { Counterparty } from "@/lib/accounting/types";

const ZEN2HAN: Record<string, string> = {
  "０": "0", "１": "1", "２": "2", "３": "3", "４": "4",
  "５": "5", "６": "6", "７": "7", "８": "8", "９": "9",
  "，": ",", "．": ".",
};

function normalizeDigits(s: string): string {
  return s.replace(/[０-９，．]/g, (ch) => ZEN2HAN[ch] ?? ch);
}

function isoFrom(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  if (dt.getTime() > Date.now() + 86_400_000) return null; // reject implausible future dates
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const DATE_PATTERNS: { re: RegExp; toISO: (m: RegExpMatchArray) => string | null }[] = [
  { re: /(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日/, toISO: (m) => isoFrom(+m[1], +m[2], +m[3]) },
  { re: /(20\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/, toISO: (m) => isoFrom(+m[1], +m[2], +m[3]) },
  { re: /[Rr令和]\s?(\d{1,2})[.\/年]\s?(\d{1,2})[.\/月]\s?(\d{1,2})日?/, toISO: (m) => isoFrom(2018 + +m[1], +m[2], +m[3]) },
  { re: /[Hh平成]\s?(\d{1,2})[.\/年]\s?(\d{1,2})[.\/月]\s?(\d{1,2})日?/, toISO: (m) => isoFrom(1988 + +m[1], +m[2], +m[3]) },
  { re: /(?<!\d)(\d{1,2})[\/\-](\d{1,2})(?!\d)/, toISO: (m) => isoFrom(new Date().getFullYear(), +m[1], +m[2]) },
];

export function extractDate(text: string): string | null {
  const normalized = normalizeDigits(text);
  for (const { re, toISO } of DATE_PATTERNS) {
    const m = normalized.match(re);
    if (m) {
      const iso = toISO(m);
      if (iso) return iso;
    }
  }
  return null;
}

const TOTAL_KEYWORDS_PRIORITY = [
  "お会計", "ご請求金額", "御請求金額", "請求金額", "合計金額", "税込合計", "お買上合計", "合計", "計",
];
const EXCLUDE_LINE_TERMS = [
  "tel", "電話", "fax", "登録番号", "no.", "レシートno", "お預り", "おつり", "釣", "枚数", "数量", "カード番号",
];
const AMOUNT_RE = /[¥￥]?\s?(\d{1,3}(?:,\d{3})+|\d{4,7})\s?円?/g;

export function extractTotalAmount(text: string): number | null {
  const lines = normalizeDigits(text).split("\n").map((l) => l.trim());

  for (const keyword of TOTAL_KEYWORDS_PRIORITY) {
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes(keyword)) continue;
      if (EXCLUDE_LINE_TERMS.some((t) => lines[i].toLowerCase().includes(t))) continue;
      // Prefer amounts on the keyword's own line; only look at the next line
      // (OCR sometimes wraps the value) when the keyword line has none itself —
      // otherwise a larger unrelated number below (e.g. お預り) can win by mistake.
      const onLine = [...lines[i].matchAll(AMOUNT_RE)]
        .map((m) => Number(m[1].replace(/,/g, "")))
        .filter((v) => Number.isFinite(v) && v > 0);
      if (onLine.length) return Math.max(...onLine);

      const nextLine = lines[i + 1] ?? "";
      if (EXCLUDE_LINE_TERMS.some((t) => nextLine.toLowerCase().includes(t))) continue;
      const onNextLine = [...nextLine.matchAll(AMOUNT_RE)]
        .map((m) => Number(m[1].replace(/,/g, "")))
        .filter((v) => Number.isFinite(v) && v > 0);
      if (onNextLine.length) return Math.max(...onNextLine);
    }
  }

  const candidates: { value: number; hasYenMark: boolean }[] = [];
  for (const line of lines) {
    if (EXCLUDE_LINE_TERMS.some((t) => line.toLowerCase().includes(t))) continue;
    for (const m of line.matchAll(AMOUNT_RE)) {
      const value = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(value) && value > 0 && value <= 10_000_000) {
        candidates.push({ value, hasYenMark: /[¥￥円]/.test(m[0]) });
      }
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => Number(b.hasYenMark) - Number(a.hasYenMark) || b.value - a.value);
  return candidates[0].value;
}

const BOILERPLATE_LINES = ["領収書", "レシート", "納品書", "御見積書", "ご利用明細", "お客様控え", "キャッシュレス決済"];
const POSTAL_RE = /〒?\d{3}-?\d{4}/;
const PHONE_RE = /0\d{1,4}-\d{2,4}-\d{3,4}/;

function looksLikeVendorLine(line: string): boolean {
  if (line.length < 2 || line.length > 40) return false;
  if (BOILERPLATE_LINES.some((b) => line.includes(b))) return false;
  if (POSTAL_RE.test(line) || PHONE_RE.test(line)) return false;
  if (/^[\d\s\-,.\/円¥]+$/.test(line)) return false;
  return true;
}

export function extractVendorCandidate(text: string): string | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.slice(0, 5).find(looksLikeVendorLine) ?? null;
}

const CORP_AFFIXES = ["株式会社", "（株）", "(株)", "㈱", "有限会社", "合同会社", "合資会社", "合名会社"];

function normalizeCompanyName(name: string): string {
  let s = name.replace(/\s+/g, "");
  for (const a of CORP_AFFIXES) s = s.split(a).join("");
  return s.toLowerCase();
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export function matchCounterparty(
  candidate: string,
  counterparties: Counterparty[],
  threshold = 0.7,
): { counterpartyId: string | null } {
  const norm = normalizeCompanyName(candidate);
  let best: { id: string; score: number } | null = null;
  for (const cp of counterparties) {
    const targets = [normalizeCompanyName(cp.name), cp.kana ? normalizeCompanyName(cp.kana) : ""].filter(Boolean);
    for (const target of targets) {
      const maxLen = Math.max(norm.length, target.length, 1);
      const score = 1 - levenshtein(norm, target) / maxLen;
      if (score >= threshold && (!best || score > best.score)) best = { id: cp.id, score };
    }
  }
  return { counterpartyId: best?.id ?? null };
}

export type ParsedReceipt = {
  date: string | null;
  amount: number | null;
  vendorRaw: string | null;
  counterpartyId: string | null;
};

export function parseReceiptText(text: string, counterparties: Counterparty[]): ParsedReceipt {
  const vendorRaw = extractVendorCandidate(text);
  const { counterpartyId } = vendorRaw ? matchCounterparty(vendorRaw, counterparties) : { counterpartyId: null };
  return {
    date: extractDate(text),
    amount: extractTotalAmount(text),
    vendorRaw,
    counterpartyId,
  };
}
