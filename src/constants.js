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

export const PROJECT_COLORS = [
  { id: "berry", name: "Berry Red", hex: "#b8256f" },
  { id: "red", name: "Red", hex: "#db4035" },
  { id: "orange", name: "Orange", hex: "#ff9933" },
  { id: "yellow", name: "Yellow", hex: "#fad000" },
  { id: "olive", name: "Olive Green", hex: "#afb83b" },
  { id: "lime", name: "Lime Green", hex: "#7ecc49" },
  { id: "green", name: "Green", hex: "#299438" },
  { id: "mint", name: "Mint Green", hex: "#6accbc" },
  { id: "teal", name: "Teal", hex: "#158fad" },
  { id: "skyblue", name: "Sky Blue", hex: "#14aaf5" },
  { id: "lightblue", name: "Light Blue", hex: "#96c3eb" },
  { id: "blue", name: "Blue", hex: "#4073ff" },
  { id: "grape", name: "Grape", hex: "#884dff" },
  { id: "violet", name: "Violet", hex: "#af38eb" },
  { id: "lavender", name: "Lavender", hex: "#eb96eb" },
  { id: "magenta", name: "Magenta", hex: "#e05194" },
  { id: "salmon", name: "Salmon", hex: "#ff8d85" },
  { id: "charcoal", name: "Charcoal", hex: "#808080" },
  { id: "grey", name: "Grey", hex: "#b8b8b8" },
  { id: "taupe", name: "Taupe", hex: "#ccac93" },
];

const LEGACY_PROJECT_HEX = {
  stone: "#a8a29e",
  indigo: "#818cf8",
  emerald: "#34d399",
  amber: "#fbbf24",
  rose: "#fb7185",
  sky: "#38bdf8",
  violet: "#a78bfa",
};

export const isProjectColor = (value) =>
  PROJECT_COLORS.some((color) => color.id === value) || Object.hasOwn(LEGACY_PROJECT_HEX, value);

export const projectColorHex = (value) =>
  PROJECT_COLORS.find((color) => color.id === value)?.hex ?? LEGACY_PROJECT_HEX[value] ?? "#808080";

export const projectColorName = (value) =>
  PROJECT_COLORS.find((color) => color.id === value)?.name ?? "Charcoal";

export const COLOR_STYLES = {
  stone: { dot: "bg-stone-400", text: "text-stone-600 dark:text-stone-300", chip: "tm-chip bg-white/10 text-stone-700 dark:text-stone-200" },
  indigo: { dot: "bg-indigo-400", text: "text-indigo-700 dark:text-indigo-300", chip: "tm-chip bg-indigo-400/15 text-indigo-800 dark:text-indigo-200" },
  emerald: { dot: "bg-emerald-400", text: "text-emerald-700 dark:text-emerald-300", chip: "tm-chip bg-emerald-400/15 text-emerald-800 dark:text-emerald-200" },
  amber: { dot: "bg-amber-400", text: "text-amber-700 dark:text-amber-300", chip: "tm-chip bg-amber-400/15 text-amber-800 dark:text-amber-100" },
  rose: { dot: "bg-rose-400", text: "text-rose-700 dark:text-rose-300", chip: "tm-chip bg-rose-400/15 text-rose-800 dark:text-rose-100" },
  sky: { dot: "bg-sky-400", text: "text-sky-700 dark:text-sky-300", chip: "tm-chip bg-sky-400/15 text-sky-800 dark:text-sky-100" },
  violet: { dot: "bg-violet-400", text: "text-violet-700 dark:text-violet-300", chip: "tm-chip bg-violet-400/15 text-violet-800 dark:text-violet-100" },
};

export const PRIORITY_META = {
  1: { circle: "border-[var(--p1)]", text: "text-[var(--p1)]", flag: "text-[var(--p1)]" },
  2: { circle: "border-[var(--p2)]", text: "text-[var(--p2)]", flag: "text-[var(--p2)]" },
  3: { circle: "border-[var(--p3)]", text: "text-[var(--p3)]", flag: "text-[var(--p3)]" },
  4: { circle: "border-[var(--p4)]", text: "text-neutral-100", flag: "text-neutral-300" },
};

export const PRIORITY_STYLES = {
  1: PRIORITY_META[1].circle,
  2: PRIORITY_META[2].circle,
  3: PRIORITY_META[3].circle,
  4: PRIORITY_META[4].circle,
};

export const cycleColor = (current) => {
  const index = PROJECT_COLORS.findIndex((color) => color.id === current);
  return PROJECT_COLORS[(index + 1) % PROJECT_COLORS.length].id;
};

export const normalizePriority = (value) =>
  value === 1 || value === 2 || value === 3 || value === 4 ? value : 4;
