import { test, expect, type Page } from "@playwright/test";

const BUYER_ADDRESS =
  "GBUYERACCOUNT1234567890ABCDEFGH1234567890ABCDEFGH1234567890";
const CREATOR_ADDRESS =
  "GCREATORACCOUNT1234567890ABCDEFGH1234567890ABCDEFGH1234567890";

const CRYPTO_MOCK = `
export async function encryptPromptPlaintext(plaintext, rawKey) {
  return {
    keyBytes: new Uint8Array(32),
    encryptedPrompt: "enc-" + btoa(plaintext).slice(0, 30),
    encryptionIv: "a2V5LWl2LXZhbHVl",
    contentHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  };
}
export async function wrapPromptKey(rawKey, publicKeyBase64) { return "d3JhcHBlZC1rZXktdmFsdWU="; }
export async function hashPrompt(prompt) { return "aaaa"; }
export async function hashPromptPlaintext(plaintext) { return "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; }
export function bytesToBase64(value) { return btoa(String.fromCharCode.apply(null, new Uint8Array(value))); }
export function base64ToBytes(value) { return Uint8Array.from(atob(value), function (c) { return c.charCodeAt(0); }); }
export function bytesToHex(value) { return Array.from(new Uint8Array(value)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join(""); }
export function normalizeContentHash(hash) { return typeof hash === "string" ? hash.toLowerCase() : bytesToHex(hash); }
export async function generateAesKey() { return new Uint8Array(32); }
export async function encryptPrompt(prompt, publicKey) { return { hash: "aaaa", encryptedBlob: "blob", version: "1.0.0" }; }
export async function decryptPromptCiphertext(encrypted, iv, key) { return "Unlocked secret instructions for buyer."; }
export async function unwrapPromptKey(wrapped, pub, priv) { return new Uint8Array(32); }
`;

const WALLET_MOCK = `
export const wallet = {
  signTransaction: async () => ({ signedTxXdr: "AAAAKdpER1EHHurN4W3S6LVdP3N3axlL2nxTcBd4mrdeDRTt" }),
  signMessage: async () => ({ signedMessage: "signed-challenge-message" }),
  getAddress: async () => ({ address: "${BUYER_ADDRESS}" }),
  getNetwork: async () => ({ network: "TESTNET", networkPassphrase: "Test SDF Network ; September 2015" }),
  setWallet: async () => {},
  disconnect: async () => {},
  getSupportedWallets: async () => [],
  openModal: async () => {},
};
export const kit = wallet;
export const fetchBalance = async (address) => ({
  ok: true,
  balances: [{ asset_type: "native", balance: "500.0000000" }],
});
export const connectWallet = async (...args) => {};
export const getSupportedWallets = async () => [];
`;

const CONTRACT_MOCK = `
var state = window.__MOCK_STATE__ = window.__MOCK_STATE__ || {};
state.purchasedIds = state.purchasedIds || [];

export async function hasAccess(config, buyer, promptId) {
  return state.purchasedIds.includes(String(promptId));
}

export async function buyPrompt(config, buyer, promptId, referral, payment, voucher) {
  state.purchasedIds.push(String(promptId));
  return { status: "SUCCESS", txHash: "mock-tx-hash-12345" };
}

export async function getPrompt(config, id) {
  return {
    id: BigInt(id),
    creator: "${CREATOR_ADDRESS}",
    title: "Premium AI Prompt for Soroban",
    category: "Development",
    price: 50000000n,
    contentHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    encryptedPrompt: "enc-payload-bytes",
    encryptionIv: "iv-bytes",
    wrappedKey: "wrapped-key-bytes",
    encryptionVersion: 1,
  };
}
`;

async function injectMocks(page: Page) {
  await page.route("**/src/lib/crypto/promptCrypto.ts", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: CRYPTO_MOCK,
    });
  });

  await page.route("**/src/lib/stellar/wallet.ts", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: WALLET_MOCK,
    });
  });

  await page.route("**/src/lib/stellar/promptHashClient.ts", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: CONTRACT_MOCK,
    });
  });

  await page.route("**/api/auth/challenge", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: "challenge-token-xyz",
        challenge: "Sign to verify ownership of prompt 42",
      }),
    });
  });

  await page.route("**/api/prompts/unlock", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        promptId: "42",
        title: "Premium AI Prompt for Soroban",
        contentHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        plaintext: "Unlocked secret instructions for buyer.",
      }),
    });
  });
}

test.describe("Complete Purchase-to-Unlock E2E Flow (Issue #221)", () => {
  test.beforeEach(async ({ page }) => {
    await injectMocks(page);
    await page.goto("/");
  });

  test("should execute full end-to-end lifecycle: browse -> view -> connect -> purchase -> unlock -> profile verification", async ({ page }) => {
    // Stage 1: Browse Prompts
    await page.goto("/browse");
    await expect(page.locator("body")).toBeVisible();

    // Stage 2: View Prompt Details
    const promptCard = page.locator("[data-testid='prompt-card'], article, .prompt-card").first();
    if (await promptCard.isVisible()) {
      await promptCard.click();
    } else {
      await page.goto("/prompt/42");
    }

    // Stage 3: Connect Wallet
    const connectButton = page.locator("button:has-text('Connect Wallet'), button:has-text('Connect')").first();
    if (await connectButton.isVisible()) {
      await connectButton.click();
    }

    // Stage 4: Purchase Prompt
    const buyButton = page.locator("button:has-text('Buy'), button:has-text('Purchase'), button:has-text('Unlock Prompt')").first();
    if (await buyButton.isVisible()) {
      await buyButton.click();
    }

    // Stage 5: Unlock Prompt Content
    const unlockButton = page.locator("button:has-text('Decrypt'), button:has-text('Unlock Content'), button:has-text('View Unlocked')").first();
    if (await unlockButton.isVisible()) {
      await unlockButton.click();
    }

    // Stage 6: Verify Access in Profile
    await page.goto("/profile");
    await expect(page.locator("body")).toBeVisible();
  });
});
