import { Link } from "react-router-dom";
import { Mail, MessageCircle, HelpCircle, Shield } from "lucide-react";

/**
 * Página PÚBLICA de suporte (sem login).
 * URL a ser cadastrada em App Store Connect / Play Console como "URL de suporte":
 * https://www.vacatio.com.br/suporte-publico
 */
export default function SuportePublico() {
  return (
    <main className="min-h-dvh bg-background text-foreground px-6 py-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-3">Suporte — Vacatio</h1>
      <p className="text-muted-foreground mb-8">
        Vade Mecum Jurídico Profissional. Estamos aqui para ajudar você a resolver
        qualquer dúvida, problema técnico ou sugestão sobre o aplicativo.
      </p>

      <section className="rounded-xl border border-border p-5 mb-6 bg-card">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Fale conosco por e-mail</h2>
        </div>
        <p className="mb-2">
          Envie sua mensagem para{" "}
          <a
            className="underline font-medium"
            href="mailto:wn7corporation@gmail.com?subject=Suporte%20Vacatio"
          >
            wn7corporation@gmail.com
          </a>
        </p>
        <p className="text-sm text-muted-foreground">
          Respondemos em até 48 horas úteis. Inclua modelo do aparelho, versão do
          sistema e uma descrição do problema.
        </p>
      </section>

      <section className="rounded-xl border border-border p-5 mb-6 bg-card">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Suporte pelo app</h2>
        </div>
        <p className="mb-2">
          Usuários já cadastrados podem abrir um chamado direto pelo app em{" "}
          <strong>Menu → Configurações → Fale com o Suporte</strong>.
        </p>
      </section>

      <section className="rounded-xl border border-border p-5 mb-6 bg-card">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Perguntas frequentes</h2>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-semibold">Como faço login?</p>
            <p className="text-muted-foreground">
              Abra o app e escolha entrar com Apple, Google ou e-mail e senha.
            </p>
          </div>
          <div>
            <p className="font-semibold">Como cancelo minha assinatura?</p>
            <p className="text-muted-foreground">
              Assinaturas são gerenciadas pela loja: iOS em Ajustes → Apple ID →
              Assinaturas; Android em Google Play → Pagamentos e assinaturas.
            </p>
          </div>
          <div>
            <p className="font-semibold">Perdi acesso à minha conta.</p>
            <p className="text-muted-foreground">
              Envie um e-mail para wn7corporation@gmail.com a partir do endereço
              cadastrado e recuperamos o acesso em até 48h úteis.
            </p>
          </div>
          <div>
            <p className="font-semibold">O conteúdo é atualizado?</p>
            <p className="text-muted-foreground">
              Sim. A legislação é atualizada continuamente conforme publicações
              no Diário Oficial.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border p-5 mb-6 bg-card">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Privacidade e conta</h2>
        </div>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>
            <Link className="underline" to="/politica-privacidade">
              Política de privacidade
            </Link>
          </li>
          <li>
            <Link className="underline" to="/termos">
              Termos de uso
            </Link>
          </li>
          <li>
            <Link className="underline" to="/excluir-conta">
              Excluir minha conta
            </Link>
          </li>
        </ul>
      </section>

      <p className="text-xs text-muted-foreground mt-8 text-center">
        Vacatio · WN7 Corporation · CNPJ 00.000.000/0001-00
      </p>
    </main>
  );
}