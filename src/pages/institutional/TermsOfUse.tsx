import { useEffect } from "react";
import { InstitutionalHeader } from "@/components/InstitutionalHeader";
import { InstitutionalFooter } from "@/components/InstitutionalFooter";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsOfUse() {
  useEffect(() => { document.title = "Termos de Uso — MindSell"; }, []);
  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <InstitutionalHeader />
        <main className="pt-28 pb-20 px-4 sm:px-6">
          <article className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors no-underline mb-8">
              <ArrowLeft className="h-4 w-4" /> Voltar para a home
            </Link>

            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">Termos de Uso do MindSell</h1>
            <p className="text-sm text-muted-foreground"><strong>Última atualização:</strong> abril de 2026</p>

          <p>
            Estes Termos de Uso regulam o acesso e a utilização da plataforma MindSell. Ao acessar, contratar ou utilizar o sistema, o usuário declara que leu, compreendeu e concorda com estas condições.
          </p>

          <h2>1. Objeto</h2>
          <p>
            O MindSell é uma plataforma de software em nuvem voltada à análise de negociações, atendimentos, operações de vendas e performance comercial, com funcionalidades que podem incluir relatórios, diagnósticos, acompanhamento de indicadores, automações e recursos de inteligência artificial.
          </p>

          <h2>2. Aceitação dos Termos</h2>
          <p>
            Ao utilizar o site, solicitar demonstração, criar conta, contratar plano ou acessar a plataforma, o usuário concorda com estes Termos e com a{" "}
            <a href="/politica-de-privacidade" className="text-primary hover:underline">Política de Privacidade</a> do MindSell.
          </p>

          <h2>3. Cadastro e acesso</h2>
          <p>
            Para utilizar determinadas funcionalidades, poderá ser necessário realizar cadastro e fornecer informações verdadeiras, completas e atualizadas.
          </p>
          <p>O usuário é responsável por:</p>
          <ul>
            <li>manter a confidencialidade de seus acessos</li>
            <li>não compartilhar login e senha de forma indevida</li>
            <li>garantir a veracidade das informações fornecidas</li>
            <li>comunicar prontamente qualquer uso não autorizado de sua conta</li>
          </ul>
          <p>
            O MindSell poderá suspender ou restringir acessos em caso de suspeita de fraude, uso indevido, violação destes Termos ou risco à segurança da plataforma.
          </p>

          <h2>4. Uso permitido da plataforma</h2>
          <p>
            A plataforma deve ser utilizada exclusivamente para fins legítimos, empresariais ou profissionais, de acordo com a legislação aplicável e com estes Termos.
          </p>
          <p>É vedado utilizar o MindSell para:</p>
          <ul>
            <li>praticar atos ilícitos</li>
            <li>violar direitos de terceiros</li>
            <li>inserir conteúdos maliciosos, fraudulentos ou enganosos</li>
            <li>tentar obter acesso não autorizado a sistemas, dados ou contas</li>
            <li>utilizar a plataforma de forma que comprometa sua estabilidade, segurança ou disponibilidade</li>
          </ul>

          <h2>5. Responsabilidade sobre os dados inseridos</h2>
          <p>
            O cliente é integralmente responsável pelos dados, conteúdos, mensagens, arquivos, áudios, históricos e demais informações inseridas na plataforma por si ou por seus usuários autorizados.
          </p>
          <p>Ao utilizar o sistema, o cliente declara que:</p>
          <ul>
            <li>possui legitimidade e base legal para tratar os dados inseridos</li>
            <li>está autorizado a utilizar esses dados na sua operação</li>
            <li>adotará as medidas necessárias para respeitar a legislação aplicável, inclusive em matéria de proteção de dados</li>
          </ul>
          <p>
            O MindSell não se responsabiliza pela origem, licitude ou exatidão dos dados fornecidos pelo cliente.
          </p>

          <h2>6. Planos, contratação e pagamentos</h2>
          <p>
            O uso do MindSell poderá depender da contratação de plano pago, sujeito a valores, limites, recursos e condições comerciais apresentados no momento da oferta ou contratação.
          </p>
          <p>
            Os pagamentos poderão ser processados por terceiros especializados, como plataformas de pagamento e faturamento.
          </p>
          <p>
            Em caso de inadimplência, atraso, falha de vendas ou descumprimento contratual, o MindSell poderá suspender, limitar ou encerrar o acesso à plataforma, conforme aplicável.
          </p>

          <h2>7. Cancelamento</h2>
          <p>
            O cliente poderá solicitar o cancelamento da assinatura pelos canais oficiais de atendimento.
          </p>
          <p>Salvo disposição contratual diferente:</p>
          <ul>
            <li>o cancelamento impede novas renovações futuras</li>
            <li>o acesso poderá permanecer ativo até o fim do período já pago</li>
            <li>vendass já realizadas não serão automaticamente devolvidas, exceto quando houver obrigação legal ou erro comprovado</li>
          </ul>
          <p>
            As regras complementares de cancelamento e reembolso estão descritas em{" "}
            <a href="/cancelamento-e-reembolso" className="text-primary hover:underline">política própria</a> disponível no site.
          </p>

          <h2>8. Disponibilidade e melhorias do serviço</h2>
          <p>
            O MindSell busca manter a plataforma em funcionamento com estabilidade e segurança, mas não garante disponibilidade ininterrupta ou livre de falhas.
          </p>
          <p>
            Poderemos realizar atualizações, manutenções, correções, mudanças de layout, inclusão ou remoção de funcionalidades a qualquer tempo, inclusive para melhorar o serviço ou atender exigências técnicas, legais e operacionais.
          </p>

          <h2>9. Limitação de responsabilidade</h2>
          <p>
            O MindSell é uma ferramenta de apoio analítico, operacional e gerencial. Embora a plataforma possa gerar diagnósticos, recomendações, indicadores ou sugestões com apoio de automação e inteligência artificial, ela não garante resultados comerciais, jurídicos, financeiros ou operacionais específicos.
          </p>
          <p>
            O usuário reconhece que decisões estratégicas, negociais, comerciais ou operacionais devem considerar seu próprio contexto, critérios internos e avaliação humana.
          </p>
          <p>
            Na máxima extensão permitida pela legislação aplicável, o MindSell não será responsável por:
          </p>
          <ul>
            <li>lucros cessantes</li>
            <li>perda de oportunidade</li>
            <li>danos indiretos</li>
            <li>decisões tomadas pelo cliente com base exclusiva em análises da plataforma</li>
            <li>problemas decorrentes de dados incorretos, incompletos ou ilegítimos inseridos pelo cliente</li>
          </ul>

          <h2>10. Propriedade intelectual</h2>
          <p>
            Todos os direitos relativos ao MindSell, incluindo software, marca, nome comercial, identidade visual, interface, textos, documentação, estrutura e demais elementos da plataforma, pertencem ao seu titular ou aos respectivos licenciantes.
          </p>
          <p>
            Estes Termos não conferem ao usuário qualquer cessão de propriedade intelectual, mas apenas uma autorização limitada de uso, nos termos da contratação aplicável.
          </p>

          <h2>11. Encerramento ou suspensão de acesso</h2>
          <p>O MindSell poderá encerrar ou suspender o acesso de usuários e clientes em caso de:</p>
          <ul>
            <li>violação destes Termos</li>
            <li>uso indevido da plataforma</li>
            <li>inadimplência</li>
            <li>risco técnico, operacional ou jurídico</li>
            <li>determinação legal ou regulatória</li>
          </ul>

          <h2>12. Alterações destes Termos</h2>
          <p>
            Estes Termos poderão ser alterados a qualquer momento para refletir atualizações do serviço, mudanças legais ou ajustes operacionais. A versão vigente será sempre a publicada no site.
          </p>

          <h2>13. Contato</h2>
          <p>
            Para dúvidas, suporte, solicitações comerciais ou assuntos relacionados à plataforma:
          </p>
          <p>
            <strong>E-mail:</strong>{" "}
            <a href="mailto:contato@mindsell.ia.br" className="text-primary hover:underline">contato@mindsell.ia.br</a>
          </p>
        </article>
      </main>
      <InstitutionalFooter />
    </div>
  );
}
