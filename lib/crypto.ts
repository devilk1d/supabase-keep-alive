import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

let cachedKey: Buffer | null = null;

function parseOrDeriveKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  return crypto.createHash("sha256").update(trimmed, "utf8").digest();
}

function readEnvLocalKey(envPath: string): string | null {
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*ENCRYPTION_KEY\s*=\s*(.+)\s*$/);
    if (match && match[1]) {
      return match[1].replace(/^["']|["']$/g, "").trim();
    }
  }
  return null;
}

// Resolves a 32-byte AES-256 key from ENCRYPTION_KEY or auto-provisions one in .env.local
// so local-first dashboard runs require zero manual secret setup while persisting across restarts.
function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const envKey = process.env.ENCRYPTION_KEY?.trim();
  if (envKey) {
    cachedKey = parseOrDeriveKey(envKey);
    return cachedKey;
  }

  const envLocalPath = path.join(process.cwd(), ".env.local");
  const existingLocalKey = readEnvLocalKey(envLocalPath);
  if (existingLocalKey) {
    cachedKey = parseOrDeriveKey(existingLocalKey);
    return cachedKey;
  }

  const generatedHex = crypto.randomBytes(32).toString("hex");
  try {
    const prefix = fs.existsSync(envLocalPath) ? "\n" : "";
    fs.appendFileSync(
      envLocalPath,
      `${prefix}ENCRYPTION_KEY=${generatedHex}\n`,
      { encoding: "utf8", mode: 0o600 }
    );
  } catch {
    // Keep generated key in memory if filesystem is read-only.
  }

  cachedKey = Buffer.from(generatedHex, "hex");
  return cachedKey;
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted secret format.");
  }

  const [ivPart, tagPart, dataPart] = parts;
  const iv = Buffer.from(ivPart, "base64url");
  const authTag = Buffer.from(tagPart, "base64url");
  const ciphertext = Buffer.from(dataPart, "base64url");

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
