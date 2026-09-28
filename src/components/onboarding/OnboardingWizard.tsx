import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, Wallet, X } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "prompthash.onboarding.v1";

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "done";
  } catch {
    return true;
  }
}

export function markOnboardingComplete(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "done");
  } catch {
    /* ignore storage errors */
  }
}

const WALLETS = [
  { id: "freighter", name: "Freighter" },
  { id: "albedo", name: "Albedo" },
  { id: "xbull", name: "xBull" },
];

interface StepProps {
  onNext?: () => void;
  onBack?: () => void;
  onFinish?: () => void;
  onConnect?: (id: string) => void;
}

function WelcomeStep({ onNext }: StepProps) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
        <Wallet className="h-8 w-8" />
      </div>
      <h2 className="mt-4 text-2xl font-bold text-white">
        Welcome to PromptHash
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        PromptHash is a Stellar-based marketplace where creators publish AI
        prompts as verifiable assets and buyers purchase licensed access —
        all recorded on-chain.
      </p>
      <Button
        className="mt-6 w-full bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400"
        onClick={onNext}
      >
        Get started <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function WalletStep({ onBack, onNext, onConnect }: StepProps) {
  const { address } = useWallet();
  return (
    <div>
      <h2 className="text-xl font-bold text-white">Connect a wallet</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Your wallet signs purchases and proves ownership of the prompts you buy
        and sell. Pick one below to continue.
      </p>
      <div className="mt-5 space-y-2">
        {WALLETS.map((wallet) => (
          <button
            key={wallet.id}
            type="button"
            onClick={() => {
              onConnect?.(wallet.id);
              onNext?.();
            }}
            disabled={Boolean(address)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {wallet.name}
            <ArrowRight className="h-4 w-4 text-slate-500" />
          </button>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="text-slate-400">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {address && (
          <span className="text-xs text-emerald-400">Wallet connected</span>
        )}
      </div>
    </div>
  );
}

function BrowseStep({ onBack, onNext }: StepProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white">Browse &amp; buy</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Explore the marketplace, filter by category or price, and click any
        prompt to see its preview and license before checking out.
      </p>
      <ul className="mt-5 space-y-2 text-sm text-slate-300">
        <li className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          Use the search bar or filters to narrow results
        </li>
        <li className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          Open a prompt to preview it and view its license
        </li>
        <li className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          Check out securely with your connected wallet
        </li>
      </ul>
      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="text-slate-400">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button
          className="bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400"
          onClick={onNext}
        >
          Next <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function LicensingStep({ onBack, onFinish }: StepProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white">About licensing</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        When you buy a prompt, you receive a license to use it — not ownership
        of the underlying asset. Each listing states what the license permits.
      </p>
      <ul className="mt-5 space-y-2 text-sm text-slate-300">
        <li className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          Review the license terms shown on every listing
        </li>
        <li className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          Purchases are recorded on the Stellar network
        </li>
        <li className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          Creators retain their original rights unless stated otherwise
        </li>
      </ul>
      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="text-slate-400">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button
          className="bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400"
          onClick={onFinish}
        >
          Start browsing
        </Button>
      </div>
    </div>
  );
}

export function OnboardingWizard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const { connect } = useWallet();
  const steps = [WelcomeStep, WalletStep, BrowseStep, LicensingStep];

  const handleClose = () => {
    markOnboardingComplete();
    onClose();
  };

  const ActiveStep = steps[step];

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[120] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-8">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
              Step {step + 1} of {steps.length}
            </span>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close quick tour"
                className="rounded-full p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <ActiveStep
            onNext={() => setStep((s) => Math.min(s + 1, steps.length - 1))}
            onBack={() => setStep((s) => Math.max(s - 1, 0))}
            onFinish={handleClose}
            onConnect={(id) => void connect(id)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
