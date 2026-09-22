import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-center">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-900 text-white font-bold text-sm tracking-wider group-hover:bg-emerald-800 transition-colors">
            BS
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            BhumiSetu
          </span>
        </Link>
      </div>

      <div className="my-auto py-6">{children}</div>

      <footer className="text-center text-xs text-slate-400">
        Secure Citizen & Officer Gateway • BhumiSetu
      </footer>
    </div>
  );
}
