import { Horizon } from "@stellar/stellar-sdk";
import { horizonUrl, stellarNetwork } from "@/lib/env";
import {
  DEFAULT_BASE_RESERVE_STROOPS,
  computeMinimumReserveStroops,
  parseHorizonNativeBalanceToStroops,
} from "@/lib/checkout/xlmBalance";

export interface CheckoutAccountSnapshot {
  nativeBalanceStroops: bigint;
  minimumReserveStroops: bigint;
  subentryCount: number;
}

function getHorizonServer(): Horizon.Server {
  return new Horizon.Server(horizonUrl, {
    allowHttp: (stellarNetwork as string) === "LOCAL" || (stellarNetwork as string) === "STANDALONE",
  });
}

let cachedBaseReserveStroops: bigint | null = null;

async function resolveBaseReserveStroops(horizon: Horizon.Server): Promise<bigint> {
  if (cachedBaseReserveStroops !== null) {
    return cachedBaseReserveStroops;
  }

  try {
    const root = await horizon.root();
    const fromHorizon = BigInt((root as any).base_reserve_in_stroops ?? 0);
    cachedBaseReserveStroops = fromHorizon > 0n ? fromHorizon : DEFAULT_BASE_RESERVE_STROOPS;
  } catch {
    cachedBaseReserveStroops = DEFAULT_BASE_RESERVE_STROOPS;
  }

  return cachedBaseReserveStroops;
}

/** Resets cached Horizon base reserve (for tests). */
export function resetCheckoutBaseReserveCache(): void {
  cachedBaseReserveStroops = null;
}

/**
 * Loads native XLM balance and minimum reserve for checkout validation.
 */
export async function fetchCheckoutAccountSnapshot(
  address: string,
): Promise<CheckoutAccountSnapshot> {
  const horizon = getHorizonServer();
  const account = await horizon.accounts().accountId(address).call();
  const native = account.balances.find((line) => line.asset_type === "native");
  const nativeBalanceStroops = native
    ? parseHorizonNativeBalanceToStroops(native.balance)
    : 0n;

  const baseReserve = await resolveBaseReserveStroops(horizon);
  const subentryCount = account.subentry_count ?? 0;
  const numSponsoring = account.num_sponsoring ?? 0;
  const numSponsored = account.num_sponsored ?? 0;

  return {
    nativeBalanceStroops,
    minimumReserveStroops: computeMinimumReserveStroops(
      subentryCount,
      numSponsoring,
      numSponsored,
      baseReserve,
    ),
    subentryCount,
  };
}
