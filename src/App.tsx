import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Square, Mic, MicOff, Settings, 
  History, Clipboard, FileText, Image as ImageIcon, 
  Trash2, Clock, Upload, Check, Volume2, Save,
  Star, Sparkles, X, Filter, ArrowDownWideNarrow
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { format } from 'date-fns';
import { getThemeStyles, ThemeBg, ThemeAccent, backgroundPalettes, accentPalettes } from './themes';
import { cn } from './lib/utils';
import { HistoryItem, SavedTextItem } from './types';
import { SetupWizard } from './components/SetupWizard';
import { NavButton } from './components/NavButton';
import { HistoryCard } from './components/HistoryCard';

// --- Web Speech API Types ---
const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function App() {
  // --- Theming & Setup ---
  const [themeBg, setThemeBg] = useState<ThemeBg>('dark');
  const [themeAccent, setThemeAccent] = useState<ThemeAccent>('blue');
  const [showSetup, setShowSetup] = useState(false);

  // --- State ---
  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Aguardando...');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  // Settings
  const [startWithWindows, setStartWithWindows] = useState(false);
  const [readSpecialChars, setReadSpecialChars] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [rate, setRate] = useState(1);
  
  // Devices
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('default');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('default');
  
  // AI Config
  const [aiProvider, setAiProvider] = useState<'google' | 'openrouter' | 'local'>('google');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('gemini-2.5-flash');
  const [aiLocalUrl, setAiLocalUrl] = useState('http://localhost:11434/v1/chat/completions');
  
  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [clipboardHistory, setClipboardHistory] = useState<HistoryItem[]>([]);
  const [savedTexts, setSavedTexts] = useState<SavedTextItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'favorites'>('all');
  const [historySort, setHistorySort] = useState<'newest' | 'oldest' | 'longest'>('newest');
  
  // UI State
  const [activeTab, setActiveTab] = useState<'editor' | 'history' | 'saved' | 'settings'>('editor');
  const [isDragging, setIsDragging] = useState(false);
  const [textBeingExplained, setTextBeingExplained] = useState('');
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [explanationProgress, setExplanationProgress] = useState(0);
  const [showAiWarning, setShowAiWarning] = useState(false);

  // Refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  // Global Play/Pause wrapper for Electron
  useEffect(() => {
    (window as any).togglePlayPause = () => {
       if (isSpeaking) {
          if (isPaused) {
            synthRef.current.resume();
            setIsPaused(false);
          } else {
            synthRef.current.pause();
            setIsPaused(true);
          }
       } else {
          // Can't call handleRead without it defined, but I'll define a simpler trigger
          document.getElementById('play-button')?.click();
       }
    };
  }, [isSpeaking, isPaused]);

  const vibrate = (ms = 50) => {
    if (navigator.vibrate) {
      try { navigator.vibrate(ms); } catch(e) {}
    }
  };

  // --- Initialization ---
  useEffect(() => {
    // Check first run
    if (!localStorage.getItem('leitor_setup_done')) {
      setShowSetup(true);
    }
    const savedBg = localStorage.getItem('leitor_bg') as ThemeBg;
    if (savedBg && backgroundPalettes[savedBg]) setThemeBg(savedBg);
    const savedAccent = localStorage.getItem('leitor_accent') as ThemeAccent;
    if (savedAccent && accentPalettes[savedAccent]) setThemeAccent(savedAccent);

    // Load configs
    const savedRate = localStorage.getItem('reader_rate');
    if (savedRate) setRate(parseFloat(savedRate));
    const savedHistory = localStorage.getItem('reader_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    const savedClipboard = localStorage.getItem('reader_clipboard');
    if (savedClipboard) setClipboardHistory(JSON.parse(savedClipboard));
    const savedTextsLocal = localStorage.getItem('leitor_saved_texts');
    if (savedTextsLocal) setSavedTexts(JSON.parse(savedTextsLocal));
    const savedWinStart = localStorage.getItem('reader_win_start');
    if (savedWinStart === 'true') setStartWithWindows(true);
    
    const savedSpecialChars = localStorage.getItem('leitor_special_chars');
    if (savedSpecialChars === 'true') setReadSpecialChars(true);
    
    // Load AI Config
    if (localStorage.getItem('leitor_ai_provider')) setAiProvider(localStorage.getItem('leitor_ai_provider') as any);
    if (localStorage.getItem('leitor_ai_key')) setAiApiKey(localStorage.getItem('leitor_ai_key') as string);
    if (localStorage.getItem('leitor_ai_model')) setAiModel(localStorage.getItem('leitor_ai_model') as string);
    if (localStorage.getItem('leitor_ai_url')) setAiLocalUrl(localStorage.getItem('leitor_ai_url') as string);

    const savedInput = localStorage.getItem('leitor_audio_input');
    if (savedInput) setSelectedAudioInput(savedInput);
    const savedOutput = localStorage.getItem('leitor_audio_output');
    if (savedOutput) setSelectedAudioOutput(savedOutput);

    const updateVoices = () => {
      const availableVoices = synthRef.current.getVoices();
      setVoices(availableVoices);
      const savedVoice = localStorage.getItem('reader_voice');
      if (savedVoice && availableVoices.find(v => v.voiceURI === savedVoice)) {
        setSelectedVoiceURI(savedVoice);
      } else if (availableVoices.length > 0) {
        const ptVoice = availableVoices.find(v => v.lang.includes('pt'));
        setSelectedVoiceURI(ptVoice ? ptVoice.voiceURI : availableVoices[0].voiceURI);
      }
    };

    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = updateVoices;
    }
    updateVoices();

    const fetchDevicesWrapper = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputs(devices.filter(d => d.kind === 'audioinput'));
        setAudioOutputs(devices.filter(d => d.kind === 'audiooutput'));
      } catch (err) {}
    };
    fetchDevicesWrapper();

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          else interimTranscript += event.results[i][0].transcript;
        }
        
        if (finalTranscript) {
          setText(prev => (prev + ' ' + finalTranscript).trim() + ' ');
        }
        setStatus(interimTranscript ? `Ouvindo: ${interimTranscript}` : 'Capturando áudio...');
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error !== 'no-speech') {
          setStatus(event.error === 'not-allowed' ? 'Permissão do Microfone Negada.' : `Mic status: ${event.error}`);
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (status.startsWith('Ouvindo') || status.startsWith('Capturando')) setStatus('Pronto para leitura');
      };

      recognitionRef.current = recognition;
    }

    return () => {
      synthRef.current.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // --- Save State ---
  useEffect(() => { localStorage.setItem('leitor_bg', themeBg); }, [themeBg]);
  useEffect(() => { localStorage.setItem('leitor_accent', themeAccent); }, [themeAccent]);
  useEffect(() => { localStorage.setItem('reader_rate', rate.toString()); }, [rate]);
  useEffect(() => { localStorage.setItem('reader_voice', selectedVoiceURI); }, [selectedVoiceURI]);
  useEffect(() => { localStorage.setItem('reader_history', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('reader_clipboard', JSON.stringify(clipboardHistory)); }, [clipboardHistory]);
  useEffect(() => { localStorage.setItem('leitor_saved_texts', JSON.stringify(savedTexts)); }, [savedTexts]);
  useEffect(() => { localStorage.setItem('reader_win_start', startWithWindows ? 'true' : 'false'); }, [startWithWindows]);
  useEffect(() => { 
    localStorage.setItem('leitor_ai_provider', aiProvider);
    localStorage.setItem('leitor_ai_key', aiApiKey);
    localStorage.setItem('leitor_ai_model', aiModel);
    localStorage.setItem('leitor_ai_url', aiLocalUrl);
  }, [aiProvider, aiApiKey, aiModel, aiLocalUrl]);

  // --- Core Functions ---
  const handleRead = () => {
    vibrate(50);
    if (!text.trim()) {
      setStatus('Editor vazio.');
      return;
    }

    if (isPaused) {
      synthRef.current.resume();
      setIsSpeaking(true);
      setIsPaused(false);
      setStatus('Leitura em andamento...');
      return;
    }

    let textToRead = text.trim();
    if (readSpecialChars) {
      textToRead = textToRead
        .replace(/&/g, ' e comercial ')
        .replace(/@/g, ' arroba ')
        .replace(/#/g, ' hashtag ')
        .replace(/%/g, ' porcento ')
        .replace(/\*/g, ' asterisco ')
        .replace(/\$/g, ' cifrão ')
        .replace(/\+/g, ' mais ')
        .replace(/=/g, ' igual ')
        .replace(/</g, ' menor que ')
        .replace(/>/g, ' maior que ');
    } else {
      textToRead = textToRead.replace(/[&@#%^*_$+=<>~`|\\]/g, ' ');
    }

    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = rate;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setStatus('Leitura em andamento...');
      const newItem: HistoryItem = { id: Date.now().toString(), text: text.trim(), date: Date.now(), type: 'read', favorite: false };
      setHistory(prev => [newItem, ...prev].slice(0, 100)); // Keep up to 100
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setStatus('Leitura concluída');
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setStatus('Leitura interrompida');
    };

    synthRef.current.speak(utterance);
  };

  const handlePause = () => {
    vibrate(40);
    if (isSpeaking) {
      synthRef.current.pause();
      setIsSpeaking(false);
      setIsPaused(true);
      setStatus('Leitura pausada');
    }
  };

  const handleStop = () => {
    vibrate(60);
    synthRef.current.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setStatus('Leitura parada');
  };

  const toggleRecording = async () => {
    vibrate(50);
    if (!recognitionRef.current) {
      setStatus('Reconhecimento não suportado no navegador atual.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setStatus('Gravação encerrada');
    } else {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        setStatus('Microfone bloqueado. Permita o acesso na barra de endereço.');
        return;
      }
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        setStatus('Preparando interface de áudio...');
      } catch (e) {
        if ((e as Error).name === 'InvalidStateError') {
          recognitionRef.current.stop();
          setTimeout(() => {
            try { recognitionRef.current.start(); setIsRecording(true); } 
            catch(err) { setIsRecording(false); }
          }, 300);
        } else {
          setIsRecording(false);
        }
      }
    }
  };

  const handleClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setText(prev => (prev + '\n\n' + clipboardText).trim());
        const newItem: HistoryItem = { id: Date.now().toString(), text: clipboardText.trim(), date: Date.now(), type: 'clipboard', favorite: false };
        setClipboardHistory(prev => [newItem, ...prev].slice(0, 50));
        setStatus('Conteúdo colado');
      }
    } catch (err) {
      setStatus('Permissão ao clipboard negada');
    }
  };

  const processImage = async (file: File) => {
    setIsProcessingImage(true);
    setStatus('Iniciando análise OCR...');
    try {
      const worker = await Tesseract.createWorker('por', undefined, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setStatus(`Mapeando imagem... ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      await worker.setParameters({
        tessedit_pageseg_mode: '3',
        preserve_interword_spaces: '1',
        textord_heavy_nr: '1',
        tessedit_enable_doc_dict: '1',
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      setText(prev => (prev + '\n\n' + data.text).trim());
      setStatus('Texto extraído com sucesso');
      const newItem: HistoryItem = { id: Date.now().toString(), text: data.text.trim(), date: Date.now(), type: 'ocr', favorite: false };
      setClipboardHistory(prev => [newItem, ...prev].slice(0, 50));
    } catch (err) {
      console.error(err);
      setStatus('Falha na análise da imagem');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const processTextFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setText(prev => (prev + '\n\n' + content).trim());
      setStatus('Arquivo de texto lido');
      const newItem: HistoryItem = { id: Date.now().toString(), text: content.trim(), date: Date.now(), type: 'arquivo', favorite: false };
      setClipboardHistory(prev => [newItem, ...prev].slice(0, 50));
    };
    reader.readAsText(file);
  };

  const handleSaveConfigs = () => {
    localStorage.setItem('leitor_ai_provider', aiProvider);
    localStorage.setItem('leitor_ai_key', aiApiKey);
    localStorage.setItem('leitor_ai_model', aiModel);
    localStorage.setItem('leitor_ai_url', aiLocalUrl);
    localStorage.setItem('leitor_audio_input', selectedAudioInput);
    localStorage.setItem('leitor_audio_output', selectedAudioOutput);
    localStorage.setItem('leitor_special_chars', readSpecialChars ? 'true' : 'false');
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processImage(e.target.files[0]);
  };
  const handleTextUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processTextFile(e.target.files[0]);
  };

  const handleExplain = async (customText?: string) => {
    vibrate(50);
    const targetText = typeof customText === 'string' ? customText : text;
    if (!targetText.trim()) {
      setStatus('Texto vazio.');
      return;
    }

    if (aiProvider !== 'local' && !aiApiKey) {
      setShowAiWarning(true);
      setActiveTab('settings');
      setTimeout(() => setShowAiWarning(false), 4000);
      return;
    }
    
    setTextBeingExplained(targetText);

    if (aiProvider !== 'local' && !navigator.onLine) {
      alert("Sem conexão com a internet. O modelo selecionado precisa de internet ou utilize o provedor Local.");
      return;
    }

    setShowExplainModal(true);
    setIsExplaining(true);
    setExplanationProgress(0);
    
    const loadingPhrases = [
      'Conectando com o cérebro digital...',
      'Lendo o seu texto atentamente...',
      'Analisando o significado...',
      'Contextualizando as informações...',
      'Estruturando a melhor resposta possível...',
      'Sintetizando detalhes importantes...',
      'Revisando para uma explicação mais clara...',
      'Preparando as palavras finais...',
      'Quase lá, só mais um instante...'
    ];
    let phraseIndex = 0;
    setExplanation(loadingPhrases[0]);
    
    // Animate progress bar during AI generation (estimated to take around 15 seconds)
    const progressInterval = setInterval(() => {
      setExplanationProgress(prev => {
        if (prev >= 95) return prev; // Hold at 95% until complete
        return prev + (Math.random() * 5 + 2); // Random jump to feel more organic
      });
    }, 1000);

    const loadingInterval = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % loadingPhrases.length;
      setExplanation(loadingPhrases[phraseIndex]);
    }, 5500);

    try {
      let responseText = '';
      const prompt = `Você é um assistente útil e direto. Explique, resuma ou analise o seguinte texto de forma muito clara e concisa:\n\n${targetText.substring(0, 4000)}`;

      if (aiProvider === 'google') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${aiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message || "Erro na API do Google");
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maneira de dar resposta falhou.";
      } else if (aiProvider === 'openrouter' || aiProvider === 'local') {
        const res = await fetch(aiProvider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : aiLocalUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(aiProvider === 'openrouter' ? { 'Authorization': `Bearer ${aiApiKey}` } : {})
          },
          body: JSON.stringify({
            model: aiModel,
            messages: [
              { role: 'system', content: 'Explique o texto do usuário de forma clara e resumida.' },
              { role: 'user', content: prompt }
            ]
          })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message || "Erro na API do modelo");
        responseText = data.choices?.[0]?.message?.content || "Sem resposta";
      }
      clearInterval(loadingInterval);
      clearInterval(progressInterval);
      setExplanationProgress(100);
      setExplanation(responseText);
    } catch (err: any) {
      clearInterval(loadingInterval);
      clearInterval(progressInterval);
      setExplanationProgress(0);
      setExplanation(`Erro ao processar: ${err.message}\nVerifique configurações de provedor, chaves de API e conexão.`);
    } finally {
      setIsExplaining(false);
      clearInterval(loadingInterval);
      clearInterval(progressInterval);
    }
  };

  // --- Filter and Sort History ---
  const toggleFavorite = (id: string, isClipboard = false) => {
    if (isClipboard) {
      setClipboardHistory(prev => prev.map(item => item.id === id ? { ...item, favorite: !item.favorite } : item));
    } else {
      setHistory(prev => prev.map(item => item.id === id ? { ...item, favorite: !item.favorite } : item));
    }
  };

  const getFilteredAndSortedHistory = (list: HistoryItem[]) => {
    let result = [...list];
    if (historyFilter === 'favorites') result = result.filter(item => item.favorite);
    
    result.sort((a, b) => {
      if (historySort === 'newest') return b.date - a.date;
      if (historySort === 'oldest') return a.date - b.date;
      if (historySort === 'longest') return b.text.length - a.text.length;
      return 0;
    });
    return result;
  };

  // --- Utilities ---
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const wpm = 180 * rate; 
  const estimatedSeconds = Math.ceil((wordCount / wpm) * 60);
  const formattedTime = estimatedSeconds > 60 
    ? `${Math.floor(estimatedSeconds / 60)}m ${estimatedSeconds % 60}s` 
    : `${estimatedSeconds}s`;

  const activeVoiceName = voices.find(v => v.voiceURI === selectedVoiceURI)?.name || 'Voz Padrão';

  return (
    <div style={getThemeStyles(themeBg, themeAccent)} className="flex flex-col md:flex-row bg-[var(--bg-app)] text-[var(--text-main)] font-sans h-screen w-full overflow-hidden transition-colors duration-300">
      
      {showSetup && <SetupWizard onComplete={() => setShowSetup(false)} />}
      
      {showExplainModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="h-16 px-6 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-header)] rounded-t-2xl">
              <h2 className="font-bold flex items-center gap-2 tracking-tight text-[var(--text-main)]"><Sparkles className="text-[var(--accent-hover)]" size={20}/> Explicação I.A.</h2>
              <button 
                onClick={() => setShowExplainModal(false)}
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
              <div className="p-4 border-t border-[var(--border-color)] flex justify-between shrink-0 bg-[var(--bg-header)] rounded-b-2xl">
                <button
                  onClick={() => {
                    const newItem: SavedTextItem = {
                      id: Date.now().toString(),
                      originalText: textBeingExplained,
                      explanation: explanation,
                      date: Date.now(),
                      title: "Explicação gerada: " + format(Date.now(), 'dd/MM HH:mm')
                    };
                    setSavedTexts(prev => [newItem, ...prev]);
                    setShowExplainModal(false);
                    setStatus('Explicação salva com sucesso!');
                  }}
                  className="px-6 py-2 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
                >
                  <Save size={16} /> Salvar Explicação
                </button>
                <button
                  onClick={() => setShowExplainModal(false)}
                  className="px-6 py-2 bg-[var(--bg-app)] hover:bg-[var(--border-color)] text-[var(--text-main)] rounded-lg text-sm font-medium transition-colors"
                >
                  Fechar
                </button>
              </div>
            )}
            {!isExplaining && explanation.startsWith('Erro ao processar') && (
              <div className="p-4 border-t border-[var(--border-color)] flex justify-end shrink-0 bg-[var(--bg-header)] rounded-b-2xl">
                <button
                  onClick={() => setShowExplainModal(false)}
                  className="px-6 py-2 bg-[var(--bg-app)] hover:bg-[var(--border-color)] text-[var(--text-main)] rounded-lg text-sm font-medium transition-colors"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Left/Bottom Sidebar: Main Navigation */}
      <nav className="order-last md:order-first w-full md:w-20 h-16 md:h-auto bg-[var(--bg-sidebar)] border-t md:border-t-0 md:border-r border-[var(--border-color)] flex flex-row md:flex-col justify-around md:justify-start items-center md:py-8 shrink-0 z-20 transition-colors duration-300">
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

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 md:h-20 flex items-center justify-between px-4 lg:px-8 bg-[var(--bg-header)] border-b border-[var(--border-color)] shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <h1 className="text-lg md:text-xl font-semibold tracking-tight text-[var(--text-main)]">Leitor Inteligente</h1>
            <div className={cn("hidden lg:flex items-center gap-2 px-3 py-1 rounded-full border", isRecording || isSpeaking ? "bg-[var(--accent-transparent)] border-[var(--accent-border)]" : "bg-emerald-500/10 border-emerald-500/20")}>
              <div className={cn("w-2 h-2 rounded-full", isRecording || isSpeaking ? "bg-[var(--accent-hover)] animate-pulse" : "bg-emerald-500")}></div>
              <span className={cn("text-[10px] uppercase font-bold tracking-widest", isRecording || isSpeaking ? "text-[var(--accent-hover)]" : "text-emerald-500")}>
                {isRecording ? "Ouvindo" : isSpeaking ? "Lendo" : "Pronto"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 md:gap-6 text-sm">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-tighter">Voz Ativa</span>
              <span className="font-medium text-[var(--text-main)] tracking-tight max-w-[150px] lg:max-w-[250px] truncate">{activeVoiceName}</span>
            </div>
            <div className="hidden md:block h-8 w-px bg-[var(--border-color)]"></div>
            <div className="flex flex-col items-end">
               <span className="text-[var(--text-muted)] text-[9px] md:text-[10px] uppercase font-bold tracking-tighter">Métricas: {wordCount} pal.</span>
              <span className="font-mono text-[var(--text-main)] text-xs md:text-sm">~{formattedTime}</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex overflow-hidden relative">
          
          {/* Editor Section */}
          <div className={cn("flex-1 flex flex-col p-4 md:p-6 lg:p-8 overflow-hidden transition-opacity", activeTab !== 'editor' && "hidden")}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 shrink-0 gap-3">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                 transcrição & edição
                <span className="hidden sm:inline-block text-[10px] font-normal text-[var(--text-darker)] normal-case bg-[var(--bg-panel)] px-2 py-0.5 rounded border border-[var(--border-color)]">{status}</span>
              </span>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button onClick={handleClipboard} className="flex-1 sm:flex-none items-center justify-center gap-2 px-3 py-1.5 bg-[var(--bg-panel)] hover:bg-[var(--accent-transparent)] rounded border border-[var(--border-color)] text-xs text-[var(--text-main)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-transparent)]">
                  <Clipboard size={14} className="inline-block" /> Colar
                </button>
                <label className="flex-1 sm:flex-none items-center justify-center gap-2 px-3 py-1.5 bg-[var(--bg-panel)] hover:bg-[var(--accent-transparent)] rounded border border-[var(--border-color)] text-xs text-[var(--text-main)] cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[var(--accent-transparent)]">
                  <FileText size={14} className="inline-block" /> Txt
                  <input type="file" accept=".txt,text/plain" className="hidden" onChange={handleTextUpload} />
                </label>
                <label className="flex-1 sm:flex-none items-center justify-center gap-2 px-3 py-1.5 bg-[var(--bg-panel)] hover:bg-[var(--accent-transparent)] rounded border border-[var(--border-color)] text-xs text-[var(--text-main)] cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[var(--accent-transparent)]">
                  <ImageIcon size={14} className="inline-block" /> Img
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                <button onClick={() => setText('')} className="flex-none items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded border border-red-500/20 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 relative flex flex-col min-h-0 group">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="A fala transcrita aparecerá aqui...&#10;Cole, digite ou solte arquivos de texto / imagens para converter em som."
                className={cn(
                  "flex-1 w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-4 md:p-6 text-base md:text-lg leading-relaxed focus:outline-none focus:border-[var(--accent-hover)] resize-none placeholder-[var(--text-darker)] text-[var(--text-main)] transition-colors duration-300",
                  isDragging && "border-[var(--accent-hover)] bg-[var(--accent-transparent)]"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
              
              {isDragging && (
                <div className="absolute inset-0 border-2 border-dashed border-[var(--accent-hover)] bg-[var(--bg-sidebar)]/80 rounded-xl flex flex-col items-center justify-center z-10 backdrop-blur-sm pointer-events-none">
                  <Upload size={48} className="text-[var(--accent-hover)] mb-4 animate-bounce" />
                  <p className="text-lg font-bold text-[var(--accent-hover)] tracking-wide">Solte o arquivo aqui</p>
                </div>
              )}

              {isRecording && (
                <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-full shadow-lg backdrop-blur-md">
                  <Mic size={14} className="animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider">Escutando áudio...</span>
                </div>
              )}

               {text.trim() && (
                  <button onClick={() => handleExplain()} className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-[var(--bg-header)] hover:bg-[var(--accent-transparent)] text-[var(--text-main)] hover:text-[var(--accent-hover)] border border-[var(--border-color)] hover:border-[var(--accent-border)] rounded-full text-xs font-bold shadow-lg transition-all focus:outline-none active:scale-95 group-focus-within:opacity-100 opacity-60">
                    <Sparkles size={14}/> Explicar com I.A.
                  </button>
               )}
            </div>

            {/* AI Warning Toast */}
            {showAiWarning && (
              <div className="mb-3 flex items-center justify-center animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3 px-5 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl shadow-lg backdrop-blur-sm">
                  <Sparkles size={18} className="text-amber-500 shrink-0" />
                  <p className="text-sm font-bold text-amber-500">Nenhuma I.A. configurada — vá em Ajustes e cadastre sua chave de API.</p>
                </div>
              </div>
            )}

            {/* Quick Controls Layout */}
            <div className="mt-4 md:mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6 bg-[var(--bg-header)] p-4 rounded-xl border border-[var(--border-color)] shrink-0 transition-colors duration-300">
              <div className="flex items-center gap-4 flex-1 w-full sm:max-w-xs xl:max-w-sm">
                <div className="flex flex-col gap-2 w-full">
                  <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex justify-between">
                    <span>Velocidade de Leitura</span>
                    <span className="text-[var(--accent-hover)]">{rate}x</span>
                  </label>
                  <input type="range" min="0.5" max="2.5" step="0.1" value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} className="w-full h-1.5 bg-[var(--border-hover)] rounded appearance-none cursor-pointer outline-none transition-colors" />
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-center">
                <button onClick={handleStop} disabled={!isSpeaking && !isPaused} className="w-12 h-12 flex items-center justify-center rounded-xl bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--border-hover)] disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-hover)]">
                  <Square size={18} fill="currentColor" />
                </button>
                {!isSpeaking ? (
                   <button onClick={handleRead} disabled={!text.trim() || isProcessingImage} className="flex-1 sm:flex-none px-6 md:px-8 h-12 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold disabled:opacity-50 flex justify-center items-center gap-2 transition-all shadow-[0_4px_14px_var(--accent-transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-transparent)]">
                    <Play size={18} fill="currentColor" /> <span className="hidden sm:inline">Ler Agora</span>
                  </button>
                ) : (
                  <button onClick={handlePause} className="flex-1 sm:flex-none px-6 md:px-8 h-12 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                    <Pause size={18} fill="currentColor" /> <span className="hidden sm:inline">Pausar</span>
                  </button>
                )}
              </div>

              <div className="flex-none sm:flex-1 flex justify-end absolute right-4 top-4 sm:relative sm:right-auto sm:top-auto">
                 <button onClick={toggleRecording} className={cn("flex flex-col items-center gap-1.5 group select-none focus:outline-none cursor-pointer", isRecording ? "text-red-500" : "text-[var(--text-muted)] hover:text-[var(--text-main)]")}>
                   <div className={cn("w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full border transition-all shadow-sm", isRecording ? "bg-red-500/10 border-red-500/40" : "bg-[var(--bg-panel)] border-[var(--border-color)] group-hover:border-[var(--border-hover)] group-active:scale-95")}>
                     {isRecording ? <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" /> : <Mic size={18} className="md:w-5 md:h-5"/>}
                   </div>
                   <span className="hidden md:inline text-[9px] font-bold uppercase tracking-widest mt-1">{isRecording ? "Gravando" : "Ditar"}</span>
                 </button>
              </div>
            </div>
          </div>

          {/* Saved Texts Tab */}
          <div className={cn("flex-1 w-full p-4 lg:p-8 overflow-y-auto scrollbar-thin overflow-x-hidden", activeTab !== 'saved' && "hidden")}>
             <div className="max-w-4xl mx-auto">
               <div className="flex items-center justify-between mb-6">
                 <div>
                   <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2"><Sparkles className="text-[var(--accent-hover)]"/> Textos & Explicações Salvas</h2>
                   <p className="text-sm text-[var(--text-muted)] mt-1 tracking-wide">Revise as análises geradas pela I.A. offline.</p>
                 </div>
                 <button onClick={() => setSavedTexts([])} className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-red-500 focus:outline-none">Apagar Tudo</button>
               </div>
               
               <div className="space-y-6">
                 {savedTexts.length === 0 ? (
                   <div className="h-60 flex flex-col items-center justify-center text-[var(--text-darker)] bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl">
                      <Save size={40} className="mb-4 opacity-20" />
                      <p className="text-sm text-center max-w-sm">Você ainda não salvou nenhuma explicação. Gere explicacões no Editor e clique em Salvar.</p>
                   </div>
                 ) : (
                   savedTexts.map(item => (
                     <div key={item.id} className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl shadow-sm overflow-hidden group">
                       <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-header)] flex justify-between items-center">
                         <h3 className="font-bold text-sm text-[var(--text-main)]">{item.title}</h3>
                         <button 
                           onClick={() => setSavedTexts(prev => prev.filter(x => x.id !== item.id))}
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
                           <h4 className="text-xs font-bold text-[var(--accent-hover)] uppercase tracking-widest flex items-center gap-2"><Sparkles size={14}/> Explicação I.A.</h4>
                           <div className="text-[var(--text-main)] whitespace-pre-wrap select-text leading-relaxed">
                             {item.explanation}
                           </div>
                         </div>
                       </div>
                       <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-panel)] flex justify-end">
                          <button 
                           onClick={() => { setText(item.explanation); setActiveTab('editor'); }}
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

          {/* History Tab */}
          <div className={cn("flex-1 w-full p-4 lg:p-8 overflow-y-auto scrollbar-thin overflow-x-hidden", activeTab !== 'history' && "hidden")}>
            <div className="max-w-6xl mx-auto flex flex-col gap-4 mb-4">
               <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-sidebar)] p-4 rounded-xl border border-[var(--border-color)]">
                 <div className="flex items-center gap-2">
                   <button onClick={() => setHistoryFilter('all')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-colors", historyFilter === 'all' ? "bg-[var(--accent-transparent)] text-[var(--accent-hover)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-panel)]")}>Todos</button>
                   <button onClick={() => setHistoryFilter('favorites')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1", historyFilter === 'favorites' ? "bg-amber-500/10 text-amber-500" : "text-[var(--text-muted)] hover:bg-[var(--bg-panel)]")}><Star size={12}/> Favoritos</button>
                 </div>
                 <div className="flex items-center gap-2 text-xs">
                   <span className="text-[var(--text-muted)] flex items-center gap-1"><ArrowDownWideNarrow size={14}/> Ordenar:</span>
                   <select value={historySort} onChange={(e) => setHistorySort(e.target.value as any)} className="bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-main)] rounded p-1 outline-none focus:border-[var(--accent-hover)]">
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
                  <button onClick={() => setHistory([])} className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-red-500 focus:outline-none">Limpar</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {getFilteredAndSortedHistory(history).length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-[var(--text-darker)] text-sm">Nenhuma leitura encontrada.</div>
                  ) : (
                    getFilteredAndSortedHistory(history).map(item => (
                      <HistoryCard 
                        key={item.id} item={item} 
                        onClick={() => { setText(item.text); setActiveTab('editor'); }} 
                        onDelete={() => setHistory(h => h.filter(x => x.id !== item.id))}
                        onFavorite={() => toggleFavorite(item.id, false)}
                        onExplain={() => handleExplain(item.text)}
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
                  <button onClick={() => setClipboardHistory([])} className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-red-500 focus:outline-none">Limpar</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {getFilteredAndSortedHistory(clipboardHistory).length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-[var(--text-darker)] text-sm">Nenhuma captura encontrada.</div>
                  ) : (
                    getFilteredAndSortedHistory(clipboardHistory).map(item => (
                      <HistoryCard 
                        key={item.id} item={item} 
                        onClick={() => { setText((prev) => (prev + '\n\n' + item.text).trim()); setActiveTab('editor'); }} 
                        onDelete={() => setClipboardHistory(h => h.filter(x => x.id !== item.id))}
                        onFavorite={() => toggleFavorite(item.id, true)}
                        onExplain={() => handleExplain(item.text)}
                      />
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Settings Tab */}
          <div className={cn("flex-1 w-full p-4 sm:p-6 lg:p-10 overflow-y-auto", activeTab !== 'settings' && "hidden")}>
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
                      <input type="checkbox" className="sr-only" checked={startWithWindows} onChange={(e) => setStartWithWindows(e.target.checked)} />
                      <div className={cn("w-10 h-6 rounded-full transition-colors", startWithWindows ? "bg-[var(--accent-hover)]" : "bg-[var(--bg-panel)] border border-[var(--border-color)]")}></div>
                      <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-transform", startWithWindows ? "left-5" : "left-1")}></div>
                    </div>
                    <span className="text-sm text-[var(--text-main)] group-hover:text-[var(--accent-hover)] transition-colors">Iniciar o leitor junto com o Windows<br/><span className="text-xs text-[var(--text-muted)] font-normal">(Requer instalação do PWA)</span></span>
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
                          key={bg} onClick={() => setThemeBg(bg as ThemeBg)}
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
                          key={accent} onClick={() => setThemeAccent(accent as ThemeAccent)}
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
                  <label className="block text-sm font-medium text-[var(--text-light)]">Motor de Voz Instalado (Offline)</label>
                  <div className="relative">
                    <select
                      value={selectedVoiceURI}
                      onChange={(e) => setSelectedVoiceURI(e.target.value)}
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
                      <label className="block text-xs font-medium text-[var(--text-light)] mb-1.5">Microfone Recomendado (Entrada)</label>
                      <select value={selectedAudioInput} onChange={(e) => setSelectedAudioInput(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] py-2.5 px-3 rounded-lg focus:outline-none focus:border-[var(--accent-hover)] text-sm">
                        <option value="default">Padrão do Sistema</option>
                        {audioInputs.map(device => (
                          <option key={device.deviceId} value={device.deviceId}>{device.label || `Microfone ${device.deviceId.slice(0, 5)}...`}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-light)] mb-1.5">Saída de Áudio</label>
                      <select value={selectedAudioOutput} onChange={(e) => setSelectedAudioOutput(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] py-2.5 px-3 rounded-lg focus:outline-none focus:border-[var(--accent-hover)] text-sm">
                        <option value="default">Padrão do Sistema</option>
                        {audioOutputs.map(device => (
                          <option key={device.deviceId} value={device.deviceId}>{device.label || `Saída ${device.deviceId.slice(0, 5)}...`}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <label className="flex items-center gap-3 cursor-pointer group mt-4">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={readSpecialChars} onChange={(e) => setReadSpecialChars(e.target.checked)} />
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
                      <label className="block text-xs font-medium text-[var(--text-light)] mb-1.5">Provedor</label>
                      <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value as any)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] py-2.5 px-3 rounded-lg focus:outline-none focus:border-[var(--accent-hover)] text-sm">
                        <option value="google">Google Gemini API</option>
                        <option value="openrouter">OpenRouter API</option>
                        <option value="local">Modelo Local (Ollama/LM Studio)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-light)] mb-1.5">Modelo</label>
                      <input type="text" value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder="ex: gemini-2.5-flash" className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] py-2.5 px-3 rounded-lg focus:outline-none focus:border-[var(--accent-hover)] text-sm" />
                    </div>
                  </div>

                  {aiProvider === 'local' ? (
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-light)] mb-1.5">URL da API Local</label>
                      <input type="text" value={aiLocalUrl} onChange={(e) => setAiLocalUrl(e.target.value)} placeholder="http://localhost:11434/v1/chat/completions" className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] py-2.5 px-3 rounded-lg focus:outline-none focus:border-[var(--accent-hover)] text-sm font-mono" />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-light)] mb-1.5">Chave da API (Salva no navegador)</label>
                      <input type="password" value={aiApiKey} onChange={(e) => setAiApiKey(e.target.value)} placeholder="sk-..." className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-main)] py-2.5 px-3 rounded-lg focus:outline-none focus:border-[var(--accent-hover)] text-sm font-mono" />
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
                  <button onClick={handleSaveConfigs} className="w-full sm:w-auto px-8 py-3.5 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold transition-all shadow-[0_4px_14px_var(--accent-transparent)] flex items-center justify-center gap-2 active:scale-95">
                    <Save size={18} /> Salvar Preferências
                  </button>
                </div>

              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

// --- End App ---

