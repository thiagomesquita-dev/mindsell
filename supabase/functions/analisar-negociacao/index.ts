import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

// ─── Types ───

interface AidaEvaluation {
  nota: number;
  comentario: string;
}

interface TranscriptionMarker {
  tipo: "objecao" | "falha" | "boa_pratica";
  timestamp?: string;
  trecho?: string;
  motivo?: string;
}

interface AnalysisPayload {
  operador: string;
  carteira: string;
  canal: string;
  transcricao?: string;
  audio_urls?: string[];
  duracao_audio_total?: number;
}

interface AIAnalysisResult {
  resumo: string;
  pontos_fortes: string[];
  pontos_melhorar: string[];
  sugestoes: string[];
  aida_atencao: AidaEvaluation;
  aida_interesse: AidaEvaluation;
  aida_desejo: AidaEvaluation;
  aida_acao: AidaEvaluation;
  tecnica_usada: string;
  objecao: string;
  tom_operador: string;
  risco_quebra: number;
  chance_pagamento: number;
  erro_principal: string;
  mensagem_ideal: string;
  nota_qa: number;
  nivel_habilidade: string;
  conformidade: string;
  justificativa_conformidade: string;
  score: number;
  categoria_objecao: string;
  categoria_erro: string;
  feedback_diagnostico: string;
  feedback_orientacao: string;
  feedback_exercicio: string;
  feedback_exemplo: string;
  marcacoes_transcricao: TranscriptionMarker[];
  marcacoes_transcricao: TranscriptionMarker[];
  /** Subindicadores da chance de pagamento (0-100) */
  intencao_cliente: number;
  capacidade_percebida: number;
  firmeza_compromisso: number;
  /** Classificação do tipo de contato */
  tipo_contato: string;
}

interface AIProviderResult {
  analysis: AIAnalysisResult;
  tokensPrompt: number;
  tokensResposta: number;
}

interface TranscriptionResult {
  text: string;
  duration: number;
}

// ─── Constants ───

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um supervisor experiente de operação de cobrança avaliando a negociação de um operador. Seja direto, prático e objetivo. Evite explicações teóricas ou acadêmicas. Foque em melhoria da negociação.

TODOS os campos são OBRIGATÓRIOS. Respeite rigorosamente os limites abaixo:

- resumo: máximo 3 linhas
- pontos_fortes: máximo 3 itens (frases curtas e diretas)
- pontos_melhorar: máximo 3 itens (frases curtas e diretas)
- sugestoes: máximo 3 itens (frases curtas e acionáveis)
- erro_principal: máximo 2 linhas — DEVE conter obrigatoriamente: (1) o que o operador fez de errado ou arriscado, (2) por que isso é problema, (3) qual risco operacional, comercial ou de conformidade isso gera. Evitar abstrações vagas ou frases genéricas. Ser específico e citar o momento ou a ação concreta. Exemplo ruim: "Formalizou benefícios de forma confusa e ampliou informação sobre uso do cartão, o que pede mais cuidado na carteira." Exemplo bom: "No fechamento, a operadora extrapolou ao afirmar desbloqueio e uso do cartão após quitação, o que pode ser interpretado como promessa excessiva em tema sensível da carteira."
- mensagem_ideal: máximo 3 linhas (mensagem pronta para uso) — DEVE ser a versão corrigida da mesma situação do erro_principal, mostrando como o operador deveria ter conduzido aquele momento específico
- justificativa_conformidade: máximo 2 linhas
- Cada comentário AIDA (atencao, interesse, desejo, acao): máximo 2 linhas + nota 0-10

NÍVEL DE HABILIDADE (campo nivel_habilidade):
Classificar OBRIGATORIAMENTE em uma destas categorias: Iniciante | Em desenvolvimento | Consistente | Avançado
Formato: "Classificação — Justificativa curta baseada no comportamento observado na negociação (máx 1 linha)"
Exemplo: "Em desenvolvimento — Investigou parcialmente a situação do cliente, mas apresentou a proposta antes de tratar completamente a objeção."

ESTRATÉGIA DE CONDUÇÃO DA NEGOCIAÇÃO (campo tecnica_usada):
Identificar a estratégia predominante usada pelo operador. Usar sempre primeira letra maiúscula.
Estratégias possíveis (não limitado a): Proposta direta sem investigação | Investigação inicial seguida de proposta | Negociação baseada em objeção | Pressão por consequência | Fechamento por escolha | Negociação consultiva | Ancoragem de valor | Levantamento de informações | Tentativa de rapport | Fechamento presumido | Abertura direta
Formato: "Estratégia identificada — Justificativa curta baseada na conversa (máx 1 linha)"
Exemplo: "Investigação inicial seguida de proposta — Operador perguntou sobre a situação financeira antes de apresentar as condições de pagamento."

TOM DO OPERADOR (campo tom_operador):
Classificar o tom predominante de forma específica. Opções possíveis (não limitado a): Empático e investigativo | Neutro e objetivo | Pressionador | Robótico ou scriptado | Consultivo | Acolhedor | Impaciente | Assertivo | Inseguro
Formato: "Classificação — Observação curta explicando a avaliação (máx 1 linha)"
Exemplo: "Empático e investigativo — Demonstrou interesse genuíno na situação do cliente e fez perguntas abertas antes de propor."

Campos numéricos e de classificação:
- risco_quebra: 0-100
- chance_pagamento: 0-100 (DEVE ser calculado como: 0.40*intencao_cliente + 0.35*capacidade_percebida + 0.25*firmeza_compromisso)
- nota_qa: 0-100
- conformidade: classificar OBRIGATORIAMENTE em: "Conforme" | "Parcialmente Conforme" | "Não Conforme"
  Critérios baseados em boas práticas de cobrança e no Código de Defesa do Consumidor (CDC), Art. 42:
  → CONFORME: linguagem respeitosa, clareza na cobrança, proposta adequada, ausência de pressão abusiva, ameaça ou constrangimento.
  → PARCIALMENTE CONFORME: negociação respeitosa porém com problemas como condução confusa, proposta inadequada, falta de investigação da situação do cliente, fechamento mal conduzido ou leve pressão.
  → NÃO CONFORME: sinais de possível violação do CDC — pressão abusiva, ameaça direta ou indireta, tentativa de constrangimento, cobrança agressiva, linguagem inadequada ou falta de transparência.
- justificativa_conformidade: OBRIGATÓRIA — explicar objetivamente por que a negociação foi classificada naquele nível, citando trechos ou comportamentos específicos observados (máx 2 linhas)
- categoria_objecao: categoria curta da objeção (máximo 3 palavras, CAIXA ALTA). Ex: VALOR ALTO, SEM DINHEIRO, AGUARDANDO SALARIO, DUVIDA SOBRE DIVIDA, DESEMPREGO, PARCELA ALTA
- categoria_erro: categoria curta do erro principal (máximo 3 palavras, CAIXA ALTA). Ex: SEM FECHAMENTO, NAO TRATOU OBJECAO, SEM ANCORAGEM, MENSAGEM GENERICA, REPETICAO DE TEXTO, FALTA DE EMPATIA
- score: 0-100

SUBINDICADORES DA CHANCE DE PAGAMENTO (campos obrigatórios, escala 0-100):
- intencao_cliente: Quanto o cliente demonstra vontade real de resolver a situação. Considerar: reconhecimento da dívida, interesse em negociar, aceitação do diálogo, desejo de regularizar, engajamento na conversa, abertura para proposta, resposta positiva a alternativas.
- capacidade_percebida: Quanto a proposta parece compatível com a realidade financeira do cliente. Considerar: adequação do valor, adequação do parcelamento, conforto com data, ausência de sinais fortes de aperto financeiro. Se houver sinais fortes de dificuldade financeira, a capacidade DEVE cair mesmo que a intenção esteja alta.
- firmeza_compromisso: Quanto o fechamento foi claro e consistente. Considerar: data confirmada, valor confirmado, compromisso verbal claro, ausência de hesitação, fechamento objetivo, aceite com convicção.

A fórmula do chance_pagamento é: 0.40 * intencao_cliente + 0.35 * capacidade_percebida + 0.25 * firmeza_compromisso. O valor final de chance_pagamento DEVE ser coerente com os 3 subindicadores.

FEEDBACK PARA O SUPERVISOR (campos obrigatórios — DEVEM ser consequência direta do erro_principal):
- feedback_diagnostico: máximo 2 linhas — explique objetivamente o principal problema da negociação, conectando ao erro_principal
- feedback_orientacao: máximo 2 linhas — como o supervisor deve orientar o operador para corrigir ESPECIFICAMENTE o erro_principal identificado
- feedback_exercicio: máximo 2 linhas — sugira um exercício prático que treine o operador exatamente no ponto fraco revelado pelo erro_principal
- feedback_exemplo: máximo 2 linhas — exemplo de frase ou abordagem correta para a MESMA situação onde o erro_principal ocorreu

COERÊNCIA OBRIGATÓRIA ENTRE CAMPOS (REGRA CRÍTICA):
Os campos erro_principal, pontos_melhorar, mensagem_ideal, feedback_diagnostico, feedback_orientacao, feedback_exercicio e feedback_exemplo DEVEM formar uma narrativa coerente e conectada:
1. O erro_principal define o problema central.
2. Os pontos_melhorar devem incluir o tema do erro_principal.
3. A mensagem_ideal deve ser a correção prática do erro_principal.
4. O feedback_diagnostico deve explicar o erro_principal para o supervisor.
5. O feedback_orientacao deve ensinar como evitar o erro_principal.
6. O feedback_exercicio deve treinar o ponto fraco do erro_principal.
7. O feedback_exemplo deve mostrar a abordagem correta na mesma situação do erro_principal.
NÃO gere sugestões genéricas desconectadas do erro principal identificado.

MARCAÇÕES DA TRANSCRIÇÃO (campo marcacoes_transcricao):
Array de objetos com marcações de trechos importantes da negociação. Cada marcação deve conter:
- tipo: "objecao" (objeção do cliente), "falha" (erro/falha do operador) ou "boa_pratica" (ação positiva do operador)
- timestamp: momento aproximado no formato "MM:SS" (se possível inferir da posição no diálogo, senão omitir)
- trecho: trecho curto e literal da fala marcada (máx 15 palavras, copiar da transcrição)
- motivo: explicação curta e objetiva do motivo da marcação (máx 15 palavras). OBRIGATÓRIO para tipo "falha" e "objecao". Exemplos para falha: "proposta apresentada antes da validação completa", "fechamento sem confirmação de data/compromisso". Exemplos para objecao: "sem condição de pagar à vista", "pedido de prazo", "contestação de valor". Para boa_pratica pode ser omitido ou conter elogio curto.
Marque entre 2 e 7 trechos mais relevantes. Priorize objeções reais do cliente, erros críticos e boas práticas notáveis.



CLASSIFICAÇÃO DO TIPO DE CONTATO (campo tipo_contato — OBRIGATÓRIO, ANTES da avaliação AIDA):
Antes de avaliar qualquer etapa AIDA, classifique o tipo de contato da negociação:
- "Devedor direto": o operador fala diretamente com o titular da dívida.
- "Terceiro": o operador fala com familiar, cônjuge, colega ou outra pessoa que não é o devedor.
- "Sem contato efetivo": não houve interação real com nenhuma das partes (caixa postal, sem resposta, número errado, etc).

REGRAS DE AJUSTE POR TIPO DE CONTATO:
1. Se tipo_contato = "Terceiro":
   - Reduzir o peso da etapa AÇÃO (fechamento): nota máxima de Ação = 6, a não ser que haja compromisso firme e realista do terceiro.
   - Reduzir chance_pagamento em pelo menos 20 pontos em relação ao que seria se fosse devedor direto.
   - Aumentar risco_quebra em pelo menos 15 pontos.
   - Promessas feitas por terceiros NÃO devem ser consideradas como fechamento real. Classificar firmeza_compromisso como fraca (máx 30).
   - No comentário de aida_acao, registrar explicitamente: "Contato com terceiro — compromisso indireto, não equivale a fechamento com titular."

2. Se tipo_contato = "Sem contato efetivo":
   - Todas as notas AIDA devem ser 0 ou 1.
   - chance_pagamento = 0, risco_quebra = 100, firmeza_compromisso = 0, intencao_cliente = 0, capacidade_percebida = 0.
   - score e nota_qa devem refletir ausência de negociação.

DETECÇÃO DE FRASES CONDICIONAIS (REGRA CRÍTICA):
Se o cliente usar frases com "se", "quando", "depois que", "caso", "talvez", "vou ver", "vou tentar":
- Classificar como INTENÇÃO FRACA.
- intencao_cliente deve ser reduzido (máx 40 se houver predominância de frases condicionais).
- firmeza_compromisso deve ser reduzido proporcionalmente.
- No comentário de aida_acao, registrar: "Cliente usou linguagem condicional — intenção classificada como fraca."

DETECÇÃO DE FALHA DE CREDIBILIDADE (REGRA CRÍTICA):
Se o cliente questionar a legitimidade da cobrança, da empresa ou da dívida 2 ou mais vezes durante a conversa:
- Penalizar fortemente as notas de DESEJO (máx 4) e AÇÃO (máx 3).
- Registrar no comentário de aida_desejo: "Cliente questionou legitimidade múltiplas vezes — credibilidade comprometida."
- Aumentar risco_quebra em pelo menos 20 pontos adicionais.
- chance_pagamento deve refletir a baixa credibilidade (reduzir em pelo menos 25 pontos).

ANÁLISE AIDA (contexto cobrança — 4 etapas obrigatórias):
- ATENÇÃO: Avaliar o início do atendimento — abertura humanizada, identificação do atendente, confirmação de titularidade (ex: 3 dígitos do CPF), contextualização do motivo do contato.
- INTERESSE: Avaliar como a dívida foi apresentada — uso de ancoragem de valor, apresentação de economia ou desconto, explicação clara da dívida, uso de escolha guiada (ex: pagamento à vista ou parcelado).
- DESEJO (incluindo tratamento de objeções): Avaliar a construção da proposta — adaptação à realidade do cliente, empatia durante a negociação, personalização da proposta, investigação da situação do cliente, tratamento adequado das objeções. A IA deve identificar se o operador investigou a objeção, reformulou a proposta ou apenas insistiu na mesma condição.
- AÇÃO: Avaliar o fechamento da negociação — fechamento assumido, confirmação de parcela ou valor, confirmação da data de pagamento, encaminhamento claro para pagamento.

VALIDAÇÃO DE CPF/SEGURANÇA — REGRA DE SEQUÊNCIA (CRÍTICA):
Ao avaliar se o operador validou CPF/segurança no momento adequado, diferencie OBRIGATORIAMENTE:
1. SINALIZAÇÃO INICIAL ≠ PROPOSTA COMERCIAL EFETIVA:
   - NÃO é "avanço da negociação comercial": mencionar que existem valores atualizados, informar sobre campanha ou desconto disponível, convidar o cliente a ouvir proposta, perguntar se tem interesse em ouvir condições.
   - É "avanço da negociação comercial": apresentar valor exato de débito ou acordo, detalhar entrada/parcela/desconto com valores, formalizar proposta financeira, tentar fechamento com valor específico.
2. A validação de CPF/segurança está CORRETA quando ocorre antes da apresentação efetiva de valores e proposta comercial, mesmo que venha depois de uma sinalização inicial ou convite para ouvir proposta.
3. Só classifique como "validação tardia" quando o CPF/segurança for verificado DEPOIS de o operador já ter apresentado valores exatos da proposta.
4. Leia a transcrição na ordem cronológica real. Não inverta a sequência dos fatos. Verifique se a validação veio antes ou depois da PRIMEIRA menção a valores exatos.
5. Se a sequência for: sinalização → validação de segurança → proposta com valores, isso é CORRETO e deve ser reconhecido como boa prática.

VALIDAÇÃO EM ATENDIMENTOS VIA WHATSAPP — REGRA DE HISTÓRICO (CRÍTICA):
Em atendimentos via WhatsApp ou chat assíncrono, a validação do cliente pode acontecer em etapas ao longo do histórico da conversa. NÃO aplique a mesma rigidez temporal de uma ligação telefônica linear. Considere o histórico completo do fio de conversa.

1. IDENTIFICAÇÃO PRÉVIA SUFICIENTE:
   Considerar como identificação prévia suficiente quando, dentro do histórico do mesmo atendimento/chat, o cliente já tiver fornecido espontaneamente um ou mais dados identificadores relevantes:
   - CPF (parcial ou completo)
   - Número de contrato
   - Nome completo
   - Outro dado forte que vincule o atendimento ao titular/beneficiário
   Nesses casos, NÃO tratar a conversa como "sem validação nenhuma" nem como "ausência total de validação".

2. CONFIRMAÇÃO CADASTRAL FINAL ≠ PRIMEIRA VALIDAÇÃO:
   Quando o operador, em momento posterior, pedir confirmação de dados como nome, telefone, e-mail, endereço ou data de pagamento, isso deve ser interpretado como CONFIRMAÇÃO CADASTRAL PARA FORMALIZAÇÃO, e NÃO como a primeira validação do atendimento.

3. REGRA DE PENALIZAÇÃO — 3 NÍVEIS:
   a) SEM PENALIZAÇÃO: cliente já se identificou previamente no histórico (CPF, contrato, nome) E o operador apresentou proposta após essa identificação → sequência correta.
   b) PONTO DE ATENÇÃO (penalização leve): cliente já se identificou previamente, mas a confirmação cadastral completa veio apenas na formalização/pagamento → sugerir melhorar organização da sequência, mas NÃO classificar como falha grave de segurança.
   c) PENALIZAÇÃO FORTE: nenhuma identificação prévia no histórico E o operador expôs informação sensível (valor total, proposta comercial, parcelamento, contrato detalhado, link de pagamento, dados financeiros/cadastrais) → classificar como falha real de validação/segurança.

4. REDAÇÃO DO ERRO PRINCIPAL EM CENÁRIOS INTERMEDIÁRIOS:
   Quando houver identificação prévia mas confirmação cadastral tardia, o erro_principal deve refletir isso com precisão.
   Exemplo RUIM: "apresentou valor antes da validação formal de segurança"
   Exemplo BOM: "O atendimento apresentou valor e opção de parcelamento antes da confirmação cadastral completa, mas a cliente já havia fornecido CPF no histórico da conversa. O ponto de atenção é organizar melhor a confirmação final antes da formalização, sem que isso represente ausência total de validação."

5. CONTEXTO ASSÍNCRONO:
   Em WhatsApp, considerar: histórico anterior de mensagens, retomadas de atendimento, dados já enviados pelo cliente em mensagens anteriores, continuidade do mesmo fio de conversa. A análise deve ler o chat como um fluxo contínuo com possíveis intervalos, e não como interações isoladas.

VALORES MONETÁRIOS EM TRANSCRIÇÕES DE ÁUDIO (REGRA CRÍTICA):
Transcrições de áudio frequentemente contêm erros de reconhecimento em valores monetários. Palavras como "duzentos", "mil e duzentos", "cento e vinte", "vinte", "dois mil" podem ser confundidas pelo motor de transcrição.
- NUNCA classifique divergência de valor como "erro grave" ou "divergência grave na formalização" baseado apenas em valores extraídos da transcrição.
- Para apontar divergência financeira como erro grave, exija pelo menos UM destes critérios:
  1. O mesmo valor aparece de forma consistente em mais de um trecho da transcrição.
  2. Há confirmação explícita do operador OU do cliente repetindo o valor.
  3. O contexto torna inequívoco que houve mudança real de valor proposto.
- Se houver ambiguidade ou baixa confiança no valor transcrito, use linguagem cautelosa:
  "Possível divergência de valor (valor identificado na transcrição pode conter erro de reconhecimento)"
- NÃO penalize o operador (score, nota_qa, erro_principal) com base em valores monetários ambíguos.
- Quando mencionar valores no erro_principal ou em qualquer campo, informe que o valor pode estar sujeito a imprecisão de transcrição se não houver confirmação clara no diálogo.

O campo tipo_contato é OBRIGATÓRIO e deve ser preenchido ANTES de calcular qualquer nota AIDA ou indicador.

Não inclua nomes de clientes. Retorne JSON estruturado.`;

const ANALYSIS_SCHEMA = {
  resumo: { type: "string", description: "Resumo conciso da negociação (2-3 frases)" },
  pontos_fortes: { type: "array", items: { type: "string" }, description: "Lista de pontos fortes do operador" },
  pontos_melhorar: { type: "array", items: { type: "string" }, description: "Lista de pontos a melhorar" },
  sugestoes: { type: "array", items: { type: "string" }, description: "Sugestões práticas de melhoria" },
  aida_atencao: {
    type: "object",
    properties: { nota: { type: "number" }, comentario: { type: "string" } },
    required: ["nota", "comentario"],
  },
  aida_interesse: {
    type: "object",
    properties: { nota: { type: "number" }, comentario: { type: "string" } },
    required: ["nota", "comentario"],
  },
  aida_desejo: {
    type: "object",
    properties: { nota: { type: "number" }, comentario: { type: "string" } },
    required: ["nota", "comentario"],
  },
  aida_acao: {
    type: "object",
    properties: { nota: { type: "number" }, comentario: { type: "string" } },
    required: ["nota", "comentario"],
  },
  tecnica_usada: { type: "string" },
  objecao: { type: "string" },
  tom_operador: { type: "string" },
  risco_quebra: { type: "number" },
  chance_pagamento: { type: "number" },
  erro_principal: { type: "string" },
  mensagem_ideal: { type: "string" },
  nota_qa: { type: "number" },
  nivel_habilidade: { type: "string" },
  conformidade: { type: "string" },
  justificativa_conformidade: { type: "string" },
  score: { type: "number" },
  categoria_objecao: { type: "string", description: "Categoria curta da objeção do cliente (máx 3 palavras, CAIXA ALTA)" },
  categoria_erro: { type: "string", description: "Categoria curta do erro principal do operador (máx 3 palavras, CAIXA ALTA)" },
  feedback_diagnostico: { type: "string", description: "Principal problema da negociação (objetivo, máx 2 linhas)" },
  feedback_orientacao: { type: "string", description: "Como o supervisor deve orientar o operador (máx 2 linhas)" },
  feedback_exercicio: { type: "string", description: "Exercício prático para o operador treinar (máx 2 linhas)" },
  feedback_exemplo: { type: "string", description: "Exemplo de frase ou abordagem correta (máx 2 linhas)" },
  marcacoes_transcricao: {
    type: "array",
    items: {
      type: "object",
      properties: {
        tipo: { type: "string", description: "objecao | falha | boa_pratica" },
        timestamp: { type: "string", description: "Momento aproximado MM:SS" },
        trecho: { type: "string", description: "Trecho curto literal da fala (máx 15 palavras)" },
        motivo: { type: "string", description: "Explicação curta do motivo da marcação (máx 15 palavras). Obrigatório para falha e objecao." },
      },
      required: ["tipo", "trecho"],
    },
    description: "Marcações de trechos importantes da transcrição (2-7 itens).",
  },
  intencao_cliente: { type: "number", description: "Índice de intenção do cliente em resolver a dívida (0-100)" },
  capacidade_percebida: { type: "number", description: "Índice de capacidade percebida de pagamento (0-100)" },
  firmeza_compromisso: { type: "number", description: "Índice de firmeza do compromisso assumido (0-100)" },
  tipo_contato: { type: "string", description: "Tipo de contato: 'Devedor direto' | 'Terceiro' | 'Sem contato efetivo'" },
};

const REQUIRED_FIELDS: (keyof AIAnalysisResult)[] = [
  "resumo", "pontos_fortes", "pontos_melhorar", "sugestoes",
  "aida_atencao", "aida_interesse", "aida_desejo", "aida_acao",
  "tecnica_usada", "objecao", "tom_operador", "risco_quebra",
  "chance_pagamento", "erro_principal", "mensagem_ideal", "nota_qa",
  "nivel_habilidade", "conformidade", "justificativa_conformidade", "score",
  "categoria_objecao", "categoria_erro",
  "feedback_diagnostico", "feedback_orientacao", "feedback_exercicio", "feedback_exemplo",
  "marcacoes_transcricao",
  "intencao_cliente", "capacidade_percebida", "firmeza_compromisso", "tipo_contato",
];

const TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "analise_negociacao",
    description: "Retorna a análise estruturada da negociação de cobrança",
    parameters: {
      type: "object",
      properties: ANALYSIS_SCHEMA,
      required: REQUIRED_FIELDS,
      additionalProperties: false,
    },
  },
};

// Cost per million tokens (input/output) in USD
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4.1": { input: 2.0, output: 8.0 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-5.4": { input: 2.0, output: 8.0 },
  "o3": { input: 2.0, output: 8.0 },
  "o3-mini": { input: 1.1, output: 4.4 },
  "o4-mini": { input: 1.1, output: 4.4 },
  "gemini-1.5-pro": { input: 1.25, output: 5.0 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "gemini-2.5-flash": { input: 0.15, output: 0.6 },
  "gemini-3.1-pro-preview": { input: 1.25, output: 10.0 },
  // Anthropic Claude models
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
  "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0 },
  "claude-opus-4-6": { input: 5.0, output: 25.0 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const costs = MODEL_COSTS[model] || { input: 2.0, output: 8.0 };
  const inputCost = (promptTokens / 1_000_000) * costs.input;
  const outputCost = (completionTokens / 1_000_000) * costs.output;
  return Math.round((inputCost + outputCost) * 100) / 100;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Validates parsed AI response has all required fields */
function validateAnalysisResult(data: Record<string, unknown>): AIAnalysisResult {
  const missing = REQUIRED_FIELDS.filter((f) => data[f] === undefined || data[f] === null);
  if (missing.length > 0) {
    throw new Error(`IA não retornou campos obrigatórios: ${missing.join(", ")}`);
  }
  return data as unknown as AIAnalysisResult;
}

// ─── Audio Transcription (always uses OpenAI Whisper) ───

async function transcribeAudio(openaiApiKey: string, audioPathOrUrl: string, supabaseAdmin: SupabaseClient): Promise<TranscriptionResult> {
  console.log(`[analisar-negociacao] Transcrevendo áudio: ${audioPathOrUrl}`);

  // Accept either a raw storage path or a full URL and extract the path
  let storagePath = audioPathOrUrl;

  // If it's a full URL, extract the storage path from it
  if (storagePath.startsWith("http")) {
    const publicMatch = storagePath.match(/\/storage\/v1\/object\/(?:public|sign)\/audios\/([^?]+)/);
    if (publicMatch) {
      storagePath = publicMatch[1];
    } else {
      throw new Error(`URL de áudio inválida: ${audioPathOrUrl}`);
    }
  }

  // Remove bucket prefix if accidentally included
  if (storagePath.startsWith("audios/")) {
    storagePath = storagePath.substring("audios/".length);
  }

  console.log(`[analisar-negociacao] Download path: ${storagePath}`);

  const { data: audioData, error: downloadError } = await supabaseAdmin.storage
    .from("audios")
    .download(storagePath);

  if (downloadError || !audioData) {
    console.error("[analisar-negociacao] Download error:", downloadError);
    throw new Error(`Erro ao baixar áudio: ${downloadError?.message || "dados vazios"}`);
  }

  // Detect file format from path
  const isWav = storagePath.toLowerCase().endsWith(".wav");
  const fileName = isWav ? "audio.wav" : "audio.mp3";
  const fileSize = audioData.size;
  console.log(`[analisar-negociacao] Audio file: ${fileName}, size: ${fileSize} bytes, isWav: ${isWav}`);

  const formData = new FormData();
  formData.append("file", audioData, fileName);
  formData.append("model", "whisper-1");
  formData.append("language", "pt");
  formData.append("response_format", "verbose_json");
  // Contexto de cobrança melhora precisão do Whisper em termos específicos do domínio
  formData.append("prompt", "Transcrição de negociação de cobrança entre operador e cliente. Termos comuns: boleto, parcela, entrada, acordo, pagamento, vencimento, CPF, dívida, desconto, quitação, renegociação, protesto, Serasa, SPC.");
  // Temperatura baixa = transcrição mais conservadora e precisa
  formData.append("temperature", "0");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiApiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[analisar-negociacao] Whisper error:", errorText);
    throw new Error(`Erro na transcrição: ${response.status}`);
  }

  const result = await response.json();
  const transcriptionStart = result.segments?.[0]?.start ?? null;
  console.log(`[analisar-negociacao] Transcrição OK: duração=${result.duration}s, inicio_transcricao=${transcriptionStart}s, chars=${(result.text || "").length}`);
  return { text: result.text || "", duration: result.duration || 0 };
}

// ─── OpenAI Provider ───

async function callOpenAI(apiKey: string, model: string, userPrompt: string, maxRetries = 3): Promise<AIProviderResult> {
  console.log(`[analisar-negociacao] OpenAI modelo: ${model}`);

  const body = JSON.stringify({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    tools: [TOOL_DEFINITION],
    tool_choice: { type: "function", function: { name: "analise_negociacao" } },
  });

  let response: Response | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body,
    });
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "0", 10);
      const delay = Math.max(retryAfter * 1000, (attempt + 1) * 2000);
      console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await response.text();
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    break;
  }

  if (!response || !response.ok) {
    const status = response?.status;
    const errorText = response ? await response.text() : "no response";
    console.error("OpenAI error:", status, errorText);
    if (status === 429) throw new Error("RATE_LIMITED");
    throw new Error(`OpenAI error: ${status}`);
  }

  const aiData = await response.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("IA não retornou resultado estruturado");

  const usage = aiData.usage || {};
  const parsed: Record<string, unknown> = JSON.parse(toolCall.function.arguments);
  return {
    analysis: validateAnalysisResult(parsed),
    tokensPrompt: usage.prompt_tokens || 0,
    tokensResposta: usage.completion_tokens || 0,
  };
}

// ─── Gemini Provider ───

async function callGemini(apiKey: string, model: string, userPrompt: string): Promise<AIProviderResult> {
  console.log(`[analisar-negociacao] Gemini modelo: ${model}`);

  const jsonInstruction = `\n\nRETORNE OBRIGATORIAMENTE um JSON válido com os seguintes campos: ${REQUIRED_FIELDS.join(", ")}. Não inclua nenhum texto fora do JSON. O JSON deve começar com { e terminar com }.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT + jsonInstruction + "\n\n" + userPrompt },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: Object.fromEntries(
          Object.entries(ANALYSIS_SCHEMA).map(([key, val]) => {
            if (key === "marcacoes_transcricao") {
              return [key, {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    tipo: { type: "STRING" },
                    timestamp: { type: "STRING" },
                    trecho: { type: "STRING" },
                    motivo: { type: "STRING" },
                  },
                  required: ["tipo", "trecho", "motivo"],
                },
              }];
            }
            if (val.type === "array") {
              return [key, { type: "ARRAY", items: { type: "STRING" } }];
            }
            if (val.type === "object") {
              return [key, {
                type: "OBJECT",
                properties: {
                  nota: { type: "NUMBER" },
                  comentario: { type: "STRING" },
                },
                required: ["nota", "comentario"],
              }];
            }
            return [key, { type: val.type === "number" ? "NUMBER" : "STRING" }];
          })
        ),
        required: REQUIRED_FIELDS,
      },
    },
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini error:", response.status, errorText);
    if (response.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = await response.json();

  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) throw new Error("Gemini não retornou conteúdo");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(textContent);
  } catch {
    const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1].trim());
    } else {
      throw new Error("Gemini retornou resposta não-JSON");
    }
  }

  const usageMetadata = data.usageMetadata || {};
  return {
    analysis: validateAnalysisResult(parsed),
    tokensPrompt: usageMetadata.promptTokenCount || 0,
    tokensResposta: usageMetadata.candidatesTokenCount || 0,
  };
}

// ─── Claude (Anthropic) Provider ───

// Prompt otimizado para Claude: mais curto, direto, sem redundâncias
const CLAUDE_SYSTEM_PROMPT = `Supervisor de cobrança avaliando negociação. Seja CONCISO e DIRETO. Sem explicações teóricas.

LIMITES RÍGIDOS DE RESPOSTA:
- resumo: máx 2 frases
- pontos_fortes/pontos_melhorar/sugestoes: máx 3 itens cada, 1 frase curta por item
- erro_principal/mensagem_ideal: máx 2 frases
- Cada comentário AIDA: máx 1 frase + nota 0-10
- justificativa_conformidade: máx 1 frase
- feedback_*: máx 1 frase cada

CAMPOS OBRIGATÓRIOS:
- nivel_habilidade: "Iniciante|Em desenvolvimento|Consistente|Avançado — justificativa curta"
- tecnica_usada: "Estratégia — justificativa curta"
- tom_operador: "Classificação — observação curta"
- conformidade: "Conforme|Parcialmente Conforme|Não Conforme"
- Numéricos (0-100): risco_quebra, chance_pagamento, nota_qa, score, intencao_cliente, capacidade_percebida, firmeza_compromisso
- chance_pagamento = 0.40*intencao_cliente + 0.35*capacidade_percebida + 0.25*firmeza_compromisso
- categoria_objecao/categoria_erro: máx 3 palavras, CAIXA ALTA
- marcacoes_transcricao: 2-7 marcações com tipo (objecao|falha|boa_pratica), trecho literal (máx 10 palavras) e motivo (máx 15 palavras, obrigatório para falha e objecao)

AIDA (contexto cobrança): ATENÇÃO (abertura), INTERESSE (apresentação dívida), DESEJO (proposta + objeções), AÇÃO (fechamento).

Não inclua nomes de clientes. Resposta CURTA e OBJETIVA.`;

const MAX_TRANSCRIPTION_CHARS_CLAUDE = 4000;
const MAX_TRANSCRIPTION_CHARS_OPUS = 1500;

function truncateForClaude(text: string, maxChars = MAX_TRANSCRIPTION_CHARS_CLAUDE): string {
  if (text.length <= maxChars) return text;
  // Keep beginning and end for context (objection/closing usually at end)
  const half = Math.floor(maxChars / 2);
  return text.slice(0, half) + "\n\n[...]\n\n" + text.slice(-half);
}

// ─── Opus: Ultra-compact prompt and minimal schema for cost optimization ───

const OPUS_SYSTEM_PROMPT = `Avalie a negociação de cobrança. JSON apenas. Sem explicações. Máx 400 tokens.`;

// Minimal schema: only fields essential for Opus analysis
const OPUS_ANALYSIS_SCHEMA = {
  resumo: { type: "string", description: "Veredito em 1 frase" },
  aida_atencao: { type: "number", description: "Nota AIDA Atenção 0-10" },
  aida_interesse: { type: "number", description: "Nota AIDA Interesse 0-10" },
  aida_desejo: { type: "number", description: "Nota AIDA Desejo 0-10" },
  aida_acao: { type: "number", description: "Nota AIDA Ação 0-10" },
  erro_principal: { type: "string", description: "Erro principal, máx 10 palavras" },
  objecao: { type: "string", description: "Objeção principal do cliente, máx 10 palavras" },
  categoria_objecao: { type: "string", description: "Categoria objeção, máx 3 palavras CAIXA ALTA" },
  chance_pagamento: { type: "number", description: "0-100" },
  risco_quebra: { type: "number", description: "0-100" },
  score: { type: "number", description: "Nota geral 0-100" },
  nota_qa: { type: "number", description: "QA 0-100" },
  intencao_cliente: { type: "number", description: "0-100" },
  capacidade_percebida: { type: "number", description: "0-100" },
  firmeza_compromisso: { type: "number", description: "0-100" },
  
};

const OPUS_REQUIRED_FIELDS = Object.keys(OPUS_ANALYSIS_SCHEMA);

const OPUS_TOOL_DEFINITION = {
  name: "analise_opus",
  description: "Análise compacta de negociação de cobrança",
  input_schema: {
    type: "object",
    properties: OPUS_ANALYSIS_SCHEMA,
    required: OPUS_REQUIRED_FIELDS,
  },
};

/** Fill default values for DB fields not returned by Opus minimal schema */
function expandOpusResult(compact: Record<string, unknown>): AIAnalysisResult {
  return {
    resumo: String(compact.resumo || ""),
    pontos_fortes: [],
    pontos_melhorar: [],
    sugestoes: [],
    aida_atencao: { nota: Number(compact.aida_atencao) || 0, comentario: "" },
    aida_interesse: { nota: Number(compact.aida_interesse) || 0, comentario: "" },
    aida_desejo: { nota: Number(compact.aida_desejo) || 0, comentario: "" },
    aida_acao: { nota: Number(compact.aida_acao) || 0, comentario: "" },
    tecnica_usada: "",
    objecao: String(compact.objecao || ""),
    tom_operador: "",
    risco_quebra: Number(compact.risco_quebra) || 0,
    chance_pagamento: Number(compact.chance_pagamento) || 0,
    erro_principal: String(compact.erro_principal || ""),
    mensagem_ideal: "",
    nota_qa: Number(compact.nota_qa) || 0,
    nivel_habilidade: "",
    conformidade: "",
    justificativa_conformidade: "",
    score: Number(compact.score) || 0,
    categoria_objecao: String(compact.categoria_objecao || ""),
    categoria_erro: "",
    feedback_diagnostico: "",
    feedback_orientacao: "",
    feedback_exercicio: "",
    feedback_exemplo: "",
    marcacoes_transcricao: [],
    intencao_cliente: Number(compact.intencao_cliente) || 0,
    capacidade_percebida: Number(compact.capacidade_percebida) || 0,
    firmeza_compromisso: Number(compact.firmeza_compromisso) || 0,
  };
}

// Cost alert threshold in BRL
const COST_ALERT_THRESHOLD_BRL = 0.30;
const USD_TO_BRL = 5.5;

async function callClaude(apiKey: string, model: string, userPrompt: string, maxRetries = 3, systemPrompt = CLAUDE_SYSTEM_PROMPT, maxTokens = 4096): Promise<AIProviderResult> {
  console.log(`[analisar-negociacao] Claude modelo: ${model}, max_tokens: ${maxTokens}`);

  const toolDef = {
    name: "analise_negociacao",
    description: "Análise estruturada de negociação de cobrança. Seja conciso.",
    input_schema: {
      type: "object",
      properties: ANALYSIS_SCHEMA,
      required: REQUIRED_FIELDS,
    },
  };

  const body = JSON.stringify({
    model,
    max_tokens: maxTokens,
    temperature: 0.2,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    tools: [toolDef],
    tool_choice: { type: "tool", name: "analise_negociacao" },
  });

  let response: Response | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body,
    });
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "0", 10);
      const delay = Math.max(retryAfter * 1000, (attempt + 1) * 2000);
      console.log(`Claude rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await response.text();
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    break;
  }

  if (!response || !response.ok) {
    const status = response?.status;
    const errorText = response ? await response.text() : "no response";
    console.error("Claude error:", status, errorText);
    if (status === 429) throw new Error("RATE_LIMITED");
    throw new Error(`Claude error: ${status}`);
  }

  const data = await response.json();

  // Check for truncation
  if (data.stop_reason === "max_tokens") {
    console.warn("[analisar-negociacao] Claude response truncated (max_tokens). Consider increasing limit.");
  }

  // Extract tool_use block
  const toolUseBlock = data.content?.find((b: { type: string }) => b.type === "tool_use");
  if (!toolUseBlock?.input) throw new Error("Claude não retornou resultado estruturado (tool_use)");

  const parsed = toolUseBlock.input as Record<string, unknown>;
  const usage = data.usage || {};

  return {
    analysis: validateAnalysisResult(parsed),
    tokensPrompt: usage.input_tokens || 0,
    tokensResposta: usage.output_tokens || 0,
  };
}

// ─── Claude Opus (minimal schema, cost-optimized) ───

async function callClaudeOpus(apiKey: string, model: string, userPrompt: string, maxRetries = 3): Promise<AIProviderResult> {
  console.log(`[analisar-negociacao] Opus otimizado: modelo=${model}, max_tokens=1000`);

  const body = JSON.stringify({
    model,
    max_tokens: 1000,
    temperature: 0.2,
    system: OPUS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    tools: [OPUS_TOOL_DEFINITION],
    tool_choice: { type: "tool", name: "analise_opus" },
  });

  let response: Response | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body,
    });
    if (response.status === 429) {
      const delay = (attempt + 1) * 2000;
      console.log(`Opus rate limited, retrying in ${delay}ms`);
      await response.text();
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    break;
  }

  if (!response || !response.ok) {
    const status = response?.status;
    const errorText = response ? await response.text() : "no response";
    console.error("Opus error:", status, errorText);
    if (status === 429) throw new Error("RATE_LIMITED");
    throw new Error(`Opus error: ${status}`);
  }

  const data = await response.json();
  if (data.stop_reason === "max_tokens") {
    console.warn("[analisar-negociacao] Opus truncated (max_tokens).");
  }

  const toolUseBlock = data.content?.find((b: { type: string }) => b.type === "tool_use");
  if (!toolUseBlock?.input) throw new Error("Opus não retornou resultado estruturado");

  const compact = toolUseBlock.input as Record<string, unknown>;
  const usage = data.usage || {};

  return {
    analysis: expandOpusResult(compact),
    tokensPrompt: usage.input_tokens || 0,
    tokensResposta: usage.output_tokens || 0,
  };
}

// ─── Dialogue Structuring (post-transcription) ───

const STRUCTURING_PROMPT = `Você é um assistente especializado em transcrições de cobrança. Sua tarefa é reorganizar a transcrição bruta abaixo em formato de diálogo estruturado.

REGRAS OBRIGATÓRIAS:
1. NÃO invente conteúdo. Use APENAS o texto original.
2. Separe as falas entre OPERADOR e CLIENTE.
3. Se não for possível identificar quem falou, use: FALANTE NÃO IDENTIFICADO
4. Mantenha a ordem cronológica original.
5. Corrija apenas quebras de linha e pontuação mínima para legibilidade.
6. NÃO resuma, NÃO omita trechos, NÃO adicione comentários.

FORMATO DE SAÍDA (texto puro, sem JSON):
OPERADOR: [fala do operador]
CLIENTE: [fala do cliente]
OPERADOR: [fala do operador]
...

DICAS PARA IDENTIFICAÇÃO:
- O operador geralmente: se identifica no início, menciona empresa/carteira, apresenta propostas, valores, condições de pagamento.
- O cliente geralmente: responde perguntas, apresenta objeções, faz perguntas sobre valores, confirma ou recusa propostas.
- Mudanças de turno são indicadas por mudança de contexto, perguntas seguidas de respostas, ou pausas naturais no diálogo.`;

async function structureTranscription(apiKey: string, rawText: string, operador: string): Promise<string> {
  console.log(`[analisar-negociacao] Estruturando transcrição em diálogo...`);

  const userMsg = `Operador da negociação: ${operador}\n\nTranscrição bruta:\n${rawText}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: STRUCTURING_PROMPT },
        { role: "user", content: userMsg },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[analisar-negociacao] Structuring error:", errorText);
    console.log("[analisar-negociacao] Usando transcrição bruta como fallback");
    return rawText;
  }

  const data = await response.json();
  const structured = data.choices?.[0]?.message?.content?.trim();

  if (!structured || structured.length < rawText.length * 0.3) {
    console.log("[analisar-negociacao] Estruturação retornou resultado insuficiente, usando bruta");
    return rawText;
  }

  console.log(`[analisar-negociacao] Transcrição estruturada com sucesso (${structured.length} chars)`);
  return structured;
}

// ─── Main Handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    // Determine AI provider — only founder can override
    const FOUNDER_EMAIL = "thiago@thiagoanalytics.com.br";
    const rawPayload = await req.json();
    const { operador, carteira, canal, transcricao, audio_urls, duracao_audio_total: clientDuration } = rawPayload as AnalysisPayload;
    const audioDebug = rawPayload.audio_debug as Record<string, unknown>[] | undefined;

    // Log audio debug info from frontend preprocessing
    if (audioDebug && audioDebug.length > 0) {
      console.log(`[analisar-negociacao] === AUDIO DEBUG (frontend preprocessing) ===`);
      for (const [i, info] of audioDebug.entries()) {
        console.log(`[analisar-negociacao] Audio ${i + 1}:`, JSON.stringify(info));
      }
    }
    const requestedProvider = rawPayload.provider as string | undefined;
    // Provider override is ignored for non-founder users (validated after auth below)
    let pendingProvider = requestedProvider;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only founder can override provider; ignore for all other users
    const isFounder = user.email === FOUNDER_EMAIL;
    let aiProvider = (isFounder && pendingProvider ? pendingProvider : Deno.env.get("AI_PROVIDER") || "gemini").toLowerCase();
    let model: string;
    let aiApiKey: string;

    if (aiProvider === "claude") {
      aiApiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
      model = "claude-sonnet-4-20250514";
      if (!aiApiKey) throw new Error("ANTHROPIC_API_KEY não configurada");
    } else if (aiProvider === "opus") {
      aiApiKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
      model = "claude-opus-4-6";
      if (!aiApiKey) throw new Error("ANTHROPIC_API_KEY não configurada");
    } else if (aiProvider === "gemini") {
      aiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
      model = Deno.env.get("GEMINI_MODEL") || "gemini-3.1-pro-preview";
      if (!aiApiKey) throw new Error("GEMINI_API_KEY não configurada");
    } else {
      aiApiKey = Deno.env.get("OPENAI_API_KEY") || "";
      model = Deno.env.get("OPENAI_MODEL") || "gpt-4.1";
      if (!aiApiKey) throw new Error("OPENAI_API_KEY não configurada");
    }

    console.log(`[analisar-negociacao] Provider: ${aiProvider}, Modelo: ${model}, Founder: ${isFounder}`);

    // payload already parsed above

    if (!operador || !carteira || !canal) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: operador, carteira, canal" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!transcricao && (!audio_urls || audio_urls.length === 0)) {
      return new Response(JSON.stringify({ error: "Envie pelo menos o texto da conversa ou arquivos de áudio." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("empresa_id").eq("id", user.id).single();

    if (!profile?.empresa_id) {
      return new Response(JSON.stringify({ error: "Configure sua empresa antes de criar análises." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch portfolio-specific negotiation rules (only active)
    const { data: portfolioRules } = await supabaseAdmin
      .from("portfolio_negotiation_rules")
      .select("*")
      .eq("empresa_id", profile.empresa_id)
      .eq("carteira", carteira)
      .eq("is_active", true)
      .maybeSingle();

    let portfolioContext = "";
    if (portfolioRules) {
      console.log(`[analisar-negociacao] ✅ REGRA PERSONALIZADA da carteira "${carteira}" ativa — avaliação será ajustada`);
      const permissions: string[] = [];
      if (portfolioRules.can_offer_discount) permissions.push("ofertar desconto");
      if (portfolioRules.can_offer_installments) permissions.push("ofertar parcelamento");
      if (portfolioRules.can_confirm_payment_date) permissions.push("confirmar data de pagamento");
      if (portfolioRules.can_generate_boleto) permissions.push("gerar boleto");
      if (portfolioRules.can_discuss_reactivation) permissions.push("discutir reativação");
      if (portfolioRules.can_promise_plan_maintenance) permissions.push("prometer manutenção do plano");
      if (portfolioRules.can_close_on_first_contact) permissions.push("fechar no primeiro contato");

      const denied: string[] = [];
      if (!portfolioRules.can_offer_discount) denied.push("ofertar desconto");
      if (!portfolioRules.can_offer_installments) denied.push("ofertar parcelamento");
      if (!portfolioRules.can_confirm_payment_date) denied.push("confirmar data de pagamento");
      if (!portfolioRules.can_generate_boleto) denied.push("gerar boleto");
      if (!portfolioRules.can_discuss_reactivation) denied.push("discutir reativação");
      if (!portfolioRules.can_promise_plan_maintenance) denied.push("prometer manutenção do plano");
      if (!portfolioRules.can_close_on_first_contact) denied.push("fechar no primeiro contato");

      const objectiveMap: Record<string, string> = {
        fechamento: "Fechamento de acordo",
        retencao: "Retenção do cliente",
        triagem: "Triagem e encaminhamento",
        encaminhamento: "Encaminhamento para setor responsável",
        cobranca_com_proposta: "Cobrança com proposta de acordo",
        cobranca_proposta: "Cobrança com proposta de acordo",
        cobranca_informativa: "Cobrança informativa (sem proposta)",
      };

      portfolioContext = `\n\n=== REGRAS ESPECÍFICAS DA CARTEIRA "${carteira}" ===
Objetivo da abordagem: ${objectiveMap[portfolioRules.approach_objective || "fechamento"] || portfolioRules.approach_objective}
O operador PODE: ${permissions.join(", ") || "nenhuma ação permitida"}
O operador NÃO PODE: ${denied.join(", ") || "sem restrições"}`;

      if (portfolioRules.forbidden_terms) {
        portfolioContext += `\nTermos/promessas proibidos: ${portfolioRules.forbidden_terms}`;
      }
      if (portfolioRules.mandatory_guidelines) {
        portfolioContext += `\nDiretrizes obrigatórias: ${portfolioRules.mandatory_guidelines}`;
      }

      // Conflict resolution: mandatory_guidelines override forbidden_terms
      if (portfolioRules.forbidden_terms && portfolioRules.mandatory_guidelines) {
        portfolioContext += `\n\n⚠️ REGRA DE RESOLUÇÃO DE CONFLITOS ENTRE RESTRIÇÕES E DIRETRIZES:
Quando houver aparente conflito entre "Termos/promessas proibidos" e "Diretrizes obrigatórias", aplique esta hierarquia:
1. PROIBIDO: o que está explicitamente listado nos termos proibidos (ex: prometer retorno de limite, citar valor de limite).
2. PERMITIDO SOB CONDIÇÃO: quando uma diretriz obrigatória autoriza uma informação que se assemelha a um termo proibido, mas com escopo diferente. Exemplo: se os termos proíbem "prometer retorno de limite do cartão", mas as diretrizes obrigatórias preveem "após quitação total, o cliente pode voltar a utilizar o cartão em até X dias úteis", o operador NÃO deve ser penalizado por informar essa diretriz ao cliente.
3. A diretriz obrigatória sempre prevalece sobre interpretações genéricas de bloqueio.
4. NÃO penalize o operador por reproduzir corretamente uma informação prevista nas diretrizes obrigatórias da carteira.
5. Diferencie semanticamente: "retorno de limite" (proibido) vs "possibilidade de uso do cartão após quitação total" (permitido se constar nas diretrizes).
6. Ao avaliar conformidade e score, verifique se a fala do operador está aderente ao texto das diretrizes antes de classificar como violação.`;
      }

      if (portfolioRules.non_negotiable_cases) {
        portfolioContext += `\nCasos para encaminhar a outro setor: ${portfolioRules.non_negotiable_cases}`;
      }
      if (portfolioRules.negotiation_possible_conditions) {
        portfolioContext += `\nCondições possíveis de negociação: ${portfolioRules.negotiation_possible_conditions}`;
      }
      if (portfolioRules.exclude_from_score_conditions) {
        portfolioContext += `\nCASOS SEM NEGOCIAÇÃO ELEGÍVEL (não penalizar operador): ${portfolioRules.exclude_from_score_conditions}`;
      }
      if (portfolioRules.observations) {
        portfolioContext += `\nObservações da carteira: ${portfolioRules.observations}`;
      }

      const criteria = portfolioRules.evaluation_criteria as string[] | null;
      if (criteria && criteria.length > 0) {
        const criteriaLabels: Record<string, string> = {
          fechamento: "fechamento", contorno_objecoes: "contorno de objeções",
          tentativa_compromisso: "tentativa de compromisso", confirmacao_data: "confirmação de data",
          proposta_financeira: "proposta financeira", orientacao_correta: "orientação correta",
          encaminhamento_correto: "encaminhamento correto",
        };
        portfolioContext += `\nCritérios de avaliação priorizados: ${criteria.map(c => criteriaLabels[c] || c).join(", ")}`;
      }

      portfolioContext += `\n\nIMPORTANTE: Avalie o operador de acordo com essas regras específicas da carteira. Se a negociação se enquadrar em um caso "sem negociação elegível", NÃO penalize o operador por não ter conduzido fechamento. Nesse caso, avalie apenas a qualidade do atendimento e orientação.
=== FIM DAS REGRAS DA CARTEIRA ===`;
    } else {
      console.log(`[analisar-negociacao] ℹ️ REGRA PADRÃO — sem regra ativa para carteira "${carteira}"`);
    }

    // Audio transcription (always uses OpenAI Whisper)
    let finalTranscricao = transcricao || "";
    let totalAudioDuration = clientDuration || 0;

    if (!finalTranscricao && audio_urls && audio_urls.length > 0) {
      const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";
      if (!openaiKey) throw new Error("OPENAI_API_KEY necessária para transcrição de áudio");

      console.log(`[analisar-negociacao] Transcrevendo ${audio_urls.length} áudio(s)...`);
      const transcriptions: string[] = [];
      let totalDuration = 0;

      for (const url of audio_urls) {
        const result = await transcribeAudio(openaiKey, url, supabaseAdmin);
        transcriptions.push(result.text);
        totalDuration += result.duration;
      }

      finalTranscricao = transcriptions.join("\n\n");
      totalAudioDuration = Math.round(totalDuration);
      console.log(`[analisar-negociacao] Transcrição concluída. Duração: ${totalAudioDuration}s`);
    }

    if (!finalTranscricao) {
      return new Response(JSON.stringify({ error: "Não foi possível obter a transcrição." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Post-process: structure audio transcriptions into OPERADOR/CLIENTE dialogue
    const isAudioCanal = canal.toLowerCase().includes("call") || canal.toLowerCase().includes("ligação") || canal.toLowerCase().includes("ligacao") || canal.toLowerCase().includes("telefone") || canal.toLowerCase().includes("audio") || canal.toLowerCase().includes("áudio");
    const hasDialogueFormat = /^(OPERADOR|CLIENTE|operador|cliente)\s*:/m.test(finalTranscricao);

    if (isAudioCanal && !hasDialogueFormat) {
      const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";
      if (openaiKey) {
        finalTranscricao = await structureTranscription(openaiKey, finalTranscricao, operador);
      }
    }

    const userPrompt = `Analise a seguinte negociação de cobrança. Preencha TODOS os campos obrigatoriamente com informações específicas desta transcrição.

Operador: ${operador}
Carteira: ${carteira}
Canal: ${canal}
${portfolioContext}
Transcrição:
${finalTranscricao}`;

    // Call AI provider
    const startTime = Date.now();
    let aiResult: AIProviderResult;

    try {
      if (aiProvider === "opus") {
        const truncated = truncateForClaude(finalTranscricao, MAX_TRANSCRIPTION_CHARS_OPUS);
        const opusPrompt = `Operador: ${operador}\nCarteira: ${carteira}\nCanal: ${canal}\n\n${truncated}`;
        aiResult = await callClaudeOpus(aiApiKey, model, opusPrompt);
      } else if (aiProvider === "claude") {
        const claudePrompt = userPrompt.replace(/Transcrição:\n[\s\S]*$/, `Transcrição:\n${truncateForClaude(finalTranscricao)}`);
        aiResult = await callClaude(aiApiKey, model, claudePrompt);
      } else if (aiProvider === "gemini") {
        aiResult = await callGemini(aiApiKey, model, userPrompt);
      } else {
        aiResult = await callOpenAI(aiApiKey, model, userPrompt);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "RATE_LIMITED") {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback: se Gemini falhou e não é override do founder, tenta OpenAI
      if (aiProvider === "gemini" && !(isFounder && pendingProvider)) {
        const geminiError = e instanceof Error ? e.message : "unknown";
        console.warn(`[analisar-negociacao] ⚠️ Gemini falhou (${geminiError}), tentando fallback OpenAI...`);
        try {
          const fallbackKey = Deno.env.get("OPENAI_API_KEY") || "";
          if (fallbackKey) {
            const fallbackModel = Deno.env.get("OPENAI_MODEL") || "gpt-4.1";
            model = fallbackModel;
            aiProvider = "openai (fallback)";
            aiResult = await callOpenAI(fallbackKey, fallbackModel, userPrompt);
            console.log(`[analisar-negociacao] ✅ Fallback OpenAI (${fallbackModel}) bem-sucedido após falha Gemini: ${geminiError}`);
          } else {
            throw e;
          }
        } catch (fallbackErr: unknown) {
          console.error(`[analisar-negociacao] ❌ Fallback OpenAI também falhou: ${fallbackErr instanceof Error ? fallbackErr.message : "unknown"}`);
          throw e;
        }
      } else {
        throw e;
      }
    }

    const { analysis, tokensPrompt, tokensResposta } = aiResult;
    const tempoResposta = Math.round((Date.now() - startTime) / 100) / 10;
    const tokensTotal = tokensPrompt + tokensResposta;
    const custoEstimado = estimateCost(model, tokensPrompt, tokensResposta);

    console.log(`[analisar-negociacao] === MÉTRICAS DA ANÁLISE ===`);
    console.log(`[analisar-negociacao] Provider: ${aiProvider}`);
    console.log(`[analisar-negociacao] Modelo: ${model}`);
    console.log(`[analisar-negociacao] Tokens prompt: ${tokensPrompt}`);
    console.log(`[analisar-negociacao] Tokens resposta: ${tokensResposta}`);
    console.log(`[analisar-negociacao] Tokens total: ${tokensTotal}`);
    console.log(`[analisar-negociacao] Custo estimado: $${custoEstimado}`);
    console.log(`[analisar-negociacao] Tempo de resposta: ${tempoResposta}s`);
    console.log(`[analisar-negociacao] Duração áudio: ${totalAudioDuration}s`);
    console.log(`[analisar-negociacao] ===========================`);

    // Cost alert
    const custoBRL = custoEstimado * USD_TO_BRL;
    if (custoBRL > COST_ALERT_THRESHOLD_BRL) {
      console.warn(`[analisar-negociacao] ⚠️ ALERTA DE CUSTO: R$${custoBRL.toFixed(2)} excede limite de R$${COST_ALERT_THRESHOLD_BRL.toFixed(2)}`);
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("analyses")
      .insert({
        user_id: user.id,
        empresa_id: profile.empresa_id,
        operador, carteira, canal,
        transcricao: finalTranscricao,
        audio_urls: audio_urls || [],
        resumo: analysis.resumo,
        pontos_fortes: analysis.pontos_fortes,
        pontos_melhorar: analysis.pontos_melhorar,
        sugestoes: analysis.sugestoes,
        aida_atencao: analysis.aida_atencao,
        aida_interesse: analysis.aida_interesse,
        aida_desejo: analysis.aida_desejo,
        
        aida_acao: analysis.aida_acao,
        tecnica_usada: analysis.tecnica_usada,
        objecao: analysis.objecao,
        tom_operador: analysis.tom_operador,
        risco_quebra: analysis.risco_quebra,
        chance_pagamento: analysis.chance_pagamento,
        erro_principal: analysis.erro_principal,
        nota_qa: analysis.nota_qa,
        nivel_habilidade: analysis.nivel_habilidade,
        mensagem_ideal: analysis.mensagem_ideal,
        conformidade: analysis.conformidade,
        justificativa_conformidade: analysis.justificativa_conformidade,
        score: analysis.score,
        categoria_objecao: analysis.categoria_objecao,
        categoria_erro: analysis.categoria_erro,
        feedback_diagnostico: analysis.feedback_diagnostico,
        feedback_orientacao: analysis.feedback_orientacao,
        feedback_exercicio: analysis.feedback_exercicio,
        feedback_exemplo: analysis.feedback_exemplo,
        marcacoes_transcricao: analysis.marcacoes_transcricao || [],
        intencao_cliente: analysis.intencao_cliente,
        capacidade_percebida: analysis.capacidade_percebida,
        firmeza_compromisso: analysis.firmeza_compromisso,
        modelo_usado: model,
        tokens_prompt: tokensPrompt,
        tokens_resposta: tokensResposta,
        tokens_total: tokensTotal,
        custo_estimado: custoEstimado,
        tempo_resposta: tempoResposta,
        duracao_audio_total: totalAudioDuration,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Erro ao salvar análise: " + insertError.message);
    }

    // Log AI usage to ai_usage_logs
    try {
      await supabaseAdmin.from("ai_usage_logs").insert({
        empresa_id: profile.empresa_id,
        user_id: user.id,
        analysis_id: inserted?.id || null,
        action_type: "analysis",
        provider: aiProvider,
        model,
        input_tokens: tokensPrompt,
        output_tokens: tokensResposta,
        audio_seconds: totalAudioDuration,
        estimated_cost_usd: custoEstimado,
        status: "success",
        metadata: { operador, carteira, canal, fallback: aiProvider.includes("fallback") || undefined },
      });
    } catch (logErr) {
      console.error("[analisar-negociacao] Failed to log AI usage:", logErr);
    }

    // Trigger cycle check in background (fire-and-forget)
    try {
      const cycleResp = await fetch(`${supabaseUrl}/functions/v1/gerar-ciclo-operador`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ operador }),
      });
      const cycleResult = await cycleResp.json();
      console.log(`[analisar-negociacao] Cycle check result:`, cycleResult.status || cycleResult.error);
    } catch (cycleErr: unknown) {
      console.error("[analisar-negociacao] Cycle check failed (non-blocking):", getErrorMessage(cycleErr));
    }

    return new Response(JSON.stringify({ 
      id: inserted?.id, 
      ...analysis,
      audio_debug: audioDebug || undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("analisar-negociacao error:", e);
    return new Response(
      JSON.stringify({ error: getErrorMessage(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
