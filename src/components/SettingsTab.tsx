import { useState, useEffect, useRef } from 'react';
import { Sparkles, Check, Save, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ThemeBg, ThemeAccent, backgroundPalettes, accentPalettes } from '../themes';

interface SettingsTabProps {
  themeBg: ThemeBg;
  themeAccent: ThemeAccent;
  startWithWindows: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  audioInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
  selectedAudioInput: string;
  selectedAudioOutput: string;
  readSpecialChars: boolean;
  aiProvider: string;
  aiModel: string;
  aiApiKey: string;
  aiLocalUrl: string;
  showSaveToast: boolean;
  onSetThemeBg: (v: ThemeBg) => void;
  onSetThemeAccent: (v: ThemeAccent) => void;
  onSetStartWithWindows: (v: boolean) => void;
  onSetSelectedVoiceURI: (v: string) => void;
  onSetSelectedAudioInput: (v: string) => void;
  onSetSelectedAudioOutput: (v: string) => void;
  onSetReadSpecialChars: (v: boolean) => void;
  onSetAiProvider: (v: string) => void;
  onSaveConfigs: () => void;
  onSetAiModel: (v: string) => void;
  onSetAiApiKey: (v: string) => void;
  onSetAiLocalUrl: (v: string) => void;
}

function DebouncedInput({ value, onChange, ...props }: { value: string; onChange: (v: string) => void } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [local, setLocal] = useState(value);
  const ref = useRef<ReturnType<typeof setTimeout>>();
  const mounted = useRef(false);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocal(v);
    clearTimeout(ref.current);
    ref.current = setTimeout(() => { if (mounted.current) onChange(v); }, 350);
  };

  useEffect(() => {
    return () => clearTimeout(ref.current);
  }, []);

  return <input {...props} value={local} onChange={handleChange} />;
}

export function SettingsTab(props: SettingsTabProps) {
  const {
    themeBg, themeAccent, startWithWindows, voices, selectedVoiceURI,
    audioInputs, audioOutputs, selectedAudioInput, selectedAudioOutput,
    readSpecialChars, aiProvider, aiModel, aiApiKey, aiLocalUrl, showSaveToast,
    onSetThemeBg, onSetThemeAccent, onSetStartWithWindows, onSetSelectedVoiceURI,
    onSetSelectedAudioInput, onSetSelectedAudioOutput, onSetReadSpecialChars,
    onSetAiProvider, onSaveConfigs,
    onSetAiModel, onSetAiApiKey, onSetAiLocalUrl
  } = props;

  return (
    <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 lg:p-10">
      <div className="max-w-2xl mx-auto bg-[var(--bg-sidebar)] rounded-xl border border-[var(--border-color)] shadow-xl overflow-hidden transition-colors duration-300 mb-10 md:mb-0">
        <div className="p-6 md:p-8 border-b border-[var(--border-color)] bg-[var(--bg-header)] flex justify-between items-start">
          <div>
            <h2 className="font-semibold text-lg md:text-xl text-[var(--text-main)] tracking-tight">Motor & Preferências</h2>
            <p className="text-sm text-[var(--text-muted)] mt-2 tracking-wide">Ajuste a síntese de voz, I.A. explicativa e personalização.</p>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-10">
          {/* System Settings */}
          <div className="space-y-4">
            <h3 className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2 mb-4">Sistema Windows</h3>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={startWithWindows} onChange={(e) => onSetStartWithWindows(e.target.checked)} />
                <div className={cn("w-10 h-6 rounded-full transition-colors", startWithWindows ? "bg-[var(--accent-hover)]" : "bg-[var(--bg-panel)] border border-[var(--border-color)]")}></div>
                <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", startWithWindows ? "left-5" : "left-1")}></div>
              </div>
              <span className="text-sm text-[var(--text-main)] group-hover:text-[var(--accent-hover)] transition-colors">Iniciar o leitor junto com o Windows<br/><span className="text-xs text-[var(--text-muted)] font-normal">(Funciona apenas na versão instalada)</span></span>
            </label>
          </div>

          <hr className="border-[var(--border-color)]" />

          {/* Theme Selectors */}
          <div className="space-y-6">
            <h3 className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2 mb-4">Aparência (48 variações)</h3>

            <div className="space-y-3">
              <label className="text-sm font-medium text-[var(--text-light)] flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" /> Plano de Fundo Base</label>
              <div className="flex flex-wrap gap-2 md:gap-3">
                {Object.keys(backgroundPalettes).map((bg) => (
                  <button
                    key={bg} onClick={() => onSetThemeBg(bg as ThemeBg)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium border transition-all capitalize",
                      themeBg === bg ? "bg-[var(--accent-transparent)] border-[var(--accent-hover)] text-[var(--accent-hover)] shadow-[0_0_10px_var(--accent-transparent)]" : "bg-[var(--bg-panel)] border-[var(--border-color)] text-[var(--text-light)] hover:text-[var(--text-main)] hover:border-[var(--border-hover)]"
                    )}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-sm font-medium text-[var(--text-light)] flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" /> Cor de Destaque Primária</label>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 mt-2">
                {Object.keys(accentPalettes).map((accent) => (
                  <button
                    key={accent} onClick={() => onSetThemeAccent(accent as ThemeAccent)}
                    className={cn(
                      "aspect-square rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center",
                      themeAccent === accent ? "scale-110 shadow-[0_0_15px_var(--accent-glow)] z-10" : "border-transparent"
                    )}
                    style={{ backgroundColor: accentPalettes[accent as ThemeAccent]['--accent-color'], borderColor: themeAccent === accent ? 'var(--text-main)' : 'transparent' }}
                    title={accent}
                  />
                ))}
              </div>
            </div>
          </div>

          <hr className="border-[var(--border-color)]" />

          {/* Voice Engine */}
          <div className="space-y-4">
            <h3 className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2 mb-4">Áudio Engine</h3>
            <label className="block text-sm font-medium text-[var(--text-light)]" htmlFor="voice-select">Motor de Voz Instalado (Offline)</label>
            <div className="relative">
              <select id="voice-select"
                value={selectedVoiceURI}
                onChange={(e) => onSetSelectedVoiceURI(e.target.value)}
                className="w-full appearance-none bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] py-3 px-4 rounded-lg focus:outline-none focus:border-[var(--accent-hover)] focus:ring-1 focus:ring-[var(--accent-hover)] transition-colors shadow-sm"
              >
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang}) {voice.default ? ' - (Padrão)' : ''}
                  </option>
                ))}
                {voices.length === 0 && <option>Monitorando barramento de falas...</option>}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--text-muted)]">
                <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            <p className="text-xs text-[var(--text-darker)] leading-relaxed mb-4">As vozes operam processando áudio através das bibliotecas locais do Windows (SAPI)/SO. Nada é enviado à nuvem.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-light)] mb-1.5" htmlFor="audio-input">Microfone Recomendado (Entrada)</label>
                <select id="audio-input" value={selectedAudioInput} onChange={(e) => onSetSelectedAudioInput(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] py-2.5 px-3 rounded-lg focus:outline-none focus:border-[var(--accent-hover)] text-sm">
                  <option value="default">Padrão do Sistema</option>
                  {audioInputs.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>{device.label || `Microfone ${device.deviceId.slice(0, 5)}...`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-light)] mb-1.5" htmlFor="audio-output">Saída de Áudio</label>
                <select id="audio-output" value={selectedAudioOutput} onChange={(e) => onSetSelectedAudioOutput(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] py-2.5 px-3 rounded-lg focus:outline-none focus:border-[var(--accent-hover)] text-sm">
                  <option value="default">Padrão do Sistema</option>
                  {audioOutputs.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>{device.label || `Saída ${device.deviceId.slice(0, 5)}...`}</option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group mt-4">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={readSpecialChars} onChange={(e) => onSetReadSpecialChars(e.target.checked)} />
                <div className={cn("w-10 h-6 rounded-full transition-colors", readSpecialChars ? "bg-[var(--accent-hover)]" : "bg-[var(--bg-panel)] border border-[var(--border-color)]")}></div>
                <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", readSpecialChars ? "left-5" : "left-1")}></div>
              </div>
              <span className="text-sm text-[var(--text-main)] group-hover:text-[var(--accent-hover)] transition-colors">Ler caracteres especiais<br/><span className="text-xs text-[var(--text-muted)] font-normal">(Exemplo: arroba, hashtag, porcento...)</span></span>
            </label>
          </div>

          <hr className="border-[var(--border-color)]" />

          {/* AI Explanation Config */}
          <div className="space-y-4">
            <h3 className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2 mb-4 flex items-center gap-2"><Sparkles size={14} className="text-[var(--accent-hover)]"/> Integração I.A. (Explicador)</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-light)] mb-1.5" htmlFor="ai-provider">Provedor</label>
                <select id="ai-provider" value={aiProvider} onChange={(e) => onSetAiProvider(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] py-2.5 px-3 rounded-lg focus:outline-none focus:border-[var(--accent-hover)] text-sm">
                  <option value="google">Google Gemini API</option>
                  <option value="openrouter">OpenRouter API</option>
                  <option value="local">Modelo Local (Ollama/LM Studio)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-light)] mb-1.5" htmlFor="ai-model">Modelo</label>
                <DebouncedInput id="ai-model" type="text" value={aiModel} onChange={onSetAiModel} placeholder="ex: gemini-2.5-flash" className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] py-2.5 px-3 rounded-lg focus:outline-none focus:border-[var(--accent-hover)] text-sm" />
              </div>
            </div>

            {aiProvider === 'local' ? (
              <div>
                <label className="block text-xs font-medium text-[var(--text-light)] mb-1.5" htmlFor="ai-local-url">URL da API Local</label>
                <DebouncedInput id="ai-local-url" type="text" value={aiLocalUrl} onChange={onSetAiLocalUrl} placeholder="http://localhost:11434/v1/chat/completions" className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] py-2.5 px-3 rounded-lg focus:outline-none focus:border-[var(--accent-hover)] text-sm font-mono" />
              </div>
            ) : (
              <div>
<label className="block text-xs font-medium text-[var(--text-light)] mb-1.5" htmlFor="ai-api-key">Chave da API (Salva no navegador)</label>
                  <form onSubmit={e => e.preventDefault()}><DebouncedInput id="ai-api-key" type="password" value={aiApiKey} onChange={onSetAiApiKey} placeholder="sk-..." className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] py-2.5 px-3 rounded-lg focus:outline-none focus:border-[var(--accent-hover)] text-sm font-mono" /></form>
              </div>
            )}
            <p className="text-xs text-[var(--text-darker)] leading-relaxed">Você pode usar I.A. para resumir textos no Editor. Suas credenciais nunca saem do seu navegador (Client-Side).</p>
          </div>

          {/* Save Configurations */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--border-color)]">
            <div className="h-6 flex items-center">
              {showSaveToast && (
                <span className="text-emerald-500 font-bold text-sm tracking-wide animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2">
                  <Check size={16} /> Configurações Salvas
                </span>
              )}
            </div>
            <button onClick={onSaveConfigs} className="w-full sm:w-auto px-8 py-3.5 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold transition-all shadow-[0_4px_14px_var(--accent-transparent)] flex items-center justify-center gap-2 active:scale-95">
              <Save size={18} /> Salvar Preferências
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
