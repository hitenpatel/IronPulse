import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@aws-sdk/client-s3", () => {
  const mockSend = vi.fn().mockResolvedValue({});
  return {
    S3Client: vi.fn(() => ({ send: mockSend })),
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
    __mockSend: mockSend,
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi
    .fn()
    .mockResolvedValue("https://signed-url.example.com/file"),
}));

import {
  uploadFile,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
} from "../src/lib/s3";
import * as s3Client from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const { PutObjectCommand, GetObjectCommand } = s3Client;
// Access the mock send function exposed by our mock factory
const mockSend = (s3Client as any).__mockSend;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("uploadFile", () => {
  it("calls S3Client.send with PutObjectCommand and returns the key", async () => {
    const key = await uploadFile(
      "photos/avatar.png",
      Buffer.from("image-data"),
      "image/png",
    );

    expect(key).toBe("photos/avatar.png");
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: "ironpulse",
        Key: "photos/avatar.png",
        Body: Buffer.from("image-data"),
        ContentType: "image/png",
      }),
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("passes Uint8Array body through", async () => {
    const body = new Uint8Array([1, 2, 3]);
    const key = await uploadFile("data/file.bin", body, "application/octet-stream");

    expect(key).toBe("data/file.bin");
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Body: body }),
    );
  });
});

describe("getPresignedDownloadUrl", () => {
  it("calls getSignedUrl with GetObjectCommand and returns signed URL", async () => {
    const url = await getPresignedDownloadUrl("photos/avatar.png");

    expect(url).toBe("https://signed-url.example.com/file");
    expect(GetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: "ironpulse",
        Key: "photos/avatar.png",
      }),
    );
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 3600 },
    );
  });

  it("uses custom expiresIn when provided", async () => {
    await getPresignedDownloadUrl("photos/avatar.png", 600);

    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 600 },
    );
  });
});

describe("getPresignedUploadUrl", () => {
  it("calls getSignedUrl with PutObjectCommand and returns signed URL", async () => {
    const url = await getPresignedUploadUrl("uploads/file.jpg", "image/jpeg");

    expect(url).toBe("https://signed-url.example.com/file");
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: "ironpulse",
        Key: "uploads/file.jpg",
        ContentType: "image/jpeg",
      }),
    );
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 600 },
    );
  });

  it("uses custom expiresIn when provided", async () => {
    await getPresignedUploadUrl("uploads/file.jpg", "image/jpeg", 120);

    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 120 },
    );
  });
});
