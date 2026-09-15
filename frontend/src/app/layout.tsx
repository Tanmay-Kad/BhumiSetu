import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BhumiSetu",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
