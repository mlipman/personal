import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { handleImagePost, type ImageUploader } from "@/lib/image-upload";

export const runtime = "nodejs";

const uploadToCloudinary: ImageUploader = (bytes) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    { folder: "simple-log", resource_type: "image" },
    (error, uploaded: UploadApiResponse | undefined) => {
      if (error || !uploaded?.secure_url) {
        reject(error instanceof Error ? error : new Error("Upload failed"));
        return;
      }
      resolve({ url: uploaded.secure_url });
    },
  );
  stream.end(bytes);
});

export async function POST(request: Request) {
  try {
    if (!process.env.CLOUDINARY_URL) return Response.json({ error: "Image uploads are not configured yet." }, { status: 503 });
    return await handleImagePost(request, uploadToCloudinary);
  } catch {
    return Response.json({ error: "Image upload failed. Try another photo, or take a picture." }, { status: 502 });
  }
}
