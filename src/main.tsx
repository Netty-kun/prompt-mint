import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import "./index.css";
import App from "./App.tsx";
import "@stellar/design-system/build/styles.min.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { BrowserRouter } from "react-router-dom";

import { KeyboardShortcutsProvider } from "./providers/KeyboardShortcutsProvider.tsx";

import { WalletProvider } from "./providers/WalletProvider.tsx";
import { TransactionProvider } from "./components/TransactionProvider.tsx";
import { NotificationProvider } from "./providers/NotificationProvider.tsx";
import { ContractSyncProvider } from "./providers/ContractSyncProvider.tsx";
import { CurrencyProvider } from "./providers/CurrencyProvider.tsx";
import { NetworkStateProvider } from "./hooks/useNetworkState.tsx";
import { ReducedMotionProvider } from "./components/ReducedMotionProvider.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <ReducedMotionProvider>
      <NotificationProvider>
        <QueryClientProvider client={queryClient}>
          <ContractSyncProvider>
            <TransactionProvider>
              <WalletProvider>
                <NetworkStateProvider>
                  <BrowserRouter>
                    <KeyboardShortcutsProvider>
                      <CurrencyProvider>
                        <App />
                        <Toaster
                          theme="dark"
                          position="bottom-right"
                          toastOptions={{
                            className:
                              "!bg-slate-900 !border !border-white/10 !text-white !shadow-2xl",
                          }}
                        />
                      </CurrencyProvider>
                    </KeyboardShortcutsProvider>
                  </BrowserRouter>
                </NetworkStateProvider>
              </WalletProvider>
            </TransactionProvider>
          </ContractSyncProvider>
        </QueryClientProvider>
      </NotificationProvider>
    </ReducedMotionProvider>
  </StrictMode>,
);
