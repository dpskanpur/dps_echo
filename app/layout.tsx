import type { Metadata, Viewport } from "next";
import "./globals.css";
import { IdleSessionGuard } from "@/components/IdleSessionGuard";
import { portalConfig } from "@/lib/portal-config";

export const viewport: Viewport = {
  themeColor: portalConfig.theme.primaryDarkColor,
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://echo.dpskanpur.com"),
  title: {
    default: `${portalConfig.institution.portalName} — Official Portal (${portalConfig.institution.name})`,
    template: `%s | ${portalConfig.institution.portalName} — ${portalConfig.institution.shortName}`,
  },
  description:
    `Official Student Lifecycle & Fee Management Platform for ${portalConfig.institution.name} campuses: Azad Nagar, Barra, Kidwai Nagar, Servodaya Nagar. Online Admissions, Quick Fee Payment, and Transfer Certificate Verification.`,
  keywords: [
    portalConfig.institution.shortName,
    portalConfig.institution.name,
    "DPS Azad Nagar",
    "DPS Barra",
    "DPS Kidwai Nagar",
    "DPS Servodaya Nagar",
    "Online Student Registration 2026-27",
    "Quick Pay School Fees Kanpur",
    "Verify Transfer Certificate",
    `${portalConfig.institution.portalName} Portal`,
  ],
  authors: [{ name: `${portalConfig.institution.shortName} IT Cell`, url: portalConfig.institution.websiteUrl }],
  creator: portalConfig.institution.name,
  publisher: portalConfig.institution.name,
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
    siteName: `${portalConfig.institution.portalName} Portal — ${portalConfig.institution.shortName}`,
    title: `${portalConfig.institution.portalName} — Official School Portal (${portalConfig.institution.name})`,
    description:
      `Official Student Lifecycle & Fee Management Platform for ${portalConfig.institution.name} campuses: Azad Nagar, Barra, Kidwai Nagar, Servodaya Nagar.`,
    images: [
      {
        url: "/dps_crest.png",
        width: 1200,
        height: 630,
        alt: `${portalConfig.institution.shortName} Crest & ${portalConfig.institution.portalName} Portal`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${portalConfig.institution.portalName} — Official School Portal (${portalConfig.institution.name})`,
    description:
      `Official Student Lifecycle & Fee Management Platform for ${portalConfig.institution.name} campuses.`,
    images: ["/dps_crest.png"],
  },
  icons: {
    icon: portalConfig.branding.favicon,
    shortcut: "/favicon.ico",
    apple: portalConfig.branding.favicon,
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
