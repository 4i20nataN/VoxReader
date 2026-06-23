import { useState, useEffect, useRef } from 'react';
import { HistoryItem } from '../types';

const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;

interface UseSpeechParams {
  text: string;
  onTextChange: (text: string) => void;
  onStatusChange: (status: string) => void;
  onAddHistoryItem: (item: HistoryItem) => void;
}

export function useSpeech({ text, onTextChange, onStatusChange, onAddHistoryItem }: UseSpeechParams) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [rate, setRate] = useState(1);
  const [startWithWindows, setStartWithWindows] = useState(false);
  const [readSpecialChars, setReadSpecialChars] = useState(false);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('default');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('default');

  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const recognitionRef = useRef<any>(null);

  const vibrate = (ms = 50) => {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch { /* noop */ } }
  };

  useEffect(() => {
    const savedRate = localStorage.getItem('reader_rate');
    if (savedRate) setRate(parseFloat(savedRate));
    const savedWinStart = localStorage.getItem('reader_win_start');
    if (savedWinStart === 'true') setStartWithWindows(true);
    const savedSpecialChars = localStorage.getItem('leitor_special_chars');
    if (savedSpecialChars === 'true') setReadSpecialChars(true);
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

    const fetchDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputs(devices.filter(d => d.kind === 'audioinput'));
        setAudioOutputs(devices.filter(d => d.kind === 'audiooutput'));
      } catch { /* noop */ }
    };
    fetchDevices();

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          else interimTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) {
          onTextChange((text + ' ' + finalTranscript).trim() + ' ');
        }
        onStatusChange(interimTranscript ? `Ouvindo: ${interimTranscript}` : 'Capturando áudio...');
      };
      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          onStatusChange(event.error === 'not-allowed' ? 'Permissão do Microfone Negada.' : `Mic status: ${event.error}`);
          setIsRecording(false);
        }
      };
      recognition.onend = () => { setIsRecording(false); };
      recognitionRef.current = recognition;
    }

    return () => {
      synthRef.current.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // Persistence effects
  useEffect(() => { localStorage.setItem('reader_rate', rate.toString()); }, [rate]);
  useEffect(() => { localStorage.setItem('reader_voice', selectedVoiceURI); }, [selectedVoiceURI]);
  useEffect(() => { localStorage.setItem('reader_win_start', startWithWindows ? 'true' : 'false'); }, [startWithWindows]);

  const handleRead = (customText?: string) => {
    vibrate(50);
    const readText = customText ?? text;
    if (!readText.trim()) {
      onStatusChange('Editor vazio.');
      return;
    }

    if (isPaused) {
      synthRef.current.resume();
      setIsSpeaking(true);
      setIsPaused(false);
      onStatusChange('Leitura em andamento...');
      return;
    }

    let textToRead = readText.trim();
    if (readSpecialChars) {
      textToRead = textToRead
        .replace(/&/g, ' e comercial ').replace(/@/g, ' arroba ').replace(/#/g, ' hashtag ')
        .replace(/%/g, ' porcento ').replace(/\*/g, ' asterisco ').replace(/\$/g, ' cifrão ')
        .replace(/\+/g, ' mais ').replace(/=/g, ' igual ').replace(/</g, ' menor que ').replace(/>/g, ' maior que ');
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
      onStatusChange('Leitura em andamento...');
      onAddHistoryItem({ id: Date.now().toString(), text: readText.trim(), date: Date.now(), type: 'read', favorite: false });
    };
    utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); onStatusChange('Leitura concluída'); };
    utterance.onerror = () => { setIsSpeaking(false); setIsPaused(false); onStatusChange('Leitura interrompida'); };
    synthRef.current.speak(utterance);
  };

  const handlePause = () => {
    vibrate(40);
    if (isSpeaking) {
      synthRef.current.pause();
      setIsSpeaking(false);
      setIsPaused(true);
      onStatusChange('Leitura pausada');
    }
  };

  const handleStop = () => {
    vibrate(60);
    synthRef.current.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    onStatusChange('Leitura parada');
  };

  const toggleRecording = async () => {
    vibrate(50);
    if (!recognitionRef.current) {
      onStatusChange('Reconhecimento não suportado no navegador atual.');
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      onStatusChange('Gravação encerrada');
    } else {
      try { await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch { onStatusChange('Microfone bloqueado. Permita o acesso na barra de endereço.'); return; }
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        onStatusChange('Preparando interface de áudio...');
      } catch (e) {
        if ((e as Error).name === 'InvalidStateError') {
          recognitionRef.current.stop();
          setTimeout(() => {
            try { recognitionRef.current.start(); setIsRecording(true); } catch { setIsRecording(false); }
          }, 300);
        } else { setIsRecording(false); }
      }
    }
  };

  // Global Play/Pause wrapper for Electron
  useEffect(() => {
    (window as any).togglePlayPause = () => {
      if (isSpeaking) {
        if (isPaused) { synthRef.current.resume(); setIsPaused(false); }
        else { synthRef.current.pause(); setIsPaused(true); }
      } else {
        document.getElementById('play-button')?.click();
      }
    };
  }, [isSpeaking, isPaused]);

  const activeVoiceName = voices.find(v => v.voiceURI === selectedVoiceURI)?.name || 'Voz Padrão';

  return {
    isSpeaking, isPaused, isRecording, voices, selectedVoiceURI, rate,
    startWithWindows, setStartWithWindows, readSpecialChars, setReadSpecialChars,
    audioInputs, audioOutputs, selectedAudioInput, setSelectedAudioInput,
    selectedAudioOutput, setSelectedAudioOutput,
    setSelectedVoiceURI, setRate, activeVoiceName,
    handleRead, handlePause, handleStop, toggleRecording
  };
}
