import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

export const runtime = "nodejs";
const maxBytes = 10 * 1024 * 1024;

export async function POST(request: Request) {
  if (!process.env.CLOUDINARY_URL) return Response.json({ error: "Image uploads are not configured yet." }, { status: 503 });
  const form = await request.formData(); const value = form.get("file");
  if (!(value instanceof File) || !value.type.startsWith("image/") || value.size > maxBytes) return Response.json({ error: "Choose an image smaller than 10 MB." }, { status: 400 });
  const bytes = Buffer.from(await value.arrayBuffer());
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "simple-log", resource_type: "image" }, (error, uploaded) => error || !uploaded ? reject(error ?? new Error("Upload failed")) : resolve(uploaded));
    stream.end(bytes);
  });
  return Response.json({ url: result.secure_url });
}
