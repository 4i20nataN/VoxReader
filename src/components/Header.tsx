import { Volume2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  isRecording: boolean;
  isSpeaking: boolean;
  activeVoiceName: string;
  wordCount: number;
  formattedTime: string;
}

export function Header({ isRecording, isSpeaking, activeVoiceName, wordCount, formattedTime }: HeaderProps) {
  return (
    <header className="h-16 md:h-20 flex items-center justify-between px-4 lg:px-8 bg-[var(--bg-header)] border-b border-[var(--border-color)] shrink-0 transition-colors duration-300">
      <div className="flex items-center gap-4">
        <h1 className="text-lg md:text-xl font-semibold tracking-tight text-[var(--text-main)]">Leitor Inteligente</h1>
        <div className={cn("hidden lg:flex items-center gap-2 px-3 py-1 rounded-full border", isRecording || isSpeaking ? "bg-[var(--accent-transparent)] border-[var(--accent-border)]" : "bg-emerald-500/10 border-emerald-500/20")}>
          <div className={cn("w-2 h-2 rounded-full", isRecording || isSpeaking ? "bg-[var(--accent-hover)] animate-pulse" : "bg-emerald-500")}></div>
          <span className={cn("text-[10px] uppercase font-bold tracking-widest", isRecording || isSpeaking ? "text-[var(--accent-hover)]" : "text-emerald-500")}>
            {isRecording ? "Ouvindo" : isSpeaking ? "Lendo" : "Pronto"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 md:gap-6 text-sm">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-tighter">Voz Ativa</span>
          <span className="font-medium text-[var(--text-main)] tracking-tight max-w-[150px] lg:max-w-[250px] truncate">{activeVoiceName}</span>
        </div>
        <div className="hidden md:block h-8 w-px bg-[var(--border-color)]"></div>
        <div className="flex flex-col items-end">
          <span className="text-[var(--text-muted)] text-[9px] md:text-[10px] uppercase font-bold tracking-tighter">Métricas: {wordCount} pal.</span>
          <span className="font-mono text-[var(--text-main)] text-xs md:text-sm">~{formattedTime}</span>
        </div>
      </div>
    </header>
  );
}
