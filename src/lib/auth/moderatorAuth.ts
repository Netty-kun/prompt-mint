import { buildModeratorAuthMessage } from "./challenge";

// eslint-disable-next-line no-unused-vars
export type SignMessageFn = (_message: string) => Promise<{ signedMessage?: string } | string>;

function extractSignedMessage(signature: { signedMessage?: string } | string): string {
  if (typeof signature === "string") {
    return signature;
  }
  if (!signature?.signedMessage) {
    throw new Error("Wallet did not return a signed message.");
  }
  return signature.signedMessage;
}

export interface ModeratorAuthProof {
  moderatorTimestamp: number;
  moderatorSignature: string;
}

/**
 * Signs a moderator-auth message with the connected wallet so a moderation
 * API request can prove it was made by the holder of `address`, not merely
 * someone who knows the (often public) address.
 */
export async function signModeratorAuth(
  address: string,
  purpose: string,
  signMessage: SignMessageFn,
): Promise<ModeratorAuthProof> {
  const moderatorTimestamp = Date.now();
  const message = buildModeratorAuthMessage(address, purpose, moderatorTimestamp);
  const signature = await signMessage(message);
  return {
    moderatorTimestamp,
    moderatorSignature: extractSignedMessage(signature),
  };
}
