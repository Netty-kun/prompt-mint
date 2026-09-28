import { stellarNetwork } from "@/lib/env";

const EXPLORER_BASE = "https://stellar.expert/explorer";

export function explorerNetworkSegment(
  network: string = stellarNetwork
): "testnet" | "public" | "futurenet" {
  switch (String(network).toUpperCase()) {
    case "PUBLIC":
    case "MAINNET":
      return "public";
    case "FUTURENET":
      return "futurenet";
    case "TESTNET":
    case "STANDALONE":
    default:
      return "testnet";
  }
}

export function explorerTxUrl(txHash: string, network?: string): string {
  return `${EXPLORER_BASE}/${explorerNetworkSegment(network)}/tx/${txHash}`;
}

export function explorerAccountUrl(address: string, network?: string): string {
  return `${EXPLORER_BASE}/${explorerNetworkSegment(network)}/account/${address}`;
}

export function buildTransactionExplorerUrl(txHash: string): string | null {
  const trimmed = txHash.trim();
  if (!trimmed) {
    return null;
  }
  const segment = stellarNetwork === "PUBLIC" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${segment}/tx/${trimmed}`;
}
