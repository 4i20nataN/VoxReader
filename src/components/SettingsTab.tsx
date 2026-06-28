import { useState, useEffect, useRef } from 'react';
import { Sparkles, Check, Save, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ThemeBg, ThemeAccent, backgroundPalettes, accentPalettes } from '../themes';

interface SpeechPack {
  name: string; displayName: string; installed: boolean;
  locale?: string; langName?: string;
}

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
  speechPacks: SpeechPack[];
  selectedPackName: string;
  installProgress: number;
  installingPack: string | null;
  checkingPacks: boolean;
  speechPacksError: string | null;
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
  onCheckSpeechPacks: () => void;
  onCheckSpeechPacksOnline: () => void;
  onInstallSpeechPack: (name: string) => void;
  onRemoveSpeechPack: (name: string) => void;
  onSelectPack: (name: string) => void;
  speechPrivacyOk: boolean | null;
  onCheckSpeechPrivacy: () => void;
  onAcceptSpeechPrivacy: () => void;
  onDeactivateSpeechPrivacy: () => void;
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
    speechPacks, selectedPackName, installProgress, installingPack, checkingPacks, speechPacksError,
    speechPrivacyOk, onCheckSpeechPrivacy, onAcceptSpeechPrivacy, onDeactivateSpeechPrivacy,
    onSetThemeBg, onSetThemeAccent, onSetStartWithWindows, onSetSelectedVoiceURI,
    onSetSelectedAudioInput, onSetSelectedAudioOutput, onSetReadSpecialChars,
    onSetAiProvider, onSaveConfigs,
    onSetAiModel, onSetAiApiKey, onSetAiLocalUrl,
    onCheckSpeechPacks, onCheckSpeechPacksOnline, onInstallSpeechPack, onRemoveSpeechPack, onSelectPack
  } = props;

  const [packSearch, setPackSearch] = useState('');
  const installedPacks = speechPacks.filter(p => p.installed);
  const availablePacks = speechPacks.filter(p => !p.installed);

  const renderPack = (pack: SpeechPack) => {
    const isInstalled = pack.installed;
    const isSelected = selectedPackName === pack.name;
    const isDownloading = installingPack === pack.name;
    return (
      <div key={pack.name} className={cn(
        "flex items-center justify-between py-3 px-3 rounded-lg mb-1.5 transition-all border",
        isSelected
          ? "bg-[var(--accent-transparent)] border-[var(--accent-border)] shadow-sm"
          : isInstalled
            ? "border-[var(--border-color)] hover:bg-[var(--bg-input)]"
            : "border-transparent hover:bg-[var(--bg-input)]"
      )}>
        <div className="flex items-center gap-3 min-w-0">
          {isSelected ? (
            <div className="w-5 h-5 rounded-full bg-[var(--accent-hover)] flex items-center justify-center shrink-0">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-[var(--border-color)] shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-sm truncate", isSelected ? "text-[var(--accent-hover)] font-semibold" : "text-[var(--text-main)]")}>
                {pack.langName || pack.displayName || pack.name}
              </span>
              {pack.locale && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-darker)] font-mono uppercase">{pack.locale}</span>
              )}
            </div>
            {isInstalled && (
              <span className={cn("text-[10px] font-medium", isSelected ? "text-[var(--accent-hover)]" : "text-emerald-500")}>
                {isSelected ? '✓ Em uso' : 'Instalado'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDownloading && installProgress > 0 && (
            <div className="w-16 h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--accent-hover)] rounded-full transition-all" style={{ width: `${installProgress}%` }}></div>
            </div>
          )}
          {isInstalled ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onSelectPack(pack.name)}
                disabled={isSelected}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg font-medium transition-all active:scale-90 min-w-[4.5rem]",
                  isSelected
                    ? "bg-emerald-500 text-white cursor-default shadow-sm"
                    : "bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)]"
                )}
              >
                {isSelected ? 'Em uso' : 'Usar'}
              </button>
              <button
                onClick={() => onRemoveSpeechPack(pack.name)}
                className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all active:scale-90 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
              >
                Desinstalar
              </button>
            </div>
          ) : (
            <button
              onClick={() => onInstallSpeechPack(pack.name)}
              disabled={isDownloading}
              className="text-xs bg-[var(--accent-color)] text-white px-3 py-1.5 rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-all active:scale-90 flex items-center gap-1"
            >
              {isDownloading ? (
                <>{installProgress > 0 ? `${installProgress}%` : '...'}</>
              ) : 'Baixar'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const isElectron = typeof (window as any).require === 'function' && navigator.userAgent.includes('Electron');

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

          {isElectron && (
          <div className="space-y-4">
            <h3 className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2 mb-4">Reconhecimento de Fala (Windows)</h3>

            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-[var(--text-light)]">Reconhecimento de Fala do Windows</span>
                <button
                  onClick={speechPrivacyOk === true ? onDeactivateSpeechPrivacy : onAcceptSpeechPrivacy}
                  disabled={speechPrivacyOk === null}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-lg font-medium transition-all active:scale-90",
                    speechPrivacyOk === true
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : speechPrivacyOk === false
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)]"
                  )}
                >
                  {speechPrivacyOk === true ? 'Desativar' : speechPrivacyOk === false ? 'Ativar' : 'Verificando...'}
                </button>
              </div>
              <hr className="border-[var(--border-color)] mb-3" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-[var(--text-light)] flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                  Pacotes de Fala
                </span>
                <button
                  onClick={onCheckSpeechPacks}
                  disabled={checkingPacks}
                  className="text-xs bg-[var(--accent-color)] text-white px-3.5 py-1.5 rounded-lg hover:bg-[var(--accent-hover)] active:scale-90 transition-all flex items-center gap-1.5 font-medium disabled:opacity-60"
                >
                  <svg className={cn("w-3.5 h-3.5", checkingPacks && "animate-spin")} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  {checkingPacks ? 'Buscando...' : 'Buscar'}
                </button>
                <button
                  onClick={onCheckSpeechPacksOnline}
                  disabled={checkingPacks}
                  className="text-xs bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-main)] px-3.5 py-1.5 rounded-lg hover:bg-[var(--bg-input)] active:scale-90 transition-all flex items-center gap-1.5 font-medium disabled:opacity-60"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
                  Online
                </button>
              </div>

              <div className="relative mb-3">
                <input
                  type="text"
                  value={packSearch}
                  onChange={e => setPackSearch(e.target.value)}
                  placeholder="Filtrar por idioma..."
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-darker)] outline-none focus:border-[var(--accent-color)] transition-colors"
                />
              </div>

              {speechPacksError && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">
                  <p className="text-xs text-amber-500">{speechPacksError}</p>
                </div>
              )}

              {checkingPacks && speechPacks.length === 0 && (
                <p className="text-xs text-[var(--text-darker)] text-center py-6">Buscando pacotes disponíveis...</p>
              )}

              {!checkingPacks && speechPacks.length === 0 && !speechPacksError && (
                <p className="text-xs text-[var(--text-darker)] text-center py-6">Clique em "Buscar" para listar os pacotes de fala disponíveis para seu Windows.</p>
              )}

              {installedPacks.length > 0 && (() => {
                const filtered = installedPacks.filter(p =>
                  !packSearch || p.langName?.toLowerCase().includes(packSearch.toLowerCase()) ||
                  p.locale?.toLowerCase().includes(packSearch.toLowerCase()) ||
                  p.displayName?.toLowerCase().includes(packSearch.toLowerCase())
                );
                if (filtered.length === 0) return null;
                return (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-[var(--text-darker)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      Instalados ({filtered.length})
                    </p>
                    {filtered.map(pack => renderPack(pack))}
                  </div>
                );
              })()}

              {availablePacks.length > 0 && (() => {
                const filtered = availablePacks.filter(p =>
                  !packSearch || p.langName?.toLowerCase().includes(packSearch.toLowerCase()) ||
                  p.locale?.toLowerCase().includes(packSearch.toLowerCase()) ||
                  p.displayName?.toLowerCase().includes(packSearch.toLowerCase())
                );
                if (filtered.length === 0) return null;
                return (
                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-darker)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                      Disponíveis ({filtered.length})
                    </p>
                    {filtered.map(pack => renderPack(pack))}
                  </div>
                );
              })()}

              {installingPack && (() => {
                const pack = speechPacks.find(p => p.name === installingPack);
                return (
                  <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                    <div className="flex justify-between text-xs text-[var(--text-darker)] mb-1.5">
                      <span>Instalando {pack?.langName || pack?.displayName || ''}...</span>
                      <span>{installProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--bg-input)] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[var(--accent-color)] to-[var(--accent-hover)] rounded-full transition-all duration-1000" style={{ width: `${installProgress}%` }}></div>
                    </div>
                    <p className="text-[10px] text-[var(--text-darker)] mt-1">Aceite a solicitação de permissão de administrador (UAC) para continuar.</p>
                  </div>
                );
              })()}
            </div>

            <p className="text-xs text-[var(--text-darker)] leading-relaxed">Baixe o pacote de fala do seu idioma e clique em "Usar" para ativar a transcrição por voz offline.</p>
          </div>
          )}

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
