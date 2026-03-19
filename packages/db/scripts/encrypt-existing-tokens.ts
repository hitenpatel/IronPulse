/**
 * One-time data migration: encrypt any plaintext OAuth tokens in device_connections.
 *
 * Run with: npx tsx packages/db/scripts/encrypt-existing-tokens.ts
 *
 * Encrypted tokens use the format "iv:tag:data" (hex-encoded, colon-separated).
 * Plaintext tokens will never contain exactly two colons with all-hex segments,
 * so we can safely detect which rows need migration.
 */

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function getKey(): Buffer {
  const secret =
    process.env.DEVICE_TOKEN_ENCRYPTION_KEY ?? process.env.NEXTAUTH_SECRET;
  if (!secret)
    throw new Error(
      "DEVICE_TOKEN_ENCRYPTION_KEY or NEXTAUTH_SECRET must be set",
    );
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  return parts.every((p) => /^[0-9a-f]+$/.test(p));
}

async function main() {
  const connections = await prisma.deviceConnection.findMany({
    select: {
      id: true,
      provider: true,
      accessToken: true,
      refreshToken: true,
    },
  });

  let migrated = 0;

  for (const conn of connections) {
    const needsAccessEncrypt = !isEncrypted(conn.accessToken);
    const needsRefreshEncrypt = !isEncrypted(conn.refreshToken);

    if (!needsAccessEncrypt && !needsRefreshEncrypt) {
      console.log(`  ${conn.provider} (${conn.id}): already encrypted, skipping`);
      continue;
    }

    await prisma.deviceConnection.update({
      where: { id: conn.id },
      data: {
        ...(needsAccessEncrypt && {
          accessToken: encryptToken(conn.accessToken),
        }),
        ...(needsRefreshEncrypt && {
          refreshToken: encryptToken(conn.refreshToken),
        }),
      },
    });

    console.log(`  ${conn.provider} (${conn.id}): encrypted`);
    migrated++;
  }

  console.log(
    `\nDone. ${migrated}/${connections.length} connections migrated.`,
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
