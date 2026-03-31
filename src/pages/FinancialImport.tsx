import { useState, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle2, Columns, Info, AlertTriangle, DollarSign } from "lucide-react";
import * as XLSX from "xlsx";
import { OperatorReconciliation, type ReconciliationRow } from "@/components/OperatorReconciliation";

interface ParsedRow {
  operador: string;
  valorFinanceiro: number;
  [key: string]: unknown;
}

type ImportStep = "upload" | "column-select" | "reconciliation" | "done";

interface ImportSummary {
  totalRows: number;
  totalFinanceiro: number;
  operadores: { nome: string; valor: number }[];
  ignorados: number;
}

function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s]+/g, " ")
    .trim();
}

function findColumnByNames(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map((h) => (h ? normalizeColumnName(String(h)) : ""));
  const normalizedNames = possibleNames.map(normalizeColumnName);

  for (const name of normalizedNames) {
    const idx = normalizedHeaders.indexOf(name);
    if (idx !== -1) return idx;
  }
  for (const name of normalizedNames) {
    const idx = normalizedHeaders.findIndex((h) => h.startsWith(name));
    if (idx !== -1) return idx;
  }
  for (const name of normalizedNames) {
    const idx = normalizedHeaders.findIndex((h) => h.includes(name));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseCurrencyValue(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  const str = String(raw)
    .replace(/R\$\s*/gi, "")
    .replace(/\s/g, "")
    .trim();
  // Handle Brazilian format: 1.234,56 → 1234.56
  // If it has comma as decimal separator
  if (str.includes(",")) {
    const cleaned = str.replace(/\./g, "").replace(",", ".");
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  }
  const val = parseFloat(str);
  return isNaN(val) ? 0 : val;
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FinancialImport() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ImportStep>("upload");
  const [rawData, setRawData] = useState<unknown[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedColumnIdx, setSelectedColumnIdx] = useState<number>(-1);
  const [financialColumnIdx, setFinancialColumnIdx] = useState<number>(-1);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [fileOperators, setFileOperators] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const { data: operators = [] } = useQuery({
    queryKey: ["operators-for-import", profile?.empresa_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operators")
        .select("id, nome")
        .eq("empresa_id", profile!.empresa_id!)
        .eq("status", "ativo")
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.empresa_id,
  });

  const operatorNames = useMemo(() => operators.map((o) => o.nome), [operators]);

  const { data: savedMappingsRaw = [] } = useQuery({
    queryKey: ["operator-mappings", profile?.empresa_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operator_name_mappings")
        .select("nome_arquivo, operador_cobramind")
        .eq("empresa_id", profile!.empresa_id!);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.empresa_id,
  });

  const savedMappings = savedMappingsRaw.reduce<Record<string, string>>((acc, m) => {
    acc[m.nome_arquivo] = m.operador_cobramind;
    return acc;
  }, {});

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, aoa.length); i++) {
          const row = aoa[i];
          if (!row) continue;
          const nonEmpty = row.filter((cell) => cell != null && String(cell).trim() !== "");
          if (nonEmpty.length >= 2) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          toast.error("Não foi possível detectar o cabeçalho. Verifique o arquivo.");
          return;
        }

        const detectedHeaders = (aoa[headerRowIndex] as unknown[]).map((cell) =>
          cell != null ? String(cell).trim() : ""
        );

        const dataRows = aoa.slice(headerRowIndex + 1).filter((row) =>
          row && row.some((cell) => cell != null && String(cell).trim() !== "")
        );

        setHeaders(detectedHeaders);
        setRawData(dataRows);

        // Auto-detect operator column
        const autoOpIdx = findColumnByNames(detectedHeaders, [
          "descricao", "descrição", "operador", "nome operador", "nome_operador", "operator", "nome",
        ]);
        setSelectedColumnIdx(autoOpIdx !== -1 ? autoOpIdx : -1);

        // Auto-detect financial column (Com.Tot)
        const autoFinIdx = findColumnByNames(detectedHeaders, [
          "com.tot", "com tot", "comtot", "comissao total", "comissão total", "valor pago", "pago",
        ]);
        setFinancialColumnIdx(autoFinIdx !== -1 ? autoFinIdx : -1);

        setStep("column-select");
      } catch (err) {
        toast.error("Erro ao ler o arquivo. Verifique o formato.");
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const columnPreview = useMemo(() => {
    if (selectedColumnIdx < 0 || rawData.length === 0) return [];
    return [...new Set(
      rawData.map((row) => {
        const cell = row[selectedColumnIdx];
        return cell != null ? String(cell).trim() : "";
      }).filter(Boolean)
    )].slice(0, 8);
  }, [selectedColumnIdx, rawData]);

  const financialPreview = useMemo(() => {
    if (financialColumnIdx < 0 || rawData.length === 0) return [];
    return rawData
      .slice(0, 5)
      .map((row) => {
        const raw = row[financialColumnIdx];
        const parsed = parseCurrencyValue(raw);
        return { raw: raw != null ? String(raw) : "", parsed };
      })
      .filter((v) => v.raw !== "");
  }, [financialColumnIdx, rawData]);

  const handleColumnConfirm = () => {
    if (selectedColumnIdx < 0) {
      toast.error("Selecione a coluna de operador.");
      return;
    }
    if (financialColumnIdx < 0) {
      toast.error("Selecione a coluna financeira (Com.Tot / Pago).");
      return;
    }

    const rows: ParsedRow[] = rawData
      .filter((row) => {
        const cell = row[selectedColumnIdx];
        return cell != null && String(cell).trim() !== "";
      })
      .map((row) => {
        const obj: ParsedRow = {
          operador: String(row[selectedColumnIdx] ?? "").trim(),
          valorFinanceiro: parseCurrencyValue(row[financialColumnIdx]),
        };
        headers.forEach((h, i) => {
          if (h) obj[h] = row[i];
        });
        return obj;
      });

    const uniqueOps = [...new Set(rows.map((r) => r.operador).filter(Boolean))];
    setParsedData(rows);
    setFileOperators(uniqueOps);
    setStep("reconciliation");
  };

  const handleConfirm = async (mappings: ReconciliationRow[]) => {
    if (!profile?.empresa_id) return;
    setConfirming(true);

    try {
      // Save mappings
      const vinculados = mappings.filter((m) => m.status === "vinculado" && m.operadorCobramind);
      for (const m of vinculados) {
        const existing = savedMappingsRaw.find((s) => s.nome_arquivo === m.nomeArquivo);
        if (existing) {
          await supabase
            .from("operator_name_mappings")
            .update({ operador_cobramind: m.operadorCobramind! })
            .eq("empresa_id", profile.empresa_id)
            .eq("nome_arquivo", m.nomeArquivo);
        } else {
          await supabase.from("operator_name_mappings").insert({
            empresa_id: profile.empresa_id,
            nome_arquivo: m.nomeArquivo,
            operador_cobramind: m.operadorCobramind!,
            created_by: profile.id,
          });
        }
      }

      // Build name→system operator map
      const nameMap = new Map<string, string>();
      vinculados.forEach((m) => {
        if (m.operadorCobramind) nameMap.set(m.nomeArquivo, m.operadorCobramind);
      });

      // Aggregate financial values per system operator
      const aggregated = new Map<string, number>();
      for (const row of parsedData) {
        const systemName = nameMap.get(row.operador);
        if (!systemName) continue; // ignored
        aggregated.set(systemName, (aggregated.get(systemName) || 0) + row.valorFinanceiro);
      }

      // Get current date as period reference
      const now = new Date();
      const periodoRef = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

      // Update each operator with financial data
      for (const [opName, valor] of aggregated) {
        const op = operators.find((o) => o.nome === opName);
        if (!op) continue;
        const { error } = await supabase
          .from("operators")
          .update({
            valor_pago_periodo: valor,
            periodo_referencia: periodoRef,
          } as Record<string, unknown>)
          .eq("id", op.id);
        if (error) console.error(`[FinancialImport] Error updating ${opName}:`, error);
      }

      // Also update company_carteiras total if possible
      // Sum all values per carteira from operators
      const carteiraMap = new Map<string, number>();
      for (const [opName, valor] of aggregated) {
        const op = operators.find((o) => o.nome === opName);
        if (!op) continue;
        // We need carteira info - fetch from operators query
        const { data: opData } = await supabase
          .from("operators")
          .select("carteira")
          .eq("id", op.id)
          .single();
        if (opData) {
          carteiraMap.set(opData.carteira, (carteiraMap.get(opData.carteira) || 0) + valor);
        }
      }

      const totalFinanceiro = Array.from(aggregated.values()).reduce((s, v) => s + v, 0);
      const summaryOps = Array.from(aggregated.entries())
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor);

      const summary: ImportSummary = {
        totalRows: parsedData.length,
        totalFinanceiro,
        operadores: summaryOps,
        ignorados: mappings.filter((m) => m.status === "ignorado").length,
      };

      console.log("[FinancialImport] Resumo:", {
        totalRegistros: summary.totalRows,
        totalFinanceiro: formatBRL(summary.totalFinanceiro),
        operadores: summary.operadores.map((o) => `${o.nome}: ${formatBRL(o.valor)}`),
        ignorados: summary.ignorados,
      });

      setImportSummary(summary);
      queryClient.invalidateQueries({ queryKey: ["operator-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["company-operators"] });
      toast.success(`Importação concluída! ${vinculados.length} operadores, ${formatBRL(totalFinanceiro)} total.`);
      setStep("done");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar importação.");
    } finally {
      setConfirming(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setRawData([]);
    setHeaders([]);
    setSelectedColumnIdx(-1);
    setFinancialColumnIdx(-1);
    setParsedData([]);
    setFileOperators([]);
    setFileName("");
    setImportSummary(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Importação Financeira"
        description="Importe dados financeiros do XLSX e vincule operadores ao CobraMind."
      />

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Upload do Arquivo XLSX
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Selecione o arquivo XLSX com os dados financeiros da operação.
              </p>
              <label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button asChild variant="default">
                  <span>Selecionar arquivo</span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "column-select" && (
        <div className="space-y-4">
          <Alert className="bg-secondary border-border">
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Arquivo: <strong>{fileName}</strong> — {rawData.length} registros, {headers.filter(Boolean).length} colunas detectadas.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <Columns className="h-5 w-5 text-primary" />
                Configuração de Colunas
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecione as colunas de operador e valor financeiro.
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Detected columns badges */}
              <div>
                <p className="text-sm font-medium mb-2">Colunas detectadas:</p>
                <div className="flex flex-wrap gap-2">
                  {headers.map((h, idx) =>
                    h ? (
                      <Badge
                        key={idx}
                        variant={
                          idx === selectedColumnIdx || idx === financialColumnIdx
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer"
                      >
                        {h}
                      </Badge>
                    ) : null
                  )}
                </div>
              </div>

              {/* Operator column selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-primary" />
                    Coluna de Operador
                  </Label>
                  <Select
                    value={selectedColumnIdx >= 0 ? String(selectedColumnIdx) : ""}
                    onValueChange={(val) => setSelectedColumnIdx(Number(val))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h, idx) =>
                        h ? <SelectItem key={idx} value={String(idx)}>{h}</SelectItem> : null
                      )}
                    </SelectContent>
                  </Select>
                  {selectedColumnIdx >= 0 && columnPreview.length > 0 && (
                    <div className="rounded-md border max-h-40 overflow-auto">
                      <Table>
                        <TableBody>
                          {columnPreview.map((val, i) => (
                            <TableRow key={i}>
                              <TableCell className="py-1.5 text-sm">{val}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {selectedColumnIdx >= 0 && columnPreview.length === 0 && (
                    <p className="text-sm text-destructive">Coluna vazia.</p>
                  )}
                </div>

                {/* Financial column selector */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Coluna Financeira (Pago R$)
                  </Label>
                  <Select
                    value={financialColumnIdx >= 0 ? String(financialColumnIdx) : ""}
                    onValueChange={(val) => setFinancialColumnIdx(Number(val))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h, idx) =>
                        h ? <SelectItem key={idx} value={String(idx)}>{h}</SelectItem> : null
                      )}
                    </SelectContent>
                  </Select>
                  {financialColumnIdx >= 0 && financialPreview.length > 0 && (
                    <div className="rounded-md border max-h-40 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="py-1.5 text-xs">Original</TableHead>
                            <TableHead className="py-1.5 text-xs">Convertido</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {financialPreview.map((v, i) => (
                            <TableRow key={i}>
                              <TableCell className="py-1.5 text-sm">{v.raw}</TableCell>
                              <TableCell className="py-1.5 text-sm font-medium">{formatBRL(v.parsed)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {financialColumnIdx >= 0 && financialPreview.length === 0 && (
                    <Alert className="border-destructive/30 bg-destructive/5">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <AlertDescription className="text-sm">
                        Coluna vazia ou sem valores válidos.
                      </AlertDescription>
                    </Alert>
                  )}
                  {financialColumnIdx < 0 && (
                    <Alert className="border-yellow-500/30 bg-yellow-500/5">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <AlertDescription className="text-sm">
                        Selecione a coluna que contém o valor "Com.Tot" ou equivalente.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={handleReset}>Cancelar</Button>
                <Button
                  onClick={handleColumnConfirm}
                  disabled={selectedColumnIdx < 0 || financialColumnIdx < 0 || columnPreview.length === 0}
                >
                  Continuar para conciliação
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "reconciliation" && (
        <div className="space-y-4">
          <Alert className="bg-secondary border-border">
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Arquivo: <strong>{fileName}</strong> — Operador: <strong>{headers[selectedColumnIdx]}</strong> — Financeiro: <strong>{headers[financialColumnIdx]}</strong> — {parsedData.length} registros, {fileOperators.length} operadores.
            </AlertDescription>
          </Alert>

          <OperatorReconciliation
            fileOperators={fileOperators}
            systemOperators={operatorNames}
            savedMappings={savedMappings}
            onConfirm={handleConfirm}
            onCancel={handleReset}
            confirming={confirming}
          />
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
              <h3 className="text-lg font-heading font-semibold mb-2">Importação Concluída</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Mapeamentos salvos para futuras importações.
              </p>
            </CardContent>
          </Card>

          {importSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Resumo da Importação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Total de Registros</p>
                    <p className="text-2xl font-heading font-bold">{importSummary.totalRows}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Total Pago (R$)</p>
                    <p className="text-2xl font-heading font-bold text-primary">
                      {formatBRL(importSummary.totalFinanceiro)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Operadores Ignorados</p>
                    <p className="text-2xl font-heading font-bold">{importSummary.ignorados}</p>
                  </div>
                </div>

                {importSummary.operadores.length > 0 && (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Operador</TableHead>
                          <TableHead className="text-right">Pago (R$)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importSummary.operadores.map((op) => (
                          <TableRow key={op.nome}>
                            <TableCell className="font-medium">{op.nome}</TableCell>
                            <TableCell className="text-right font-medium">{formatBRL(op.valor)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right text-primary">{formatBRL(importSummary.totalFinanceiro)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}

                <Button onClick={handleReset} className="w-full">Nova Importação</Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
