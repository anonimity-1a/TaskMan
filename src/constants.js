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
  stone: { dot: "bg-stone-400", text: "text-stone-300", chip: "bg-white/10 text-stone-200" },
  indigo: { dot: "bg-indigo-400", text: "text-indigo-300", chip: "bg-indigo-400/15 text-indigo-200" },
  emerald: { dot: "bg-emerald-400", text: "text-emerald-300", chip: "bg-emerald-400/15 text-emerald-200" },
  amber: { dot: "bg-amber-400", text: "text-amber-300", chip: "bg-amber-400/15 text-amber-100" },
  rose: { dot: "bg-rose-400", text: "text-rose-300", chip: "bg-rose-400/15 text-rose-100" },
  sky: { dot: "bg-sky-400", text: "text-sky-300", chip: "bg-sky-400/15 text-sky-100" },
  violet: { dot: "bg-violet-400", text: "text-violet-300", chip: "bg-violet-400/15 text-violet-100" },
};

export const PRIORITY_META = {
  1: { circle: "border-[#de4c4a]", text: "text-[#de4c4a]", flag: "text-[#de4c4a]" },
  2: { circle: "border-[#eb8909]", text: "text-[#eb8909]", flag: "text-[#eb8909]" },
  3: { circle: "border-[#246fe0]", text: "text-[#246fe0]", flag: "text-[#246fe0]" },
  4: { circle: "border-[#8d8d8d]", text: "text-[#c8c8c8]", flag: "text-[#d4d4d4]" },
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
