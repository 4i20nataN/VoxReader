import React, { useState } from 'react';
import { Volume2, Mic, History } from 'lucide-react';
import { cn } from '../lib/utils';

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[var(--bg-header)] border border-[var(--accent-border)] w-full max-w-md rounded-2xl shadow-2xl p-8 flex flex-col gap-6 animate-in fade-in zoom-in duration-300 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[var(--bg-header)] via-[var(--accent-hover)] to-[var(--bg-header)] opacity-50"></div>
        {step === 1 && (
          <>
            <div className="w-16 h-16 bg-[var(--accent-transparent)] text-[var(--accent-hover)] rounded-2xl flex items-center justify-center mx-auto mb-2 border border-[var(--accent-border)] shadow-[0_0_20px_var(--accent-transparent)]">
              <Volume2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-center text-[var(--text-main)] tracking-tight">Leitor C++ <span className="opacity-50 text-base">(Modo PWA)</span></h2>
            <p className="text-center text-[var(--text-light)] text-sm leading-relaxed">O sistema está sendo configurado para rodar nativamente, salvar histórico e temas no AppData local e respeitar sua privacidade (Offline e Zero IA em segundo plano).</p>
            <div className="text-[11px] p-3 bg-[var(--bg-panel)] rounded-lg text-[var(--text-muted)] border border-[var(--border-color)]">
              ⚙️ <strong className="text-[var(--text-main)]">Nota:</strong> Instale como aplicativo no seu navegador (icone na barra de endereços ⊕) para criar atalho no menu Iniciar, ativando comportamento EXE único e janela limpa.
            </div>
            <button onClick={() => setStep(2)} className="mt-2 w-full py-3.5 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-header)] focus:ring-[var(--accent-color)]">Avançar</button>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">Estrutura Inicial de Histórico</h2>
            <div className="space-y-3 text-sm text-[var(--text-light)]">
              <div className="flex items-start gap-4 p-4 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-color)]">
                 <Mic className="text-[var(--accent-hover)] shrink-0 w-5 h-5" />
                 <div><strong className="text-[var(--text-main)] block mb-1">Transcrição & Localização</strong>O Microfone é acionado apenas ao clicar para ditar. O Leitor utiliza SAPI nativa.</div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-color)]">
                 <History className="text-[var(--accent-hover)] shrink-0 w-5 h-5" />
                 <div><strong className="text-[var(--text-main)] block mb-1">Clipboard e Leituras (AppData)</strong>Suas leituras e cópias são estruturadas no banco de dados local da Runtime, podendo ser favoritadas, ordenadas e filtradas livremente sem internet.</div>
              </div>
            </div>
            <button onClick={() => { localStorage.setItem('leitor_setup_done', 'true'); onComplete(); }} className="mt-4 w-full py-3.5 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold transition-all shadow-lg active:scale-95">Concluir Instalação</button>
          </>
        )}
      </div>
    </div>
  )
}
