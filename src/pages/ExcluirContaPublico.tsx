import { Link } from "react-router-dom";

/**
 * Página PÚBLICA (sem login) explicando como excluir a conta.
 * Exigência do Google Play desde 2024: URL pública acessível sem cadastro.
 * URL a ser cadastrada no Play Console: https://www.vacatio.com.br/excluir-conta
 */
export default function ExcluirContaPublico() {
  return (
    <main className="min-h-dvh bg-background text-foreground px-6 py-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Exclusão de conta — Vacatio</h1>

      <p className="mb-4">
        Você pode solicitar a exclusão da sua conta Vacatio e de todos os dados
        associados a qualquer momento. O processo é gratuito e irreversível.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Como excluir pelo app</h2>
      <ol className="list-decimal pl-6 space-y-2 mb-6">
        <li>Abra o app Vacatio e faça login.</li>
        <li>Vá em <strong>Menu → Configurações → Segurança → Excluir conta</strong>.</li>
        <li>Confirme a solicitação. A conta e os dados são apagados imediatamente.</li>
      </ol>

      <h2 className="text-xl font-semibold mt-8 mb-3">Como excluir por e-mail</h2>
      <p className="mb-2">
        Se você não consegue acessar o app, envie um e-mail para{" "}
        <a className="underline" href="mailto:wn7corporation@gmail.com?subject=Exclus%C3%A3o%20de%20conta%20Vacatio">
          wn7corporation@gmail.com
        </a>{" "}
        a partir do endereço cadastrado, com o assunto{" "}
        <strong>&quot;Exclusão de conta Vacatio&quot;</strong>. A exclusão é feita em até
        7 dias úteis.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">Dados excluídos</h2>
      <ul className="list-disc pl-6 space-y-1 mb-6">
        <li>Perfil (nome, e-mail, foto)</li>
        <li>Anotações, grifos e artigos favoritos</li>
        <li>Histórico de narrações, buscas e progresso de estudos</li>
        <li>Tokens de notificação (FCM)</li>
        <li>Dados de assinatura (o cancelamento da cobrança recorrente deve ser feito na Google Play)</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">Dados retidos</h2>
      <p className="mb-6">
        Podemos reter registros mínimos exigidos por lei (fiscais e antifraude)
        por até 5 anos, de forma anônima, conforme a LGPD.
      </p>

      <div className="mt-10 pt-6 border-t border-border text-sm text-muted-foreground">
        <Link to="/privacidade" className="underline mr-4">Política de Privacidade</Link>
        <Link to="/termos" className="underline">Termos de Uso</Link>
      </div>
    </main>
  );
}
