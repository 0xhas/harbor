export type CardKey =
  | "about"
  | "ratings"
  | "canvas"
  | "showcase"
  | "lists"
  | "badges"
  | "activity"
  | "comments";

export const CARD_ORDER_DEFAULT: CardKey[] = [
  "about",
  "ratings",
  "canvas",
  "showcase",
  "lists",
  "badges",
  "activity",
  "comments",
];

export const CARD_LABELS: Record<CardKey, string> = {
  about: "About",
  ratings: "Ratings",
  canvas: "Custom",
  showcase: "Showcase",
  lists: "Lists",
  badges: "Badges",
  activity: "Recent activity",
  comments: "Comments",
};

export type CardLayout = { order?: string[]; hidden?: string[] };

const KNOWN = new Set<string>(CARD_ORDER_DEFAULT);

export function sanitizeLayout(raw: unknown): CardLayout {
  const l = (raw ?? {}) as { order?: unknown; hidden?: unknown };
  const order = Array.isArray(l.order) ? l.order.filter((k): k is string => typeof k === "string" && KNOWN.has(k)) : [];
  const hidden = Array.isArray(l.hidden) ? l.hidden.filter((k): k is string => typeof k === "string" && KNOWN.has(k)) : [];
  return { order: [...new Set(order)], hidden: [...new Set(hidden)] };
}

export function effectiveOrder(layout: CardLayout | undefined, present: CardKey[]): CardKey[] {
  const order = layout?.order?.length ? layout.order : CARD_ORDER_DEFAULT;
  const seen = new Set<string>();
  const out: CardKey[] = [];
  for (const k of order) {
    if (present.includes(k as CardKey) && !seen.has(k)) {
      seen.add(k);
      out.push(k as CardKey);
    }
  }
  for (const k of present) if (!seen.has(k)) out.push(k);
  return out;
}

export function moveCard(order: CardKey[], key: CardKey, dir: -1 | 1): CardKey[] {
  const i = order.indexOf(key);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return order;
  const next = order.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
