"use client";

import { AnimatePresence, motion } from "framer-motion";

export type PaletteCommand = {
  id: string;
  label: string;
  shortcut?: string;
  onSelect: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
};

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 pt-24 backdrop-blur-sm"
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="w-full max-w-md rounded-lg border border-border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              readOnly
              placeholder="Type a command…  (search lands in Phase 2)"
              className="block w-full border-b border-border bg-transparent px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
            <ul className="p-1">
              {commands.map((cmd) => (
                <li key={cmd.id}>
                  <button
                    type="button"
                    onClick={() => {
                      cmd.onSelect();
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 font-mono text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <span>{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="font-mono text-[10px] text-muted-foreground">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
