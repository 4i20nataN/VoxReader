import React from 'react';
import { format } from 'date-fns';
import { Star, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { HistoryItem } from '../types';

export function HistoryCard({ item, onClick, onDelete, onFavorite, onExplain }: { item: HistoryItem, onClick: () => void, onDelete: () => void, onFavorite: () => void, onExplain?: () => void }) {
  return (
    <div className="group relative bg-[var(--bg-panel)] rounded-xl border border-[var(--border-color)] p-4 hover:border-[var(--accent-border)] transition-colors shadow-sm focus-within:ring-2 focus-within:ring-[var(--accent-transparent)] active:scale-[0.98]">
      <div className="flex justify-between items-start mb-3 cursor-pointer outline-none" onClick={onClick} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
        <span className="text-[10px] font-mono text-[var(--text-darker)] flex items-center gap-2">
          {format(item.date, 'dd/MM/yyyy HH:mm')} 
          {item.favorite && <Star size={10} className="fill-amber-500 text-amber-500" />}
        </span>
        <div className="flex items-center gap-2">
          {onExplain && (
            <button 
              onClick={(e) => { e.stopPropagation(); onExplain(); }}
              className="text-[var(--text-darker)] hover:text-[var(--accent-hover)] opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none"
              title="Explicar com I.A."
            >
              <Sparkles size={14} />
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onFavorite(); }}
            className={cn("hover:text-amber-500 transition-opacity focus:outline-none", item.favorite ? "text-amber-500 opacity-100" : "text-[var(--text-darker)] opacity-0 group-hover:opacity-100 focus:opacity-100")}
            title={item.favorite ? "Remover dos Favoritos" : "Marcar como Favorito"}
          >
            <Star size={14} className={cn(item.favorite && "fill-amber-500")} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-[var(--text-darker)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none"
            title="Excluir item"
          >
            <Trash2 size={14} />
          </button>
          <span className={cn(
            "px-2 py-0.5 text-[8px] rounded uppercase font-bold tracking-wider", 
            item.type === 'clipboard' ? "bg-orange-500/10 text-orange-500" : 
            item.type === 'ocr' ? "bg-purple-500/10 text-purple-500" : 
            item.type === 'arquivo' ? "bg-emerald-500/10 text-emerald-500" : 
            "bg-[var(--accent-transparent)] text-[var(--accent-hover)]"
          )}>
            {item.type}
          </span>
        </div>
      </div>
      <p className="text-sm text-[var(--text-light)] leading-relaxed line-clamp-2 cursor-pointer outline-none" onClick={onClick}>{item.text}</p>
    </div>
  );
}
