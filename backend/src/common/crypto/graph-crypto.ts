import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT = "mini-dify-graph-encrypt";
const ENCRYPTION_PREFIX = "$enc:";

function deriveKey(): Buffer {
  const secret =
    process.env.GRAPH_ENCRYPTION_KEY ||
    "mini-dify-dev-default-key-change-in-production";
  // 32-byte key for aes-256
  return scryptSync(secret, SALT, 32);
}

function encryptValue(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Format: iv + authTag + ciphertext, all base64url-encoded
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return ENCRYPTION_PREFIX + combined.toString("base64url");
}

function decryptValue(wrapped: string): string {
  const encoded = wrapped.slice(ENCRYPTION_PREFIX.length);
  const combined = Buffer.from(encoded, "base64url");
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const key = deriveKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8"
  );
}

const SENSITIVE_KEYS = ["apiKey", "baseURL"] as const;

/**
 * Walk a graph and encrypt sensitive fields (apiKey, baseURL) in-place.
 * Returns the same graph object (mutated).
 */
export function encryptGraphSensitiveFields(graph: {
  nodes: Array<{ type: string; data: Record<string, unknown> }>;
}): void {
  for (const node of graph.nodes) {
    if (node.type !== "llm") continue;
    for (const key of SENSITIVE_KEYS) {
      const value = node.data[key];
      if (
        typeof value === "string" &&
        value.length > 0 &&
        !value.startsWith(ENCRYPTION_PREFIX)
      ) {
        node.data[key] = encryptValue(value);
      }
    }
  }
}

/**
 * Walk a graph and decrypt sensitive fields in-place.
 * Returns the same graph object (mutated).
 */
export function decryptGraphSensitiveFields(graph: {
  nodes: Array<{ type: string; data: Record<string, unknown> }>;
}): void {
  for (const node of graph.nodes) {
    if (node.type !== "llm") continue;
    for (const key of SENSITIVE_KEYS) {
      const value = node.data[key];
      if (typeof value === "string" && value.startsWith(ENCRYPTION_PREFIX)) {
        try {
          node.data[key] = decryptValue(value);
        } catch {
          // If decryption fails (e.g. key rotation), leave the value as-is.
          // The LLM node will fall back to process.env credentials.
        }
      }
    }
  }
}
