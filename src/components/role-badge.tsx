export type Role = "GK" | "DF" | "MF" | "FW";

// Filled circle + white letter, matching leghe.fantacalcio.it's own badges:
// P (GK) amber, D (DF) emerald, C (MF) sky, A (FW) rose.
const roleStyles: Record<Role, string> = {
  GK: "bg-amber-500 text-white",
  DF: "bg-emerald-500 text-white",
  MF: "bg-sky-500 text-white",
  FW: "bg-rose-500 text-white",
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
