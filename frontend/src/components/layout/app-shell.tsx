"use client";

import React, { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <Header onToggleMobileNav={() => setMobileNavOpen(true)} />
      
      <div className="flex flex-1">
        <Sidebar />
        <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
