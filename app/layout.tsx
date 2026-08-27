import type { Metadata } from "next";
import "./globals.css";
import { IdleSessionGuard } from "@/components/IdleSessionGuard";

export const metadata: Metadata = {
  title: "DPS Echo — School Management System (DPS Kanpur)",
  description: "Enterprise Student Lifecycle & Fee Management Platform for DPS Kanpur Campuses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-emerald-800 selection:text-white">
        <IdleSessionGuard />
        {children}
      </body>
    </html>
  );
}
