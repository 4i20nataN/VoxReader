import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Square, Mic, MicOff, Settings, 
  History, Clipboard, FileText, Image as ImageIcon, 
  Trash2, Clock, Upload, Check, Volume2, Save,
  Star, Sparkles, X, Filter, ArrowDownWideNarrow,
  Languages, Globe, CheckCheck
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { format } from 'date-fns';
import { getThemeStyles, ThemeBg, ThemeAccent, backgroundPalettes, accentPalettes } from './themes';
import { cn } from './lib/utils';
import { HistoryItem, SavedTextItem } from './types';
import { SetupWizard } from './components/SetupWizard';
import { NavButton } from './components/NavButton';
import { HistoryCard } from './components/HistoryCard';
import { EditorTab } from './components/EditorTab';
import { SettingsTab } from './components/SettingsTab';

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
  const [aiAction, setAiAction] = useState<'explain' | 'translate' | 'correct' | 'english' | 'translate-to'>('explain');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [targetLang, setTargetLang] = useState('Inglês');

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
  const handleRead = (customText?: string) => {
    vibrate(50);
    const readText = customText ?? text;
    if (!readText.trim()) {
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

    let textToRead = readText.trim();
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
      const newItem: HistoryItem = { id: Date.now().toString(), text: readText.trim(), date: Date.now(), type: 'read', favorite: false };
      setHistory(prev => [newItem, ...prev].slice(0, 100));
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

  const handleAI = async (action: 'explain' | 'translate' | 'correct' | 'english' | 'translate-to', customText?: string, targetLang?: string) => {
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
    
    setAiAction(action);
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
    
    const progressInterval = setInterval(() => {
      setExplanationProgress(prev => {
        if (prev >= 95) return prev;
        return prev + (Math.random() * 5 + 2);
      });
    }, 1000);

    const loadingInterval = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % loadingPhrases.length;
      setExplanation(loadingPhrases[phraseIndex]);
    }, 5500);

    let systemContent = '';
    let userPrompt = '';
    switch (action) {
      case 'explain':
        systemContent = 'Explique o texto do usuário de forma clara e resumida.';
        userPrompt = `Explique, resuma ou analise o seguinte texto de forma muito clara e concisa:\n\n${targetText.substring(0, 4000)}`;
        break;
      case 'translate':
        systemContent = 'Você é um tradutor profissional. Traduza o texto do usuário para o português brasileiro de forma natural e precisa.';
        userPrompt = `Traduza o seguinte texto para o português brasileiro de forma clara e natural, mantendo o significado original:\n\n${targetText.substring(0, 4000)}`;
        break;
      case 'correct':
        systemContent = 'Você é um revisor de texto profissional. Corrija erros de português mantendo o sentido original do texto.';
        userPrompt = `Corrija a gramática, ortografia e pontuação do seguinte texto, mantendo o sentido original. Apenas devolva o texto corrigido, sem explicações adicionais:\n\n${targetText.substring(0, 4000)}`;
        break;
      case 'english':
        systemContent = 'You are a professional English translator. Translate the user text to natural, fluent English.';
        userPrompt = `Translate the following text to English in a clear and natural way, preserving the original meaning:\n\n${targetText.substring(0, 4000)}`;
        break;
      case 'translate-to':
        systemContent = `Você é um tradutor profissional. Traduza o texto do usuário para ${targetLang} de forma natural e precisa.`;
        userPrompt = `Traduza o seguinte texto para ${targetLang} de forma clara e natural, mantendo o significado original:\n\n${targetText.substring(0, 4000)}`;
        break;
    }

    try {
      let responseText = '';

      if (aiProvider === 'google') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${aiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }]
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
              { role: 'system', content: systemContent },
              { role: 'user', content: userPrompt }
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
  const modalTitle = { explain: 'Explicação I.A.', translate: 'Tradução I.A.', correct: 'Correção I.A.', english: 'Tradução I.A.', 'translate-to': 'Tradução I.A.' }[aiAction];
  const languages = [
    { label: 'Inglês', value: 'Inglês' },
    { label: 'Espanhol', value: 'Espanhol' },
    { label: 'Francês', value: 'Francês' },
    { label: 'Alemão', value: 'Alemão' },
    { label: 'Italiano', value: 'Italiano' },
    { label: 'Japonês', value: 'Japonês' },
    { label: 'Chinês', value: 'Chinês' },
    { label: 'Russo', value: 'Russo' },
    { label: 'Coreano', value: 'Coreano' },
    { label: 'Árabe', value: 'Árabe' },
    { label: 'Hindi', value: 'Hindi' },
    { label: 'Holandês', value: 'Holandês' },
    { label: 'Polonês', value: 'Polonês' },
    { label: 'Sueco', value: 'Sueco' },
    { label: 'Turco', value: 'Turco' },
    { label: 'Vietnamita', value: 'Vietnamita' },
    { label: 'Tailandês', value: 'Tailandês' },
    { label: 'Grego', value: 'Grego' },
    { label: 'Hebraico', value: 'Hebraico' },
    { label: 'Romeno', value: 'Romeno' },
    { label: 'Tcheco', value: 'Tcheco' },
    { label: 'Húngaro', value: 'Húngaro' },
    { label: 'Ucraniano', value: 'Ucraniano' },
  ];

  return (
    <div style={getThemeStyles(themeBg, themeAccent)} className="flex flex-col md:flex-row bg-[var(--bg-app)] text-[var(--text-main)] font-sans h-dvh w-full overflow-hidden transition-colors duration-300">
      
      {showSetup && <SetupWizard onComplete={() => setShowSetup(false)} />}
      
      {showExplainModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="h-16 px-6 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-header)] rounded-t-2xl">
              <h2 className="font-bold flex items-center gap-2 tracking-tight text-[var(--text-main)]"><Sparkles className="text-[var(--accent-hover)]" size={20}/> {modalTitle}</h2>
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
              <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-center gap-4 shrink-0 bg-[var(--bg-header)] rounded-b-2xl px-6">
                <button
                  onClick={() => {
                    const savedType = aiAction === 'translate-to' ? 'translate' : aiAction;
                    const label = { explain: 'Explicação gerada', translate: 'Traduzido', correct: 'Corrigido' }[savedType];
                    const newItem: SavedTextItem = {
                      id: Date.now().toString(),
                      originalText: textBeingExplained,
                      explanation: explanation,
                      date: Date.now(),
                      title: `${label}: ${format(Date.now(), 'dd/MM HH:mm')}`,
                      savedType
                    };
                    setSavedTexts(prev => [newItem, ...prev]);
                    setShowExplainModal(false);
                    setStatus(`${label} salvo com sucesso!`);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Salvar
                </button>
                <button
                  onClick={() => {
                    setText(explanation);
                    setShowExplainModal(false);
                    setActiveTab('editor');
                    setStatus('Texto enviado para o editor');
                  }}
                  className="px-4 py-2 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <FileText size={16} /> Editar
                </button>
                <button
                  onClick={() => setShowExplainModal(false)}
                  className="px-4 py-2 bg-[var(--bg-app)] hover:bg-[var(--border-color)] text-[var(--text-main)] rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
        <main className="flex-1 w-full relative overflow-hidden min-h-0">
          
          {/* Editor Section */}
          {activeTab === 'editor' && (
            <EditorTab
              text={text}
              status={status}
              isProcessingImage={isProcessingImage}
              isDragging={isDragging}
              isRecording={isRecording}
              isSpeaking={isSpeaking}
              isPaused={isPaused}
              showAiWarning={showAiWarning}
              showLangDropdown={showLangDropdown}
              targetLang={targetLang}
              rate={rate}
              onTextChange={setText}
              onClipboard={handleClipboard}
              onTextUpload={handleTextUpload}
              onImageUpload={handleImageUpload}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onAI={handleAI}
              onRead={handleRead}
              onPause={handlePause}
              onStop={handleStop}
              onToggleRecording={toggleRecording}
              onSetLangDropdown={setShowLangDropdown}
              onSetTargetLang={setTargetLang}
              onSetRate={setRate}
              languages={languages}
            />
          )}

          {/* Saved Texts Tab */}
          {activeTab === 'saved' && (
          <div className="absolute inset-0 overflow-y-auto p-4 lg:p-8 overflow-x-hidden">
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
                            <h4 className="text-xs font-bold text-[var(--accent-hover)] uppercase tracking-widest flex items-center gap-2"><Sparkles size={14}/> {item.savedType === 'explain' ? 'Explicação I.A.' : item.savedType === 'translate' ? 'Tradução I.A.' : 'Correção I.A.'}</h4>
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
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
          <div className="absolute inset-0 overflow-y-auto p-4 lg:p-8 overflow-x-hidden">
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
                        onExplain={() => handleAI('explain', item.text)}
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
                        onExplain={() => handleAI('explain', item.text)}
                      />
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <SettingsTab
              themeBg={themeBg}
              themeAccent={themeAccent}
              startWithWindows={startWithWindows}
              voices={voices}
              selectedVoiceURI={selectedVoiceURI}
              audioInputs={audioInputs}
              audioOutputs={audioOutputs}
              selectedAudioInput={selectedAudioInput}
              selectedAudioOutput={selectedAudioOutput}
              readSpecialChars={readSpecialChars}
              aiProvider={aiProvider}
              aiModel={aiModel}
              aiApiKey={aiApiKey}
              aiLocalUrl={aiLocalUrl}
              showSaveToast={showSaveToast}
              onSetThemeBg={setThemeBg}
              onSetThemeAccent={setThemeAccent}
              onSetStartWithWindows={setStartWithWindows}
              onSetSelectedVoiceURI={setSelectedVoiceURI}
              onSetSelectedAudioInput={setSelectedAudioInput}
              onSetSelectedAudioOutput={setSelectedAudioOutput}
              onSetReadSpecialChars={setReadSpecialChars}
              onSetAiProvider={setAiProvider}
              onSetAiModel={setAiModel}
              onSetAiApiKey={setAiApiKey}
              onSetAiLocalUrl={setAiLocalUrl}
              onSaveConfigs={handleSaveConfigs}
            />
          )}

        </main>
      </div>
    </div>
  );
}

// --- End App ---

