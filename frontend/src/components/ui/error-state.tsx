import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  onRetry?: () => void;
  action?: React.ReactNode;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  action,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-rose-200 bg-rose-50/60 p-6 text-center text-rose-900",
        className
      )}
      role="alert"
      {...props}
    >
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-rose-700 leading-relaxed max-w-md mx-auto">
        {message}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
