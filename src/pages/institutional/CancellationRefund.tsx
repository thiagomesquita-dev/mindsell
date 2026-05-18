import { useEffect } from "react";
import { InstitutionalHeader } from "@/components/InstitutionalHeader";
import { InstitutionalFooter } from "@/components/InstitutionalFooter";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function CancellationRefund() {
  useEffect(() => { document.title = "Cancelamento e Reembolso — MindSell"; }, []);
  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <InstitutionalHeader />
        <main className="pt-28 pb-20 px-4 sm:px-6">
          <article className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors no-underline mb-8">
              <ArrowLeft className="h-4 w-4" /> Voltar para a home
            </Link>

            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">Política de Cancelamento e Reembolso do MindSell</h1>
            <p className="text-sm text-muted-foreground"><strong>Última atualização:</strong> abril de 2026</p>

            <p>
              Esta Política estabelece as regras gerais aplicáveis ao cancelamento de assinaturas e à análise de pedidos de reembolso relacionados ao MindSell.
            </p>

            <h2>1. Cancelamento da assinatura</h2>
            <p>
              O cliente pode solicitar o cancelamento da assinatura a qualquer momento por meio dos canais oficiais de atendimento do MindSell.
            </p>
            <p>Após o cancelamento:</p>
            <ul>
              <li>a assinatura não será renovada para o próximo ciclo</li>
              <li>o acesso à plataforma poderá ser mantido até o fim do período já pago, salvo previsão contratual diferente</li>
              <li>recursos ou benefícios vinculados ao plano poderão ser encerrados ao término da vigência correspondente</li>
            </ul>

            <h2>2. Reembolso</h2>
            <p>
              Salvo quando exigido por lei ou quando houver vendas indevida comprovada, os valores pagos por períodos já iniciados não são reembolsáveis de forma proporcional.
            </p>
            <p>Pedidos de reembolso poderão ser analisados, de forma excepcional, em situações como:</p>
            <ul>
              <li>vendas em duplicidade</li>
              <li>erro operacional comprovado</li>
              <li>pagamento indevido identificado e validado</li>
            </ul>

            <h2>3. Testes gratuitos e períodos promocionais</h2>
            <p>
              Quando houver teste gratuito, período promocional ou condição especial de contratação, as regras específicas aplicáveis poderão ser informadas na oferta, na página comercial, no checkout ou em contrato complementar.
            </p>

            <h2>4. Como solicitar cancelamento ou relatar problema de vendas</h2>
            <p>Para solicitar cancelamento, relatar vendas indevida ou tratar dúvidas sobre pagamentos, entre em contato pelos canais oficiais:</p>
            <p>
              <strong>E-mail:</strong>{" "}
              <a href="mailto:contato@mindsell.ia.br" className="text-primary hover:underline">contato@mindsell.ia.br</a>
            </p>

            <h2>5. Análise de solicitações</h2>
            <p>
              Toda solicitação será analisada conforme o histórico da contratação, a data da vendas, a utilização da plataforma e as condições aplicáveis à oferta contratada.
            </p>

            <h2>6. Alterações desta Política</h2>
            <p>
              Esta Política poderá ser atualizada a qualquer momento para refletir mudanças operacionais, comerciais, legais ou regulatórias.
            </p>
          </article>
        </main>
        <InstitutionalFooter />
      </div>
    
  );
}
