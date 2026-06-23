import { Sparkles, X, Save, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { SavedTextItem } from '../types';

interface AiModalProps {
  isExplaining: boolean;
  explanation: string;
  explanationProgress: number;
  modalTitle: string;
  aiAction: string;
  textBeingExplained: string;
  onClose: () => void;
  onSave: (item: SavedTextItem, label: string) => void;
  onSendToEditor: (text: string) => void;
}

export function AiModal({
  isExplaining, explanation, explanationProgress, modalTitle,
  aiAction, textBeingExplained,
  onClose, onSave, onSendToEditor
}: AiModalProps) {
  const handleSave = () => {
    const savedType = aiAction === 'translate-to' ? 'translate' : (aiAction as 'explain' | 'translate' | 'correct');
    const label = { explain: 'Explicação gerada', translate: 'Traduzido', correct: 'Corrigido' }[savedType];
    const newItem: SavedTextItem = {
      id: Date.now().toString(),
      originalText: textBeingExplained,
      explanation,
      date: Date.now(),
      title: `${label}: ${format(Date.now(), 'dd/MM HH:mm')}`,
      savedType
    };
    onSave(newItem, label);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="h-16 px-6 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-header)] rounded-t-2xl">
          <h2 className="font-bold flex items-center gap-2 tracking-tight text-[var(--text-main)]"><Sparkles className="text-[var(--accent-hover)]" size={20}/> {modalTitle}</h2>
          <button
            onClick={onClose}
            className="p-2 bg-[var(--bg-app)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors focus:ring-2 focus:ring-[var(--border-hover)] focus:outline-none"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 md:p-8 overflow-y-auto scrollbar-thin">
          {isExplaining ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-6 w-full max-w-sm mx-auto">
              <div className="w-12 h-12 border-4 border-[var(--accent-transparent)] border-t-[var(--accent-hover)] rounded-full animate-spin"></div>
              <p className="text-[var(--text-light)] animate-pulse text-center font-medium">{explanation}</p>
              <div className="w-full bg-[var(--bg-app)] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[var(--accent-hover)] h-1.5 transition-all duration-300 ease-out"
                  style={{ width: `${explanationProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="text-[var(--text-main)] leading-relaxed whitespace-pre-wrap select-text">
              {explanation}
            </div>
          )}
        </div>
        {!isExplaining && !explanation.startsWith('Erro ao processar') && (
          <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-center gap-4 shrink-0 bg-[var(--bg-header)] rounded-b-2xl px-6">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Save size={16} /> Salvar
            </button>
            <button
              onClick={() => { onSendToEditor(explanation); onClose(); }}
              className="px-4 py-2 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <FileText size={16} /> Editar
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--bg-app)] hover:bg-[var(--border-color)] text-[var(--text-main)] rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              Fechar
            </button>
          </div>
        )}
        {!isExplaining && explanation.startsWith('Erro ao processar') && (
          <div className="p-4 border-t border-[var(--border-color)] flex justify-end shrink-0 bg-[var(--bg-header)] rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[var(--bg-app)] hover:bg-[var(--border-color)] text-[var(--text-main)] rounded-lg text-sm font-medium transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
