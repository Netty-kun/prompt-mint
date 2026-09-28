import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { OnboardingWizard, isOnboardingComplete } from "@/components/onboarding/OnboardingWizard";

interface OnboardingContextValue {
  restart: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

const AUTO_OPEN_DELAY_MS = 900;

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isOnboardingComplete()) return;
    const timer = window.setTimeout(() => {
      setOpen(true);
    }, AUTO_OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const restart = () => {
    setOpen(true);
  };

  return (
    <OnboardingContext.Provider value={{ restart }}>
      {children}
      <OnboardingWizard open={open} onClose={() => setOpen(false)} />
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return ctx;
}
