"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { classNames } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      children,
      leftIcon,
      rightIcon,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={classNames(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
          variant === "primary" &&
            "bg-dark-surface text-white px-4 py-2.5 text-sm hover:opacity-90",
          variant === "secondary" &&
            "bg-surface border border-border text-text-primary px-4 py-2.5 text-sm hover:bg-surface-secondary",
          variant === "icon" &&
            "w-9 h-9 border border-border rounded-md bg-surface text-text-secondary hover:bg-surface-secondary",
          className
        )}
        {...props}
      >
        {leftIcon && <span className="w-4 h-4">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="w-4 h-4">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
