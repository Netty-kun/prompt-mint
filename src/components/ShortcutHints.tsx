import { KEYBOARD_SHORTCUTS, type ShortcutDefinition } from "@/providers/KeyboardShortcutsProvider";
import { cn } from "@/lib/utils";

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-white/15 bg-white/10 px-1.5 font-mono text-[10px] font-medium leading-none text-slate-200",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function ShortcutHints({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed right-4 top-16 z-[110] w-[min(92vw,300px)] rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Keyboard shortcuts
        </p>
        <button
          type="button"
          aria-label="Close shortcuts"
          onClick={onClose}
          className="rounded p-0.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <ul className="space-y-2.5">
        {KEYBOARD_SHORTCUTS.map((shortcut) => (
          <ShortcutRow key={shortcut.key} shortcut={shortcut} />
        ))}
      </ul>
      <p className="mt-3 border-t border-white/10 pt-3 text-[11px] text-slate-500">
        Press <Kbd>?</Kbd> anywhere to toggle this panel.
      </p>
    </div>
  );
}

function ShortcutRow({ shortcut }: { shortcut: ShortcutDefinition }) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-300">{shortcut.description}</span>
      <Kbd>{shortcut.label}</Kbd>
    </li>
  );
}
