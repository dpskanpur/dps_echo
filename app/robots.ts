import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/public-registration", "/pay", "/verify-tc", "/login"],
      disallow: ["/admin/", "/students/", "/fees/"],
    },
    sitemap: "https://echo.dpskanpur.com/sitemap.xml",
  };
}
