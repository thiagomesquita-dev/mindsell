import { useEffect } from "react";
import { InstitutionalHeader } from "@/components/InstitutionalHeader";
import { InstitutionalFooter } from "@/components/InstitutionalFooter";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  useEffect(() => { document.title = "Política de Privacidade — MindSell"; }, []);
  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <InstitutionalHeader />
        <main className="pt-28 pb-20 px-4 sm:px-6">
          <article className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors no-underline mb-8">
              <ArrowLeft className="h-4 w-4" /> Voltar para a home
            </Link>

            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">Política de Privacidade do MindSell</h1>
            <p className="text-sm text-muted-foreground"><strong>Última atualização:</strong> abril de 2026</p>

            <p>
              O MindSell respeita a sua privacidade e está comprometido com a proteção dos dados pessoais tratados em sua plataforma. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos as informações de usuários, clientes e demais pessoas cujos dados possam ser tratados no contexto de uso do sistema.
            </p>

            <h2>1. Quem somos</h2>
            <p>
              O MindSell é uma plataforma de software em nuvem voltada à análise de negociações, atendimentos, operações de vendas e performance comercial, utilizando dados, automação e recursos de inteligência artificial para apoiar a gestão, o acompanhamento e a melhoria de resultados operacionais.
            </p>
            <p>
              Para fins desta Política, "MindSell", "nós" ou "plataforma" refere-se ao serviço operado por <strong>53.525.344 THIAGO FERREIRA DE MESQUITA</strong>.
            </p>

            <h2>2. Quais dados podemos coletar</h2>
            <p>Podemos coletar e tratar os seguintes tipos de dados, conforme a forma de uso da plataforma:</p>

            <h3>Dados cadastrais e de contato</h3>
            <ul>
              <li>nome</li>
              <li>e-mail</li>
              <li>telefone</li>
              <li>empresa</li>
              <li>cargo</li>
              <li>informações de login</li>
            </ul>

            <h3>Dados de uso da plataforma</h3>
            <ul>
              <li>registros de acesso</li>
              <li>endereço IP</li>
              <li>data e hora de uso</li>
              <li>navegador e dispositivo</li>
              <li>ações executadas dentro do sistema</li>
              <li>preferências e configurações da conta</li>
            </ul>

            <h3>Dados enviados pelo cliente</h3>
            <ul>
              <li>textos, mensagens, transcrições, áudios, históricos de atendimento, indicadores operacionais, informações comerciais, relatórios, arquivos e demais conteúdos inseridos na plataforma pelo cliente ou por seus usuários autorizados</li>
            </ul>

            <h3>Dados de vendas e contratação</h3>
            <ul>
              <li>plano contratado</li>
              <li>histórico de pagamentos</li>
              <li>status da assinatura</li>
              <li>informações relacionadas à vendas processada por intermediadores de pagamento</li>
            </ul>

            <h2>3. Como usamos os dados</h2>
            <p>Os dados tratados pelo MindSell podem ser utilizados para:</p>
            <ul>
              <li>viabilizar o cadastro e o acesso à plataforma</li>
              <li>prestar os serviços contratados</li>
              <li>analisar negociações, atendimentos e performance operacional</li>
              <li>gerar relatórios, diagnósticos, recomendações e indicadores</li>
              <li>oferecer suporte técnico e atendimento ao cliente</li>
              <li>enviar comunicações operacionais, administrativas e comerciais</li>
              <li>melhorar a segurança, estabilidade e desempenho do sistema</li>
              <li>prevenir fraudes, acessos indevidos e uso irregular</li>
              <li>cumprir obrigações legais, regulatórias e contratuais</li>
            </ul>

            <h2>4. Bases legais para o tratamento</h2>
            <p>Quando aplicável, o tratamento de dados pessoais poderá se basear em uma ou mais das hipóteses legais previstas na legislação, incluindo:</p>
            <ul>
              <li>execução de contrato ou de procedimentos preliminares relacionados a contrato</li>
              <li>cumprimento de obrigação legal ou regulatória</li>
              <li>exercício regular de direitos</li>
              <li>legítimo interesse, quando aplicável</li>
              <li>consentimento, quando necessário</li>
            </ul>

            <h2>5. Compartilhamento de dados</h2>
            <p>
              O MindSell poderá compartilhar dados com terceiros apenas quando isso for necessário para a operação do serviço, para cumprimento de obrigações legais ou para exercício regular de direitos.
            </p>
            <p>Isso pode incluir, por exemplo:</p>
            <ul>
              <li>provedores de hospedagem, banco de dados, armazenamento e infraestrutura em nuvem</li>
              <li>provedores de autenticação e segurança</li>
              <li>plataformas de pagamento e faturamento</li>
              <li>ferramentas de análise, monitoramento e suporte</li>
              <li>parceiros tecnológicos contratados para viabilizar funcionalidades da plataforma</li>
              <li>autoridades públicas, quando houver obrigação legal, regulatória ou ordem válida</li>
            </ul>
            <p><strong>Não vendemos dados pessoais a terceiros.</strong></p>

            <h2>6. Armazenamento e segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais razoáveis para proteger os dados tratados contra acesso não autorizado, destruição, perda, alteração, vazamento ou qualquer forma de tratamento inadequado ou ilícito.
            </p>
            <p>
              Embora empreguemos boas práticas de segurança, nenhum sistema é completamente imune a falhas ou incidentes. Por isso, o usuário também é responsável por manter a confidencialidade de seus acessos e utilizar a plataforma de forma segura.
            </p>

            <h2>7. Retenção dos dados</h2>
            <p>Os dados serão armazenados pelo tempo necessário para:</p>
            <ul>
              <li>cumprir a finalidade para a qual foram coletados</li>
              <li>prestar os serviços contratados</li>
              <li>atender exigências legais, regulatórias ou contratuais</li>
              <li>resguardar direitos em eventuais processos administrativos, arbitrais ou judiciais</li>
            </ul>
            <p>Após esse período, os dados poderão ser excluídos, anonimizados ou mantidos de forma segura, conforme a necessidade e a legislação aplicável.</p>

            <h2>8. Responsabilidades do cliente sobre os dados enviados</h2>
            <p>
              Quando o cliente insere na plataforma dados, mensagens, áudios, históricos ou quaisquer conteúdos relacionados a seus atendimentos, operações ou usuários, ele declara ser responsável por garantir que possui base legal adequada para esse tratamento e para o uso do sistema dentro de sua operação.
            </p>
            <p>
              O MindSell atua como ferramenta de apoio operacional e analítico, não substituindo a responsabilidade do cliente sobre a origem, legitimidade e adequação dos dados inseridos.
            </p>

            <h2>9. Direitos do titular de dados</h2>
            <p>Nos termos da legislação aplicável, o titular de dados pessoais poderá solicitar, quando cabível:</p>
            <ul>
              <li>confirmação da existência de tratamento</li>
              <li>acesso aos dados</li>
              <li>correção de dados incompletos, inexatos ou desatualizados</li>
              <li>anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade</li>
              <li>portabilidade, quando aplicável</li>
              <li>informação sobre compartilhamento de dados</li>
              <li>revogação do consentimento, quando essa for a base legal utilizada</li>
            </ul>
            <p>
              As solicitações poderão ser feitas pelos canais de contato informados nesta Política, e serão avaliadas nos termos da legislação vigente.
            </p>

            <h2>10. Cookies e tecnologias semelhantes</h2>
            <p>
              O site e a plataforma do MindSell podem utilizar cookies e tecnologias semelhantes para melhorar a experiência do usuário, manter sessões ativas, analisar o desempenho do ambiente e reforçar a segurança.
            </p>
            <p>O usuário pode gerenciar cookies diretamente em seu navegador, ciente de que algumas funcionalidades podem ser impactadas.</p>

            <h2>11. Alterações nesta Política</h2>
            <p>
              Esta Política de Privacidade poderá ser atualizada a qualquer momento para refletir melhorias no serviço, mudanças operacionais, legais ou regulatórias. Recomendamos consulta periódica desta página.
            </p>

            <h2>12. Contato</h2>
            <p>Em caso de dúvidas, solicitações ou assuntos relacionados à privacidade e proteção de dados, entre em contato:</p>
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
