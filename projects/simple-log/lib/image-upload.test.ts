import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleImagePost, maxBytes, sniffImageType } from "./image-upload.ts";

const jpegBytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const heicBytes = Uint8Array.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0x00, 0x00, 0x00, 0x00,
]);
const neverUpload = async () => {
  throw new Error("uploader should not be called");
};

function fileRequest(file: File): Request {
  const form = new FormData();
  form.append("file", file);
  return new Request("http://localhost/api/images", { method: "POST", body: form });
}

async function readJson(response: Response): Promise<{ error?: string; url?: string }> {
  const body: unknown = await response.json();
  assert.equal(typeof body, "object");
  assert.ok(body);
  return body as { error?: string; url?: string };
}

describe("sniffImageType", () => {
  it("recognizes JPEG, PNG, and HEIC ftyp brands", () => {
    assert.equal(sniffImageType(jpegBytes), "image/jpeg");
    assert.equal(sniffImageType(pngBytes), "image/png");
    assert.equal(sniffImageType(heicBytes), "image/heic");
    const mif1 = Uint8Array.from(heicBytes);
    mif1.set([0x6d, 0x69, 0x66, 0x31], 8);
    assert.equal(sniffImageType(mif1), "image/heic");
    assert.equal(sniffImageType(Uint8Array.from([0x00, 0x01, 0x02, 0x03])), null);
  });
});

describe("handleImagePost", () => {
  it("rejects empty files with JSON 400, not the 10 MB copy", async () => {
    const file = new File([], "empty.jpg", { type: "image/jpeg" });
    const response = await handleImagePost(fileRequest(file), neverUpload);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("content-type")?.includes("application/json"), true);
    const body = await readJson(response);
    assert.equal(typeof body.error, "string");
    assert.match(body.error!, /empty/i);
    assert.doesNotMatch(body.error!, /10 MB/);
  });

  it("returns JSON 502 when the uploader throws, not an empty 500", async () => {
    const file = new File([jpegBytes], "tiny.jpg", { type: "image/jpeg" });
    const response = await handleImagePost(fileRequest(file), async () => {
      throw new Error("Cloudinary exploded");
    });
    assert.equal(response.status, 502);
    assert.notEqual(response.headers.get("content-length"), "0");
    const text = await response.text();
    assert.ok(text.length > 0);
    const body: unknown = JSON.parse(text);
    assert.equal(typeof body, "object");
    assert.ok(body && typeof (body as { error?: unknown }).error === "string");
    assert.ok(((body as { error: string }).error).length > 0);
  });

  it("accepts JPEG bytes with a missing or octet-stream MIME", async () => {
    const file = new File([jpegBytes], "photo.jpg", { type: "application/octet-stream" });
    const response = await handleImagePost(fileRequest(file), async () => ({ url: "https://example.com/photo.jpg" }));
    assert.equal(response.status, 200);
    const body = await readJson(response);
    assert.equal(body.url, "https://example.com/photo.jpg");
  });

  it("accepts HEIC with an image/heic MIME without sniffing past Cloudinary", async () => {
    const file = new File([heicBytes], "photo.heic", { type: "image/heic" });
    const response = await handleImagePost(fileRequest(file), async () => ({ url: "https://example.com/photo.heic" }));
    assert.equal(response.status, 200);
    const body = await readJson(response);
    assert.equal(body.url, "https://example.com/photo.heic");
  });

  it("splits too-large and not-an-image validation errors", async () => {
    const huge = new File([new Uint8Array(maxBytes + 1)], "huge.jpg", { type: "image/jpeg" });
    const hugeResponse = await handleImagePost(fileRequest(huge), neverUpload);
    assert.equal(hugeResponse.status, 400);
    assert.equal((await readJson(hugeResponse)).error, "Choose an image smaller than 10 MB.");

    const junk = new File([Uint8Array.from([0x00, 0x01, 0x02, 0x03])], "notes.bin", { type: "" });
    const junkResponse = await handleImagePost(fileRequest(junk), neverUpload);
    assert.equal(junkResponse.status, 400);
    assert.equal((await readJson(junkResponse)).error, "Choose an image file.");
  });
});
