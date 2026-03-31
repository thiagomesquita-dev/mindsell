import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AnalysisData {
  operador: string;
  carteira: string;
  canal: string;
  created_at: string;
  nota_qa: number | null;
  chance_pagamento: number | null;
  risco_quebra: number | null;
  score: number | null;
  resumo: string | null;
  pontos_fortes: string[] | null;
  pontos_melhorar: string[] | null;
  erro_principal: string | null;
  mensagem_ideal: string | null;
  feedback_orientacao: string | null;
  feedback_exemplo: string | null;
  sugestoes: string[] | null;
  conformidade: string | null;
  justificativa_conformidade: string | null;
  tom_operador: string | null;
  objecao: string | null;
  nivel_habilidade: string | null;
  tecnica_usada: string | null;
  feedback_diagnostico: string | null;
  feedback_exercicio: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildHtml(analysis: AnalysisData): string {
  const pontos_fortes = analysis.pontos_fortes ?? [];
  const pontos_melhorar = analysis.pontos_melhorar ?? [];
  const sugestoes = analysis.sugestoes ?? [];
  const dataAnalise = formatDate(analysis.created_at);
  const dataExport = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const metric = (label: string, value: number | null, suffix = "") =>
    `<div class="metric">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value != null ? `${value}${suffix}` : "—"}</div>
    </div>`;

  const bulletList = (items: string[], color: string) =>
    items.map(s => `<li><span style="color:${color};margin-right:6px;">■</span>${s}</li>`).join("");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 8.5px;
    line-height: 1.35;
    color: #1a1a1a;
    background: #fff;
    width: 210mm;
  }
  .page { padding: 0; }
  .header {
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 6px;
    margin-bottom: 10px;
  }
  .header h1 { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
  .header-meta { font-size: 8px; color: #666; }
  .section { margin-bottom: 8px; }
  .section-title {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #1a1a1a;
    border-bottom: 1px solid #ddd;
    padding-bottom: 2px;
    margin-bottom: 5px;
  }
  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 5px;
    margin-bottom: 2px;
  }
  .metric {
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 5px 7px;
  }
  .metric-label {
    font-size: 7px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #888;
    margin-bottom: 1px;
  }
  .metric-value { font-size: 15px; font-weight: 700; }
  .card {
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 6px 8px;
    margin-bottom: 4px;
  }
  .card-label {
    font-size: 7px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #888;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .card p, .card li { font-size: 8.5px; line-height: 1.4; }
  .card ul { list-style: none; padding: 0; }
  .card li { margin-bottom: 1px; display: flex; align-items: flex-start; }
  .highlight-box {
    background: #f7f7f7;
    border-left: 2px solid #888;
    padding: 4px 7px;
    border-radius: 3px;
    font-size: 8.5px;
    line-height: 1.4;
  }
  .highlight-box.error { border-left-color: #dc2626; background: #fef2f2; }
  .highlight-box.success { border-left-color: #16a34a; background: #f0fdf4; }
  .highlight-box.warning { border-left-color: #ca8a04; background: #fefce8; }
  .highlight-box.info { border-left-color: #2563eb; background: #eff6ff; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
  .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; }
  .footer {
    margin-top: 10px;
    padding-top: 4px;
    border-top: 1px solid #ddd;
    font-size: 7px;
    color: #999;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <h1>Resultado da Análise</h1>
    <div class="header-meta">
      Operador: <strong>${analysis.operador}</strong> &nbsp;•&nbsp;
      Carteira: <strong>${analysis.carteira}</strong> &nbsp;•&nbsp;
      Canal: <strong>${analysis.canal}</strong> &nbsp;•&nbsp;
      Data: <strong>${dataAnalise}</strong>
    </div>
  </div>

  <div class="section">
    <div class="section-title">1. Resultado da Negociação</div>
    <div class="metrics-grid">
      ${metric("Qualidade da Negociação", analysis.nota_qa)}
      ${metric("Prob. Pagamento", analysis.chance_pagamento, "%")}
      ${metric("Risco de Quebra", analysis.risco_quebra, "%")}
      ${metric("Efetividade", analysis.score)}
    </div>
  </div>

  ${analysis.resumo ? `
  <div class="section">
    <div class="section-title">2. Leitura</div>
    <div class="card">
      <div class="card-label">Resumo da Negociação</div>
      <p>${analysis.resumo}</p>
    </div>
  </div>` : ""}

  <div class="section">
    <div class="section-title">3. Diagnóstico</div>
    <div class="two-col">
      <div class="card">
        ${pontos_fortes.length > 0 ? `
          <div class="card-label">Pontos Fortes</div>
          <ul>${bulletList(pontos_fortes, "#16a34a")}</ul>
        ` : ""}
        ${pontos_melhorar.length > 0 ? `
          ${pontos_fortes.length > 0 ? '<div style="margin-top:4px;"></div>' : ""}
          <div class="card-label">Pontos de Melhoria</div>
          <ul>${bulletList(pontos_melhorar, "#dc2626")}</ul>
        ` : ""}
        ${!pontos_fortes.length && !pontos_melhorar.length ? '<p style="color:#888;font-style:italic;">Dados não disponíveis.</p>' : ""}
      </div>
      <div>
        ${analysis.erro_principal ? `
          <div class="card">
            <div class="card-label">Erro Principal</div>
            <div class="highlight-box error">${analysis.erro_principal}</div>
          </div>` : ""}
      </div>
    </div>
  </div>

  ${(analysis.mensagem_ideal || analysis.feedback_orientacao || analysis.feedback_exemplo) ? `
  <div class="section">
    <div class="section-title">4. Como Conduzir Melhor</div>
    <div class="three-col">
      ${analysis.mensagem_ideal ? `<div class="card"><div class="card-label">Mensagem Ideal</div><div class="highlight-box success" style="font-style:italic;">"${analysis.mensagem_ideal}"</div></div>` : ""}
      ${analysis.feedback_orientacao ? `<div class="card"><div class="card-label">Orientação</div><div class="highlight-box info">${analysis.feedback_orientacao}</div></div>` : ""}
      ${analysis.feedback_exemplo ? `<div class="card"><div class="card-label">Exemplo</div><div class="highlight-box success" style="font-style:italic;">"${analysis.feedback_exemplo}"</div></div>` : ""}
    </div>
  </div>` : ""}

  <div class="section">
    <div class="section-title">5. Análise Técnica</div>
    <div class="three-col">
      <div class="card">
        <div class="card-label">Conformidade</div>
        <p><strong>${analysis.conformidade || "Pendente"}</strong></p>
        ${analysis.justificativa_conformidade ? `<p style="margin-top:2px;color:#666;">${analysis.justificativa_conformidade}</p>` : ""}
      </div>
      <div class="card">
        <div class="card-label">Tom do Operador</div>
        <p>${analysis.tom_operador || "—"}</p>
        <div class="card-label" style="margin-top:4px;">Objeção</div>
        <p>${analysis.objecao || "—"}</p>
      </div>
      <div class="card">
        <div class="card-label">Nível de Habilidade</div>
        <p>${analysis.nivel_habilidade || "—"}</p>
        <div class="card-label" style="margin-top:4px;">Estratégia</div>
        <p>${analysis.tecnica_usada || "—"}</p>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>Gerado por CobraMind</span>
    <span>${dataExport}</span>
  </div>

</div>
</body>
</html>`;
}

export function ExportPdfButton({ analysis }: { analysis: AnalysisData }) {
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(async () => {
    setLoading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const container = document.createElement("div");
      container.innerHTML = buildHtml(analysis);
      container.style.position = "absolute";
      container.style.left = "-9999px";
      document.body.appendChild(container);

      const dateSlug = new Date(analysis.created_at)
        .toLocaleDateString("pt-BR").replace(/\//g, "-");
      const filename = `analise-${slugify(analysis.operador)}-${dateSlug}.pdf`;

      await html2pdf()
        .set({
          margin: [8, 10, 8, 10],
          filename,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 1.5, useCORS: true, logging: false, width: 794 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: [] },
        })
        .from(container.querySelector(".page"))
        .save();

      document.body.removeChild(container);
      toast.success("PDF exportado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Erro ao gerar o PDF. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [analysis]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
      className="gap-2"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      Exportar PDF
    </Button>
  );
}
