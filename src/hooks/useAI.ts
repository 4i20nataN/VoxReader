import { useState, useEffect } from 'react';
import { loadData, saveData } from '../lib/persistence';

export function useAI() {
  const [aiProvider, setAiProvider] = useState<'google' | 'openrouter' | 'local'>('google');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('gemini-2.5-flash');
  const [aiLocalUrl, setAiLocalUrl] = useState('http://localhost:11434/v1/chat/completions');
  const [showAiWarning, setShowAiWarning] = useState(false);
  const [aiAction, setAiAction] = useState<'explain' | 'translate' | 'correct' | 'english' | 'translate-to'>('explain');
  const [textBeingExplained, setTextBeingExplained] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [explanationProgress, setExplanationProgress] = useState(0);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [targetLang, setTargetLang] = useState('Inglês');

  useEffect(() => {
    if (loadData('leitor_ai_provider')) setAiProvider(loadData('leitor_ai_provider') as any);
    if (loadData('leitor_ai_key')) setAiApiKey(loadData('leitor_ai_key') as string);
    if (loadData('leitor_ai_model')) setAiModel(loadData('leitor_ai_model') as string);
    if (loadData('leitor_ai_url')) setAiLocalUrl(loadData('leitor_ai_url') as string);
  }, []);

  useEffect(() => {
    saveData('leitor_ai_provider', aiProvider);
    saveData('leitor_ai_key', aiApiKey);
    saveData('leitor_ai_model', aiModel);
    saveData('leitor_ai_url', aiLocalUrl);
  }, [aiProvider, aiApiKey, aiModel, aiLocalUrl]);

  const handleSaveConfigs = (extra?: { selectedAudioInput?: string; selectedAudioOutput?: string; readSpecialChars?: boolean }) => {
    saveData('leitor_ai_provider', aiProvider);
    saveData('leitor_ai_key', aiApiKey);
    saveData('leitor_ai_model', aiModel);
    saveData('leitor_ai_url', aiLocalUrl);
    if (extra?.selectedAudioInput) saveData('leitor_audio_input', extra.selectedAudioInput);
    if (extra?.selectedAudioOutput) saveData('leitor_audio_output', extra.selectedAudioOutput);
    if (extra?.readSpecialChars !== undefined) saveData('leitor_special_chars', extra.readSpecialChars ? 'true' : 'false');
  };

  const handleAI = async (
    action: 'explain' | 'translate' | 'correct' | 'english' | 'translate-to',
    targetText: string,
    lang?: string,
    callbacks?: {
      onStatusChange?: (s: string) => void;
      onActiveTabChange?: (t: string) => void;
    }
  ) => {
    if (navigator.vibrate) { try { navigator.vibrate(50); } catch {} }
    if (!targetText.trim()) {
      callbacks?.onStatusChange?.('Texto vazio.');
      return;
    }

    if (aiProvider !== 'local' && !aiApiKey) {
      setShowAiWarning(true);
      callbacks?.onActiveTabChange?.('settings');
      setTimeout(() => setShowAiWarning(false), 4000);
      return;
    }

    setAiAction(action);
    setTextBeingExplained(targetText);

    if (aiProvider !== 'local' && !navigator.onLine) {
      alert("Sem conexão com a internet. O modelo selecionado precisa de internet ou utilize o provedor Local.");
      return;
    }

    setIsExplaining(true);
    setExplanationProgress(0);

    const loadingPhrases = [
      'Conectando com o cérebro digital...', 'Lendo o seu texto atentamente...',
      'Analisando o significado...', 'Contextualizando as informações...',
      'Estruturando a melhor resposta possível...', 'Sintetizando detalhes importantes...',
      'Revisando para uma explicação mais clara...', 'Preparando as palavras finais...',
      'Quase lá, só mais um instante...'
    ];
    let phraseIndex = 0;
    setExplanation(loadingPhrases[0]);

    const progressInterval = setInterval(() => {
      setExplanationProgress(prev => prev >= 95 ? prev : prev + (Math.random() * 5 + 2));
    }, 1000);

    const loadingInterval = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % loadingPhrases.length;
      setExplanation(loadingPhrases[phraseIndex]);
    }, 5500);

    let systemContent = '';
    let userPrompt = '';
    const textSlice = targetText.substring(0, 4000);
    switch (action) {
      case 'explain':
        systemContent = 'Explique o texto do usuário de forma clara e resumida.';
        userPrompt = `Explique, resuma ou analise o seguinte texto de forma muito clara e concisa:\n\n${textSlice}`;
        break;
      case 'translate':
        systemContent = 'Você é um tradutor profissional. Traduza o texto do usuário para o português brasileiro de forma natural e precisa.';
        userPrompt = `Traduza o seguinte texto para o português brasileiro de forma clara e natural, mantendo o significado original:\n\n${textSlice}`;
        break;
      case 'correct':
        systemContent = 'Você é um revisor de texto profissional. Corrija erros de português mantendo o sentido original do texto.';
        userPrompt = `Corrija a gramática, ortografia e pontuação do seguinte texto, mantendo o sentido original. Apenas devolva o texto corrigido, sem explicações adicionais:\n\n${textSlice}`;
        break;
      case 'english':
        systemContent = 'You are a professional English translator. Translate the user text to natural, fluent English.';
        userPrompt = `Translate the following text to English in a clear and natural way, preserving the original meaning:\n\n${textSlice}`;
        break;
      case 'translate-to': {
        const tl = lang || targetLang;
        systemContent = `Você é um tradutor profissional. Traduza o texto do usuário para ${tl} de forma natural e precisa.`;
        userPrompt = `Traduza o seguinte texto para ${tl} de forma clara e natural, mantendo o significado original:\n\n${textSlice}`;
        break;
      }
    }

    try {
      let responseText = '';

      if (aiProvider === 'google') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${aiApiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: userPrompt }] }] })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message || "Erro na API do Google");
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maneira de dar resposta falhou.";
      } else if (aiProvider === 'openrouter' || aiProvider === 'local') {
        const res = await fetch(aiProvider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : aiLocalUrl, {
          method: 'POST', headers: {
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

  const modalTitle = {
    explain: 'Explicação I.A.', translate: 'Tradução I.A.', correct: 'Correção I.A.',
    english: 'Tradução I.A.', 'translate-to': 'Tradução I.A.'
  }[aiAction];

  const languages = [
    { label: 'Inglês', value: 'Inglês' }, { label: 'Espanhol', value: 'Espanhol' },
    { label: 'Francês', value: 'Francês' }, { label: 'Alemão', value: 'Alemão' },
    { label: 'Italiano', value: 'Italiano' }, { label: 'Japonês', value: 'Japonês' },
    { label: 'Chinês', value: 'Chinês' }, { label: 'Russo', value: 'Russo' },
    { label: 'Coreano', value: 'Coreano' }, { label: 'Árabe', value: 'Árabe' },
    { label: 'Hindi', value: 'Hindi' }, { label: 'Holandês', value: 'Holandês' },
    { label: 'Polonês', value: 'Polonês' }, { label: 'Sueco', value: 'Sueco' },
    { label: 'Turco', value: 'Turco' }, { label: 'Vietnamita', value: 'Vietnamita' },
    { label: 'Tailandês', value: 'Tailandês' }, { label: 'Grego', value: 'Grego' },
    { label: 'Hebraico', value: 'Hebraico' }, { label: 'Romeno', value: 'Romeno' },
    { label: 'Tcheco', value: 'Tcheco' }, { label: 'Húngaro', value: 'Húngaro' },
    { label: 'Ucraniano', value: 'Ucraniano' },
  ];

  return {
    aiProvider, setAiProvider, aiApiKey, setAiApiKey, aiModel, setAiModel,
    aiLocalUrl, setAiLocalUrl, showAiWarning, aiAction, textBeingExplained,
    isExplaining, setIsExplaining, explanation, explanationProgress,
    showLangDropdown, setShowLangDropdown, targetLang, setTargetLang,
    setShowAiWarning, modalTitle, languages,
    handleAI, handleSaveConfigs
  };
}
