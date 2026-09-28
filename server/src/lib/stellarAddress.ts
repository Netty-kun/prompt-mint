import { Keypair } from "@stellar/stellar-sdk";

/**
 * Validates and normalizes a Stellar public key (G-address).
 */
export function normalizeStellarAddress(address: string): string | null {
  if (!address || typeof address !== "string") {
    return null;
  }

  const trimmed = address.trim();
  if (trimmed.length !== 56 || !trimmed.startsWith("G")) {
    return null;
  }

  try {
    Keypair.fromPublicKey(trimmed);
    return trimmed;
  } catch {
    return null;
  }
}
