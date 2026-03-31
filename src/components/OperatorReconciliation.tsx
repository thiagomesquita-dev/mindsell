import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, XCircle, Link2, Info } from "lucide-react";
import { findBestMatch } from "@/lib/fuzzyMatch";

export type ReconciliationStatus = "vinculado" | "pendente" | "ignorado";

export interface ReconciliationRow {
  nomeArquivo: string;
  operadorCobramind: string | null;
  status: ReconciliationStatus;
  autoSuggested: boolean;
}

interface OperatorReconciliationProps {
  fileOperators: string[];
  systemOperators: string[];
  savedMappings: Record<string, string>; // nome_arquivo -> operador_cobramind
  onConfirm: (mappings: ReconciliationRow[]) => void;
  onCancel: () => void;
  confirming?: boolean;
}

export function OperatorReconciliation({
  fileOperators,
  systemOperators,
  savedMappings,
  onConfirm,
  onCancel,
  confirming = false,
}: OperatorReconciliationProps) {
  const initialRows = useMemo(() => {
    return fileOperators.map<ReconciliationRow>((name) => {
      // 1. Check saved mappings first
      if (savedMappings[name] && systemOperators.includes(savedMappings[name])) {
        return { nomeArquivo: name, operadorCobramind: savedMappings[name], status: "vinculado", autoSuggested: true };
      }
      // 2. Try fuzzy match
      const match = findBestMatch(name, systemOperators);
      if (match && match.score >= 0.6) {
        return { nomeArquivo: name, operadorCobramind: match.match, status: "vinculado", autoSuggested: true };
      }
      return { nomeArquivo: name, operadorCobramind: null, status: "pendente", autoSuggested: false };
    });
  }, [fileOperators, systemOperators, savedMappings]);

  const [rows, setRows] = useState<ReconciliationRow[]>(initialRows);

  const updateRow = (index: number, operador: string | null, status: ReconciliationStatus) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, operadorCobramind: operador, status, autoSuggested: false } : r)));
  };

  const handleSelect = (index: number, value: string) => {
    if (value === "__ignore__") {
      updateRow(index, null, "ignorado");
    } else {
      updateRow(index, value, "vinculado");
    }
  };

  const stats = useMemo(() => {
    const vinculados = rows.filter((r) => r.status === "vinculado").length;
    const ignorados = rows.filter((r) => r.status === "ignorado").length;
    const pendentes = rows.filter((r) => r.status === "pendente").length;
    return { vinculados, ignorados, pendentes };
  }, [rows]);

  // Detect duplicates: multiple file names mapped to same system operator
  const duplicates = useMemo(() => {
    const map = new Map<string, string[]>();
    rows.forEach((r) => {
      if (r.status === "vinculado" && r.operadorCobramind) {
        const list = map.get(r.operadorCobramind) || [];
        list.push(r.nomeArquivo);
        map.set(r.operadorCobramind, list);
      }
    });
    const dups: string[] = [];
    map.forEach((names, op) => {
      if (names.length > 1) dups.push(`"${op}" vinculado a: ${names.join(", ")}`);
    });
    return dups;
  }, [rows]);

  const canConfirm = stats.pendentes === 0;

  const statusIcon = (status: ReconciliationStatus) => {
    if (status === "vinculado") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (status === "ignorado") return <XCircle className="h-4 w-4 text-muted-foreground" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const statusBadge = (status: ReconciliationStatus) => {
    if (status === "vinculado") return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Vinculado</Badge>;
    if (status === "ignorado") return <Badge variant="secondary">Ignorado</Badge>;
    return <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30">Pendente</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-heading flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          Conciliação de Operadores
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Vincule cada operador encontrado no arquivo com o operador cadastrado no CobraMind.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats bar */}
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {stats.vinculados} vinculado{stats.vinculados !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            {stats.pendentes} pendente{stats.pendentes !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            {stats.ignorados} ignorado{stats.ignorados !== 1 ? "s" : ""}
          </span>
        </div>

        {duplicates.length > 0 && (
          <Alert className="border-yellow-500/30 bg-yellow-500/5">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-sm">
              <strong>Atenção:</strong> Operadores duplicados detectados.
              <ul className="list-disc ml-4 mt-1">
                {duplicates.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {rows.some((r) => r.autoSuggested) && (
          <Alert className="border-primary/20 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Algumas correspondências foram sugeridas automaticamente. Revise antes de confirmar.
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operador no Arquivo</TableHead>
                <TableHead>Operador no CobraMind</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={row.nomeArquivo}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {statusIcon(row.status)}
                      {row.nomeArquivo}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.status === "ignorado" ? "__ignore__" : (row.operadorCobramind || "")}
                      onValueChange={(val) => handleSelect(idx, val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ignore__">
                          <span className="text-muted-foreground italic">Ignorar operador</span>
                        </SelectItem>
                        {systemOperators.map((op) => (
                          <SelectItem key={op} value={op}>{op}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{statusBadge(row.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={confirming}>Cancelar</Button>
          <Button onClick={() => onConfirm(rows)} disabled={!canConfirm || confirming}>
            {confirming ? "Processando..." : `Confirmar importação (${stats.vinculados} operadores)`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
