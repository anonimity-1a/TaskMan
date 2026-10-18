export const INBOX_ID = "inbox";

export const COLORS = [
  "stone",
  "indigo",
  "emerald",
  "amber",
  "rose",
  "sky",
  "violet",
];

export const COLOR_STYLES = {
  stone: { dot: "bg-stone-400", chip: "bg-stone-100 text-stone-700" },
  indigo: { dot: "bg-indigo-500", chip: "bg-indigo-50 text-indigo-700" },
  emerald: { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
  amber: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800" },
  rose: { dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700" },
  sky: { dot: "bg-sky-500", chip: "bg-sky-50 text-sky-800" },
  violet: { dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700" },
};

export const PRIORITY_STYLES = {
  1: "border-rose-500",
  2: "border-amber-500",
  3: "border-sky-500",
  4: "border-stone-300",
};

export const cycleColor = (current) => {
  const index = COLORS.indexOf(current);
  return COLORS[(index + 1) % COLORS.length];
};

export const normalizePriority = (value) =>
  value === 1 || value === 2 || value === 3 || value === 4 ? value : 4;
