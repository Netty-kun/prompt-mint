import { test, expect, type Page } from "@playwright/test";

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
export async function wrapPromptKey(rawKey, publicKeyBase64) {
  return "d3JhcHBlZC1rZXktdmFsdWU=";
}
export async function hashPrompt(prompt) { return "aaaa"; }
export async function hashPromptPlaintext(plaintext) { return "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; }
export function bytesToBase64(value) { return btoa(String.fromCharCode.apply(null, new Uint8Array(value))); }
export function base64ToBytes(value) { return Uint8Array.from(atob(value), function (c) { return c.charCodeAt(0); }); }
export function bytesToHex(value) { return Array.from(new Uint8Array(value)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join(""); }
export function normalizeContentHash(hash) { return typeof hash === "string" ? hash.toLowerCase() : bytesToHex(hash); }
export async function generateAesKey() { return new Uint8Array(32); }
export async function encryptPrompt(prompt, publicKey) { return { hash: "aaaa", encryptedBlob: "blob", version: "1.0.0" }; }
export async function decryptPromptCiphertext(encrypted, iv, key) { return "decrypted"; }
export async function unwrapPromptKey(wrapped, pub, priv) { return new Uint8Array(32); }
`;

const WALLET_MOCK = `
export const wallet = {
  signTransaction: async () => ({ signedTxXdr: "AAAAKdpER1EHHurN4W3S6LVdP3N3axlL2nxTcBd4mrdeDRTt" }),
  signMessage: async () => ({ signedMessage: "signed-message-content" }),
  getAddress: async () => ({ address: "${CREATOR_ADDRESS}" }),
  getNetwork: async () => ({ network: "TESTNET", networkPassphrase: "Test SDF Network ; September 2015" }),
  setWallet: async () => {},
  disconnect: async () => {},
  getSupportedWallets: async () => [],
  openModal: async () => {},
};
export const kit = wallet;
export const fetchBalance = async (address) => ({
  ok: true,
  balances: [{ asset_type: "native", balance: "99999.9999900" }],
});
export const connectWallet = async (...args) => {};
export const getSupportedWallets = async () => [];
`;

const CONTRACT_MOCK = `
function delay(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

var state = window.__MOCK_STATE__ = window.__MOCK_STATE__ || {};
state.nextId = state.nextId || 103;

var defaultPrompts = function () { return [
  {
    id: 101n, creator: "${CREATOR_ADDRESS}",
    priceStroops: 50000000n, title: "Board-ready launch plan",
    category: "Marketing",
    previewText: "A comprehensive marketing launch plan with go-to-market strategy.",
    imageUrl: "https://example.com/prompt.png",
    salesCount: 3, active: true,
    contentHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    classification: "professional", safetyFlags: ["none"],
    tags: ["Marketing"],
  },
  {
    id: 102n, creator: "${CREATOR_ADDRESS}",
    priceStroops: 100000000n, title: "Creative storyteller",
    category: "Creative",
    previewText: "Craft compelling narratives with AI assistance.",
    imageUrl: "https://example.com/story.png",
    salesCount: 7, active: true,
    contentHash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    classification: "creative", safetyFlags: ["none"],
    tags: ["Creative"],
  },
]; };

state.creatorPrompts = state.creatorPrompts || defaultPrompts();
state.marketplacePrompts = state.marketplacePrompts || defaultPrompts();
state.createPromptShouldFail = state.createPromptShouldFail || false;
state.createPromptError = state.createPromptError || "";
state.updatePriceShouldFail = state.updatePriceShouldFail || false;
state.updatePriceError = state.updatePriceError || "";
state.toggleStatusShouldFail = state.toggleStatusShouldFail || false;
state.toggleStatusError = state.toggleStatusError || "";

export var PromptHashClient = {
  getAllPrompts: async function () {
    await delay(50);
    return state.marketplacePrompts.filter(function (p) { return p.active; }).map(function (p) { return Object.assign({}, p); });
  },
  getPromptsByCreator: async function () {
    await delay(50);
    return state.creatorPrompts.map(function (p) { return Object.assign({}, p); });
  },
  getPromptsByBuyer: async function () { return []; },
  getPrompt: async function (_config, promptId) {
    await delay(50);
    var all = state.creatorPrompts.concat(state.marketplacePrompts);
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === promptId) return Object.assign({}, all[i]);
    }
    throw new Error("Prompt #" + promptId + " not found.");
  },
  createPrompt: async function (_config, _walletSignerLike, _address, data) {
    await delay(100);
    if (state.createPromptShouldFail) {
      throw new Error(state.createPromptError || "createPrompt failed");
    }
    var id = state.nextId++;
    state._lastCreateArgs = data;
    var newPrompt = {
      id: BigInt(id), creator: "${CREATOR_ADDRESS}",
      priceStroops: BigInt(data.priceStroops),
      title: data.title,
      category: data.category,
      previewText: data.previewText,
      imageUrl: data.imageUrl,
      salesCount: 0, active: true,
      contentHash: data.contentHash,
      classification: "professional", safetyFlags: ["none"],
      tags: [data.category],
    };
    state.creatorPrompts.push(newPrompt);
    state.marketplacePrompts.push(newPrompt);
    return { promptId: BigInt(id), txHash: "tx_hash_" + id };
  },
  setPromptSaleStatus: async function (_config, _walletSignerLike, _address, promptId, isForSale) {
    await delay(50);
    if (state.toggleStatusShouldFail) {
      throw new Error(state.toggleStatusError || "toggleStatus failed");
    }
    var id = BigInt(promptId);
    state.creatorPrompts = state.creatorPrompts.map(function (p) {
      return p.id === id ? Object.assign({}, p, { active: isForSale }) : p;
    });
    state.marketplacePrompts = state.marketplacePrompts.map(function (p) {
      return p.id === id ? Object.assign({}, p, { active: isForSale }) : p;
    });
    return { success: true };
  },
  updatePromptPrice: async function (_config, _walletSignerLike, _address, promptId, newPrice) {
    await delay(50);
    if (state.updatePriceShouldFail) {
      throw new Error(state.updatePriceError || "updatePrice failed");
    }
    var id = BigInt(promptId);
    var price = BigInt(newPrice);
    state.creatorPrompts = state.creatorPrompts.map(function (p) {
      return p.id === id ? Object.assign({}, p, { priceStroops: price }) : p;
    });
    state.marketplacePrompts = state.marketplacePrompts.map(function (p) {
      return p.id === id ? Object.assign({}, p, { priceStroops: price }) : p;
    });
    return { success: true };
  },
  checkAccess: async function () { await delay(50); return false; },
  hasAccess: async function () { await delay(50); return false; },
  getPurchaseDetails: async function () { return null; },
  purchasePrompt: async function (itemId) { return { txHash: "tx_purchase_" + itemId, success: true }; },
  purchasePromptsBulk: async function (items) { return { txHash: "tx_bulk", results: items.map(function (i) { return { promptId: i.promptId, success: true }; }) }; },
  createPromotion: async function () { return { txHash: "tx_promo", success: true, promotionId: 1 }; },
  cancelPromotion: async function () { return { txHash: "tx_cancel", success: true }; },
  getActivePromotion: async function () { return null; },
  getEffectivePrice: async function () { return { price: 0n, asset: "", isPromotional: false }; },
  getPromptEncryptionVersion: async function () { throw new Error("Encryption version not found"); },
};

export var hasAccess = function (c, a, i) { return PromptHashClient.checkAccess(c, a, i); };
export var getPrompt = function (c, p) { return PromptHashClient.getPrompt(c, p); };
export var getAllPrompts = function (c) { return PromptHashClient.getAllPrompts(c); };
export var getPromptsByBuyer = function (c, a) { return PromptHashClient.getPromptsByBuyer(c, a); };
export var getPromptsByCreator = function (c, a) { return PromptHashClient.getPromptsByCreator(c, a); };
export var createPrompt = function (c, w, a, d) { return PromptHashClient.createPrompt(c, w, a, d); };
export var setPromptSaleStatus = function (c, w, a, pid, s) { return PromptHashClient.setPromptSaleStatus(c, w, a, pid, s); };
export var updatePromptPrice = function (c, w, a, pid, p) { return PromptHashClient.updatePromptPrice(c, w, a, pid, p); };
export var getPurchaseDetails = function (c, pid, b) { return PromptHashClient.getPurchaseDetails(c, pid, b); };
export var getPromptEncryptionVersion = function (c, pid, v) { return PromptHashClient.getPromptEncryptionVersion(c, pid, v); };
export var CONTRACT_ERROR_CODES = {};
export function classifyContractError(error) { return { code: "UNKNOWN", message: "unknown", isUserActionable: true }; }
export function formatContractErrorMessage(error) { return error && error.message || "unknown"; }
`;

async function setupMocks(page: Page, withWallet = false) {
  await page.route("**/api/images/validate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ valid: true }),
    });
  });

  await page.route("**/src/lib/stellar/promptHashClient*", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: CONTRACT_MOCK,
    });
  });

  await page.route("**/src/lib/crypto/promptCrypto*", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: CRYPTO_MOCK,
    });
  });

  if (withWallet) {
    await page.addInitScript((address) => {
      localStorage.setItem("walletId", JSON.stringify("freighter"));
      localStorage.setItem("walletAddress", JSON.stringify(address));
      localStorage.setItem("walletNetwork", JSON.stringify("TESTNET"));
    }, CREATOR_ADDRESS);

    await page.route("**/src/util/wallet*", async (route) => {
      await route.fulfill({
        contentType: "application/javascript",
        body: WALLET_MOCK,
      });
    });
  }
}

async function navigateToSell(page: Page, withWallet = false) {
  if (withWallet) {
    await page.addInitScript((address) => {
      localStorage.setItem("walletId", JSON.stringify("freighter"));
      localStorage.setItem("walletAddress", JSON.stringify(address));
      localStorage.setItem("walletNetwork", JSON.stringify("TESTNET"));
    }, CREATOR_ADDRESS);
  }
  await page.goto("/sell");
  await page.waitForLoadState("networkidle");
}

async function ensureCreateView(page: Page) {
  await page.locator('button:has-text("Create listing")').click();
  await page.waitForTimeout(400);
  try {
    const pressed = await page.locator('button:has-text("My prompts")').getAttribute("aria-pressed");
    if (pressed === "true") {
      await page.locator('button:has-text("Create listing")').click();
      await page.waitForTimeout(600);
    }
  } catch { /* ignore */ }
}

async function dismissOnboarding(page: Page) {
  const closeBtn = page.locator('[aria-label="Close onboarding"]');
  try {
    await closeBtn.waitFor({ state: "visible", timeout: 10000 });
    await closeBtn.click();
    await page.waitForTimeout(400);
  } catch {
    // Onboarding not visible, proceed
  }
}

async function selectComboBox(page: Page, triggerId: string, optionText: string) {
  await page.locator("#" + triggerId).click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"]').filter({ hasText: optionText }).click();
  await page.waitForTimeout(200);
}

async function fillValidForm(page: Page) {
  await ensureCreateView(page);
  await page.fill("#imageUrl", "https://example.com/new-cover.png");
  await page.fill("#title", "Campaign launch pack");
  await page.fill("#previewText", "A comprehensive campaign launch pack with templates and guides for marketing teams.");
  await page.fill("#fullPrompt", "Create a comprehensive marketing campaign plan that includes target audience analysis, channel selection, content strategy, and KPI tracking.");
  await page.fill("#priceXlm", "5");
  await selectComboBox(page, "category", "Marketing");
  await selectComboBox(page, "classification", "Professional");
}

async function submitForm(page: Page) {
  const btn = page.locator('button:has-text("Create prompt listing")');
  await btn.click();
  await page.waitForTimeout(800);
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
  }
}

test.describe("Creator listing management", () => {
  test.describe("Draft recovery", () => {
    test("persists form data to localStorage on input", async ({ page }) => {
      await setupMocks(page, true);
      await navigateToSell(page);
      await dismissOnboarding(page);

      await page.fill("#title", "Draft title from session recovery");
      await page.fill("#previewText", "Preview text that should survive a refresh");

      const storageKey = `prompt-hash:create-draft:${CREATOR_ADDRESS}`;

      await page.waitForTimeout(1000);

      const raw = await page.evaluate((key) => localStorage.getItem(key), storageKey);

      expect(raw).not.toBeNull();
      expect(raw).toContain("Draft title from session recovery");
      expect(raw).toContain("Preview text that should survive a refresh");

      const parsed = JSON.parse(raw!);
      expect(parsed.savedAt).toBeDefined();
      expect(parsed.formData.title).toBe("Draft title from session recovery");
      expect(parsed.formData.previewText).toBe("Preview text that should survive a refresh");
    });

    test("restores draft from localStorage on load", async ({ page }) => {
      const storageKey = `prompt-hash:create-draft:${CREATOR_ADDRESS}`;

      await page.addInitScript(({ key, data }) => {
        localStorage.setItem(key, JSON.stringify(data));
      }, {
        key: storageKey,
        data: {
          savedAt: new Date().toISOString(),
          formData: {
            title: "Recovered draft title",
            previewText: "This text was recovered from local storage.",
            imageUrl: "https://example.com/recovered.png",
            category: "Marketing",
            fullPrompt: "",
            priceXlm: "2",
            classification: "",
            safetyFlags: [],
          },
        },
      });

      // Navigate to /sell (init script runs before React mounts)
      await setupMocks(page, true);
      await page.goto("/sell");
      await page.waitForLoadState("networkidle");
      await dismissOnboarding(page);

      // The "Recovered local draft" banner confirms the restore effect fired
      await expect(page.locator("text=Recovered local draft")).toBeVisible({ timeout: 15000 });
    });

    test("discarding a draft resets form and clears the draft banner", async ({ page }) => {
      await setupMocks(page, true);
      await navigateToSell(page);
      await dismissOnboarding(page);

      const storageKey = `prompt-hash:create-draft:${CREATOR_ADDRESS}`;

      await page.addInitScript(({ key, data }) => {
        localStorage.setItem(key, JSON.stringify(data));
      }, {
        key: storageKey,
        data: {
          savedAt: new Date().toISOString(),
          formData: {
            title: "Discard me",
            previewText: "Will be discarded.",
            imageUrl: "",
            category: "",
            fullPrompt: "",
            priceXlm: "2",
            classification: "",
            safetyFlags: [],
          },
        },
      });

      await page.reload();
      await page.waitForLoadState("networkidle");

      await expect(page.locator("text=Recovered local draft")).toBeVisible({ timeout: 15000 });

      await page.locator('button:has-text("Discard draft")').click();
      await page.waitForTimeout(300);

      await expect(page.locator("text=Recovered local draft")).not.toBeVisible();

      const titleAfter = await page.evaluate(() => {
        const input = document.getElementById("title") as HTMLInputElement | null;
        return input?.value ?? "";
      });
      expect(titleAfter).toBe("");

      const priceAfter = await page.evaluate(() => {
        const input = document.getElementById("priceXlm") as HTMLInputElement | null;
        return input?.value ?? "";
      });
      expect(priceAfter).toBe("2");
    });
  });

  test.describe("Validation errors", () => {
    test("shows inline error on blur for empty required fields", async ({ page }) => {
      await setupMocks(page, true);
      await navigateToSell(page);
      await dismissOnboarding(page);

      const titleInput = page.locator("#title");
      await titleInput.focus();
      await titleInput.blur();
      await page.waitForTimeout(300);

      await expect(page.locator("text=Add a title that tells buyers")).toBeVisible();
    });

    test("shows price error when price is zero on blur", async ({ page }) => {
      await setupMocks(page, true);
      await navigateToSell(page);
      await dismissOnboarding(page);

      const priceInput = page.locator("#priceXlm");
      await priceInput.fill("0");
      await priceInput.blur();
      await page.waitForTimeout(300);

      await expect(page.locator("text=Set a price greater than zero XLM")).toBeVisible();
    });

    test("clears error when field becomes valid", async ({ page }) => {
      await setupMocks(page, true);
      await navigateToSell(page);
      await dismissOnboarding(page);

      const titleInput = page.locator("#title");
      await titleInput.focus();
      await titleInput.blur();
      await page.waitForTimeout(300);
      await expect(page.locator("text=Add a title that tells buyers")).toBeVisible();

      await titleInput.fill("A valid title");
      await titleInput.blur();
      await page.waitForTimeout(300);
      await expect(page.locator("text=Add a title that tells buyers")).not.toBeVisible();
    });
  });

  test.describe("Create listing with encryption", () => {
    async function runSubmitAndVerify(page: Page) {
      await page.waitForTimeout(300);
      await submitForm(page);

      // After successful submit, onCreated() switches view to "manage" so the success
      // message div inside CreatePromptForm is never rendered.  Verify the submission
      // happened by checking mock state + view switch instead.
      await page.waitForFunction(() => {
        const s = (window as any).__MOCK_STATE__;
        return s?._lastCreateArgs ? true : false;
      }, { timeout: 15000 });

      // The "My prompts" view should now be active
      await expect(page.locator('button:has-text("My prompts")[aria-pressed="true"]')).toBeVisible({ timeout: 5000 });
    }

    test("encrypts prompt and submits with connected wallet", async ({ page }) => {
      await setupMocks(page, true);
      await navigateToSell(page);
      await dismissOnboarding(page);

      await fillValidForm(page);
      await runSubmitAndVerify(page);
    });

    test("contract arguments exclude plaintext prompt content", async ({ page }) => {
      await setupMocks(page, true);
      await navigateToSell(page);
      await dismissOnboarding(page);

      const plaintext = "This is my secret prompt that should never appear in contract args without encryption.";

      await fillValidForm(page);
      await page.fill("#fullPrompt", plaintext);
      await page.waitForTimeout(300);

      await runSubmitAndVerify(page);

      const lastArgs = await page.evaluate(() => {
        return (window as any).__MOCK_STATE__?._lastCreateArgs || null;
      });

      expect(lastArgs).not.toBeNull();
      expect(lastArgs.encryptedPrompt).not.toBe(plaintext);
      expect(lastArgs.title).toBe("Campaign launch pack");
      expect(lastArgs.contentHash).toBeDefined();
      expect(lastArgs.contentHash.length).toBe(64);
      expect(lastArgs.priceStroops).toBeDefined();
    });
  });

  test.describe("Price updates", () => {
    test("updates prompt price and refreshes creator view", async ({ page }) => {
      await setupMocks(page, true);
      await navigateToSell(page);
      await dismissOnboarding(page);

      await page.locator('button:has-text("My prompts")').click();
      await page.waitForTimeout(500);

      await expect(page.locator("text=Board-ready launch plan")).toBeVisible({ timeout: 10000 });
      await expect(page.locator("text=Creative storyteller")).toBeVisible({ timeout: 10000 });

      const priceInputs = page.locator('[aria-label^="Price in XLM for"]');
      await priceInputs.first().fill("8");
      await page.waitForTimeout(200);

      await page.locator('button:has-text("Update price")').first().click();

      await expect(page.locator("text=Prompt price updated.")).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe("Sale status toggle", () => {
    test("deactivates and reactivates a listing", async ({ page }) => {
      await setupMocks(page, true);
      await navigateToSell(page);
      await dismissOnboarding(page);

      await page.locator('button:has-text("My prompts")').click();
      await page.waitForTimeout(500);

      await expect(page.locator("text=Board-ready launch plan")).toBeVisible({ timeout: 10000 });

      const toggleButton = page.locator('button:has-text("Set inactive")').first();
      await toggleButton.click();

      await expect(page.locator("text=Prompt deactivated.")).toBeVisible({ timeout: 15000 });

      await expect(page.locator('button:has-text("Reactivate")').first()).toBeVisible({ timeout: 10000 });

      await page.locator('button:has-text("Reactivate")').first().click();
      await expect(page.locator("text=Prompt reactivated.")).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe("Marketplace reflection", () => {
    test("deactivating a listing hides it from marketplace browse view", async ({ page }) => {
      await setupMocks(page, true);
      await navigateToSell(page);
      await dismissOnboarding(page);

      await page.locator('button:has-text("My prompts")').click();
      await page.waitForTimeout(500);
      await expect(page.locator("text=Board-ready launch plan")).toBeVisible({ timeout: 10000 });

      await page.locator('button:has-text("Set inactive")').first().click();
      await expect(page.locator("text=Prompt deactivated.")).toBeVisible({ timeout: 15000 });

      // Navigate to browse via link click to preserve mock state in same page context
      await page.locator('a[href="/browse"]').first().click();
      await page.waitForTimeout(2000);

      await expect(page.locator("text=Board-ready launch plan")).not.toBeVisible();
      await expect(page.locator("text=Creative storyteller")).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Error recovery", () => {
    test("recovers from a contract-level transaction failure", async ({ page }) => {
      await setupMocks(page, true);
      await navigateToSell(page);
      await dismissOnboarding(page);

      await fillValidForm(page);
      await page.waitForTimeout(300);

      await page.evaluate(() => {
        const state = (window as any).__MOCK_STATE__ || {};
        state.createPromptShouldFail = true;
        state.createPromptError = "Your wallet doesn't have enough XLM";
      });

      await submitForm(page);

      // Error is shown in the create form (view stays "create" on failure).
      // translateError converts unknown messages to "An unexpected error occurred. Please try again."
      await expect(page.locator("text=An unexpected error occurred. Please try again.")).toBeVisible({ timeout: 30000 });

      await page.evaluate(() => {
        const state = (window as any).__MOCK_STATE__ || {};
        state.createPromptShouldFail = false;
        state.createPromptError = "";
      });

      await submitForm(page);

      // On success, view switches to "manage" — verify mock state instead of DOM text
      await page.waitForFunction(() => {
        const s = (window as any).__MOCK_STATE__;
        return s?._lastCreateArgs ? s._lastCreateArgs : undefined;
      }, { timeout: 15000 });
      await expect(page.locator('button:has-text("My prompts")[aria-pressed="true"]')).toBeVisible({ timeout: 5000 });
    });
  });
});
