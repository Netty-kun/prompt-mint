import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TransactionRecord,
  TransactionFilter,
  getTransactions,
  recordTransaction,
  removeTransaction as removeTx,
  clearTransactions,
  filterTransactions,
  isStorageAvailable,
} from "@/lib/history/transactions";

export interface UseTransactionHistoryReturn {
  transactions: TransactionRecord[];
  filtered: TransactionRecord[];
  filter: TransactionFilter;
  setFilter: (_filter: TransactionFilter) => void;
  isStorageOk: boolean;
  record: (_record: TransactionRecord) => boolean;
  remove: (_id: string) => boolean;
  clear: () => boolean;
  refresh: () => void;
}

/**
 * Hook exposing the wallet-scoped local transaction history (#278).
 */
export function useTransactionHistory(
  walletAddress: string | null | undefined
): UseTransactionHistoryReturn {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [filter, setFilter] = useState<TransactionFilter>({
    type: "all",
    status: "all",
  });
  const [isStorageOk, setIsStorageOk] = useState(true);

  const refresh = useCallback(() => {
    if (!walletAddress) {
      setTransactions([]);
      return;
    }
    setIsStorageOk(isStorageAvailable());
    setTransactions(getTransactions(walletAddress));
  }, [walletAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const record = useCallback(
    (rec: TransactionRecord) => {
      if (!walletAddress) return false;
      const ok = recordTransaction(walletAddress, rec);
      if (ok) setTransactions(getTransactions(walletAddress));
      return ok;
    },
    [walletAddress]
  );

  const remove = useCallback(
    (id: string) => {
      if (!walletAddress) return false;
      const ok = removeTx(walletAddress, id);
      if (ok) setTransactions(getTransactions(walletAddress));
      return ok;
    },
    [walletAddress]
  );

  const clear = useCallback(() => {
    if (!walletAddress) return false;
    const ok = clearTransactions(walletAddress);
    if (ok) setTransactions([]);
    return ok;
  }, [walletAddress]);

  const filtered = useMemo(
    () => filterTransactions(transactions, filter),
    [transactions, filter]
  );

  return {
    transactions,
    filtered,
    filter,
    setFilter,
    isStorageOk,
    record,
    remove,
    clear,
    refresh,
  };
}
