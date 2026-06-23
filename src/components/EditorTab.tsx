import { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, Square, Mic, Clipboard, FileText,
  Image as ImageIcon, Trash2, Upload, Sparkles,
  CheckCheck, Languages, Globe
} from 'lucide-react';
import { cn } from '../lib/utils';

interface EditorTabProps {
  text: string;
  status: string;
  isProcessingImage: boolean;
  isDragging: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  showAiWarning: boolean;
  showLangDropdown: boolean;
  targetLang: string;
  rate: number;
  onTextChange: (text: string) => void;
  onClipboard: () => void;
  onTextUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onAI: (action: 'explain' | 'translate' | 'correct' | 'english' | 'translate-to', customText?: string, targetLang?: string) => void;
  onRead: (customText?: string) => void;
  onPause: () => void;
  onStop: () => void;
  onToggleRecording: () => void;
  onSetLangDropdown: (v: boolean) => void;
  onSetTargetLang: (v: string) => void;
  onSetRate: (v: number) => void;
  languages: { label: string; value: string }[];
}

export function EditorTab({
  text, status, isProcessingImage, isDragging, isRecording,
  isSpeaking, isPaused, showAiWarning, showLangDropdown, targetLang, rate,
  onTextChange, onClipboard, onTextUpload, onImageUpload,
  onDragOver, onDragLeave, onDrop,
  onAI, onRead, onPause, onStop, onToggleRecording,
  onSetLangDropdown, onSetTargetLang, onSetRate,
  languages
}: EditorTabProps) {
  const [localText, setLocalText] = useState(text);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLocalText(text);
  }, [text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalText(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onTextChange(val), 300);
  };

  const handleBlur = () => {
    clearTimeout(debounceRef.current);
    if (localText !== text) onTextChange(localText);
  };

  const textNotEmpty = localText.trim().length > 0;

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <div className="absolute inset-0 overflow-y-auto flex flex-col p-4 md:p-6 lg:p-8 transition-opacity">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 shrink-0 gap-3">
        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
          transcrição & edição
          <span className="hidden sm:inline-block text-[10px] font-normal text-[var(--text-darker)] normal-case bg-[var(--bg-panel)] px-2 py-0.5 rounded border border-[var(--border-color)] max-w-[280px] truncate">{status}</span>
        </span>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={onClipboard} className="flex-1 sm:flex-none items-center justify-center gap-2 px-3 py-1.5 bg-[var(--bg-panel)] hover:bg-[var(--accent-transparent)] rounded border border-[var(--border-color)] text-xs text-[var(--text-main)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-transparent)]">
            <Clipboard size={14} className="inline-block" /> Colar
          </button>
          <label className="flex-1 sm:flex-none items-center justify-center gap-2 px-3 py-1.5 bg-[var(--bg-panel)] hover:bg-[var(--accent-transparent)] rounded border border-[var(--border-color)] text-xs text-[var(--text-main)] cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[var(--accent-transparent)]">
            <FileText size={14} className="inline-block" /> Txt
            <input type="file" accept=".txt,text/plain" className="hidden" onChange={onTextUpload} />
          </label>
          <label className="flex-1 sm:flex-none items-center justify-center gap-2 px-3 py-1.5 bg-[var(--bg-panel)] hover:bg-[var(--accent-transparent)] rounded border border-[var(--border-color)] text-xs text-[var(--text-main)] cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[var(--accent-transparent)]">
            <ImageIcon size={14} className="inline-block" /> Img
            <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
          </label>
          <button onClick={() => { clearTimeout(debounceRef.current); onTextChange(''); }} aria-label="Limpar texto" className="flex-none items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded border border-red-500/20 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col min-h-0 group">
        <textarea
          value={localText}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="A fala transcrita aparecerá aqui...&#10;Cole, digite ou solte arquivos de texto / imagens para converter em som."
          className={cn(
            "flex-1 w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-4 md:p-6 text-base md:text-lg leading-relaxed focus:outline-none focus:border-[var(--accent-hover)] resize-none placeholder-[var(--text-darker)] text-[var(--text-main)] transition-colors duration-300",
            isDragging && "border-[var(--accent-hover)] bg-[var(--accent-transparent)]"
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        />

        {isDragging && (
          <div className="absolute inset-0 border-2 border-dashed border-[var(--accent-hover)] bg-[var(--bg-sidebar)]/80 rounded-xl flex flex-col items-center justify-center z-10 backdrop-blur-sm pointer-events-none">
            <Upload size={48} className="text-[var(--accent-hover)] mb-4 animate-bounce" />
            <p className="text-lg font-bold text-[var(--accent-hover)] tracking-wide">Solte o arquivo aqui</p>
          </div>
        )}

        {isRecording && (
          <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-full shadow-lg backdrop-blur-md">
            <Mic size={14} className="animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Escutando áudio...</span>
          </div>
        )}

        <button onClick={() => onAI('explain', localText)} disabled={!textNotEmpty} className={cn("absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-[var(--bg-header)] hover:bg-[var(--accent-transparent)] text-[var(--text-main)] hover:text-[var(--accent-hover)] border border-[var(--border-color)] hover:border-[var(--accent-border)] rounded-full text-xs font-bold shadow-lg transition-all focus:outline-none active:scale-95 group-focus-within:opacity-100", !textNotEmpty && "opacity-30 pointer-events-none")}>
          <Sparkles size={14}/> Explicar com I.A.
        </button>
      </div>

      {showAiWarning && (
        <div className="mb-3 flex items-center justify-center animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 px-5 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl shadow-lg backdrop-blur-sm">
            <Sparkles size={18} className="text-amber-500 shrink-0" />
            <p className="text-sm font-bold text-amber-500">Nenhuma I.A. configurada — vá em Ajustes e cadastre sua chave de API.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-3 mt-3 mb-1 shrink-0 flex-wrap">
        <button onClick={() => onAI('correct', localText)} disabled={!textNotEmpty} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border bg-[var(--bg-panel)] hover:bg-[var(--accent-transparent)] text-[var(--text-main)] hover:text-[var(--accent-hover)] border-[var(--border-color)] hover:border-[var(--accent-border)] focus:outline-none active:scale-95", !textNotEmpty && "opacity-40 pointer-events-none")}>
          <CheckCheck size={14}/> CORRIGIR
        </button>
        <button onClick={() => onAI('translate-to', localText, targetLang)} disabled={!textNotEmpty} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border bg-[var(--bg-panel)] hover:bg-[var(--accent-transparent)] text-[var(--text-main)] hover:text-[var(--accent-hover)] border-[var(--border-color)] hover:border-[var(--accent-border)] focus:outline-none active:scale-95", !textNotEmpty && "opacity-40 pointer-events-none")}>
          <Languages size={14}/> TRADUZIR
        </button>
        <div className="relative">
          <button onClick={() => { if (textNotEmpty) onSetLangDropdown(!showLangDropdown); }} disabled={!textNotEmpty} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border bg-[var(--bg-panel)] hover:bg-[var(--accent-transparent)] text-[var(--text-main)] hover:text-[var(--accent-hover)] border-[var(--border-color)] hover:border-[var(--accent-border)] focus:outline-none active:scale-95", !textNotEmpty && "opacity-40 pointer-events-none")}>
            <Globe size={14}/> {targetLang} <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
          </button>
          {showLangDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => onSetLangDropdown(false)} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden z-50 min-w-[160px] py-1 max-h-64 overflow-y-auto">
                {languages.map(lang => (
                  <button
                    key={lang.value}
                    onClick={() => { onSetTargetLang(lang.value); onSetLangDropdown(false); }}
                    className={cn("w-full text-left px-4 py-2.5 text-xs font-medium transition-colors flex items-center gap-2", targetLang === lang.value ? "text-[var(--accent-hover)] bg-[var(--accent-transparent)]" : "text-[var(--text-main)] hover:bg-[var(--accent-transparent)] hover:text-[var(--accent-hover)]")}
                  >
                    <Globe size={12}/> {lang.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 md:mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6 bg-[var(--bg-header)] p-4 rounded-xl border border-[var(--border-color)] shrink-0 transition-colors duration-300">
        <div className="flex items-center gap-4 flex-1 w-full sm:max-w-xs xl:max-w-sm">
          <div className="flex flex-col gap-2 w-full">
            <label htmlFor="speed-range" className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex justify-between">
              <span>Velocidade de Leitura</span>
              <span className="text-[var(--accent-hover)]">{rate}x</span>
            </label>
            <input id="speed-range" type="range" min="0.5" max="2.5" step="0.1" value={rate} onChange={(e) => onSetRate(parseFloat(e.target.value))} className="w-full h-1.5 bg-[var(--border-hover)] rounded appearance-none cursor-pointer outline-none transition-colors" />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-center">
          <button onClick={onStop} disabled={!isSpeaking && !isPaused} aria-label="Parar leitura" className="w-12 h-12 flex items-center justify-center rounded-xl bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--border-hover)] disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-hover)]">
            <Square size={18} fill="currentColor" />
          </button>
          {!isSpeaking ? (
            <button id="play-button" onClick={() => onRead(localText)} disabled={!textNotEmpty || isProcessingImage} className="flex-1 sm:flex-none px-6 md:px-8 h-12 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold disabled:opacity-50 flex justify-center items-center gap-2 transition-all shadow-[0_4px_14px_var(--accent-transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-transparent)]">
              <Play size={18} fill="currentColor" /> <span className="hidden sm:inline">Ler Agora</span>
            </button>
          ) : (
            <button onClick={onPause} className="flex-1 sm:flex-none px-6 md:px-8 h-12 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50">
              <Pause size={18} fill="currentColor" /> <span className="hidden sm:inline">Pausar</span>
            </button>
          )}
          <button onClick={onToggleRecording} className={cn("flex flex-col items-center gap-1.5 group select-none focus:outline-none cursor-pointer shrink-0", isRecording ? "text-red-500" : "text-[var(--text-muted)] hover:text-[var(--text-main)]")}>
            <div className={cn("w-12 h-12 flex items-center justify-center rounded-full border transition-all shadow-sm", isRecording ? "bg-red-500/10 border-red-500/40" : "bg-[var(--bg-panel)] border-[var(--border-color)] group-hover:border-[var(--border-hover)] group-active:scale-95")}>
              {isRecording ? <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" /> : <Mic size={20} className="md:w-5 md:h-5"/>}
            </div>
            <span className="hidden md:inline text-[9px] font-bold uppercase tracking-widest mt-1">{isRecording ? "Gravando" : "Ditar"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
