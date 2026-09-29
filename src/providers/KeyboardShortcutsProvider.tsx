import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";

export interface ShortcutDefinition {
  key: string;
  label: string;
  description: string;
}

export const KEYBOARD_SHORTCUTS: ShortcutDefinition[] = [
  { key: "/", label: "/", description: "Focus search / go to Browse" },
  { key: "n", label: "N", description: "New prompt (Sell)" },
  { key: "b", label: "B", description: "Browse marketplace" },
  { key: "Esc", label: "Esc", description: "Close dialogs & modals" },
];

interface ModalRegistration {
  id: string;
  close: () => void;
  active: () => boolean;
}

interface KeyboardShortcutsContextValue {
  registerModal: (registration: ModalRegistration) => () => void;
  hintsOpen: boolean;
  setHintsOpen: (open: boolean) => void;
}

const KeyboardShortcutsContext =
  createContext<KeyboardShortcutsContextValue | null>(null);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function KeyboardShortcutsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const modalsRef = useRef<Map<string, ModalRegistration>>(new Map());
  const [hintsOpen, setHintsOpen] = useState(false);

  const registerModal = useCallback(
    (registration: ModalRegistration) => {
      modalsRef.current.set(registration.id, registration);
      return () => {
        modalsRef.current.delete(registration.id);
      };
    },
    [],
  );

  const closeTopModal = useCallback(() => {
    const registrations = Array.from(modalsRef.current.values());
    let topId: string | null = null;
    for (const registration of registrations) {
      if (!registration.active()) continue;
      if (topId === null || registration.id >= topId) {
        topId = registration.id;
      }
    }
    if (topId !== null) {
      modalsRef.current.get(topId)?.close();
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      if (event.key === "Escape") {
        if (closeTopModal()) {
          event.preventDefault();
          return;
        }
        setHintsOpen(false);
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        setHintsOpen((prev) => !prev);
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        const searchInput = document.querySelector<HTMLElement>(
          '[data-shortcut="search"]',
        );
        if (searchInput) {
          searchInput.focus();
        } else {
          navigate("/browse");
        }
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        navigate("/sell");
        return;
      }

      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        navigate("/browse");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, closeTopModal]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{ registerModal, hintsOpen, setHintsOpen }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts() {
  const ctx = useContext(KeyboardShortcutsContext);
  if (!ctx) {
    throw new Error(
      "useKeyboardShortcuts must be used within a KeyboardShortcutsProvider",
    );
  }
  return ctx;
}

export function useModalShortcut(id: string, close: () => void, active: boolean) {
  const { registerModal } = useKeyboardShortcuts();
  const closeRef = useRef(close);
  closeRef.current = close;
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    return registerModal({
      id,
      close: () => closeRef.current(),
      active: () => activeRef.current,
    });
  }, [registerModal, id]);
}
