# Testnet Onboarding with Friendbot

PromptHash Stellar integrates Stellar's **Friendbot** service to simplify testnet onboarding for new users. Friendbot is a free funding service that sends test XLM to Stellar accounts on test networks, allowing developers and testers to interact with the marketplace without using real funds.

## How Friendbot Works

Friendbot is a Stellar development tool that automatically funds new accounts on test networks. When a user requests funding:

1. The frontend calls the Friendbot endpoint with the user's Stellar public address.
2. Friendbot creates the account on the test network (if it doesn't exist) and sends a starting balance of test XLM.
3. The user can then use these test XLM to purchase prompts, test contract interactions, and validate marketplace flows.

## Network Support

The Friendbot integration supports the following Stellar networks:

| Network | Friendbot URL | Environment Variable |
|---------|---------------|---------------------|
| **TESTNET** | `https://friendbot.stellar.org/?addr={address}` | `PUBLIC_STELLAR_NETWORK=TESTNET` |
| **FUTURENET** | `https://friendbot-futurenet.stellar.org/?addr={address}` | `PUBLIC_STELLAR_NETWORK=FUTURENET` |
| **LOCAL / STANDALONE** | `/friendbot?addr={address}` (proxied) | `PUBLIC_STELLAR_NETWORK=LOCAL` or `STANDALONE` |
| **MAINNET / PUBLIC** | Not supported (throws error) | `PUBLIC_STELLAR_NETWORK=PUBLIC` |

### TESTNET

The default test network for Stellar development. Friendbot is available at `https://friendbot.stellar.org`. Use this for most development and QA work.

### FUTURENET

Stellar's future network for testing upcoming protocol changes. Friendbot is available at `https://friendbot-futurenet.stellar.org`.

### LOCAL / STANDALONE

For local Soroban development (e.g., `stellar container start`). Friendbot requests are proxied through the Vite dev server via the `/friendbot` route, which forwards to the local Stellar QuickStart container. The `PUBLIC_STELLAR_NETWORK=STANDALONE` value is automatically converted to `LOCAL` in the environment utility.

### MAINNET / PUBLIC

Friendbot does **not** exist on Mainnet. Calling `getFriendbotUrl()` with `PUBLIC_STELLAR_NETWORK=PUBLIC` throws an error to prevent accidental usage on production.

## Frontend Integration

### FundAccountButton Component

The `FundAccountButton` component (`src/components/FundAccountButton.tsx`) provides the primary user interface for Friendbot funding:

**Behavior:**
- **Visible only** when a wallet address is connected.
- **Disabled** when the account is already funded (`isFunded` from `useWalletBalance`).
- **Disabled** while a funding request is in progress (`isPending` from `useTransition`).
- **Disabled** while the balance is loading (`isLoading` from `useWalletBalance`).
- Shows a tooltip explaining the action (either "Account is already funded" or "Fund your account using the Stellar Friendbot").
- Calls `getFriendbotUrl(address)` to build the correct endpoint URL.

**User feedback:**
- **Success:** Displays a success notification: "Account funded successfully!"
- **Failure (with details):** Displays an error notification with the server's error detail message.
- **Failure (unknown):** Displays "Error funding account: Unknown error".
- **Network error:** Displays "Error funding account. Please try again."

### Error Handling

The FundAccountButton handles the following error scenarios:

| Scenario | Behavior |
|----------|----------|
| Account already exists and is funded | Friendbot returns an error; displayed to the user |
| Invalid wallet address | Friendbot returns an error; displayed to the user |
| Network request failure (offline, timeout) | Catch block shows generic error message |
| Mainnet network detected | `getFriendbotUrl()` throws before making the request |
| Unknown server error | JSON fallback parses `detail` field or shows generic error |

## Utility Layer

The `getFriendbotUrl()` function (`src/util/friendbot.ts`) is the core utility for building Friendbot URLs:

```typescript
import { stellarNetwork } from "../lib/env";

export function getFriendbotUrl(address: string) {
  switch (stellarNetwork) {
    case "LOCAL":
      return `/friendbot?addr=${address}`;
    case "FUTURENET":
      return `https://friendbot-futurenet.stellar.org/?addr=${address}`;
    case "TESTNET":
      return `https://friendbot.stellar.org/?addr=${address}`;
    default:
      throw new Error(
        `Unknown or unsupported PUBLIC_STELLAR_NETWORK for friendbot: ${stellarNetwork}`,
      );
  }
}
```

### Key Design Decisions

1. **No Mainnet support:** Friendbot is a test network tool. The function throws an explicit error for unknown/unsupported networks to prevent accidental usage on Mainnet.
2. **Environment-driven:** The network is determined by `PUBLIC_STELLAR_NETWORK` environment variable, ensuring consistent behavior across development, preview, and production deployments.
3. **Local proxy:** For LOCAL/STANDALONE networks, requests are proxied through the Vite dev server (`vite.config.ts`) to the local Stellar container.

## Vite Proxy Configuration

In `vite.config.ts`, the `/friendbot` route is proxied to the Friendbot endpoint:

```typescript
server: {
  proxy: {
    "/friendbot": {
      target: "https://friendbot.stellar.org",
      changeOrigin: true,
    },
  },
}
```

For local development with a Stellar QuickStart container, update the proxy target to `http://localhost:8000/friendbot`.

## Testing

The Friendbot integration is covered by automated tests in `src/util/__tests__/friendbot.test.ts`:

- **Success paths:** TESTNET, FUTURENET, and LOCAL URLs are correctly constructed.
- **Error paths:** MAINNET and unknown networks throw appropriate errors.
- **Edge cases:** Empty addresses, special characters, and the STANDALONE → LOCAL conversion are handled.

### Running the tests

```bash
# Run all frontend tests
yarn test:frontend

# Run only friendbot tests
yarn test:frontend -- src/util/__tests__/friendbot.test.ts
```

## Backward Compatibility

The Friendbot integration is fully backward compatible with existing marketplace flows:

- The `FundAccountButton` is an optional UI component — users can skip funding if their account already has XLM.
- The `getFriendbotUrl()` utility is purely additive — existing contract interactions, purchase flows, and unlock endpoints do not depend on it.
- Friendbot funding is only available on test networks; Mainnet users never see the funding button (the wallet simply shows an unfunded state).
- No contract changes were required — Friendbot operates entirely at the application/UI layer.

## Security Considerations

- **Test XLM only:** Friendbot funds are test tokens with no real value. Never use Friendbot URLs on Mainnet.
- **Public addresses only:** The Friendbot endpoint only accepts public Stellar addresses. No private keys or secrets are transmitted.
- **Rate limiting:** Friendbot has rate limits. Excessive requests from a single IP may be temporarily blocked.
- **No authentication:** Friendbot is an open faucet and requires no API key or authentication.

## Related Documentation

- [Environment Setup Guide](./environments.md) — Configuring Stellar networks
- [Local Development Guide](./contributing.md) — Setting up the development environment
- [Local Fixtures](./local-fixtures.md) — Testing without Friendbot
- [Troubleshooting](./troubleshooting.md) — Common issues and solutions
