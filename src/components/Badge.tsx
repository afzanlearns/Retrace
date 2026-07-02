import type { ReactNode } from "react";
import { classNames } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "mono";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium",
        variant === "default" &&
          "bg-surface-secondary text-text-secondary border border-border",
        variant === "mono" &&
          "bg-surface-secondary text-text-tertiary font-mono",
        className
      )}
    >
      {children}
    </span>
  );
}
