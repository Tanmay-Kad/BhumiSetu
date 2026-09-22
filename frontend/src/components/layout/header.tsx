"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Badge, Button } from "@/components/ui";

interface HeaderProps {
  onToggleMobileNav?: () => void;
}

export function Header({ onToggleMobileNav }: HeaderProps) {
  const { user, role, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {onToggleMobileNav && (
          <button
            type="button"
            onClick={onToggleMobileNav}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700 md:hidden"
            aria-label="Toggle navigation menu"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}

        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-900 text-white font-bold text-sm tracking-wider">
            BS
          </div>
          <div>
            <span className="text-base font-bold text-slate-900 tracking-tight block leading-tight">
              BhumiSetu
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium block">
              Land Governance
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800">
                {user.name || user.email}
              </span>
              <span className="text-[11px] text-slate-500">{user.email}</span>
            </div>

            {role && (
              <Badge
                variant={
                  role === "ADMIN"
                    ? "danger"
                    : role === "OFFICER"
                    ? "info"
                    : "success"
                }
              >
                {role}
                {user.department ? ` • ${user.department}` : ""}
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-xs font-medium"
            >
              Logout
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="outline" size="sm">
                Log In
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm">
                Register
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
