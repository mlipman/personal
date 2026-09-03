export const maxBytes = 10 * 1024 * 1024;

export type ImageUploader = (bytes: Buffer) => Promise<{ url: string }>;

export function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  if (bytes.length >= 6) {
    const header = ascii(bytes, 0, 6);
    if (header === "GIF87a" || header === "GIF89a") return "image/gif";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4).toLowerCase();
    if (brand === "heic" || brand === "heif" || brand === "mif1") return "image/heic";
  }
  return null;
}

export async function handleImagePost(request: Request, upload: ImageUploader): Promise<Response> {
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (!(value instanceof File)) return jsonError("Choose an image to upload.", 400);
    if (value.size === 0) return jsonError("That photo is empty. Try another photo, or take a picture.", 400);
    if (value.size > maxBytes) return jsonError("Choose an image smaller than 10 MB.", 400);

    const bytes = Buffer.from(await value.arrayBuffer());
    if (bytes.length === 0) return jsonError("That photo is empty. Try another photo, or take a picture.", 400);
    if (bytes.length > maxBytes) return jsonError("Choose an image smaller than 10 MB.", 400);

    const declaredType = value.type.trim();
    if (!declaredType.startsWith("image/") && !sniffImageType(bytes)) {
      return jsonError("Choose an image file.", 400);
    }

    const result = await upload(bytes);
    if (!result.url) return jsonError("Image upload failed. Try another photo, or take a picture.", 502);
    return Response.json({ url: result.url });
  } catch {
    return jsonError("Image upload failed. Try another photo, or take a picture.", 502);
  }
}

function jsonError(error: string, status: number): Response {
  return Response.json({ error }, { status });
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}
