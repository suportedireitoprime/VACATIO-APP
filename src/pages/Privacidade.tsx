import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/vademecum/PageHeader";

const ULTIMA_ATUALIZACAO = "13 de julho de 2026";

export default function Privacidade() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const embed = params.get("embed") === "1";
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {!embed && (
        <div className="sticky top-0 z-20">
          <PageHeader title="Política de Privacidade" onBack={() => navigate("/")} />
        </div>
      )}


      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="mb-8 text-sm text-muted-foreground">
          Última atualização: {ULTIMA_ATUALIZACAO}
        </p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Quem somos</h2>
            <p className="text-muted-foreground leading-relaxed">
              O <strong>Vacatio</strong> é um
              aplicativo de estudo jurídico e Vade Mecum digital operado por{" "}
              <strong>Wesley Antonio Nunes Pereira</strong>, MEI inscrito no CNPJ{" "}
              <strong>57.573.905/0001-78</strong> ("nós", "nosso"). Esta política
              descreve como coletamos, usamos e protegemos suas informações quando você
              usa nosso aplicativo web ou móvel.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Dados que coletamos</h2>
            <p className="mb-3 text-muted-foreground leading-relaxed">
              Coletamos apenas o necessário para oferecer as funcionalidades do app:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Dados de conta:</strong> nome,
                e-mail e foto de perfil fornecidos via login com o Google.
              </li>
              <li>
                <strong className="text-foreground">Conteúdo criado por você:</strong>{" "}
                anotações, destaques (grifos), comentários e favoritos vinculados a
                artigos de lei.
              </li>
              <li>
                <strong className="text-foreground">Histórico de estudos:</strong>{" "}
                respostas de flashcards, questões respondidas, tempo de
                estudo e materiais gerados por IA.
              </li>
              <li>
                <strong className="text-foreground">Áudios de anotação:</strong>{" "}
                gravações de voz que você opta por anexar às suas anotações.
              </li>
              <li>
                <strong className="text-foreground">Dados de uso e analytics:</strong>{" "}
                páginas visitadas, funcionalidades acessadas, informações do
                dispositivo e desempenho, coletados de forma anonimizada para melhorar
                o app.
              </li>
              <li>
                <strong className="text-foreground">Notificações:</strong> token do
                dispositivo para envio de notificações push (opcional, pode ser
                revogado nas permissões do dispositivo).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Como usamos seus dados</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>Autenticar você e manter sua conta ativa.</li>
              <li>Salvar suas anotações, grifos e progresso de estudos.</li>
              <li>
                Gerar conteúdo personalizado (resumos, mapas mentais, questões, áudios
                narrados) por meio de IA.
              </li>
              <li>Enviar notificações sobre novidades legislativas e atualizações.</li>
              <li>Melhorar o app e diagnosticar problemas técnicos.</li>
              <li>Cumprir obrigações legais aplicáveis.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              4. Serviços de terceiros que utilizamos
            </h2>
            <p className="mb-3 text-muted-foreground leading-relaxed">
              Para funcionar, o Vacatio integra os seguintes serviços. Cada um deles
              possui sua própria política de privacidade:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Google (Sign-In e Gemini AI):</strong>{" "}
                autenticação e geração de conteúdo por IA.
              </li>
              <li>
                <strong className="text-foreground">Supabase:</strong> banco de dados,
                autenticação e armazenamento de arquivos.
              </li>
              <li>
                <strong className="text-foreground">Firebase (Google):</strong> envio
                de notificações push (FCM).
              </li>
              <li>
                <strong className="text-foreground">Vercel Analytics:</strong> métricas
                anônimas de uso e desempenho.
              </li>
              <li>
                <strong className="text-foreground">Mistral OCR:</strong>{" "}
                processamento de PDFs enviados à biblioteca (quando aplicável).
              </li>
              <li>
                <strong className="text-foreground">APIs públicas:</strong> Câmara dos
                Deputados, Senado, Planalto e portais oficiais para consulta de
                legislação e notícias.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Compartilhamento de dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Não vendemos seus dados pessoais. Compartilhamos informações apenas com
              os provedores listados acima, estritamente para operação do serviço, ou
              quando exigido por lei/ordem judicial.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Armazenamento e segurança</h2>
            <p className="text-muted-foreground leading-relaxed">
              Seus dados são armazenados em servidores do Supabase com criptografia em
              trânsito (HTTPS/TLS) e em repouso. Aplicamos regras de segurança
              (Row-Level Security) para que apenas você acesse seu próprio conteúdo.
              Anotações também podem ser salvas localmente no seu dispositivo para uso
              offline.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              7. Seus direitos (LGPD — Lei 13.709/2018)
            </h2>
            <p className="mb-3 text-muted-foreground leading-relaxed">
              Você tem direito a:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>Confirmar a existência de tratamento dos seus dados.</li>
              <li>Acessar, corrigir ou atualizar seus dados.</li>
              <li>Solicitar a exclusão da sua conta e de todos os dados associados.</li>
              <li>Revogar consentimentos a qualquer momento.</li>
              <li>Solicitar a portabilidade dos seus dados.</li>
            </ul>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Para exercer qualquer direito, envie um e-mail para{" "}
              <a
                href="mailto:wn7corporation@gmail.com"
                className="text-primary underline underline-offset-4"
              >
                wn7corporation@gmail.com
              </a>
              . Respondemos em até 15 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Retenção de dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos seus dados enquanto sua conta estiver ativa. Se você excluir sua
              conta, removeremos seus dados pessoais em até 30 dias, exceto quando a
              retenção for exigida por lei.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">9. Menores de idade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Vacatio é destinado a estudantes de Direito e profissionais maiores de
              16 anos. Menores devem ter autorização dos responsáveis para utilizar o
              app.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">10. Alterações nesta política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta política periodicamente. Alterações relevantes
              serão comunicadas dentro do próprio app ou por e-mail.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">11. Contato</h2>
            <div className="rounded-lg border border-border/60 bg-card/50 p-4">
              <p className="mb-2 text-sm text-muted-foreground">
                Dúvidas sobre privacidade ou tratamento de dados:
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
              to="/termos"
              className="text-sm text-primary underline underline-offset-4"
            >
              Ver Termos de Uso →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
