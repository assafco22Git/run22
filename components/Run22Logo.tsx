import { cn } from "@/lib/utils";

interface Run22LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Run22Logo({ className, size = "md" }: Run22LogoProps) {
  const dimensions = {
    sm: { width: 72, height: 24 },
    md: { width: 96, height: 32 },
    lg: { width: 140, height: 46 },
  };

  const { width, height } = dimensions[size];

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 96 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-label="run22"
    >
      {/* Speed lines — left side */}
      <line x1="0" y1="14" x2="9" y2="14" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" className="dark:stroke-gray-200" />
      <line x1="0" y1="19" x2="6" y2="19" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" className="dark:stroke-gray-200" />
      <line x1="0" y1="24" x2="4" y2="24" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" className="dark:stroke-gray-200" />

      {/* "run" — dark navy, bold italic */}
      <text
        x="12"
        y="26"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontWeight="800"
        fontSize="24"
        fill="#0f172a"
        className="dark:fill-gray-100"
        letterSpacing="-0.5"
      >
        run
      </text>

      {/* "22" — medium gray, bold italic */}
      <text
        x="57"
        y="26"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontWeight="800"
        fontSize="24"
        fill="#64748b"
        className="dark:fill-gray-400"
        letterSpacing="-0.5"
      >
        22
      </text>

      {/* Speed lines — top right of "22" */}
      <line x1="87" y1="5" x2="96" y2="5" stroke="#64748b" strokeWidth="2" strokeLinecap="round" className="dark:stroke-gray-400" />
      <line x1="90" y1="10" x2="96" y2="10" stroke="#64748b" strokeWidth="2" strokeLinecap="round" className="dark:stroke-gray-400" />
    </svg>
  );
}
