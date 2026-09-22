"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { role, user, logout } = useAuth();

  // Close drawer when pathname changes
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const citizenNav = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "My Properties", href: "/properties" },
    { label: "Applications", href: "/applications" },
    { label: "Notifications", href: "/notifications" },
    { label: "Profile", href: "/profile" },
  ];

  const officerNav = [
    { label: "Department Dashboard", href: "/officer/dashboard" },
    { label: "Workflow Inbox", href: "/officer/applications" },
    { label: "Profile", href: "/profile" },
  ];

  const adminNav = [
    { label: "Admin Overview", href: "/admin/dashboard" },
    { label: "All Applications", href: "/officer/applications" },
    { label: "Profile", href: "/profile" },
  ];

  const items = role === "ADMIN" ? adminNav : role === "OFFICER" ? officerNav : citizenNav;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white p-6 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-900 text-white font-bold text-sm">
                BS
              </div>
              <span className="text-base font-bold text-slate-900">BhumiSetu</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              aria-label="Close navigation"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {user && (
            <div className="py-4 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-900">{user.name || user.email}</p>
              <p className="text-[11px] text-slate-500">{user.email}</p>
              <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {role} {user.department ? `(${user.department})` : ""}
              </span>
            </div>
          )}

          <nav className="mt-4 space-y-1">
            {items.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-emerald-50 text-emerald-950 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {user && (
          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={logout}
              className="w-full text-left rounded-md px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
