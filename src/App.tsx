import { useState, useEffect } from 'react';
import { FileText, History, Save, Settings, Volume2, Check } from 'lucide-react';
import { getThemeStyles } from './themes';
import { SetupWizard } from './components/SetupWizard';
import { NavButton } from './components/NavButton';
import { EditorTab } from './components/EditorTab';
import { SettingsTab } from './components/SettingsTab';
import { SavedTab } from './components/SavedTab';
import { HistoryTab } from './components/HistoryTab';
import { AiModal } from './components/AiModal';
import { Header } from './components/Header';
import { useTheme } from './hooks/useTheme';
import { useSpeech } from './hooks/useSpeech';
import { useAI } from './hooks/useAI';
import { useHistory } from './hooks/useHistory';
import { loadData, saveData } from './lib/persistence';
import Tesseract from 'tesseract.js';

function getSavedTab(): 'editor' | 'history' | 'saved' | 'settings' {
  const saved = loadData('activeTab');
  if (saved === 'editor' || saved === 'history' || saved === 'saved' || saved === 'settings') return saved;
  return 'editor';
}

export default function App() {
  const [text, setText] = useState(() => loadData('editorText') || '');
  const [status, setStatus] = useState('Aguardando...');
  const [activeTab, setActiveTab] = useState<'editor' | 'history' | 'saved' | 'settings'>(getSavedTab);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showExplainModal, setShowExplainModal] = useState(false);

  const theme = useTheme();
  const speech = useSpeech({ text, onTextChange: setText, onStatusChange: setStatus, onAddHistoryItem: (item) => history.setHistory(prev => [item, ...prev].slice(0, 100)) });
  const ai = useAI();
  const history = useHistory();

  useEffect(() => { saveData('activeTab', activeTab); }, [activeTab]);
  useEffect(() => { saveData('editorText', text); }, [text]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const wpm = 180 * speech.rate;
  const estimatedSeconds = Math.ceil((wordCount / wpm) * 60);
  const formattedTime = estimatedSeconds > 60 ? `${Math.floor(estimatedSeconds / 60)}m ${estimatedSeconds % 60}s` : `${estimatedSeconds}s`;

  const processTextFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setText((prev) => (prev + '\n\n' + content).trim());
      setStatus('Arquivo de texto lido');
      history.setClipboardHistory(prev => [{ id: Date.now().toString(), text: content.trim(), date: Date.now(), type: 'arquivo', favorite: false }, ...prev].slice(0, 50));
    };
    reader.readAsText(file);
  };

  const processImage = async (file: File) => {
    setIsProcessingImage(true);
    setStatus('Iniciando análise OCR...');
    try {
      const worker = await Tesseract.createWorker('por', undefined, {
        logger: m => { if (m.status === 'recognizing text') setStatus(`Mapeando imagem... ${Math.round(m.progress * 100)}%`); }
      });
      await worker.setParameters({ tessedit_pageseg_mode: '3', preserve_interword_spaces: '1', textord_heavy_nr: '1', tessedit_enable_doc_dict: '1' });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      setText(prev => (prev + '\n\n' + data.text).trim());
      setStatus('Texto extraído com sucesso');
      history.setClipboardHistory(prev => [{ id: Date.now().toString(), text: data.text.trim(), date: Date.now(), type: 'ocr', favorite: false }, ...prev].slice(0, 50));
    } catch { setStatus('Falha na análise da imagem'); }
    finally { setIsProcessingImage(false); }
  };

  const handleClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setText(prev => (prev + '\n\n' + clipboardText).trim());
        history.setClipboardHistory(prev => [{ id: Date.now().toString(), text: clipboardText.trim(), date: Date.now(), type: 'clipboard', favorite: false }, ...prev].slice(0, 50));
        setStatus('Conteúdo colado');
      }
    } catch { setStatus('Permissão ao clipboard negada'); }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) await processImage(file);
      else if (file.type === 'text/plain') processTextFile(file);
      else setStatus('Apenas imagens ou arquivos .txt');
    } else {
      const droppedText = e.dataTransfer.getData('text');
      if (droppedText) setText(prev => (prev + '\n\n' + droppedText).trim());
    }
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) processImage(e.target.files[0]); };
  const handleTextUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) processTextFile(e.target.files[0]); };

  const handleAIWithCb = (action: any, customText?: string, targetLang?: string) => {
    const textToUse = customText ?? text;
    if (ai.aiProvider !== 'local' && !ai.aiApiKey) {
      ai.setShowAiWarning(true);
      setActiveTab('settings');
      setTimeout(() => ai.setShowAiWarning(false), 4000);
      return;
    }
    ai.handleAI(action, textToUse, targetLang);
    setShowExplainModal(true);
  };

  return (
    <div style={getThemeStyles(theme.themeBg, theme.themeAccent)} className="flex flex-col md:flex-row bg-[var(--bg-app)] text-[var(--text-main)] font-sans h-dvh w-full overflow-hidden transition-colors duration-300">

      {theme.showSetup && <SetupWizard onComplete={() => theme.setShowSetup(false)} speechPacks={speech.speechPacks} installingPack={speech.installingPack} installProgress={speech.installProgress} onCheckSpeechPacks={speech.checkSpeechPacks} onInstallSpeechPack={speech.installSpeechPack} />}

      {showExplainModal && (
      <AiModal
        isExplaining={ai.isExplaining}
        explanation={ai.explanation}
        explanationProgress={ai.explanationProgress}
        modalTitle={ai.modalTitle}
        aiAction={ai.aiAction}
        textBeingExplained={ai.textBeingExplained}
        onClose={() => setShowExplainModal(false)}
        onSave={(item, label) => { history.setSavedTexts(prev => [item, ...prev]); setShowExplainModal(false); setStatus(`${label} salvo com sucesso!`); }}
        onSendToEditor={(t) => { setText(t); setShowExplainModal(false); setActiveTab('editor'); setStatus('Texto enviado para o editor'); }}
      />
      )}

      {speech.micError && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={speech.clearMicError}>
        <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-2xl p-6 max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-main)]">Microfone</h3>
          </div>
          <p className="text-sm text-[var(--text-dim)] leading-relaxed mb-6">{speech.micError}</p>
          <button onClick={speech.clearMicError} className="w-full py-2.5 rounded-xl bg-[var(--accent-color)] text-white font-medium text-sm hover:brightness-110 transition-all">Entendi</button>
        </div>
      </div>
      )}

      <nav className="shrink-0 order-last md:order-first w-full md:w-20 h-16 md:h-auto bg-[var(--bg-sidebar)] border-t md:border-t-0 md:border-r border-[var(--border-color)] flex flex-row md:flex-col justify-around md:justify-start items-center md:py-8 z-30 transition-colors duration-300">
        <div className="hidden md:flex w-12 h-12 bg-[var(--accent-color)] rounded-xl items-center justify-center shadow-[0_0_15px_var(--accent-glow)] mb-8">
          <Volume2 size={24} className="text-white" />
        </div>
        <div className="flex flex-row md:flex-col gap-2 md:gap-4 w-full px-2 md:px-0">
          <NavButton active={activeTab === 'editor'} onClick={() => setActiveTab('editor')} icon={<FileText size={22} />} label="Editor" />
          <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={22} />} label="Histórico" />
          <NavButton active={activeTab === 'saved'} onClick={() => setActiveTab('saved')} icon={<Save size={22} />} label="Salvos" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={22} />} label="Ajustes" />
        </div>
      </nav>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header isRecording={speech.isRecording} isSpeaking={speech.isSpeaking} activeVoiceName={speech.activeVoiceName} wordCount={wordCount} formattedTime={formattedTime} />

        <main className="flex-1 w-full relative overflow-hidden min-h-0">

          {activeTab === 'editor' && (
            <EditorTab
              text={text} status={status} isProcessingImage={isProcessingImage}
              isDragging={isDragging} isRecording={speech.isRecording}
              isSpeaking={speech.isSpeaking} isPaused={speech.isPaused}
              showAiWarning={ai.showAiWarning} showLangDropdown={ai.showLangDropdown}
              targetLang={ai.targetLang} rate={speech.rate}
              readingCharIndex={speech.readingCharIndex} readingCharLength={speech.readingCharLength}
              onTextChange={setText} onClipboard={handleClipboard}
              onTextUpload={handleTextUpload} onImageUpload={handleImageUpload}
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onAI={handleAIWithCb} onRead={speech.handleRead}
              onPause={speech.handlePause} onStop={speech.handleStop}
              onToggleRecording={speech.toggleRecording}
              onSetLangDropdown={ai.setShowLangDropdown} onSetTargetLang={ai.setTargetLang}
              onSetRate={speech.setRate} languages={ai.languages}
            />
          )}

          {activeTab === 'saved' && (
            <SavedTab savedTexts={history.savedTexts} onDeleteAll={() => history.setSavedTexts([])} onDeleteItem={(id) => history.setSavedTexts(prev => prev.filter(x => x.id !== id))} onSendToEditor={(t) => { setText(t); setActiveTab('editor'); }} />
          )}

          {activeTab === 'history' && (
            <HistoryTab history={history.history} clipboardHistory={history.clipboardHistory} historyFilter={history.historyFilter} historySort={history.historySort} onSetHistoryFilter={history.setHistoryFilter} onSetHistorySort={(v) => history.setHistorySort(v as any)} onClearHistory={() => history.setHistory([])} onClearClipboard={() => history.setClipboardHistory([])} onHistoryItemClick={(t) => { setText(t); setActiveTab('editor'); }} onHistoryItemDelete={(id) => history.setHistory(h => h.filter(x => x.id !== id))} onHistoryItemFavorite={(id) => history.toggleFavorite(id, false)} onHistoryItemExplain={(t) => handleAIWithCb('explain', t)} onClipboardItemClick={(t) => { setText((prev) => (prev + '\n\n' + t).trim()); setActiveTab('editor'); }} getFilteredAndSortedHistory={history.getFilteredAndSortedHistory} />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              themeBg={theme.themeBg} themeAccent={theme.themeAccent}
              startWithWindows={speech.startWithWindows} voices={speech.voices}
              selectedVoiceURI={speech.selectedVoiceURI} audioInputs={speech.audioInputs}
              audioOutputs={speech.audioOutputs} selectedAudioInput={speech.selectedAudioInput}
              selectedAudioOutput={speech.selectedAudioOutput} readSpecialChars={speech.readSpecialChars}
              aiProvider={ai.aiProvider} aiModel={ai.aiModel} aiApiKey={ai.aiApiKey} aiLocalUrl={ai.aiLocalUrl}
              showSaveToast={showSaveToast}
               speechPacks={speech.speechPacks}
               selectedPackName={speech.selectedPackName} installProgress={speech.installProgress} installingPack={speech.installingPack}
               checkingPacks={speech.checkingPacks} speechPacksError={speech.speechPacksError}
               onSetThemeBg={theme.setThemeBg} onSetThemeAccent={theme.setThemeAccent}
               onSetStartWithWindows={speech.setStartWithWindows}
               onSetSelectedVoiceURI={speech.setSelectedVoiceURI}
               onSetSelectedAudioInput={speech.setSelectedAudioInput}
               onSetSelectedAudioOutput={speech.setSelectedAudioOutput}
               onSetReadSpecialChars={speech.setReadSpecialChars}
               onSetAiProvider={ai.setAiProvider} onSetAiModel={ai.setAiModel}
               onSetAiApiKey={ai.setAiApiKey} onSetAiLocalUrl={ai.setAiLocalUrl}
               onSaveConfigs={() => { ai.handleSaveConfigs(); setShowSaveToast(true); setTimeout(() => setShowSaveToast(false), 3000); }}
               onCheckSpeechPacks={speech.checkSpeechPacks} onCheckSpeechPacksOnline={speech.checkSpeechPacksOnline} onInstallSpeechPack={speech.installSpeechPack} onRemoveSpeechPack={speech.removeSpeechPack}
               onSelectPack={speech.selectPack}
               speechPrivacyOk={speech.speechPrivacyOk}
               onCheckSpeechPrivacy={speech.checkSpeechPrivacy}
               onAcceptSpeechPrivacy={speech.acceptSpeechPrivacy}
               onDeactivateSpeechPrivacy={speech.deactivateSpeechPrivacy}
            />
          )}

        </main>
      </div>
    </div>
  );
}
