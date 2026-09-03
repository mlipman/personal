import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fitWithinMaxEdge, jpegFileName, maxEdge } from "./compress-image.ts";

describe("fitWithinMaxEdge", () => {
  it("leaves images within the max edge unchanged", () => {
    assert.deepEqual(fitWithinMaxEdge(1024, 768), { width: 1024, height: 768 });
    assert.deepEqual(fitWithinMaxEdge(maxEdge, maxEdge), { width: maxEdge, height: maxEdge });
  });

  it("scales the longest edge down to 2048 and keeps aspect ratio", () => {
    assert.deepEqual(fitWithinMaxEdge(4000, 3000), { width: 2048, height: 1536 });
    assert.deepEqual(fitWithinMaxEdge(3000, 4000), { width: 1536, height: 2048 });
    assert.deepEqual(fitWithinMaxEdge(1, 5000), { width: 1, height: 2048 });
  });
});

describe("jpegFileName", () => {
  it("keeps the original stem and forces a .jpg extension", () => {
    assert.equal(jpegFileName("IMG_1234.HEIC"), "IMG_1234.jpg");
    assert.equal(jpegFileName("photo.jpeg"), "photo.jpg");
    assert.equal(jpegFileName("image"), "image.jpg");
    assert.equal(jpegFileName(""), "image.jpg");
  });
});
