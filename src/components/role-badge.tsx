export type Role = "GK" | "DF" | "MF" | "FW";

// Filled circle + white letter, matching leghe.fantacalcio.it's own badges:
// P (GK) amber, D (DF) emerald, C (MF) sky, A (FW) rose. The -700 step (not
// -500) is what actually clears WCAG AA (4.5:1) for white text on these —
// verified by computing real contrast ratios from Tailwind v4's OKLCH
// palette: -500 lands 2.1:1-3.8:1, -700 lands 5.0:1-6.1:1 across all four.
const roleStyles: Record<Role, string> = {
  GK: "bg-amber-700 text-white",
  DF: "bg-emerald-700 text-white",
  MF: "bg-sky-700 text-white",
  FW: "bg-rose-700 text-white",
};

const sizeClasses: Record<"sm" | "md" | "lg", string> = {
  sm: "h-4 w-4 text-[9px]",
  md: "h-5 w-5 text-[10px]",
  lg: "h-7 w-7 text-xs",
};

export function RoleBadge({
  position,
  t,
  size = "md",
}: {
  position: Role;
  t: (key: string) => string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold uppercase ${sizeClasses[size]} ${roleStyles[position]}`}
    >
      {t(position)}
    </span>
  );
}
