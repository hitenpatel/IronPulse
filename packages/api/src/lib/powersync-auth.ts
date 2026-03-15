import jwt from "jsonwebtoken";
import crypto from "crypto";

interface JWKSKey {
  kty: string;
  alg: string;
  use: string;
  kid: string;
  n: string;
  e: string;
}

interface JWKS {
  keys: JWKSKey[];
}

let privateKey: string | null = null;
let publicKey: string | null = null;
let keyId: string | null = null;

export function generateKeyPairIfNeeded(): void {
  if (privateKey && publicKey) return;

  const envPrivate = process.env.POWERSYNC_PRIVATE_KEY;
  const envPublic = process.env.POWERSYNC_PUBLIC_KEY;

  if (envPrivate && envPublic) {
    privateKey = envPrivate;
    publicKey = envPublic;
  } else {
    const pair = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    privateKey = pair.privateKey;
    publicKey = pair.publicKey;
  }

  keyId = crypto
    .createHash("sha256")
    .update(publicKey)
    .digest("hex")
    .slice(0, 16);
}

export function signPowerSyncToken(userId: string): string {
  generateKeyPairIfNeeded();

  return jwt.sign(
    {
      sub: userId,
      aud: "powersync",
    },
    privateKey!,
    {
      algorithm: "RS256",
      expiresIn: "5m",
      keyid: keyId!,
    },
  );
}

export function getPowerSyncJWKS(): JWKS {
  generateKeyPairIfNeeded();

  const pubKeyObj = crypto.createPublicKey(publicKey!);
  const jwk = pubKeyObj.export({ format: "jwk" });

  return {
    keys: [
      {
        kty: "RSA",
        alg: "RS256",
        use: "sig",
        kid: keyId!,
        n: jwk.n as string,
        e: jwk.e as string,
      },
    ],
  };
}
