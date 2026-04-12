import { cn } from "@/lib/utils";

interface Run22LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: { text: "text-lg", lines: "gap-[3px]", lineW: ["w-5", "w-3.5", "w-2"], lineH: "h-[2px]", wrapper: "gap-1.5" },
  md: { text: "text-2xl", lines: "gap-[4px]", lineW: ["w-6", "w-4", "w-2.5"], lineH: "h-[2.5px]", wrapper: "gap-2" },
  lg: { text: "text-4xl", lines: "gap-[5px]", lineW: ["w-9", "w-6", "w-3.5"], lineH: "h-[3px]", wrapper: "gap-2.5" },
};

export function Run22Logo({ className, size = "md" }: Run22LogoProps) {
  const s = sizeStyles[size];

  return (
    <div
      className={cn("flex items-center shrink-0", s.wrapper, className)}
      aria-label="run22"
      style={{ fontFamily: "var(--font-sans), sans-serif" }}
    >
      {/* Speed lines — left of text */}
      <div className={cn("flex flex-col items-start self-center", s.lines)}>
        <div className={cn("rounded-full bg-slate-800 dark:bg-gray-200", s.lineH, s.lineW[0])} />
        <div className={cn("rounded-full bg-slate-800 dark:bg-gray-200", s.lineH, s.lineW[1])} />
        <div className={cn("rounded-full bg-slate-800 dark:bg-gray-200", s.lineH, s.lineW[2])} />
      </div>

      {/* Logotype */}
      <div className={cn("flex items-baseline leading-none", s.text)}>
        <span className="font-extrabold italic text-slate-900 dark:text-gray-100 tracking-tight">
          run
        </span>
        <span className="font-extrabold italic text-slate-400 dark:text-slate-500 tracking-tight">
          22
        </span>
      </div>
    </div>
  );
}
