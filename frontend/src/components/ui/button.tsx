import React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-md";

    const variants = {
      primary:
        "bg-emerald-900 text-white hover:bg-emerald-800 focus:ring-emerald-800 shadow-xs",
      secondary:
        "bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-slate-400 border border-slate-200",
      outline:
        "bg-transparent text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400",
      ghost:
        "bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-400",
      danger:
        "bg-rose-700 text-white hover:bg-rose-800 focus:ring-rose-600 shadow-xs",
    };

    const sizes = {
      sm: "text-xs px-2.5 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2 gap-2",
      lg: "text-base px-6 py-2.5 gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Spinner size="sm" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
