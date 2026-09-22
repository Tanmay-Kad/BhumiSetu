import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth/context";
import "./globals.css";

export const metadata: Metadata = {
  title: "BhumiSetu | Land Governance Platform",
  description:
    "A GIS-based, parcel-centric digital platform for land governance in India.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
