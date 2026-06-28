import { useState, useEffect } from 'react';
import { Volume2, Mic, History, ChevronLeft } from 'lucide-react';
import { saveData } from '../lib/persistence';

interface SpeechPackInfo {
  name: string; displayName: string; installed: boolean;
}

interface SetupWizardProps {
  onComplete: () => void;
  speechPacks?: SpeechPackInfo[];
  installingPack?: string | null;
  installProgress?: number;
  onCheckSpeechPacks?: () => void;
  onInstallSpeechPack?: (name: string) => void;
}

export function SetupWizard({ onComplete, speechPacks, installingPack, installProgress, onCheckSpeechPacks, onInstallSpeechPack }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [packsChecked, setPacksChecked] = useState(false);

  useEffect(() => {
    if (onCheckSpeechPacks && !packsChecked) {
      onCheckSpeechPacks();
      setPacksChecked(true);
    }
  }, [onCheckSpeechPacks, packsChecked]);

  const availablePacks = speechPacks?.filter(p => !p.installed) || [];
  const hasInstalled = speechPacks?.some(p => p.installed) || false;
  const allAvailable = packsChecked && speechPacks && speechPacks.length > 0 && !hasInstalled && availablePacks.length > 0;

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
        {allAvailable && step === 2 && (
          <>
            <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">Reconhecimento de Fala (Windows)</h2>
            <p className="text-sm text-[var(--text-light)] leading-relaxed mb-4">Nenhum pacote de fala instalado. Baixe um para usar transcrição por voz offline:</p>
            <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
              {availablePacks.map(pack => (
                <div key={pack.name} className="flex items-center justify-between p-3 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-color)]">
                  <span className="text-sm text-[var(--text-main)]">{pack.displayName || pack.name}</span>
                  <div className="flex items-center gap-2">
                    {installingPack === pack.name && installProgress && installProgress > 0 && (
                      <div className="w-16 h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--accent-hover)] rounded-full transition-all" style={{ width: `${installProgress}%` }}></div>
                      </div>
                    )}
                    <button
                      onClick={() => onInstallSpeechPack?.(pack.name)}
                      disabled={installingPack === pack.name}
                      className="text-xs bg-[var(--accent-color)] text-white px-3 py-1.5 rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-all active:scale-90"
                    >
                      {installingPack === pack.name ? 'Baixando...' : 'Baixar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {installingPack && installProgress && installProgress > 0 && (
              <div className="w-full h-2 bg-[var(--bg-input)] rounded-full overflow-hidden mb-2">
                <div className="h-full bg-gradient-to-r from-[var(--accent-color)] to-[var(--accent-hover)] rounded-full transition-all duration-1000" style={{ width: `${installProgress}%` }}></div>
              </div>
            )}
            <p className="text-xs text-[var(--text-darker)] leading-relaxed mb-4">A instalação solicitará permissão de administrador (UAC). Você pode pular e configurar depois em Ajustes &gt; Reconhecimento de Fala.</p>
            <button onClick={() => setStep(3)} className="w-full py-3.5 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold transition-all shadow-lg active:scale-95">Avançar</button>
          </>
        )}
        {((step === 2 && !allAvailable) || step === (allAvailable ? 3 : 2)) && (
          <>
            <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">Estrutura Inicial de Histórico</h2>
            <div className="space-y-3 text-sm text-[var(--text-light)]">
              <div className="flex items-start gap-4 p-4 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-color)]">
                 <Mic className="text-[var(--accent-hover)] shrink-0 w-5 h-5" />
                 <div><strong className="text-[var(--text-main)] block mb-1">Transcrição & Localização</strong>O Microfone é acionado apenas ao clicar para ditar. No Windows, utiliza o reconhecimento nativo do sistema (offline).</div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-color)]">
                 <History className="text-[var(--accent-hover)] shrink-0 w-5 h-5" />
                 <div><strong className="text-[var(--text-main)] block mb-1">Clipboard e Leituras (AppData)</strong>Suas leituras e cópias são estruturadas no banco de dados local da Runtime, podendo ser favoritadas, ordenadas e filtradas livremente sem internet.</div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {allAvailable && (
                <button onClick={() => setStep(2)} className="flex-1 py-3.5 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-[var(--bg-input)] text-[var(--text-main)] rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-1">
                  <ChevronLeft size={16} /> Voltar
                </button>
              )}
              <button onClick={() => { saveData('leitor_setup_done', 'true'); onComplete(); }} className="flex-1 py-3.5 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold transition-all shadow-lg active:scale-95">Concluir Instalação</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
