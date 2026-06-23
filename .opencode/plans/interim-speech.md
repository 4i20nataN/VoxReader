# Interim/Parcial Speech Recognition no Electron

## Objetivo
Mostrar texto em tempo real (parcial/interim) no status ao lado de "transcrição & edição" durante o reconhecimento de fala no Electron, igual funciona no browser com Web Speech API.

## Arquivos para alterar

### 1. `speech-worker/SpeechWorker/Program.cs`

**a) Adicionar propriedade `Partial` no `SpeechResult`:**
```csharp
[JsonPropertyName("partial")] public bool Partial { get; set; }
```

**b) Registrar `HypothesisGenerated` antes do loop `while(true)` — dentro do bloco `try`, depois de configurar os timeouts e antes do `while`:**

Adicionar:
```csharp
recognizer.HypothesisGenerated += (_, args) =>
{
    WriteResult(success: true, text: args.Hypothesis.Text, partial: true);
    Console.Out.Flush();
};
```

**c) Adicionar `Console.Out.Flush()` também após `WriteResult` no final do loop (pra garantir que resultado final chegue):**

```csharp
while (true)
{
    var result = await recognizer.RecognizeAsync();
    if (result.Status == SpeechRecognitionResultStatus.Success && !string.IsNullOrWhiteSpace(result.Text))
    {
        WriteResult(success: true, text: result.Text);
        Console.Out.Flush();
    }
}
```

**d) Adicionar parâmetro `partial` no `WriteResult`:**
```csharp
static int WriteResult(bool success, string? text = null, string? error = null, bool partial = false)
```

E passar `Partial = partial` na criação do `SpeechResult`.

---

### 2. `src/hooks/useSpeech.ts`

**Alterar o handler `recognition-result`** (linha ~231) para tratar resultados parciais vs finais:

```typescript
ipcRenderer.on('recognition-result', (_: any, result: any) => {
  if (result.partial) {
    onStatusChange('Ouvindo: ' + result.text);
  } else if (result.success && result.text) {
    const currentText = textRef.current;
    onTextChange((currentText + ' ' + result.text).trim() + ' ');
    textRef.current = (currentText + ' ' + result.text).trim() + ' ';
    onStatusChange('Fala capturada');
  }
});
```

---

### 3. Rebuild
```powershell
cd speech-worker/SpeechWorker
dotnet publish -c Release -o ../../resources
```

---

## Fluxo esperado após as alterações
1. Usuário clica no mic → worker spawna, `isRecording = true`, mic vermelho
2. Usuário começa a falar → `HypothesisGenerated` dispara várias vezes
3. Cada hipótese vira `{"success":true,"text":"...","partial":true}` no stdout
4. Main process lê a linha, manda `recognition-result` pro renderer
5. Frontend vê `result.partial === true` → `onStatusChange('Ouvindo: ...')`
6. Bolha ao lado de "transcrição & edição" mostra o texto em tempo real
7. Usuário termina de falar → `RecognizeAsync()` retorna texto final → `partial:false` (ou omitido)
8. Frontend faz append no textarea

## Teste
- Falar devagar: palavras devem aparecer na bolha de status em tempo real
- Falar rápido: o texto parcial vai sendo atualizado até o final ser commitado no textarea
- Silêncio: bolha volta a mostrar "Capturando áudio..." ou similar
