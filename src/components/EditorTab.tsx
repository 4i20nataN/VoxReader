import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play, Pause, Square, Mic, Clipboard, FileText,
  Image as ImageIcon, Trash2, Upload, Sparkles,
  CheckCheck, Languages, Globe, ChevronUp, ChevronDown,
  ArrowDownToLine, Type, AlignVerticalSpaceAround, MoveHorizontal
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
  readingCharIndex: number;
  readingCharLength: number;
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

const MIN_FONT = 12;
const MAX_FONT = 32;
const MIN_LINE_HEIGHT = 1.0;
const MAX_LINE_HEIGHT = 3.0;

const SPECIAL_CHARS: Record<string, string> = {
  '>': 'text-cyan-400', '#': 'text-violet-400', '\u201C': 'text-amber-400', '\u201D': 'text-amber-400',
  '[': 'text-orange-400', ']': 'text-orange-400', '{': 'text-orange-400', '}': 'text-orange-400',
  '/': 'text-emerald-400', '\\': 'text-emerald-400', '*': 'text-pink-400', '~': 'text-slate-400',
  '_': 'text-lime-400', '|': 'text-indigo-400', '@': 'text-rose-400', '$': 'text-yellow-400', '`': 'text-teal-400',
};

function findWordBounds(text: string, index: number): [number, number] {
  if (index >= text.length || index < 0) return [text.length, text.length];
  let start = index;
  let end = index;
  while (start > 0 && text[start - 1] !== ' ' && text[start - 1] !== '\n' && text[start - 1] !== '\t') start--;
  while (end < text.length && text[end] !== ' ' && text[end] !== '\n' && text[end] !== '\t') end++;
  return [start, end];
}

function findNearestWordBoundary(text: string, index: number): number {
  if (index <= 0) return 0;
  if (index >= text.length) return text.length;
  
  // Check if we're at a word boundary (space, newline, tab)
  const charBefore = text[index - 1];
  const charAt = text[index];
  const isBoundary = charBefore === ' ' || charBefore === '\n' || charBefore === '\t' ||
                     charAt === ' ' || charAt === '\n' || charAt === '\t';
  
  if (isBoundary) return index;
  
  // Find nearest word boundary (start of word or end of word)
  let left = index;
  let right = index;
  
  // Search left for word boundary
  while (left > 0) {
    const c = text[left - 1];
    if (c === ' ' || c === '\n' || c === '\t') break;
    left--;
  }
  
  // Search right for word boundary
  while (right < text.length) {
    const c = text[right];
    if (c === ' ' || c === '\n' || c === '\t') break;
    right++;
  }
  
  // Return the closest boundary
  const distLeft = index - left;
  const distRight = right - index;
  return distLeft <= distRight ? left : right;
}

function HighlightedText({ text, highlightStart, highlightEnd }: { text: string; highlightStart: number; highlightEnd: number }) {
  const lines = text.split('\n');
  let charOffset = 0;
  return (
    <>
      {lines.map((line, li) => {
        const lineStart = charOffset;
        const lineEnd = charOffset + line.length;
        const segments: React.ReactNode[] = [];
        let i = lineStart;
        while (i <= lineEnd) {
          if (i >= highlightStart && i < highlightEnd) {
            segments.push(
              <span key={`h${i}`} className="bg-cyan-400/15 rounded-sm px-px -mx-px">{text.slice(i, highlightEnd)}</span>
            );
            i = highlightEnd;
          } else if (i < lineEnd) {
            const nextHighlight = highlightStart > i ? Math.min(highlightStart, lineEnd) : lineEnd;
            const chunk = text.slice(i, nextHighlight);
            const chars: React.ReactNode[] = [];
            for (let c = 0; c < chunk.length; c++) {
              const ch = chunk[c];
              const cls = SPECIAL_CHARS[ch];
              chars.push(cls ? <span key={`c${i + c}`} className={cls}>{ch}</span> : ch);
            }
            segments.push(<span key={`n${i}`}>{chars}</span>);
            i = nextHighlight;
          } else { break; }
        }
        charOffset = lineEnd + 1;
        return <span key={li}>{segments}{li < lines.length - 1 ? '\n' : ''}</span>;
      })}
    </>
  );
}

export function EditorTab({
  text, status, isProcessingImage, isDragging, isRecording,
  isSpeaking, isPaused, showAiWarning, showLangDropdown, targetLang, rate,
  readingCharIndex, readingCharLength,
  onTextChange, onClipboard, onTextUpload, onImageUpload,
  onDragOver, onDragLeave, onDrop,
  onAI, onRead, onPause, onStop, onToggleRecording,
  onSetLangDropdown, onSetTargetLang, onSetRate,
  languages
}: EditorTabProps) {
  const [localText, setLocalText] = useState(text);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const scrollMeasureRef = useRef<HTMLDivElement>(null);
  const [readStartOffset, setReadStartOffset] = useState(0);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('editor_font_size');
    return saved ? parseInt(saved) : 16;
  });
  const [lineHeight, setLineHeight] = useState(() => {
    const saved = localStorage.getItem('editor_line_height');
    return saved ? parseFloat(saved) : 1.625;
  });
  const [letterSpacing, setLetterSpacing] = useState(() => {
    const saved = localStorage.getItem('editor_letter_spacing');
    return saved ? parseFloat(saved) : 0;
  });
  const [autoScroll, setAutoScroll] = useState(() => {
    return localStorage.getItem('editor_auto_scroll') === 'true';
  });
  const [readingStartMarker, setReadingStartMarker] = useState<number | null>(null);
  const [useMarkerOnNextPlay, setUseMarkerOnNextPlay] = useState(false);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) { setLocalText(text); return; }
    const prevScrollTop = ta.scrollTop;
    const prevScrollLeft = ta.scrollLeft;
    setLocalText(text);
    requestAnimationFrame(() => {
      if (ta) { ta.scrollTop = prevScrollTop; ta.scrollLeft = prevScrollLeft; }
    });
  }, [text]);
  useEffect(() => { localStorage.setItem('editor_font_size', fontSize.toString()); }, [fontSize]);
  useEffect(() => { localStorage.setItem('editor_line_height', lineHeight.toString()); }, [lineHeight]);
  useEffect(() => { localStorage.setItem('editor_letter_spacing', letterSpacing.toString()); }, [letterSpacing]);
  useEffect(() => { localStorage.setItem('editor_auto_scroll', autoScroll.toString()); }, [autoScroll]);

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

  useEffect(() => { return () => clearTimeout(debounceRef.current); }, []);

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const hl = highlightRef.current;
    if (ta && hl) { hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft; }
  }, []);

  const increaseFont = useCallback(() => setFontSize(s => Math.min(s + 2, MAX_FONT)), []);
  const decreaseFont = useCallback(() => setFontSize(s => Math.max(s - 2, MIN_FONT)), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '=') { e.preventDefault(); increaseFont(); }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); decreaseFont(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [increaseFont, decreaseFont]);

  const absoluteCharIndex = readStartOffset + readingCharIndex;

  const [hlStart, hlEnd] = useMemo(() => {
    if (!isSpeaking || absoluteCharIndex <= 0) return [-1, -1];
    if (readingCharLength > 0) return [absoluteCharIndex, absoluteCharIndex + readingCharLength];
    return findWordBounds(localText, absoluteCharIndex);
  }, [absoluteCharIndex, readingCharLength, isSpeaking, localText]);

  const animFrameRef = useRef(0);

  useEffect(() => {
    if (!autoScroll || !isSpeaking || !scrollMeasureRef.current || !textareaRef.current || absoluteCharIndex <= 0) return;
    const ta = textareaRef.current;
    const measureEl = scrollMeasureRef.current;

    const rafId = requestAnimationFrame(() => {
      const markerTop = measureEl.offsetHeight;
      if (markerTop <= 0) return;
      const targetScroll = Math.max(0, markerTop - (ta.clientHeight / 2) + (fontSize * lineHeight / 2));
      const animate = () => {
        const current = ta.scrollTop;
        const diff = targetScroll - current;
        if (Math.abs(diff) < 0.5) { ta.scrollTop = targetScroll; syncScroll(); return; }
        ta.scrollTop = current + diff * 0.06;
        syncScroll();
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
    });

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [absoluteCharIndex, autoScroll, isSpeaking, fontSize, lineHeight, syncScroll]);

  const handleReadFromCursor = useCallback(() => {
    const ta = textareaRef.current;
    const startIdx = ta ? ta.selectionStart : 0;
    setReadStartOffset(startIdx);
    const textFromCursor = localText.substring(startIdx);
    if (textFromCursor.trim()) onRead(textFromCursor);
  }, [localText, onRead]);

  const handleCtrlClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const ta = e.currentTarget;
    const pos = ta.selectionStart;
    const boundary = findNearestWordBoundary(localText, pos);

    if (readingStartMarker !== null && boundary === readingStartMarker) {
      setReadingStartMarker(null);
      setUseMarkerOnNextPlay(false);
      return;
    }

    setReadingStartMarker(boundary);
  }, [localText, readingStartMarker]);

  const editorTextStyle = useMemo(() => ({
    fontSize: `${fontSize}px`,
    lineHeight,
    letterSpacing: `${letterSpacing}px`,
  }), [fontSize, lineHeight, letterSpacing]);

  const textareaStyle = useMemo(() => ({
    ...editorTextStyle,
    color: 'transparent',
    caretColor: 'var(--text-main)',
  }), [editorTextStyle]);

  const measureStyle = useMemo(() => ({
    fontSize: `${fontSize}px`,
    lineHeight,
    letterSpacing: `${letterSpacing}px`,
    padding: '1rem 1.5rem',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    overflowWrap: 'break-word' as const,
    width: '100%',
    position: 'absolute' as const,
    top: 0,
    left: 0,
    visibility: 'hidden' as const,
    pointerEvents: 'none' as const,
  }), [fontSize, lineHeight, letterSpacing]);

  return (
    <div className="absolute inset-0 overflow-y-auto flex flex-col p-4 md:p-6 lg:p-8 transition-opacity">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 shrink-0 gap-3">
        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
          transcrição & edição
          <span className="hidden sm:inline-block text-[10px] font-normal text-[var(--text-darker)] normal-case bg-[var(--bg-panel)] px-2 py-0.5 rounded border border-[var(--border-color)] max-w-[280px] truncate">{status}</span>
        </span>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
          <div className="flex items-center gap-1 bg-[var(--bg-panel)] rounded border border-[var(--border-color)]" title="Tamanho da fonte">
            <button onClick={decreaseFont} disabled={fontSize <= MIN_FONT} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 transition-colors" aria-label="Diminuir fonte">
              <ChevronDown size={14} />
            </button>
            <Type size={10} className="text-[var(--text-muted)]" />
            <button onClick={increaseFont} disabled={fontSize >= MAX_FONT} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 transition-colors" aria-label="Aumentar fonte">
              <ChevronUp size={14} />
            </button>
          </div>
          <div className="flex items-center gap-1 bg-[var(--bg-panel)] rounded border border-[var(--border-color)]" title="Espaço entre linhas">
            <button onClick={() => setLineHeight(v => Math.max(+(v - 0.125).toFixed(3), MIN_LINE_HEIGHT))} disabled={lineHeight <= MIN_LINE_HEIGHT} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 transition-colors" aria-label="Diminuir entrelinhas">
              <ChevronDown size={14} />
            </button>
            <AlignVerticalSpaceAround size={10} className="text-[var(--text-muted)]" />
            <button onClick={() => setLineHeight(v => Math.min(+(v + 0.125).toFixed(3), MAX_LINE_HEIGHT))} disabled={lineHeight >= MAX_LINE_HEIGHT} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 transition-colors" aria-label="Aumentar entrelinhas">
              <ChevronUp size={14} />
            </button>
          </div>
          <div className="flex items-center gap-1 bg-[var(--bg-panel)] rounded border border-[var(--border-color)]" title="Espaço entre letras">
            <button onClick={() => setLetterSpacing(v => +(v - 0.5).toFixed(1))} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors" aria-label="Diminuir espaçamento">
              <ChevronDown size={14} />
            </button>
            <MoveHorizontal size={10} className="text-[var(--text-muted)]" />
            <button onClick={() => setLetterSpacing(v => +(v + 0.5).toFixed(1))} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors" aria-label="Aumentar espaçamento">
              <ChevronUp size={14} />
            </button>
          </div>
          <button onClick={() => setAutoScroll(v => !v)} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[10px] font-bold uppercase tracking-wider transition-all", autoScroll ? "bg-[var(--accent-color)]/10 text-[var(--accent-hover)] border-[var(--accent-hover)]/30" : "bg-[var(--bg-panel)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--border-hover)]")} aria-label="Auto-scroll">
            <ArrowDownToLine size={12} /> Scroll
          </button>
          <button onClick={() => { clearTimeout(debounceRef.current); onTextChange(''); }} aria-label="Limpar texto" className="flex-none items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded border border-red-500/20 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col min-h-0 group">
        <div className="flex-1 w-full relative rounded-xl overflow-hidden border border-[var(--border-color)] transition-colors duration-300"
          style={{
            backgroundImage: 'linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            backgroundPosition: '-1px -1px',
          }}
        >
          <div className="absolute inset-0 bg-[var(--bg-input)] opacity-[0.88]" />
          <div ref={measureRef} style={measureStyle} aria-hidden="true">
            {localText}
          </div>
          <div ref={scrollMeasureRef} style={{ ...measureStyle, position: 'absolute' as const, visibility: 'hidden' as const, pointerEvents: 'none' as const, height: 'auto', overflow: 'visible' as const }} aria-hidden="true">
            {localText.substring(0, absoluteCharIndex)}
          </div>
          <div
            ref={highlightRef}
            className="absolute inset-0 p-4 md:p-6 overflow-hidden pointer-events-none whitespace-pre-wrap break-words text-[var(--text-main)]"
            style={editorTextStyle}
            aria-hidden="true"
          >
            <HighlightedText text={localText} highlightStart={hlStart} highlightEnd={hlEnd} markerIndex={readingStartMarker} />
            {!localText && (
              <span className="text-[var(--text-darker)]">A fala transcrita aparecerá aqui...{'\n'}Cole, digite ou solte arquivos de texto / imagens para converter em som.</span>
            )}
          </div>
          <textarea
            ref={textareaRef}
            value={localText}
            onChange={handleChange}
            onBlur={handleBlur}
            onScroll={syncScroll}
            onClick={handleCtrlClick}
            placeholder=""
            className="absolute inset-0 w-full h-full bg-transparent border-none p-4 md:p-6 leading-relaxed focus:outline-none resize-none"
            style={textareaStyle}
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
            <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-full shadow-lg backdrop-blur-md z-10">
              <Mic size={14} className="animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Escutando áudio...</span>
            </div>
          )}

          <button onClick={() => onAI('explain', localText)} disabled={!textNotEmpty} className={cn("absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-[var(--bg-header)] hover:bg-[var(--accent-transparent)] text-[var(--text-main)] hover:text-[var(--accent-hover)] border border-[var(--border-color)] hover:border-[var(--accent-border)] rounded-full text-xs font-bold shadow-lg transition-all focus:outline-none active:scale-95 z-10 group-focus-within:opacity-100", !textNotEmpty && "opacity-30 pointer-events-none")}>
            <Sparkles size={14}/> Explicar com I.A.
          </button>
        </div>
      </div>

      {showAiWarning && (
        <div className="mb-3 flex items-center justify-center animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 px-5 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl shadow-lg backdrop-blur-sm">
            <Sparkles size={18} className="text-amber-500 shrink-0" />
            <p className="text-sm font-bold text-amber-500">Nenhuma I.A. configurada — vá em Ajustes e cadastre sua chave de API.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 mt-3 mb-1 shrink-0 flex-wrap">
        <button onClick={onClipboard} disabled={!textNotEmpty} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border bg-[var(--bg-panel)] hover:bg-[var(--accent-transparent)] text-[var(--text-main)] hover:text-[var(--accent-hover)] border-[var(--border-color)] hover:border-[var(--accent-border)] focus:outline-none active:scale-95", !textNotEmpty && "opacity-40 pointer-events-none")}>
          <Clipboard size={14}/> COLAR
        </button>
        <label className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border bg-[var(--bg-panel)] hover:bg-[var(--accent-transparent)] text-[var(--text-main)] hover:text-[var(--accent-hover)] border-[var(--border-color)] hover:border-[var(--accent-border)] focus:outline-none active:scale-95 cursor-pointer">
          <FileText size={14}/> TXT
          <input type="file" accept=".txt,text/plain" className="hidden" onChange={onTextUpload} />
        </label>
        <label className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border bg-[var(--bg-panel)] hover:bg-[var(--accent-transparent)] text-[var(--text-main)] hover:text-[var(--accent-hover)] border-[var(--border-color)] hover:border-[var(--accent-border)] focus:outline-none active:scale-95 cursor-pointer">
          <ImageIcon size={14}/> IMG
          <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
        </label>
        <div className="w-px h-5 bg-[var(--border-color)] mx-1" />
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
            <input id="speed-range" type="range" min="0.5" max="10" step="0.1" value={rate} onChange={(e) => onSetRate(parseFloat(e.target.value))} className="w-full h-1.5 bg-[var(--border-hover)] rounded appearance-none cursor-pointer outline-none transition-colors" />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-center">
          <button onClick={() => { onStop(); if (readingStartMarker !== null) setUseMarkerOnNextPlay(true); }} disabled={!isSpeaking && !isPaused} aria-label="Parar leitura" className="w-12 h-12 flex items-center justify-center rounded-xl bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--border-hover)] disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-hover)] relative">
            <Square size={18} fill="currentColor" />
            {readingStartMarker !== null && !useMarkerOnNextPlay && (
              <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" title="Parar para ler do ponto marcado" />
            )}
          </button>
          {!isSpeaking ? (
            <button id="play-button" onClick={() => {
                if (useMarkerOnNextPlay && readingStartMarker !== null) {
                  setReadStartOffset(readingStartMarker);
                  setUseMarkerOnNextPlay(false);
                  const textFromMarker = localText.substring(readingStartMarker);
                  if (textFromMarker.trim()) onRead(textFromMarker);
                } else {
                  handleReadFromCursor();
                }
              }} disabled={!textNotEmpty || isProcessingImage} className="flex-1 sm:flex-none px-6 md:px-8 h-12 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold disabled:opacity-50 flex justify-center items-center gap-2 transition-all shadow-[0_4px_14px_var(--accent-transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-transparent)] relative">
              <Play size={18} fill="currentColor" /> <span className="hidden sm:inline">Ler Agora</span>
              {useMarkerOnNextPlay && readingStartMarker !== null && (
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" title="Iniciará do ponto marcado" />
              )}
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
