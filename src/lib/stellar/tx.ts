import {
  BASE_FEE,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  type xdr,
} from "@stellar/stellar-sdk";
import {
  Api,
  Server,
  assembleTransaction,
} from "@stellar/stellar-sdk/rpc";
import { getCircuitBreaker } from "../observability/circuitBreaker";
import { metrics } from "../observability/metrics";

const stellarRpcBreaker = getCircuitBreaker("stellar-rpc", {
  failureThreshold: 5,
  resetTimeoutMs: 20_000,
});

export interface StellarNetworkConfig {
  rpcUrl: string;
  networkPassphrase: string;
  allowHttp?: boolean;
  simulationAccount?: string;
  /** Per-request timeout for calls to the RPC server, in ms. Defaults to 15s. */
  timeoutMs?: number;
}

const DEFAULT_RPC_TIMEOUT_MS = 15_000;

export interface WalletTransactionSigner {
  /* eslint-disable no-unused-vars */
  signTransaction: (
    _xdr: string,
    _opts: { address: string; networkPassphrase: string },
  ) => Promise<{ signedTxXdr: string }>;
  /* eslint-enable no-unused-vars */
}

export interface PreparedContractCall {
  preparedTransaction: ReturnType<typeof TransactionBuilder.fromXDR>;
  simulation: Api.SimulateTransactionSuccessResponse;
  server: Server;
}

export function getRpcServer(config: StellarNetworkConfig) {
  return new Server(config.rpcUrl, {
    allowHttp: config.allowHttp ?? new URL(config.rpcUrl).hostname === "localhost",
    timeout: config.timeoutMs ?? DEFAULT_RPC_TIMEOUT_MS,
  });
}

export function scValArg(value: unknown, type?: string) {
  return type ? nativeToScVal(value, { type }) : nativeToScVal(value);
}

export function readSimulationResult(simulation: Api.SimulateTransactionSuccessResponse) {
  if (!simulation.result) {
    return undefined;
  }

  return scValToNative(simulation.result.retval);
}

async function timedRpc<T>(method: string, fn: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    metrics.trackRpcCall(method, Date.now() - started, "ok");
    return result;
  } catch (error) {
    metrics.trackRpcCall(method, Date.now() - started, "error");
    throw error;
  }
}

export async function simulateContractCall(
  config: StellarNetworkConfig,
  source: string,
  contractId: string,
  method: string,
  args: xdr.ScVal[] = [],
) {
  const server = getRpcServer(config);
  const account = await timedRpc("getAccount", () =>
    stellarRpcBreaker.execute(() => server.getAccount(source)),
  );
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(30)
    .build();

  const simulation = await timedRpc("simulateTransaction", () =>
    stellarRpcBreaker.execute(() => server.simulateTransaction(transaction)),
  );
  if (Api.isSimulationError(simulation)) {
    throw new Error(simulation.error);
  }

  if (Api.isSimulationRestore(simulation)) {
    throw new Error("Contract call requires a state restore before it can be submitted.");
  }

  return {
    server,
    transaction,
    simulation,
  };
}

export async function prepareContractCall(
  config: StellarNetworkConfig,
  source: string,
  contractId: string,
  method: string,
  args: xdr.ScVal[] = [],
): Promise<PreparedContractCall> {
  const { server, transaction, simulation } = await simulateContractCall(
    config,
    source,
    contractId,
    method,
    args,
  );

  const preparedTransaction = assembleTransaction(transaction, simulation).build();

  return {
    preparedTransaction,
    simulation,
    server,
  };
}

export async function readContract<TResult>(
  config: StellarNetworkConfig,
  contractId: string,
  method: string,
  args: xdr.ScVal[] = [],
): Promise<TResult> {
  if (!config.simulationAccount) {
    throw new Error("PUBLIC_STELLAR_SIMULATION_ACCOUNT is required for contract reads.");
  }

  const { simulation } = await simulateContractCall(
    config,
    config.simulationAccount,
    contractId,
    method,
    args,
  );

  return readSimulationResult(simulation) as TResult;
}

/** Real lifecycle stages a submitted transaction passes through (#266). */
export type SubmitTransactionStep = "signing" | "submitting" | "confirming" | "complete";

export async function submitPreparedTransaction(
  config: StellarNetworkConfig,
  prepared: PreparedContractCall,
  signer: WalletTransactionSigner,
  source: string,
  // eslint-disable-next-line no-unused-vars
  onStep?: (step: SubmitTransactionStep) => void,
) {
  onStep?.("signing");
  const signed = await signer.signTransaction(
    prepared.preparedTransaction.toXDR(),
    {
      address: source,
      networkPassphrase: config.networkPassphrase,
    },
  );

  const signedTransaction = TransactionBuilder.fromXDR(
    signed.signedTxXdr,
    config.networkPassphrase,
  );

  onStep?.("submitting");
  const response = await timedRpc("sendTransaction", () =>
    stellarRpcBreaker.execute(() => prepared.server.sendTransaction(signedTransaction)),
  );
  if (response.status === "TRY_AGAIN_LATER") {
    throw new Error("The Stellar RPC asked the client to retry later.");
  }

  if (response.status === "ERROR") {
    const details = response.errorResult?.toXDR("base64");
    throw new Error(
      details ? `Transaction submission failed: ${details}` : "Transaction submission failed.",
    );
  }

  onStep?.("confirming");
  const result = await timedRpc("pollTransaction", () =>
    stellarRpcBreaker.execute(() =>
      prepared.server.pollTransaction(response.hash, {
        attempts: 20,
        sleepStrategy: () => 1_000,
      }),
    ),
  );

  if (result.status === Api.GetTransactionStatus.SUCCESS) {
    onStep?.("complete");
    metrics.trackTransactionVolume("submit");
    return result;
  }

  if (result.status === Api.GetTransactionStatus.FAILED) {
    throw new Error(`Transaction failed: ${result.resultXdr.toXDR("base64")}`);
  }

  throw new Error("Transaction was not found after submission.");
}
