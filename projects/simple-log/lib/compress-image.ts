"use client";

export const maxEdge = 2048;
export const uploadTargetBytes = Math.floor(3.5 * 1024 * 1024);
export const jpegQualities = [0.85, 0.7, 0.55] as const;

export function fitWithinMaxEdge(width: number, height: number, max = maxEdge): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (!width || !height || longest <= max) return { width: Math.max(1, width), height: Math.max(1, height) };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function jpegFileName(originalName: string): string {
  const base = originalName.trim().split(/[/\\]/).pop() || "image";
  const stem = base.replace(/\.[^.]+$/, "").trim() || "image";
  return `${stem}.jpg`;
}

export async function compressImageFile(file: File): Promise<File> {
  const decoded = await decodeImage(file);
  try {
    const size = fitWithinMaxEdge(decoded.width, decoded.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare that photo. Try another photo, or take a picture.");
    context.drawImage(decoded.source, 0, 0, size.width, size.height);

    const name = jpegFileName(file.name);
    for (const quality of jpegQualities) {
      const blob = await canvasToJpeg(canvas, quality);
      if (blob.size <= uploadTargetBytes) {
        return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
      }
    }
    throw new Error("That photo is still too large after shrinking. Try another photo, or take a picture.");
  } finally {
    decoded.close();
  }
}

type DecodedImage = { source: CanvasImageSource; width: number; height: number; close: () => void };

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // iOS HEIC and some MIME-less Files still decode via HTMLImageElement.
    }
  }
  return decodeWithImageElement(file);
}

async function decodeWithImageElement(file: File): Promise<DecodedImage> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    if (typeof image.decode === "function") await image.decode();
    else {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not read that photo. Try another photo, or take a picture."));
      });
    }
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Could not read that photo. Try another photo, or take a picture.");
  }
  if (!image.width || !image.height) {
    URL.revokeObjectURL(url);
    throw new Error("Could not read that photo. Try another photo, or take a picture.");
  }
  return { source: image, width: image.width, height: image.height, close: () => URL.revokeObjectURL(url) };
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.size === 0) reject(new Error("Could not prepare that photo. Try another photo, or take a picture."));
      else resolve(blob);
    }, "image/jpeg", quality);
  });
}
