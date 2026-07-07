import { lookup } from "dns/promises";
import { URL } from "url";
import { isIP } from "net";

const BLOCKED_CIDRS = [
  // IPv4 private ranges
  { start: ip4ToInt("10.0.0.0"), end: ip4ToInt("10.255.255.255") },
  { start: ip4ToInt("172.16.0.0"), end: ip4ToInt("172.31.255.255") },
  { start: ip4ToInt("192.168.0.0"), end: ip4ToInt("192.168.255.255") },
  // Loopback
  { start: ip4ToInt("127.0.0.0"), end: ip4ToInt("127.255.255.255") },
  // Link-local
  { start: ip4ToInt("169.254.0.0"), end: ip4ToInt("169.254.255.255") },
];

function ip4ToInt(ip: string): number {
  return (
    ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}

function isPrivateIPv4(ip: string): boolean {
  const num = ip4ToInt(ip);
  return BLOCKED_CIDRS.some(({ start, end }) => num >= start && num <= end);
}

/**
 * Validates a URL target for the HTTP node. Returns an error message if the
 * target is blocked (SSRF protection), or null if it's safe.
 */
export async function validateHttpNodeTarget(
  rawUrl: string
): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return "Invalid URL";
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block raw IPs
  if (isIP(hostname)) {
    if (isPrivateIPv4(hostname)) {
      return `URL hostname resolves to a private IP address: ${hostname}`;
    }
    return null;
  }

  // Block known internal hostnames
  const blockedHostnames = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "[::1]",
    "metadata.google.internal", // GCP
    "169.254.169.254", // AWS / cloud metadata
  ];
  if (blockedHostnames.includes(hostname)) {
    return `URL hostname is blocked for security reasons: ${hostname}`;
  }

  // DNS rebinding check: resolve the hostname and verify it doesn't point
  // to a private address.
  try {
    const addresses = await lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (isIP(addr.address) === 4 && isPrivateIPv4(addr.address)) {
        return `URL hostname resolves to a private IP address: ${hostname} → ${addr.address}`;
      }
      if (addr.address === "::1" || addr.address === "127.0.0.1") {
        return `URL hostname resolves to loopback: ${hostname} → ${addr.address}`;
      }
    }
  } catch {
    return `DNS resolution failed for hostname: ${hostname}`;
  }

  return null;
}
