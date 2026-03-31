import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePortfolioFilter } from "@/hooks/usePortfolioFilter";
import { PortfolioFilter } from "@/components/PortfolioFilter";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, TrendingDown, Target, MessageSquare, ChevronDown, ChevronRight, Shield } from "lucide-react";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";

// ── Objection taxonomy ──
const OBJECTION_CATEGORIES: Record<string, { label: string; color: string; subcategories: string[] }> = {
  Financeira: {
    label: "Financeira",
    color: "hsl(var(--destructive))",
    subcategories: ["Sem dinheiro", "Parcela alta", "Já paguei", "Não tenho como pagar", "Valor abusivo"],
  },
  Tempo: {
    label: "Tempo",
    color: "hsl(var(--chart-4))",
    subcategories: ["Depois eu vejo", "Não posso agora", "Mês que vem", "Estou ocupado"],
  },
  Confiança: {
    label: "Confiança",
    color: "hsl(var(--chart-2))",
    subcategories: ["Não confio", "Já fui enganado", "Isso é golpe", "Quero ver por escrito"],
  },
  Emocional: {
    label: "Emocional",
    color: "hsl(var(--chart-3))",
    subcategories: ["Estou passando dificuldade", "Problemas de saúde", "Perdi o emprego", "Situação familiar"],
  },
  Contestação: {
    label: "Contestação",
    color: "hsl(var(--chart-5))",
    subcategories: ["Não reconheço a dívida", "Já prescrever", "Vou procurar o Procon", "Não é minha"],
  },
};

const ALL_CATEGORIES = Object.keys(OBJECTION_CATEGORIES);

// ── AIDA response scripts per category ──
const OBJECTION_SCRIPTS: Record<string, {
  leitura: string;
  erroComum: string;
  scriptAida: { atencao: string; interesse: string; desejo: string; acao: string };
  variacoes: string[];
  gatilho: string;
}> = {
  Financeira: {
    leitura: "O cliente alega incapacidade financeira. Pode ser real ou uma defesa automática para evitar compromisso.",
    erroComum: "Aceitar a objeção rápido demais, reforçar a dificuldade do cliente ou oferecer desconto antes de entender a real condição de pagamento.",
    scriptAida: {
      atencao: "Entendo. Me fala com sinceridade: essa pendência hoje te preocupa ou só não é o melhor momento pra resolver?",
      interesse: "O ponto é que, quanto mais isso fica em aberto, mais essa situação pesa pra você. Por isso, o ideal é a gente encontrar uma forma que caiba de verdade no seu orçamento.",
      desejo: "Se eu conseguir ajustar uma condição dentro da sua realidade, você já começa a resolver isso sem deixar o problema crescer.",
      acao: "Pra eu não te passar nada fora da sua condição, qual valor você conseguiria assumir de entrada e em qual data ficaria mais viável pra você?",
    },
    variacoes: [
      "Hoje o problema é falta total de recurso ou só não é o melhor momento?",
      "Perto de que data você teria mais condição de começar?",
      "Qual valor ficaria possível pra você sem comprometer seu orçamento?",
      "Se eu ajustar isso pra uma condição viável, você consegue resolver hoje?",
    ],
    gatilho: "Então vamos montar isso dentro do que realmente cabe pra você e já evitar que essa pendência continue em aberto.",
  },
  Tempo: {
    leitura: "O cliente posterga a decisão. Geralmente isso indica falta de urgência, tentativa de adiar a conversa ou desejo de evitar confronto.",
    erroComum: "Aceitar o adiamento de forma passiva, sem transformar a fala do cliente em data concreta, compromisso real ou senso de consequência.",
    scriptAida: {
      atencao: "Perfeito, eu entendo que talvez agora não seja o melhor momento. Mas antes de deixar isso pra depois, preciso alinhar uma coisa importante com você.",
      interesse: "O que costuma acontecer é que, quando isso vai sendo adiado, a pendência continua em aberto e a condição de hoje pode não ser a mesma depois.",
      desejo: "Se a gente já deixar isso alinhado agora, você evita esquecer, evita novo desgaste e já resolve da forma mais organizada.",
      acao: "Me fala só uma coisa: qual é a data real em que você consegue avançar com isso? Assim eu já deixo alinhado da forma certa.",
    },
    variacoes: [
      "Essa data que você está me falando é uma previsão ou um dia em que você realmente consegue pagar?",
      "Qual dia exatamente fica viável pra você?",
      "Se eu deixar a condição ajustada pra essa data, você assume esse compromisso?",
      "Quer que eu já deixe isso organizado com vencimento no dia que faz sentido pra você?",
    ],
    gatilho: "Então vamos sair da intenção e deixar isso combinado da forma mais prática pra você.",
  },
  Confiança: {
    leitura: "O cliente desconfia da legitimidade da cobrança, do canal ou da empresa. Pode ter histórico de fraude ou simplesmente não reconhece o contato.",
    erroComum: "Ficar na defensiva, pressionar o cliente ou ignorar a preocupação sem antes validar e construir credibilidade com informações concretas.",
    scriptAida: {
      atencao: "Entendo totalmente sua preocupação, e é importante mesmo que você questione. Deixa eu te explicar exatamente quem eu sou e por que estou entrando em contato.",
      interesse: "Eu consigo confirmar dados parciais seus pra você ter segurança de que esse contato é legítimo. Também posso te orientar a consultar diretamente no site do credor.",
      desejo: "Resolver por aqui evita que você precise se deslocar ou passar por processos mais demorados. E tudo fica registrado e documentado.",
      acao: "Quer que eu confirme seus dados parciais agora pra você ter certeza? Depois a gente vê a melhor forma de resolver.",
    },
    variacoes: [
      "Se preferir, posso te passar o protocolo pra você consultar direto no site do credor.",
      "Vou confirmar só os últimos dígitos do seu documento pra você ter segurança de que o contato é real.",
      "Posso enviar tudo por escrito no seu e-mail ou WhatsApp. Qual fica melhor?",
      "Entendo o cuidado. Quer que eu explique exatamente de onde vem essa pendência antes de falar de valor?",
    ],
    gatilho: "Vou te enviar tudo documentado pra você ter total segurança. Me confirma o melhor canal pra isso.",
  },
  Emocional: {
    leitura: "O cliente está fragilizado emocionalmente — pode estar passando por dificuldades pessoais, de saúde ou familiares. Precisa de acolhimento antes de qualquer proposta.",
    erroComum: "Ignorar o estado emocional do cliente e ir direto para valores e condições, ou usar a fragilidade como argumento de pressão.",
    scriptAida: {
      atencao: "Sinto muito pelo que você está passando. Antes de falar sobre qualquer valor, quero entender como posso te ajudar da melhor forma.",
      interesse: "Existem condições diferenciadas justamente pra situações como a sua. O importante é a gente encontrar algo que não te sobrecarregue ainda mais.",
      desejo: "Resolver essa pendência pode ser uma preocupação a menos no meio de tudo que você está enfrentando. E a gente faz isso no seu ritmo.",
      acao: "Me conta: qual seria um valor mensal que não comprometeria você nesse momento? A gente parte daí.",
    },
    variacoes: [
      "Não precisa decidir nada agora. Me fala só o que seria possível dentro da sua realidade.",
      "Muita gente na mesma situação se sentiu mais leve depois de organizar isso. Quer que eu veja as opções mais leves?",
      "Se a gente deixar isso resolvido, é uma coisa a menos pra se preocupar. Qual valor faria sentido pra você?",
      "Eu entendo que o momento é difícil. Vamos ver juntos o que é viável, sem pressão.",
    ],
    gatilho: "Vamos resolver isso de um jeito que respeite o seu momento. Me fala o que cabe pra você e eu organizo daqui.",
  },
  Contestação: {
    leitura: "O cliente questiona a existência, a validade ou a propriedade da dívida. Pode ser um caso legítimo ou uma estratégia de evasão.",
    erroComum: "Confrontar o cliente, insistir que a dívida existe sem apresentar evidências, ou ignorar a contestação sem investigar os detalhes.",
    scriptAida: {
      atencao: "Entendo. É importante que tudo esteja correto. Vou verificar com você ponto a ponto pra esclarecer qualquer dúvida.",
      interesse: "Consigo te mostrar a origem da pendência, o contrato e os detalhes. Assim você tem clareza total antes de qualquer decisão.",
      desejo: "Mesmo que exista dúvida, deixar isso resolvido agora evita que continue impactando seu nome e gera tranquilidade pra você.",
      acao: "Qual parte exatamente você não reconhece? Me conta pra eu verificar aqui e te dar uma resposta concreta.",
    },
    variacoes: [
      "Vamos esclarecer item por item. Me diz o que exatamente te parece estranho.",
      "Posso te enviar a documentação completa pra você analisar com calma. Qual seu e-mail?",
      "Se depois de verificar fizer sentido pra você, a gente já aproveita e resolve na melhor condição.",
      "Entendo a contestação. Quer que eu puxe os dados do contrato original pra a gente conferir juntos?",
    ],
    gatilho: "Vou te enviar toda a documentação e, se tudo fizer sentido, a gente já resolve na melhor condição. Me passa seu e-mail.",
  },
};

// ── Helper: normalize category from analysis ──
function normalizeCategory(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  if (lower.includes("financ") || lower.includes("dinheiro") || lower.includes("pag") || lower.includes("valor")) return "Financeira";
  if (lower.includes("tempo") || lower.includes("depois") || lower.includes("agora") || lower.includes("ocupad")) return "Tempo";
  if (lower.includes("confi") || lower.includes("golpe") || lower.includes("engan")) return "Confiança";
  if (lower.includes("emocio") || lower.includes("saúde") || lower.includes("dificuldade") || lower.includes("emprego")) return "Emocional";
  if (lower.includes("contest") || lower.includes("reconhe") || lower.includes("procon") || lower.includes("prescr")) return "Contestação";
  return null;
}

// ── AIDA stage from analysis ──
function getWeakestAidaStage(a: any): string {
  const stages = [
    { name: "Atenção", val: (a.aida_atencao as any)?.nota ?? 10 },
    { name: "Interesse", val: (a.aida_interesse as any)?.nota ?? 10 },
    { name: "Desejo", val: (a.aida_desejo as any)?.nota ?? 10 },
    { name: "Ação", val: (a.aida_acao as any)?.nota ?? 10 },
  ];
  return stages.reduce((min, s) => (s.val < min.val ? s : min), stages[0]).name;
}

// ── Severity badge ──
function SeverityBadge({ value }: { value: number }) {
  if (value >= 50) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Saudável</Badge>;
  if (value >= 30) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Atenção</Badge>;
  return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Crítico</Badge>;
}

export default function ObjectionMap() {
  const { profile } = useAuth();
  const { carteiras, selected, setSelected, showAllOption, filterByCarteira } = usePortfolioFilter();
  const [operatorFilter, setOperatorFilter] = useState("Todos");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  // Company filter for founder
  const { isFounder, getEmpresaFilter } = useCompanyFilter();
  const empresaFilter = getEmpresaFilter();

  // Fetch analyses
  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ["objection-map-analyses", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("analyses")
        .select("operador, carteira, categoria_objecao, objecao, chance_pagamento, aida_atencao, aida_interesse, aida_desejo, aida_acao, score")
        .not("categoria_objecao", "is", null);

      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  // Fetch operators with financial data
  const { data: operators = [] } = useQuery({
    queryKey: ["objection-map-operators", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("operators")
        .select("nome, carteira, valor_pago_periodo")
        .eq("status", "ativo");

      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  // Apply filters
  const filtered = useMemo(() => {
    let items = analyses;
    if (selected !== "Todas") items = items.filter((a) => a.carteira === selected);
    if (operatorFilter !== "Todos") items = items.filter((a) => a.operador === operatorFilter);
    return items;
  }, [analyses, selected, operatorFilter]);

  const uniqueOperators = useMemo(() => [...new Set(analyses.map((a) => a.operador))].sort(), [analyses]);

  // ── Compute objection stats ──
  const objectionStats = useMemo(() => {
    const catMap: Record<string, { count: number; highChance: number; totalChance: number; operators: Record<string, number>; aidaStages: Record<string, number>; subcategories: Record<string, number> }> = {};

    for (const a of filtered) {
      const cat = normalizeCategory(a.categoria_objecao);
      if (!cat) continue;

      if (!catMap[cat]) catMap[cat] = { count: 0, highChance: 0, totalChance: 0, operators: {}, aidaStages: {}, subcategories: {} };
      const entry = catMap[cat];
      entry.count++;
      entry.totalChance += a.chance_pagamento ?? 0;
      if ((a.chance_pagamento ?? 0) >= 60) entry.highChance++;

      entry.operators[a.operador] = (entry.operators[a.operador] || 0) + 1;

      const stage = getWeakestAidaStage(a);
      entry.aidaStages[stage] = (entry.aidaStages[stage] || 0) + 1;

      // Map raw objection text to subcategory
      const objecao = a.objecao?.toLowerCase() ?? "";
      const catDef = OBJECTION_CATEGORIES[cat];
      if (catDef) {
        const matched = catDef.subcategories.find((s) => objecao.includes(s.toLowerCase()));
        const subKey = matched || "Outras";
        entry.subcategories[subKey] = (entry.subcategories[subKey] || 0) + 1;
      }
    }

    return ALL_CATEGORIES
      .filter((c) => catMap[c])
      .map((c) => ({
        category: c,
        ...catMap[c],
        conversionRate: catMap[c].count > 0 ? Math.round((catMap[c].highChance / catMap[c].count) * 100) : 0,
        avgChance: catMap[c].count > 0 ? Math.round(catMap[c].totalChance / catMap[c].count) : 0,
        topOperator: Object.entries(catMap[c].operators).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-",
        dominantAidaStage: Object.entries(catMap[c].aidaStages).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-",
      }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  // Financial impact
  const operatorMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const op of operators) map[op.nome] = (map[op.nome] || 0) + (op.valor_pago_periodo ?? 0);
    return map;
  }, [operators]);

  // Treemap data
  const treemapData = useMemo(() => {
    return objectionStats.map((s) => ({
      name: s.category,
      size: s.count,
      fill: OBJECTION_CATEGORIES[s.category]?.color ?? "hsl(var(--muted))",
    }));
  }, [objectionStats]);

  // Chart data for ranking
  const chartData = useMemo(() => {
    return objectionStats.map((s) => ({
      name: s.category,
      value: s.count,
      conversion: s.conversionRate,
    }));
  }, [objectionStats]);

  const totalObjections = filtered.length;

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Mapa de Objeções" description="Carregando dados..." />
        <div className="animate-pulse space-y-4 mt-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Mapa de Objeções" description="Classificação, análise e scripts de resposta para objeções" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <PortfolioFilter carteiras={carteiras} selected={selected} onSelect={setSelected} showAllOption={showAllOption} />
        <Select value={operatorFilter} onValueChange={setOperatorFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Operador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os operadores</SelectItem>
            {uniqueOperators.map((op) => <SelectItem key={op} value={op}>{op}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {totalObjections === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma objeção classificada encontrada para os filtros selecionados.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total de Objeções</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalObjections}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Categorias Ativas</p>
                <p className="text-2xl font-bold text-foreground mt-1">{objectionStats.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Objeção Mais Frequente</p>
                <p className="text-2xl font-bold text-foreground mt-1">{objectionStats[0]?.category ?? "-"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Menor Conversão</p>
                <p className="text-2xl font-bold text-destructive mt-1">
                  {objectionStats.length > 0 ? `${Math.min(...objectionStats.map((s) => s.conversionRate))}%` : "-"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="scripts">Scripts de Resposta</TabsTrigger>
              <TabsTrigger value="operators">Por Operador</TabsTrigger>
            </TabsList>

            {/* ═══ TAB: Overview ═══ */}
            <TabsContent value="overview" className="space-y-6">
              {/* Chart + Treemap */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Ranking de Objeções</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} width={100} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                        <Bar dataKey="value" name="Ocorrências" radius={[0, 6, 6, 0]}>
                          {chartData.map((d, i) => <Cell key={i} fill={OBJECTION_CATEGORIES[d.name]?.color ?? "hsl(var(--primary))"} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Árvore de Objeções</CardTitle></CardHeader>
                  <CardContent>
                    {treemapData.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {treemapData.map((d) => (
                          <div
                            key={d.name}
                            className="rounded-lg p-4 flex flex-col items-center justify-center text-center"
                            style={{ backgroundColor: d.fill, opacity: 0.85, minHeight: `${Math.max(60, d.size * 8)}px` }}
                          >
                            <span className="text-sm font-bold text-primary-foreground">{d.name}</span>
                            <span className="text-xs text-primary-foreground/80">{d.size}x</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">Sem dados para exibir</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Main table */}
              <Card>
                <CardHeader><CardTitle className="text-base">Detalhamento por Categoria</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-center">Ocorrências</TableHead>
                        <TableHead className="text-center">% do Total</TableHead>
                        <TableHead className="text-center">Conversão</TableHead>
                        <TableHead className="text-center">Chance Média</TableHead>
                        <TableHead>Etapa AIDA Fraca</TableHead>
                        <TableHead>Operador + Exposto</TableHead>
                        <TableHead className="text-center">Saúde</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {objectionStats.map((s) => (
                        <>
                          <TableRow
                            key={s.category}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setExpandedCat(expandedCat === s.category ? null : s.category)}
                          >
                            <TableCell className="font-medium flex items-center gap-2">
                              {expandedCat === s.category ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: OBJECTION_CATEGORIES[s.category]?.color }} />
                              {s.category}
                            </TableCell>
                            <TableCell className="text-center font-semibold">{s.count}</TableCell>
                            <TableCell className="text-center">{Math.round((s.count / totalObjections) * 100)}%</TableCell>
                            <TableCell className="text-center font-semibold">{s.conversionRate}%</TableCell>
                            <TableCell className="text-center">{s.avgChance}%</TableCell>
                            <TableCell>
                              <Badge variant="outline">{s.dominantAidaStage}</Badge>
                            </TableCell>
                            <TableCell>{s.topOperator}</TableCell>
                            <TableCell className="text-center"><SeverityBadge value={s.conversionRate} /></TableCell>
                          </TableRow>
                          {expandedCat === s.category && (
                            <TableRow key={`${s.category}-sub`}>
                              <TableCell colSpan={8} className="bg-muted/30 p-4">
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase">Subcategorias</p>
                                  <div className="flex flex-wrap gap-2">
                                    {Object.entries(s.subcategories)
                                      .sort((a, b) => b[1] - a[1])
                                      .map(([sub, count]) => (
                                        <Badge key={sub} variant="secondary" className="text-xs">
                                          {sub} ({count})
                                        </Badge>
                                      ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ TAB: Scripts ═══ */}
            <TabsContent value="scripts" className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Scripts de resposta estruturados em AIDA para cada categoria de objeção. Use para treinamento e orientação da equipe.
              </p>
              {objectionStats.map((s) => {
                const script = OBJECTION_SCRIPTS[s.category];
                if (!script) return null;
                return (
                  <Card key={s.category} className="overflow-hidden">
                    <CardHeader className="pb-3" style={{ borderLeft: `4px solid ${OBJECTION_CATEGORIES[s.category]?.color}` }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            {s.category}
                            <Badge variant="outline" className="ml-2 text-xs">{s.count} ocorrências</Badge>
                          </CardTitle>
                          <CardDescription className="mt-1">{script.leitura}</CardDescription>
                        </div>
                        <SeverityBadge value={s.conversionRate} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-4">
                      {/* Common error */}
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                        <p className="text-xs font-bold text-destructive flex items-center gap-1.5 uppercase tracking-wide">
                          <AlertTriangle className="h-3.5 w-3.5" /> Erro Comum do Operador
                        </p>
                        <p className="text-sm text-foreground mt-2 leading-relaxed">{script.erroComum}</p>
                      </div>

                      {/* AIDA Script */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(["atencao", "interesse", "desejo", "acao"] as const).map((stage) => {
                          const labels: Record<string, string> = { atencao: "Atenção", interesse: "Interesse", desejo: "Desejo", acao: "Ação" };
                          const colors: Record<string, string> = {
                            atencao: "border-blue-500/30 bg-blue-500/5",
                            interesse: "border-amber-500/30 bg-amber-500/5",
                            desejo: "border-purple-500/30 bg-purple-500/5",
                            acao: "border-emerald-500/30 bg-emerald-500/5",
                          };
                          return (
                            <div key={stage} className={`border rounded-lg p-4 ${colors[stage]}`}>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">{labels[stage]}</p>
                              <p className="text-sm text-foreground leading-relaxed italic">"{script.scriptAida[stage]}"</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Variations */}
                      <div className="bg-muted/30 rounded-lg p-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Variações</p>
                        <div className="space-y-2.5">
                          {script.variacoes.map((v, i) => (
                            <p key={i} className="text-sm text-foreground/90 leading-relaxed pl-4 border-l-2 border-muted-foreground/20">"{v}"</p>
                          ))}
                        </div>
                      </div>

                      {/* Closing trigger */}
                      <div className="bg-primary/10 border-2 border-primary/25 rounded-lg p-4">
                        <p className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
                          <Target className="h-3.5 w-3.5" /> Gatilho de Fechamento
                        </p>
                        <p className="text-sm text-foreground mt-2 font-medium leading-relaxed">"{script.gatilho}"</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            {/* ═══ TAB: By Operator ═══ */}
            <TabsContent value="operators" className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Objeções por Operador</CardTitle></CardHeader>
                <CardContent>
                  {(() => {
                    const opData: Record<string, Record<string, number>> = {};
                    for (const a of filtered) {
                      const cat = normalizeCategory(a.categoria_objecao);
                      if (!cat) continue;
                      if (!opData[a.operador]) opData[a.operador] = {};
                      opData[a.operador][cat] = (opData[a.operador][cat] || 0) + 1;
                    }
                    const rows = Object.entries(opData)
                      .map(([op, cats]) => ({
                        operador: op,
                        cats,
                        total: Object.values(cats).reduce((a, b) => a + b, 0),
                        valorPago: operatorMap[op] ?? 0,
                      }))
                      .sort((a, b) => b.total - a.total);

                    return (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Operador</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            {ALL_CATEGORIES.map((c) => (
                              <TableHead key={c} className="text-center text-xs">{c}</TableHead>
                            ))}
                            <TableHead className="text-right">Valor Pago</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((r) => (
                            <TableRow key={r.operador}>
                              <TableCell className="font-medium">{r.operador}</TableCell>
                              <TableCell className="text-center font-semibold">{r.total}</TableCell>
                              {ALL_CATEGORIES.map((c) => (
                                <TableCell key={c} className="text-center">
                                  {r.cats[c] ? (
                                    <span className={r.cats[c] >= 5 ? "text-destructive font-semibold" : ""}>{r.cats[c]}</span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              ))}
                              <TableCell className="text-right">
                                {r.valorPago > 0 ? `R$ ${r.valorPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
