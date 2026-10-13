import { NextResponse } from "next/server";
import { downloadFileFromGCS } from "@/lib/gcs";
import { authorizeApiRequest } from "@/lib/api-auth";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = [
  "https://echo.dpskanpur.com",
  "http://localhost:8088",
  "http://localhost:3000",
  "http://127.0.0.1:8088",
];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Security Check 0: Verify authenticated session or API token
    const auth = await authorizeApiRequest(req, "students", "view");
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { path: pathSegments } = await params;
    if (
      !pathSegments ||
      pathSegments.length === 0 ||
      pathSegments.some((seg) => seg === "." || seg === ".." || seg.includes("\\") || seg.includes("\0"))
    ) {
      return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
    }

    const destinationPath = pathSegments.join("/");

    // Security Check 1: Allowed Origins / Referer
    const origin = req.headers.get("origin") || "";
    const referer = req.headers.get("referer") || "";

    const isAllowedOrigin =
      !origin && !referer
        ? true
        : ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed) || referer.startsWith(allowed));

    if (!isAllowedOrigin && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Forbidden: Access restricted to echo.dpskanpur.com" },
        { status: 403 }
      );
    }

    // Check local filesystem fallback first (for offline dev) with strict path containment
    const baseUploadsDir = path.resolve(process.cwd(), "public", "storage", "uploads");
    const relativeTarget = destinationPath.replace(/^local\//, "");
    const localFilePath = path.resolve(baseUploadsDir, relativeTarget);

    if (!localFilePath.startsWith(baseUploadsDir + path.sep)) {
      return NextResponse.json({ error: "Forbidden path traversal." }, { status: 403 });
    }

    try {
      const localBuffer = await fs.readFile(localFilePath);
      const ext = destinationPath.split(".").pop()?.toLowerCase();
      const mime =
        ext === "pdf"
          ? "application/pdf"
          : ext === "png"
          ? "image/png"
          : ext === "webp"
          ? "image/webp"
          : "image/jpeg";

      return new NextResponse(new Uint8Array(localBuffer), {
        headers: {
          "Content-Type": mime,
          "Cache-Control": "private, max-age=86400",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      // Local file does not exist, fetch from GCS
    }

    // Stream from Private GCS Bucket
    const gcsResult = await downloadFileFromGCS(destinationPath);

    if (!gcsResult) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(gcsResult.buffer), {
      headers: {
        "Content-Type": gcsResult.contentType,
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    console.error("Storage Proxy API Error:", err);
    return NextResponse.json({ error: "Failed to retrieve storage object." }, { status: 500 });
  }
}
