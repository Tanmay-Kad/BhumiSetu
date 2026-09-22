import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = error && inputId ? `${inputId}-error` : undefined;
    const helperId = helperText && inputId ? `${inputId}-helper` : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
          >
            {label}
            {props.required && <span className="text-rose-600 ml-0.5">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={errorId || helperId}
          className={cn(
            "w-full rounded-md border bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
            error ? "border-rose-500 focus:ring-rose-500" : "border-slate-300",
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-rose-600 font-medium">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
