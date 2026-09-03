export const tooLargeForUploadMessage = "That photo is still too large to upload. Try another photo, or take a picture.";
export const imageUploadFallbackMessage = "Image upload failed. Try again, or take a picture.";

export function parseJsonText(text: string): unknown {
  if (!text) return null;
  try { return JSON.parse(text) as unknown; } catch { return null; }
}

export function isPayloadTooLarge(status: number, bodyText: string | null | undefined): boolean {
  if (status === 413) return true;
  const text = bodyText ?? "";
  return /FUNCTION_PAYLOAD_TOO_LARGE/i.test(text) || /Request Entity Too Large/i.test(text);
}

export function readImageUploadError(status: number, parsed: unknown, bodyText: string | null | undefined): string {
  if (isPayloadTooLarge(status, bodyText)) return tooLargeForUploadMessage;
  if (isRecord(parsed) && typeof parsed.error === "string" && parsed.error.trim()) return parsed.error;
  return imageUploadFallbackMessage;
}

export function imageUploadCaughtMessage(value: unknown): string {
  if (!(value instanceof Error) || !value.message) return imageUploadFallbackMessage;
  if (value.name === "SyntaxError" || value.message === "The string did not match the expected pattern.") return imageUploadFallbackMessage;
  if (isPayloadTooLarge(0, value.message)) return tooLargeForUploadMessage;
  return value.message;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
