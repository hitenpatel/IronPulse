import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3Instance: S3Client | null = null;

function getS3(): S3Client {
  if (!s3Instance) {
    s3Instance = new S3Client({
      endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
      region: process.env.S3_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? "minioadmin",
        secretAccessKey: process.env.S3_SECRET_KEY ?? "minioadmin",
      },
      forcePathStyle: true,
    });
  }
  return s3Instance;
}

const BUCKET = process.env.S3_BUCKET ?? "ironpulse";

/**
 * Cache-Control policies applied at upload time so the CDN (Cloudflare in
 * front of MinIO/S3) and intermediate proxies can cache aggressively.
 *
 * - `immutable`: content-addressed keys (hash-based). Cache forever.
 * - `longLived`: user uploads with stable URLs (progress photos, avatars).
 *   1 day browser cache so a replacement propagates, but 30d at the CDN.
 * - `shortLived`: everything else — responses that might change in-place.
 */
export const CACHE = {
  immutable: "public, max-age=31536000, immutable",
  longLived: "public, max-age=86400, s-maxage=2592000",
  shortLived: "public, max-age=300, s-maxage=3600",
} as const;

export type CacheProfile = keyof typeof CACHE;

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  cacheProfile: CacheProfile = "longLived",
): Promise<string> {
  const s3 = getS3();
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: CACHE[cacheProfile],
    }),
  );
  return key;
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const s3 = getS3();
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn }
  );
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 600,
  cacheProfile: CacheProfile = "longLived",
): Promise<string> {
  const s3 = getS3();
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      CacheControl: CACHE[cacheProfile],
    }),
    { expiresIn },
  );
}
