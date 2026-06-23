import { History, Clipboard, Star, ArrowDownWideNarrow } from 'lucide-react';
import { cn } from '../lib/utils';
import { HistoryItem } from '../types';
import { HistoryCard } from './HistoryCard';

interface HistoryTabProps {
  history: HistoryItem[];
  clipboardHistory: HistoryItem[];
  historyFilter: 'all' | 'favorites';
  historySort: 'newest' | 'oldest' | 'longest';
  onSetHistoryFilter: (v: 'all' | 'favorites') => void;
  onSetHistorySort: (v: string) => void;
  onClearHistory: () => void;
  onClearClipboard: () => void;
  onHistoryItemClick: (text: string) => void;
  onHistoryItemDelete: (id: string, isClipboard: boolean) => void;
  onHistoryItemFavorite: (id: string, isClipboard: boolean) => void;
  onHistoryItemExplain: (text: string, isClipboard: boolean) => void;
  onClipboardItemClick: (text: string) => void;
  getFilteredAndSortedHistory: (items: HistoryItem[]) => HistoryItem[];
}

export function HistoryTab({
  history, clipboardHistory, historyFilter, historySort,
  onSetHistoryFilter, onSetHistorySort, onClearHistory, onClearClipboard,
  onHistoryItemClick, onHistoryItemDelete, onHistoryItemFavorite, onHistoryItemExplain,
  onClipboardItemClick, getFilteredAndSortedHistory
}: HistoryTabProps) {
  return (
    <div className="absolute inset-0 overflow-y-auto p-4 lg:p-8 overflow-x-hidden">
      <div className="max-w-6xl mx-auto flex flex-col gap-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-sidebar)] p-4 rounded-xl border border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <button onClick={() => onSetHistoryFilter('all')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-colors", historyFilter === 'all' ? "bg-[var(--accent-transparent)] text-[var(--accent-hover)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-panel)]")}>Todos</button>
            <button onClick={() => onSetHistoryFilter('favorites')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1", historyFilter === 'favorites' ? "bg-amber-500/10 text-amber-500" : "text-[var(--text-muted)] hover:bg-[var(--bg-panel)]")}><Star size={12}/> Favoritos</button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="history-sort" className="text-[var(--text-muted)] flex items-center gap-1"><ArrowDownWideNarrow size={14}/> Ordenar:</label>
            <select id="history-sort" value={historySort} onChange={(e) => onSetHistorySort(e.target.value)} className="bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-main)] rounded p-1 outline-none focus:border-[var(--accent-hover)]">
              <option value="newest">Mais Recentes</option>
              <option value="oldest">Mais Antigos</option>
              <option value="longest">Mais Longos</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 min-h-[50vh]">

        {/* Readings */}
        <div className="bg-[var(--bg-sidebar)] rounded-xl border border-[var(--border-color)] flex flex-col h-[60vh] md:h-[75vh] transition-colors duration-300">
          <div className="h-14 px-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-header)] shrink-0">
            <div className="flex items-center gap-2">
              <History size={16} className="text-[var(--accent-hover)]" />
              <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest">Leituras Salvas</h2>
            </div>
            <button onClick={onClearHistory} className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-red-500 focus:outline-none">Limpar</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {getFilteredAndSortedHistory(history).length === 0 ? (
              <div className="h-40 flex items-center justify-center text-[var(--text-darker)] text-sm">Nenhuma leitura encontrada.</div>
            ) : (
              getFilteredAndSortedHistory(history).map(item => (
                <HistoryCard
                  key={item.id} item={item}
                  onClick={() => onHistoryItemClick(item.text)}
                  onDelete={() => onHistoryItemDelete(item.id, false)}
                  onFavorite={() => onHistoryItemFavorite(item.id, false)}
                  onExplain={() => onHistoryItemExplain(item.text, false)}
                />
              ))
            )}
          </div>
        </div>

        {/* Clipboard & OCR */}
        <div className="bg-[var(--bg-sidebar)] rounded-xl border border-[var(--border-color)] flex flex-col h-[60vh] md:h-[75vh] transition-colors duration-300">
          <div className="h-14 px-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-header)] shrink-0">
            <div className="flex items-center gap-2">
              <Clipboard size={16} className="text-[var(--text-muted)]" />
              <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest">Capturas Externas</h2>
            </div>
            <button onClick={onClearClipboard} className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-red-500 focus:outline-none">Limpar</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {getFilteredAndSortedHistory(clipboardHistory).length === 0 ? (
              <div className="h-40 flex items-center justify-center text-[var(--text-darker)] text-sm">Nenhuma captura encontrada.</div>
            ) : (
              getFilteredAndSortedHistory(clipboardHistory).map(item => (
                <HistoryCard
                  key={item.id} item={item}
                  onClick={() => onClipboardItemClick(item.text)}
                  onDelete={() => onHistoryItemDelete(item.id, true)}
                  onFavorite={() => onHistoryItemFavorite(item.id, true)}
                  onExplain={() => onHistoryItemExplain(item.text, true)}
                />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
