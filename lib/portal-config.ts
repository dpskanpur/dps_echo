/**
 * Portal Configuration & White-Label Customization Engine
 *
 * This central configuration governs branding, institution identity,
 * theme color tokens, allowed authentication domains, and feature flags.
 *
 * All values default to Delhi Public School Kanpur (DPS Echo) to ensure
 * 100% backward compatibility and zero disruption to the live production site.
 * New deployments or alternate institutions can customize this file or override
 * via environment variables.
 */

export interface PortalConfig {
  institution: {
    name: string;
    shortName: string;
    portalName: string;
    tagline: string;
    websiteUrl: string;
    supportEmail: string;
    supportPhone: string;
    affiliation?: {
      board: string;
      affiliationNo?: string;
    };
  };
  branding: {
    logoLight: string;
    logoDark: string;
    emblem: string;
    favicon: string;
    crestAlt: string;
  };
  theme: {
    primaryColor: string;
    primaryDarkColor: string;
    accentColor: string;
  };
  auth: {
    allowedDomain: string;
    allowedDomains: string[];
  };
  features: {
    students: boolean;
    employees: boolean;
    fees: boolean;
    transferCertificate: boolean;
    publicRegistration: boolean;
    smsAlerts: boolean;
    alumni: boolean;
    academicSessions: boolean;
    auditLogs: boolean;
  };
}

export const portalConfig: PortalConfig = {
  institution: {
    name: process.env.NEXT_PUBLIC_INSTITUTION_NAME || "Delhi Public School Kanpur",
    shortName: process.env.NEXT_PUBLIC_INSTITUTION_SHORT_NAME || "DPS Kanpur",
    portalName: process.env.NEXT_PUBLIC_PORTAL_NAME || "DPS Echo",
    tagline:
      process.env.NEXT_PUBLIC_PORTAL_TAGLINE ||
      "Official School ERP & Campus Administration Portal",
    websiteUrl: process.env.NEXT_PUBLIC_WEBSITE_URL || "https://dpskanpur.com",
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "admissions@dpskanpur.com",
    supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+91 512 2580000",
    affiliation: {
      board: "CBSE",
      affiliationNo: "2130000",
    },
  },
  branding: {
    logoLight: "/dps-logo-white.png",
    logoDark: "/echo-logo.png",
    emblem: "/echo-logo-white.png",
    favicon: "/icon.png",
    crestAlt: "DPS Crest & Official Emblem",
  },
  theme: {
    primaryColor: "#003d2b",
    primaryDarkColor: "#064e3b",
    accentColor: "#10b981",
  },
  auth: {
    allowedDomain: process.env.ALLOWED_DOMAIN || "dpskanpur.com",
    allowedDomains: (process.env.ALLOWED_DOMAINS || process.env.ALLOWED_DOMAIN || "dpskanpur.com")
      .split(",")
      .map((d) => d.trim().toLowerCase()),
  },
  features: {
    students: true,
    employees: true,
    fees: false, // matches active state in production
    transferCertificate: true,
    publicRegistration: true,
    smsAlerts: true,
    alumni: true,
    academicSessions: true,
    auditLogs: true,
  },
};
