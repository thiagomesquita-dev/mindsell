# 🧠 CobraMind

Plataforma de inteligência para operações de cobrança. Analisa negociações entre operadores e clientes usando IA, gera feedback estruturado, acompanha performance individual e mede evolução por ciclos consolidados.

---

## ✨ Principais Funcionalidades

- **Análise de negociações com IA** — avaliação automática de texto e/ou áudio
- **Metodologia AIDA adaptada** — Atenção, Interesse, Desejo e Ação aplicados à cobrança
- **Erro principal e mensagem ideal** — identifica a falha crítica e sugere a abordagem correta
- **Compliance com justificativa** — avalia conformidade e explica o motivo
- **Score e nível de habilidade** — classificação objetiva do operador
- **Dashboard operacional** — visão consolidada de métricas, objeções e erros
- **Histórico de análises** — consulta completa com filtros por operador, carteira e período
- **Ciclos de evolução** — a cada 10 negociações, gera relatório consolidado com comparação ao ciclo anterior
- **Métricas internas de IA** — painel administrativo com tokens, custos e tempos de resposta
- **Suporte multi-provedor** — OpenAI e Gemini configuráveis por variável de ambiente

---

## 🛠 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui |
| Backend | Supabase Edge Functions (Deno) |
| Banco de dados | Supabase Postgres |
| Autenticação | Supabase Auth |
| Storage | Supabase Storage (áudios) |
| IA | OpenAI (GPT-4o) e/ou Google Gemini — configurável |
| Testes | Vitest · React Testing Library |

---

## 🚀 Como Rodar

```bash
# 1. Clone o repositório
git clone <URL_DO_REPOSITORIO>
cd cobramind

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Preencha os valores no arquivo .env

# 4. Rode o frontend
npm run dev

# 5. Rode os testes
npm test
```

---

## 🔑 Variáveis de Ambiente

### Frontend (`.env`)

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública (anon) do Supabase |

### Edge Functions (Supabase Secrets)

| Variável | Descrição |
|---|---|
| `AI_PROVIDER` | Provedor de IA: `openai` ou `gemini` |
| `OPENAI_API_KEY` | Chave da API OpenAI |
| `OPENAI_MODEL` | Modelo OpenAI (padrão: `gpt-4o-mini`) |
| `GEMINI_API_KEY` | Chave da API Google Gemini |
| `GEMINI_MODEL` | Modelo Gemini (padrão: `gemini-2.5-flash`) |

---

## 📁 Estrutura Principal

```
src/
├── pages/              # Páginas do sistema
│   ├── Dashboard.tsx         # Visão geral de métricas
│   ├── NewAnalysis.tsx       # Formulário de nova análise
│   ├── AnalysisResult.tsx    # Resultado detalhado da análise
│   ├── AnalysisHistory.tsx   # Histórico com filtros
│   ├── OperatorEvolution.tsx # Evolução por ciclos
│   ├── OperatorRanking.tsx   # Ranking de operadores
│   ├── OperationRadar.tsx    # Radar de objeções e erros
│   ├── AdminMetrics.tsx      # Métricas internas de IA
│   ├── Settings.tsx          # Configurações
│   └── Onboarding.tsx        # Configuração inicial
├── components/         # Componentes reutilizáveis
├── contexts/           # AuthContext (autenticação)
├── hooks/              # Hooks customizados
├── types/              # Tipos centralizados (AnalysisResult, etc.)
└── integrations/       # Cliente e tipos do Supabase

supabase/functions/
├── analisar-negociacao/   # Processa análise individual com IA
└── gerar-ciclo-operador/  # Gera relatório consolidado do ciclo
```

---

## 🔄 Fluxo da Análise

```
Nova Análise → texto e/ou áudio
       ↓
Edge Function (analisar-negociacao)
       ↓
Transcrição de áudio (se houver)
       ↓
Envio para IA (OpenAI ou Gemini)
       ↓
JSON estruturado validado
       ↓
Insert na tabela `analyses`
       ↓
Resultado renderizado na interface
```

---

## 🔁 Fluxo dos Ciclos do Operador

```
Operador acumula negociações analisadas
       ↓
Ao atingir 10 negociações não-cicladas
       ↓
Edge Function (gerar-ciclo-operador)
       ↓
IA consolida: score médio, erros, objeções, plano de desenvolvimento
       ↓
Ciclo fechado com comparação ao anterior (se existir)
       ↓
Novo ciclo inicia automaticamente
```

---

## 🧪 Testes

Os testes cobrem os fluxos principais do sistema:

| Arquivo | Cobertura |
|---|---|
| `ProtectedRoute.test.tsx` | Redirecionamento para login, bloqueio sem onboarding, acesso autorizado |
| `NewAnalysis.test.tsx` | Validação de campos obrigatórios, habilitação do botão de envio |
| `AnalysisResult.test.tsx` | Renderização de resumo, erro, mensagem ideal, AIDA, compliance |
| `operatorCycle.test.ts` | Lógica de threshold de 10 negociações, filtragem, numeração de ciclos |

```bash
# Rodar todos os testes
npm test

# Rodar em modo watch
npm run test:watch
```

---

## 🔮 Melhorias Futuras

- Cobertura maior de testes (integração, edge functions)
- Dashboards avançados com drill-down por carteira
- Exportação de relatórios em PDF
- Otimização de custos e performance da IA
- Notificações automáticas ao fechar ciclo
- Comparativo entre operadores no mesmo período

---

## 📄 Licença

Projeto privado — uso interno.
