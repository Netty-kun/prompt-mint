import { useEffect } from "react";
import { AlertTriangle, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";

export function WalletAutoLockModal() {
  const { autoLockSecondsLeft, extendSession } = useWallet();

  useEffect(() => {
    if (autoLockSecondsLeft === null) return;
    const onActivity = () => extendSession();
    window.addEventListener("pointerdown", onActivity, { once: true });
    return () => window.removeEventListener("pointerdown", onActivity);
  }, [autoLockSecondsLeft, extendSession]);

  if (autoLockSecondsLeft === null) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="auto-lock-title"
      aria-describedby="auto-lock-desc"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4"
    >
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
        </div>
        <h2
          id="auto-lock-title"
          className="text-lg font-bold text-white"
        >
          Wallet will lock soon
        </h2>
        <p id="auto-lock-desc" className="mt-2 text-sm text-slate-400">
          No activity detected. Your wallet will be disconnected to keep your
          account secure.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 text-2xl font-bold text-white">
          <Clock className="h-6 w-6 text-amber-400" />
          <span aria-live="polite">{autoLockSecondsLeft}s</span>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <Button
            className="h-12 w-full bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-600"
            onClick={extendSession}
          >
            Stay connected
          </Button>
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <Lock className="h-3.5 w-3.5" />
            Lock now for maximum security
          </div>
        </div>
      </div>
    </div>
  );
}
