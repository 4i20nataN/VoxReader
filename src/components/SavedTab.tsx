import { FileText, Sparkles, Trash2, Save } from 'lucide-react';
import { cn } from '../lib/utils';
import { SavedTextItem } from '../types';

interface SavedTabProps {
  savedTexts: SavedTextItem[];
  onDeleteAll: () => void;
  onDeleteItem: (id: string) => void;
  onSendToEditor: (text: string) => void;
}

export function SavedTab({ savedTexts, onDeleteAll, onDeleteItem, onSendToEditor }: SavedTabProps) {
  return (
    <div className="absolute inset-0 overflow-y-auto p-4 lg:p-8 overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2"><Sparkles className="text-[var(--accent-hover)]"/> Textos & Explicações Salvas</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1 tracking-wide">Revise as análises geradas pela I.A. offline.</p>
          </div>
          <button onClick={onDeleteAll} className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-red-500 focus:outline-none">Apagar Tudo</button>
        </div>

        <div className="space-y-6">
          {savedTexts.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-[var(--text-darker)] bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl">
              <Save size={40} className="mb-4 opacity-20" />
              <p className="text-sm text-center max-w-sm">Você ainda não salvou nenhum resultado. Gere explicações, traduções ou correções no Editor e clique em Salvar.</p>
            </div>
          ) : (
            savedTexts.map(item => (
              <div key={item.id} className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl shadow-sm overflow-hidden group">
                <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-header)] flex justify-between items-center gap-2">
                  <h3 className="font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
                    <span className={cn("text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full", item.savedType === 'explain' ? "bg-purple-500/10 text-purple-400" : item.savedType === 'translate' ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400")}>
                      {item.savedType === 'explain' ? 'Explicação' : item.savedType === 'translate' ? 'Traduzido' : 'Corrigido'}
                    </span>
                    {item.title}
                  </h3>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="text-[var(--text-muted)] hover:text-red-500 transition-colors focus:outline-none"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="p-5 md:p-6 space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2"><FileText size={14}/> Texto Original</h4>
                    <div className="text-sm text-[var(--text-light)] max-h-32 overflow-y-auto whitespace-pre-wrap scrollbar-thin pl-4 border-l-2 border-[var(--border-color)] italic">
                      {item.originalText}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[var(--accent-hover)] uppercase tracking-widest flex items-center gap-2"><Sparkles size={14}/> {item.savedType === 'explain' ? 'Explicação I.A.' : item.savedType === 'translate' ? 'Tradução I.A.' : 'Correção I.A.'}</h4>
                    <div className="text-[var(--text-main)] whitespace-pre-wrap select-text leading-relaxed">
                      {item.explanation}
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-panel)] flex justify-end">
                  <button
                    onClick={() => onSendToEditor(item.explanation)}
                    className="text-xs font-bold text-[var(--accent-color)] hover:text-[var(--accent-hover)] flex items-center gap-1"
                  >
                    Levar ao Editor
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
