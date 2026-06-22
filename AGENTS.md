# Meta-Contexto e Instruções para Agentes de I.A

## Contexto do Projeto "Leitor Inteligente"
Você está lidando com uma aplicação Multiplataforma (PWA, Android (Capacitor), Windows Desktop (Electron)). Seu principal objetivo é gerar síntese de voz a partir de textos e possuir utilitários inteligentes conectados de forma "preguiçosa" (lazy), com extrema eficiência energética e persistência local focado na manutenção do ambiente do usuário "off-line".

## Diretrizes e Estrutura Técnica para os Modelos

1. **Arquitetura e Fragmentação (Manutenção de Modularidade)**
   - O projeto teve seu design fragmentado para diminuir o tamanho dos arquivos e salvar tokens de memória/LLM. Não reinsira grandes blocos de interface ou lógicas isoladas de volta no `src/App.tsx`.
   - Utilize a pasta `src/components/` (para arquivos como `HistoryCard.tsx`, `SetupWizard.tsx` e `NavButton.tsx`).
   - Se for escalar os controladores lógicos do Text-To-Speech (TTS), prefira gerar "Custom Hooks" (`useSpeechState.ts`, etc), mantendo a integridade limpa dos *effect states* separados da parte visual de UI da tela.

2. **Tipagem e Utilities Globais**
   - Importe suas interfaces baseadas nos dados comuns estritos à partir de `src/types.ts`.
   - Qualquer inserção de classe Tailwind dinâmica, DEVERÁ obrigatoriamente usar o wrapper de mitigação de conflitos importado de `import { cn } from './lib/utils'`.

3. **Restrições de API Multiplataforma**
   - O código final roda tanto em `Web Browser`, `Electron IPC`, e `Capacitor/WebView`. Por este motivo:
     - Nunca implemente variáveis Node.JS cruas (ex: `fs.readFileSync`) em componentes globais do front-end (`src/`). Todo processo backend do windows localiza-se no `electron-main.cjs`.
     - Ao adicionar APIs do navegador (ex: Haptic feedbback com `navigator.vibrate`), garanta a inserção de `try-catch block` ou feature checks (`if(navigator...)`), já que alguns runtimes de renderização desativarão ou barrarão as APIs e causarão Unhandled Rejection.

4. **Tratamento Offline / Online**
   - Por predefinição, o design do sistema trabalha em estado **OFF-LINE** restrito e com os estados armazenados no "AppData"/LocalStorage.
   - Chamadas RESTful para Inteligência Artificial (ex: Gemini API) são "Opt-In" e exigem checagens de estado da internet prévia, o usuário não pode ter experiência travada porque não obteve um *resolve/reject* rápido.

## Relatório de Métricas e Fragmentação de Base (Log)
- Este sistema foi refatorado e teve ganho de economia em ~120 linhas diretas transferidas para submódulos na versão `1.0.x`.
- **Economia de Desempenho Documentada:** Módulos de cartões (Cards) agora reduzem os ciclos de repintura por React Reconciliation no Mobile na hora de realizar filtragens com expressões regulares do App, porque a lógica está isolada em componentes de ponta. A manutenibilidade de tokens aumentou para edições de máquina. Adapte suas edições para atuar nestes recortes finos menores e com foco garantido.
