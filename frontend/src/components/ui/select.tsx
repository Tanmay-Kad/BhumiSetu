import React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, id, options, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
          >
            {label}
            {props.required && <span className="text-rose-600 ml-0.5">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          aria-invalid={!!error}
          className={cn(
            "w-full rounded-md border bg-white px-3.5 py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
            error ? "border-rose-500 focus:ring-rose-500" : "border-slate-300",
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && (
          <p className="text-xs text-rose-600 font-medium">{error}</p>
        )}
        {!error && helperText && (
          <p className="text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
