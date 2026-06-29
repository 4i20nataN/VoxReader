# Auditoria & Plano de Correção — Refresh de Vozes Após Install/Remove

**Data:** 2026-06-28  
**Branch:** feat/local-save  
**Commit base:** c0ef30a

---

## ✅ Verificação de Tipos (Já Correta)

| Origem | Chave Registry / Package | `type` | Badge UI | Correto? |
|--------|--------------------------|--------|----------|----------|
| `Voices\Tokens` (TTS) | `TTS` | `tts` | Roxo "Voz" | ✅ |
| `Recognizers\Tokens` (SR) | `SR` | `speech` | Azul "Reconhecimento" | ✅ |
| Online `Language.TextToSpeech~~~` | — | `tts` | Roxo "Voz" | ✅ |
| Online `Language.Speech~~~` | — | `speech` | Azul "Reconhecimento" | ✅ |

Merge no `useSpeech.ts` casa por `name` ou `locale+type` — **sem mistura**.

Filtro do dropdown (`SettingsTab.tsx:133`):  
`só tts && installed` → `displayVoices` filtrado  
`speech` selecionado → `ttsLocale = null` → dropdown mostra **todas** as vozes (correto).

---

## 🔧 Plano de Correção — Refresh Automático de Vozes

**Problema:** Após install/remove, as vozes no dropdown não atualizam porque `speechSynthesis.getVoices()` só é chamado uma vez no mount (no `useEffect`).

**Solução:** Extrair a lógica de `updateVoices()` do `useEffect` para uma função `syncVoices()` reutilizável.

### Pontos de toque exatos (2 arquivos)

#### `src/hooks/useSpeech.ts`

**A.** Criar `syncVoices` como função nomeada no escopo do hook (fora do `useEffect`):
```ts
const syncVoices = () => {
  const available = synthRef.current.getVoices();
  setVoices(available);
  if (available.length > 0) {
    const savedVoice = loadData('reader_voice');
    if (savedVoice && available.find(v => v.voiceURI === savedVoice)) {
      setSelectedVoiceURI(savedVoice);
    } else {
      const ptVoice = available.find(v => v.lang.includes('pt'));
      setSelectedVoiceURI(ptVoice ? ptVoice.voiceURI : available[0].voiceURI);
    }
  }
};
```

**B.** Substituir `updateVoices` dentro do `useEffect` (linhas 73-83) por chamada a `syncVoices()`.

**C.** Em `installSpeechPack`, após `await checkSpeechPacks()` (linha ~409), adicionar: `syncVoices();`

**D.** Em `removeSpeechPack`, após `await checkSpeechPacks()` (linha ~424), adicionar: `syncVoices();`

#### `src/components/SettingsTab.tsx`

**E.** Após `checkSpeechPacks()` nos handlers de install/remove, o filtro `ttsLocale` recalcula automaticamente porque `speechPacks` mudou (setState). A mensagem `Nenhuma voz encontrada` (linha 515) já existe como fallback. **Nada a mexer.**

---

### Risco
Baixíssimo. `syncVoices()` só lê `synthRef.current.getVoices()` e atualiza estados — mesma lógica que já roda no mount com `onvoiceschanged`.

---

## Próxima Mudança a Discutir

(aguardando input do usuário)

---

## Plano — UI SettingsTab: Remover "Todos" + Mover Voice Engine

**Data:** 2026-06-28

### Mudança 1: Remover filtro "Todos"

| Arquivo | Local | Ação |
|---------|-------|------|
| `src/components/SettingsTab.tsx` | Linha 98 | `useState<'speech' \| 'tts'>('speech')` |
| `src/components/SettingsTab.tsx` | Linhas 126-128 | `installedPacks = allInstalledPacks.filter(p => p.type === packTypeFilter)` |
| `src/components/SettingsTab.tsx` | Linhas 356-362 | Remover botão "Todos", deixar só 2 botões: Reconhecimento / Voz |

### Mudança 2: Mover Voice Engine para baixo dos pacotes

| Arquivo | Ação |
|---------|------|
| `src/components/SettingsTab.tsx` | Cortar bloco linhas 490-548 (Voice Engine + dropdown voz + audio inputs) |
| `src/components/SettingsTab.tsx` | Colar após linha 444 (fim da Pack Section), antes do HR da linha 447 |

**Nova ordem visual:**
1. Pack Section (Local/Online + filtros + lista)
2. **Voice Engine** (movido para cá — contexto lógico: pacotes instalados → escolha a voz)
3. HR
4. Theme Selectors
5. HR
6. AI Config

### Variáveis usadas no Voice Engine (já calculadas no topo, linhas 125-136)
- `ttsLocale`, `selectedPack`, `displayVoices`
- `selectedVoiceURI`, `onSetSelectedVoiceURI`
- `audioInputs`, `audioOutputs`, `selectedAudioInput`, `selectedAudioOutput`, `onSetSelectedAudioInput`, `onSetSelectedAudioOutput`
- `readSpecialChars`, `onSetReadSpecialChars`

**Risco:** Baixo — variáveis derivadas ficam no escopo do componente, não movidas.

### Decisão pendente
Default do `packTypeFilter`: `'speech'` (Reconhecimento) ou `'tts'` (Voz)?