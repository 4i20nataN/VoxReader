# 🎙️ VoxReader — Leitor Inteligente Multiplataforma com IA

O **VoxReader** é um ecossistema inteligente de leitura, acessibilidade e produtividade alimentado por Inteligência Artificial. Desenvolvido para funcionar de forma fluida em **Desktop (Windows), Mobile (Android/iOS) e Web**, o app transforma texto de qualquer origem (digitação, arquivos, imagens ou áudio) em voz, permitindo ainda que uma IA explique o conteúdo em tempo real.

O projeto foi estruturado com foco em **privacidade, performance local (offline) e economia de bateria**, acionando APIs de nuvem apenas sob demanda.

---

## 🚀 Principais Funcionalidades

- **🎙️ Texto para Voz (TTS):** Leitura fluida de textos utilizando vozes nativas instaladas no sistema operacional (SAPI, Siri, etc.).
- **📸 Leitura de Imagens (OCR):** Extração de texto diretamente de imagens e capturas de tela localmente.
- **🗣️ Transcrição de Áudio (STT):** Captura e conversão de fala do microfone em blocos de texto editáveis.
- **🤖 Integração com IA (Explicador):** Conexão direta com a Google Gemini API para resumir ou explicar partes complexas do texto[cite: 2].
- **💾 Leituras Salvas:** Histórico persistente e local para revisar conteúdos importantes quando quiser[cite: 2].
- **🎨 Temas Dinâmicos:** Interface adaptável (Dark Mode nativo) com paleta de cores customizável via Tailwind[cite: 2].

---

## 🛠️ Tecnologias e Stack

- **Frontend Core:** React 18, TypeScript, Vite[cite: 2].
- **Estilização:** Tailwind CSS (variáveis dinâmicas para temas), Lucide-React (ícones)[cite: 2].
- **APIs Nativas e Web:**
  - **TTS/STT:** *Web Speech API* nativa do sistema operacional (SAPI no Windows, Siri/VoiceOver no Mac, etc)[cite: 2].
  - **OCR:** `tesseract.js` rodando 100% client-side[cite: 2].
  - **Hardware:** `navigator.vibrate` (Feedback Háptico nativo em Android)[cite: 2].
- **Persistência de Dados:** `localStorage` cross-platform (AppData no Windows via Electron), garantindo privacidade total e modo offline "Zero-IA"[cite: 2].
- **Inteligência Artificial:** Integração transparente com a Gemini API acionada apenas sob requisição externa do usuário[cite: 2].
- **Desktop (Windows/PC):** Runtime empacotada com Electron (`electron-main.cjs`) configurada para executáveis leves[cite: 2].
- **Mobile (Android/iOS):** Integração e sincronização usando CapacitorJS (`capacitor.config.json`)[cite: 2].

---

## 📐 Estrutura Modular da Arquitetura

A arquitetura do projeto separa rigidamente as responsabilidades de UI pura da lógica central de áudio, facilitando a manutenção e futuras contribuições[cite: 2]:

```text
/src
  ├── App.tsx                   # Controlador de Estado Principal (Main Loop) e UI Base
  ├── types.ts                  # Tipagens Globais TypeScript da aplicação
  ├── themes.ts                 # Máquina de Temas visuais e paletas
  ├── components/               # Módulos Visuais Puros (Stateless/Presentational)
  │   ├── SetupWizard.tsx       # Wizard de introdução do modo App/PWA
  │   ├── NavButton.tsx         # Elementos unificados do layout de navegação da dock inferior
  │   └── HistoryCard.tsx       # Cartões dinâmicos de leituras com reações táteis e ações contextuais
  └── lib/
      └── utils.ts              # Funções helper (ex: aglutinadores do tailwind 'cn')


⚡ Notas de Engenharia & Refatoração

A fragmentação da arquitetura anterior trouxe melhorias severas de performance[cite: 2]:

Otimização do Core: O controlador App.tsx teve uma redução de aproximadamente 120 linhas de ruído JSX, focando puramente no ciclo de vida da aplicação[cite: 2].

Ganho de GPU previsto: Componentes de alta frequência como o HistoryCard foram isolados[cite: 2]. Na próxima etapa, a aplicação de React.memo reduzirá drasticamente o overhead de renderização na GPU ao atualizar cronômetros ou players sobre grandes listas animadas com Tailwind[cite: 2].

Isolamento de Complexidade: A complexidade visual foi totalmente separada da complexidade de áudio, permitindo que novos desenvolvedores (ou IA Agents) intervenham na UI sem injetar bugs nos hooks de ciclo de vida (useEffect) do player principal[cite: 2].

## 📦 Como Rodar o Projeto Localmente

### Pré-requisitos
Certifique-se de ter o Node.js instalado.

1. **Clonar o repositório:**

Bash
git clone https://github.com/4i20nataN/VoxReader.git
cd VoxReader

Instalar as dependências:

Bash
npm install

Executar em modo de desenvolvimento (Web):

Bash
npm run dev
   npm run dev
