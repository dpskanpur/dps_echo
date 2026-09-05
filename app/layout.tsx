import type { Metadata, Viewport } from "next";
import "./globals.css";
import { IdleSessionGuard } from "@/components/IdleSessionGuard";

export const viewport: Viewport = {
  themeColor: "#064e3b",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://echo.dpskanpur.com"),
  title: {
    default: "DPS Echo — Official Portal (Delhi Public School Kanpur)",
    template: "%s | DPS Echo — Delhi Public School Kanpur",
  },
  description:
    "Official Student Lifecycle & Fee Management Platform for Delhi Public School (DPS) Kanpur campuses: Azad Nagar, Barra, Kidwai Nagar, Servodaya Nagar. Online Admissions 2026-27, Quick Fee Payment, and Transfer Certificate Verification.",
  keywords: [
    "DPS Kanpur",
    "Delhi Public School Kanpur",
    "DPS Azad Nagar",
    "DPS Barra",
    "DPS Kidwai Nagar",
    "DPS Servodaya Nagar",
    "Online Student Registration 2026-27",
    "Quick Pay School Fees Kanpur",
    "Verify Transfer Certificate",
    "DPS Echo Portal",
  ],
  authors: [{ name: "DPS Kanpur IT Cell", url: "https://dpskanpur.com" }],
  creator: "Delhi Public School Kanpur",
  publisher: "Delhi Public School Kanpur",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://echo.dpskanpur.com",
    siteName: "DPS Echo Portal — DPS Kanpur",
    title: "DPS Echo — Official School Portal (Delhi Public School Kanpur)",
    description:
      "Official Student Lifecycle & Fee Management Platform for Delhi Public School (DPS) Kanpur campuses: Azad Nagar, Barra, Kidwai Nagar, Servodaya Nagar.",
    images: [
      {
        url: "/dps_crest.png",
        width: 1200,
        height: 630,
        alt: "DPS Kanpur Crest & Echo Portal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DPS Echo — Official School Portal (Delhi Public School Kanpur)",
    description:
      "Official Student Lifecycle & Fee Management Platform for Delhi Public School (DPS) Kanpur campuses.",
    images: ["/dps_crest.png"],
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-emerald-800 selection:text-white"
      >
        <IdleSessionGuard />
        {children}
      </body>
    </html>
  );
}
