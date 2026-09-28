import { useEffect } from "react";

export function useBeforeUnloadWarning(
  isEnabled: boolean,
  message?: string,
) {
  useEffect(() => {
    if (!isEnabled) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message ?? "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isEnabled, message]);
}
