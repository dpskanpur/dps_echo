import { NextResponse } from "next/server";
import { uploadStudentPhoto, uploadStudentDocument } from "@/lib/gcs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/jpg"];

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const studentId = (formData.get("studentId") as string) || "new-registration";
    const targetType = (formData.get("targetType") as string) || "PHOTO"; // "PHOTO" | "DOCUMENT"
    const docType = (formData.get("docType") as string) || "OTHER";
    const title = (formData.get("title") as string) || docType;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // Size & Type Validation
    if (targetType === "PHOTO") {
      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid photo type. Only JPG, PNG, and WEBP images are allowed." },
          { status: 400 }
        );
      }
      if (file.size > MAX_PHOTO_SIZE) {
        return NextResponse.json(
          { error: "Photo size exceeds 5MB limit." },
          { status: 400 }
        );
      }
    } else {
      if (!ALLOWED_DOC_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid document format. Only PDF, JPG, PNG, and WEBP files are allowed." },
          { status: 400 }
        );
      }
      if (file.size > MAX_DOC_SIZE) {
        return NextResponse.json(
          { error: "Document size exceeds 10MB limit." },
          { status: 400 }
        );
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let publicUrl: string = "";
    let destinationPath: string = "";

    try {
      if (targetType === "PHOTO") {
        const uploadRes = await uploadStudentPhoto(studentId, buffer, file.name, file.type);
        publicUrl = uploadRes.url;
        destinationPath = uploadRes.destinationPath;
      } else {
        const uploadRes = await uploadStudentDocument(studentId, docType, buffer, file.name, file.type);
        publicUrl = uploadRes.url;
        destinationPath = uploadRes.destinationPath;
      }
    } catch (gcsErr: any) {
      console.warn("GCS Upload fallback to local storage:", gcsErr?.message);
      const localDir = path.join(process.cwd(), "public", "storage", "uploads", studentId);
      await fs.mkdir(localDir, { recursive: true });
      const sanitizedFileName = `${targetType}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const filePath = path.join(localDir, sanitizedFileName);
      await fs.writeFile(filePath, buffer);
      publicUrl = `/api/v1/storage/local/${studentId}/${sanitizedFileName}`;
      destinationPath = `local/${studentId}/${sanitizedFileName}`;
    }

    const sizeInKb = Math.round(file.size / 1024);
    const fileSizeStr = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;

    let createdDocumentId: string | null = null;

    if (studentId && !studentId.startsWith("temp-") && studentId !== "new-registration") {
      try {
        const existingStudent = await prisma.student.findUnique({
          where: { id: studentId },
          select: { id: true },
        });

        if (existingStudent) {
          if (targetType === "PHOTO") {
            await prisma.student.update({
              where: { id: studentId },
              data: { photoUrl: publicUrl },
            });
          } else {
            const newDoc = await prisma.studentDocument.create({
              data: {
                studentId,
                docType,
                title,
                fileName: file.name,
                fileUrl: publicUrl,
                fileSize: fileSizeStr,
              },
            });
            createdDocumentId = newDoc.id;
          }
        }
      } catch (dbErr) {
        console.warn("Database record update warning on upload:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      fileSize: fileSizeStr,
      docType,
      title,
      documentId: createdDocumentId,
      destinationPath,
    });
  } catch (err: any) {
    console.error("Upload API Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to upload file." },
      { status: 500 }
    );
  }
}
