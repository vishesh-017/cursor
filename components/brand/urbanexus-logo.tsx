import { cn } from "@/utils/cn";

type Props = {
  className?: string;
  markClassName?: string;
  wordmark?: boolean;
  inverted?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { mark: "h-8 w-8", text: "text-base", sub: "text-[9px]" },
  md: { mark: "h-10 w-10", text: "text-lg", sub: "text-[10px]" },
  lg: { mark: "h-12 w-12", text: "text-2xl", sub: "text-xs" },
};

export function UrbanexusLogo({
  className,
  markClassName,
  wordmark = true,
  inverted = false,
  size = "md",
}: Props) {
  const s = sizes[size];
  const gradId = `uxMark-${size}-${inverted ? "inv" : "std"}`;

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative grid place-items-center overflow-hidden rounded-2xl shadow-lg",
          s.mark,
          markClassName
        )}
        aria-hidden
      >
        <svg viewBox="0 0 40 40" className="h-full w-full" role="img">
          <defs>
            <linearGradient id={gradId} x1="8" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#14b8a6" />
              <stop offset="1" stopColor="#0f766e" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="12" fill={`url(#${gradId})`} />
          <path
            d="M8 26c4-9 8-14 12-14s8 5 12 14"
            fill="none"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="20" cy="14" r="2.4" fill="#f8fafc" />
          <path
            d="M12 28h16"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {wordmark ? (
        <span className="min-w-0 leading-tight">
          <span
            className={cn(
              "block font-display font-semibold tracking-tight",
              s.text,
              inverted ? "text-white" : "text-[var(--foreground)]"
            )}
          >
            Urbanexus
          </span>
          <span
            className={cn(
              "block font-semibold uppercase tracking-[0.18em]",
              s.sub,
              inverted ? "text-teal-100/80" : "text-[var(--muted)]"
            )}
          >
            AMC Smart City
          </span>
        </span>
      ) : (
        <span className="sr-only">Urbanexus</span>
      )}
    </span>
  );
}
