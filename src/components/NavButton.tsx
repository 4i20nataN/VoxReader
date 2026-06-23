import React from 'react';
import { cn } from '../lib/utils';

export function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "p-2.5 md:p-3 rounded-xl transition-all duration-200 border group focus:outline-none flex-1 md:flex-none flex items-center justify-center relative active:scale-95",
        active 
          ? "bg-[var(--accent-transparent)] text-[var(--accent-color)] border-[var(--accent-border)] shadow-[0_0_15px_var(--accent-transparent)]" 
          : "text-[var(--text-muted)] bg-transparent border-transparent hover:text-[var(--text-main)] hover:bg-[var(--bg-panel)] hover:border-[var(--border-hover)] focus:ring-2 focus:ring-[var(--border-hover)]"
      )}
      title={label}
    >
      {icon}
    </button>
  );
}
