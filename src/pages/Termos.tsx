import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/vademecum/PageHeader";

const ULTIMA_ATUALIZACAO = "13 de julho de 2026";

export default function Termos() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const embed = params.get("embed") === "1";
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {!embed && (
        <div className="sticky top-0 z-20">
          <PageHeader title="Termos de Uso" onBack={() => navigate("/")} />
        </div>
      )}


      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="mb-8 text-sm text-muted-foreground">
          Última atualização: {ULTIMA_ATUALIZACAO}
        </p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Aceitação dos termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao criar uma conta e utilizar o aplicativo <strong>Vacatio</strong>,
              você concorda com estes Termos de Uso e com nossa{" "}
              <Link
                to="/privacidade"
                className="text-primary underline underline-offset-4"
              >
                Política de Privacidade
              </Link>
              . Se você não concorda, não utilize o aplicativo.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Sobre o serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Vacatio é uma plataforma digital de estudo jurídico que oferece
              acesso a legislação (Vade Mecum), ferramentas de estudo (questões,
              flashcards, resumos, mapas mentais), conteúdo gerado por inteligência
              artificial e notícias sobre atividade legislativa. O serviço é operado
              por <strong>Wesley Antonio Nunes Pereira</strong>, MEI CNPJ{" "}
              <strong>57.573.905/0001-78</strong>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Cadastro e conta</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>Você deve ter no mínimo 16 anos para usar o app.</li>
              <li>
                As informações da sua conta (obtidas via login com o Google) devem ser
                verdadeiras e atualizadas.
              </li>
              <li>
                Você é responsável por manter a confidencialidade do seu acesso e por
                todas as atividades realizadas na sua conta.
              </li>
              <li>
                Reservamo-nos o direito de suspender ou encerrar contas que violem
                estes termos.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">4. Uso aceitável</h2>
            <p className="mb-3 text-muted-foreground leading-relaxed">
              Você concorda em <strong>não</strong>:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>Usar o app para fins ilícitos ou não autorizados.</li>
              <li>
                Fazer engenharia reversa, descompilar ou tentar extrair o código-fonte.
              </li>
              <li>
                Acessar ou tentar acessar contas de outros usuários sem autorização.
              </li>
              <li>
                Sobrecarregar a infraestrutura com requisições automatizadas ou uso
                abusivo.
              </li>
              <li>
                Redistribuir, revender ou copiar em massa o conteúdo do app sem
                autorização por escrito.
              </li>
              <li>
                Usar o conteúdo gerado por IA como aconselhamento jurídico definitivo
                — o app é uma ferramenta de estudo, não substitui um advogado.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Planos e pagamentos</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Vacatio oferece funcionalidades gratuitas e recursos premium com
              assinatura paga. Ao contratar um plano pago:
            </p>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>Os valores e a periodicidade são exibidos no momento da compra.</li>
              <li>
                A assinatura é renovada automaticamente até que você cancele nas
                configurações da sua loja de aplicativos ou no app.
              </li>
              <li>
                O cancelamento interrompe a próxima renovação, mas não gera reembolso
                proporcional do período já pago (salvo exigência do Código de Defesa
                do Consumidor).
              </li>
              <li>
                O usuário tem direito de arrependimento em até 7 dias após a compra,
                nos termos do art. 49 do CDC.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Propriedade intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              Marca, logo, interface, código, textos didáticos, resumos e demais
              elementos do app são de propriedade de Wesley Antonio Nunes Pereira e
              protegidos pela legislação brasileira de direitos autorais (Lei
              9.610/98) e propriedade industrial. O texto original das leis é de
              domínio público. As anotações e conteúdos que você cria dentro do app
              são de sua autoria.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">7. Conteúdo gerado por IA</h2>
            <p className="text-muted-foreground leading-relaxed">
              O app utiliza inteligência artificial (Google Gemini) para gerar
              resumos, questões, explicações e outros materiais. Esses conteúdos são
              gerados automaticamente e{" "}
              <strong>podem conter erros, imprecisões ou desatualizações</strong>.
              Sempre confirme informações críticas em fontes oficiais. Não nos
              responsabilizamos por decisões tomadas com base exclusiva em conteúdo
              gerado por IA.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Disponibilidade do serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nos esforçamos para manter o app disponível 24/7, mas não garantimos
              operação ininterrupta. Poderá haver interrupções para manutenção,
              atualizações ou por falhas de terceiros (Google, Supabase etc.).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">9. Limitação de responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Vacatio é fornecido "como está". Na máxima extensão permitida por lei,
              não nos responsabilizamos por danos indiretos, lucros cessantes, perda
              de dados ou prejuízos decorrentes do uso ou da impossibilidade de uso do
              app. Isto não afasta os direitos garantidos pelo Código de Defesa do
              Consumidor.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">10. Encerramento</h2>
            <p className="text-muted-foreground leading-relaxed">
              Você pode encerrar sua conta a qualquer momento pelas configurações do
              app ou por e-mail. Podemos suspender ou encerrar seu acesso em caso de
              violação destes termos, com notificação prévia sempre que possível.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">11. Alterações nos termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar estes termos periodicamente. Mudanças relevantes serão
              comunicadas no app ou por e-mail. O uso continuado após a comunicação
              implica aceitação da nova versão.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">12. Legislação e foro</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes termos são regidos pelas leis da República Federativa do Brasil.
              Fica eleito o foro do domicílio do consumidor para dirimir qualquer
              controvérsia decorrente destes termos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">13. Contato</h2>
            <div className="rounded-lg border border-border/60 bg-card/50 p-4">
              <p className="mb-2 text-sm text-muted-foreground">
                Dúvidas, sugestões ou solicitações:
              </p>
              <a
                href="mailto:wn7corporation@gmail.com"
                className="inline-flex items-center gap-2 text-foreground hover:text-primary"
              >
                <Mail className="h-4 w-4" />
                wn7corporation@gmail.com
              </a>
              <p className="mt-3 text-xs text-muted-foreground">
                Wesley Antonio Nunes Pereira — CNPJ 57.573.905/0001-78
              </p>
            </div>
          </section>

          <div className="pt-4">
            <Link
              to="/privacidade"
              className="text-sm text-primary underline underline-offset-4"
            >
              Ver Política de Privacidade →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
