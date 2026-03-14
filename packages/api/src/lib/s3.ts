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

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const s3 = getS3();
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
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
  expiresIn = 600
): Promise<string> {
  const s3 = getS3();
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  );
}
