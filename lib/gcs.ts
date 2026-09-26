import { Storage } from "@google-cloud/storage";

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || "dps_echo_prod";
const PROJECT_ID = process.env.GCP_PROJECT_ID || "dpskanpur-backup";

let storageInstance: Storage | null = null;

function getStorageClient(): Storage {
  if (!storageInstance) {
    if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
      try {
        const credentials = JSON.parse(
          Buffer.from(process.env.GCP_SERVICE_ACCOUNT_KEY, "base64").toString("utf-8")
        );
        storageInstance = new Storage({ projectId: PROJECT_ID, credentials });
      } catch {
        storageInstance = new Storage({ projectId: PROJECT_ID });
      }
    } else {
      storageInstance = new Storage({ projectId: PROJECT_ID });
    }
  }
  return storageInstance;
}

export interface UploadResult {
  url: string;
  destinationPath: string;
  bucket: string;
  sizeBytes: number;
}

/**
 * Uploads a file buffer directly to Google Cloud Storage (GCS)
 */
export async function uploadFileToGCS({
  fileBuffer,
  destinationPath,
  contentType,
}: {
  fileBuffer: Buffer;
  destinationPath: string;
  contentType: string;
}): Promise<UploadResult> {
  const storage = getStorageClient();
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(destinationPath);

  await file.save(fileBuffer, {
    metadata: {
      contentType,
      cacheControl: "private, max-age=86400",
    },
    resumable: false,
  });

  // Access is served via proxy endpoint /api/v1/storage/[...path] or Signed URL
  const secureUrl = `/api/v1/storage/${destinationPath}`;

  return {
    url: secureUrl,
    destinationPath,
    bucket: BUCKET_NAME,
    sizeBytes: fileBuffer.length,
  };
}

/**
 * Generates a short-lived Signed URL for direct GCS viewing (1 hour expiry)
 */
export async function generateSignedUrl(destinationPath: string, expiresInMinutes = 60): Promise<string> {
  try {
    const storage = getStorageClient();
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(destinationPath);

    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return signedUrl;
  } catch (err) {
    console.warn("Signed URL generation warning (using proxy fallback):", err);
    return `/api/v1/storage/${destinationPath}`;
  }
}

/**
 * Downloads / streams file buffer from private GCS bucket
 */
export async function downloadFileFromGCS(destinationPath: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const storage = getStorageClient();
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(destinationPath);

    const [exists] = await file.exists();
    if (!exists) return null;

    const [metadata] = await file.getMetadata();
    const [buffer] = await file.download();

    return {
      buffer,
      contentType: metadata.contentType || "application/octet-stream",
    };
  } catch (err) {
    console.error("GCS download error for path:", destinationPath, err);
    return null;
  }
}

/**
 * Helper to upload student passport photo
 */
export async function uploadStudentPhoto(
  studentId: string,
  fileBuffer: Buffer,
  originalFileName: string,
  contentType: string
): Promise<UploadResult> {
  const ext = originalFileName.split(".").pop()?.toLowerCase() || "jpg";
  const sanitizedId = studentId.replace(/[^a-zA-Z0-9_-]/g, "");
  const destinationPath = `students/${sanitizedId}/photo/passport-photo-${Date.now()}.${ext}`;

  return uploadFileToGCS({
    fileBuffer,
    destinationPath,
    contentType,
  });
}

/**
 * Helper to upload student admission documents
 */
export async function uploadStudentDocument(
  studentId: string,
  docType: string,
  fileBuffer: Buffer,
  originalFileName: string,
  contentType: string
): Promise<UploadResult> {
  const sanitizedId = studentId.replace(/[^a-zA-Z0-9_-]/g, "");
  const sanitizedType = docType.replace(/[^a-zA-Z0-9_-]/g, "_").toUpperCase();
  const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const destinationPath = `students/${sanitizedId}/documents/${sanitizedType}_${Date.now()}_${sanitizedFileName}`;

  return uploadFileToGCS({
    fileBuffer,
    destinationPath,
    contentType,
  });
}
