import type { ReactNode } from "react";

export type BadgeTone = "emerald" | "amber" | "crimson" | "neutral";

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const DOT_CLASSES: Record<BadgeTone, string> = {
  emerald: "bg-status-emerald",
  amber: "bg-status-amber",
  crimson: "bg-status-crimson",
  neutral: "bg-text-muted",
};

const TEXT_CLASSES: Record<BadgeTone, string> = {
  emerald: "text-text-primary border-border-default bg-bg-secondary",
  amber: "text-text-primary border-border-default bg-bg-secondary",
  crimson: "text-status-crimson border-status-crimson/30 bg-status-crimson/5",
  neutral: "text-text-secondary border-border-default bg-bg-secondary",
};

export function Badge({
  tone = "neutral",
  dot = true,
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium leading-4 ${TEXT_CLASSES[tone]} ${className}`}
    >
      {dot ? (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT_CLASSES[tone]}`}
          aria-hidden="true"
        />
      ) : null}
      <span>{children}</span>
    </span>
  );
}
