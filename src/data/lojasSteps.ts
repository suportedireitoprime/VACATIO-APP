export type PassoLoja = {
  key: string;
  titulo: string;
  descricao: string;
  link?: { url: string; label: string };
  linkInterno?: { path: string; label: string };
  referencias?: string[];
  secrets?: Array<{ name: string; label: string; hint?: string }>;
};

export type FaseLoja = {
  key: string;
  titulo: string;
  resumo?: string;
  passos: PassoLoja[];
};

export const APPLE_FASES: FaseLoja[] = [
  {
    key: "conta",
    titulo: "1. Conta Apple Developer",
    resumo: "Base para tudo. Custa US$ 99/ano.",
    passos: [
      {
        key: "criar-conta",
        titulo: "Criar/renovar Apple Developer Program",
        descricao: "Ativar a conta paga (US$ 99/ano). Sem isso não dá pra publicar nada.",
        link: { url: "https://developer.apple.com/programs/enroll/", label: "Enroll" },
        referencias: ["https://developer.apple.com/support/enrollment/"],
      },
      {
        key: "team-id",
        titulo: "Anotar Team ID e Developer ID",
        descricao: "O Team ID (10 caracteres) é usado em quase todo secret. Encontre no topo da página de Membership.",
        link: { url: "https://developer.apple.com/account", label: "Developer Account" },
        secrets: [{ name: "APPLE_TEAM_ID", label: "Team ID (10 chars)" }],
      },
    ],
  },
  {
    key: "api",
    titulo: "2. App Store Connect API",
    resumo: "Chave usada pelo CI/CD para enviar builds ao TestFlight.",
    passos: [
      {
        key: "solicitar-acesso",
        titulo: "Solicitar acesso à API",
        descricao: "Na primeira vez, clique em 'Request Access' e aguarde aprovação (alguns segundos).",
        link: { url: "https://appstoreconnect.apple.com/access/integrations/api", label: "Integrations" },
      },
      {
        key: "gerar-chave",
        titulo: "Gerar API Key com papel 'App Manager'",
        descricao: "Nomeie a chave (ex: 'Vacatio CI/CD'), escolha 'App Manager', gere e baixe o .p8 IMEDIATAMENTE (só aparece uma vez).",
        link: { url: "https://appstoreconnect.apple.com/access/integrations/api", label: "Gerar chave" },
        secrets: [
          { name: "APPLE_APP_STORE_CONNECT_KEY_ID", label: "Key ID (10 chars)" },
          { name: "APPLE_APP_STORE_CONNECT_ISSUER_ID", label: "Issuer ID (UUID)" },
          { name: "APPLE_APP_STORE_CONNECT_KEY_P8_BASE64", label: ".p8 em base64", hint: "Cole o conteúdo do AuthKey_XXX.p8 já em base64" },
        ],
      },
    ],
  },
  {
    key: "identifier",
    titulo: "3. Bundle ID (Identifier)",
    passos: [
      {
        key: "registrar-bundle",
        titulo: "Registrar App ID",
        descricao: "Crie um Identifier tipo 'App IDs → App' com Bundle ID EXPLICIT (ex: br.com.vacatio.app). Ative Push Notifications e Associated Domains se for usar.",
        link: { url: "https://developer.apple.com/account/resources/identifiers/add/bundleId", label: "Novo Identifier" },
        secrets: [{ name: "APPLE_BUNDLE_ID", label: "Bundle ID" }],
      },
    ],
  },
  {
    key: "certificado",
    titulo: "4. Certificado de Distribuição",
    resumo: "Gera a assinatura .p12 usada nos builds.",
    passos: [
      {
        key: "gerar-csr",
        titulo: "Gerar chave privada + CSR",
        descricao: "Use a página interna /admin-apple-csr — gera a .key e o .certSigningRequest direto no navegador (sem precisar de Mac).",
        linkInterno: { path: "/admin-apple-csr", label: "Abrir /admin-apple-csr" },
      },
      {
        key: "criar-cert",
        titulo: "Criar certificado 'Apple Distribution'",
        descricao: "Envie o .certSigningRequest e baixe o .cer.",
        link: { url: "https://developer.apple.com/account/resources/certificates/add", label: "Novo Certificate" },
      },
      {
        key: "converter-p12",
        titulo: "Converter .cer + .key em .p12",
        descricao: "Combine o certificado com a chave privada em um arquivo .p12 protegido por senha. Salve os dois secrets abaixo.",
        secrets: [
          { name: "APPLE_DISTRIBUTION_CERT_P12_BASE64", label: ".p12 em base64" },
          { name: "APPLE_DISTRIBUTION_CERT_PASSWORD", label: "Senha do .p12" },
        ],
      },
    ],
  },
  {
    key: "provisioning",
    titulo: "5. Provisioning Profile",
    passos: [
      {
        key: "criar-profile",
        titulo: "Criar profile 'App Store'",
        descricao: "Selecione seu App ID + o certificado de distribuição, baixe o .mobileprovision.",
        link: { url: "https://developer.apple.com/account/resources/profiles/add", label: "Novo Profile" },
        secrets: [{ name: "APPLE_PROVISIONING_PROFILE_BASE64", label: ".mobileprovision em base64" }],
      },
    ],
  },
  {
    key: "ci-ios",
    titulo: "5.5. CI/CD — Workflow build-ios.yml",
    resumo: "Compila e envia pro TestFlight automaticamente.",
    passos: [
      {
        key: "criptografia",
        titulo: "Declarar ITSAppUsesNonExemptEncryption=false",
        descricao: "Vacatio só usa TLS/Keychain padrão do iOS, isento de documentação de export de criptografia (ERN). O workflow build-ios.yml já injeta essa flag automaticamente no Info.plist a cada build.",
        referencias: ["https://developer.apple.com/documentation/security/complying_with_encryption_export_regulations"],
      },
      {
        key: "secrets-github",
        titulo: "Copiar secrets para GitHub Actions",
        descricao: "Os secrets APPLE_* precisam ficar TAMBÉM em GitHub → Settings → Secrets and variables → Actions (o runner macOS não acessa o Supabase). Inclui KEYCHAIN_PASSWORD (qualquer valor aleatório).",
        link: { url: "https://github.com/settings/secrets/actions", label: "GitHub Actions Secrets" },
        secrets: [
          { name: "KEYCHAIN_PASSWORD", label: "Senha temporária da keychain do runner", hint: "Qualquer string aleatória, só existe no build" },
        ],
      },
      {
        key: "rodar-workflow",
        titulo: "Rodar Build iOS (.ipa → TestFlight)",
        descricao: "GitHub → Actions → 'Build iOS (.ipa → TestFlight)' → Run workflow. Em ~15min o .ipa é gerado e enviado. Após ~10min de processamento na Apple, o build aparece em TestFlight → Builds e pode ser anexado à versão 1.0.",
        link: { url: "https://github.com/actions", label: "Abrir Actions" },
      },
    ],
  },

  {
    key: "criar-app",
    titulo: "6. Criar app no App Store Connect",
    passos: [
      {
        key: "novo-app",
        titulo: "Registrar o app",
        descricao: "Apps → + → New App. Plataforma iOS, Bundle ID já registrado, Idioma principal Português (Brasil), SKU único (ex: vacatio-ios-001).",
        link: { url: "https://appstoreconnect.apple.com/apps", label: "Meus Apps" },
        secrets: [{ name: "APPLE_APP_STORE_CONNECT_APP_ID", label: "Apple ID do app (número)" }],
      },
    ],
  },
  {
    key: "metadata",
    titulo: "7. Metadata da ficha",
    resumo: "Textos, imagens e políticas que aparecem na App Store.",
    passos: [
      {
        key: "info-basica",
        titulo: "Nome, subtítulo, descrição e palavras-chave",
        descricao: "Preencha em Português (BR). Descrição até 4000 chars, palavras-chave 100 chars separadas por vírgula. Subtítulo 30 chars.",
        link: { url: "https://appstoreconnect.apple.com/apps", label: "App Information" },
      },
      {
        key: "screenshots",
        titulo: "Screenshots + ícone 1024x1024",
        descricao: "iPhone 6.7\" (1290x2796) obrigatório. iPad 12.9\" só se suportar iPad. Ícone JPG/PNG 1024x1024 sem alpha.",
        referencias: ["https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications"],
      },
      {
        key: "privacidade",
        titulo: "URL de política de privacidade + questionário 'Privacy Nutrition Labels'",
        descricao: "Sem URL de privacidade a Apple recusa. Preencha o questionário de coleta de dados (analytics, crash, identifiers).",
      },
      {
        key: "classificacao",
        titulo: "Classificação etária + categoria",
        descricao: "Categoria principal 'Reference' ou 'Education'. Responda o questionário de conteúdo (violência, apostas, etc).",
      },
    ],
  },
  {
    key: "assinaturas",
    titulo: "8. Planos de assinatura (In-App Purchase)",
    resumo: "Assinaturas mensais/anuais dentro do app.",
    passos: [
      {
        key: "contratos",
        titulo: "Aceitar Paid Applications Agreement",
        descricao: "Sem esse contrato assinado + dados bancários + tax forms, nenhuma assinatura pode ser cobrada.",
        link: { url: "https://appstoreconnect.apple.com/business", label: "Business (Contratos)" },
      },
      {
        key: "grupo-subs",
        titulo: "Criar Subscription Group",
        descricao: "Um grupo agrupa planos que competem entre si (mensal vs anual). O usuário só pode ter 1 ativo por grupo.",
        link: { url: "https://appstoreconnect.apple.com/apps", label: "In-App Purchases" },
      },
      {
        key: "criar-planos",
        titulo: "Criar cada plano (mensal, anual)",
        descricao: "Reference name (interno), Product ID (ex: 'vacatio.mensal'), duração, preço (tier), texto de marketing, período grátis (introductory offer).",
      },
      {
        key: "review-info",
        titulo: "Screenshot de review + descrição de cada plano",
        descricao: "A Apple pede uma screenshot mostrando o plano dentro do app + descrição em PT-BR. Sem isso o IAP não é aprovado.",
      },
    ],
  },
  {
    key: "testflight",
    titulo: "9. TestFlight",
    passos: [
      {
        key: "internal",
        titulo: "Grupo de testadores internos",
        descricao: "Até 100 pessoas da equipe (precisam ter conta Apple na organização). Ativação instantânea, sem review.",
        link: { url: "https://appstoreconnect.apple.com/apps", label: "TestFlight" },
      },
      {
        key: "external",
        titulo: "Grupo externo (opcional, até 10.000)",
        descricao: "Cada build precisa de review de TestFlight (rápido, ~1 dia).",
      },
    ],
  },
  {
    key: "submissao",
    titulo: "10. Submissão para review",
    passos: [
      {
        key: "build-selecionado",
        titulo: "Selecionar build + preencher 'App Review Information'",
        descricao: "Escolha o build subido via CI. Preencha demo account (login teste) se o app pedir login, e notes explicando funcionalidades sensíveis.",
      },
      {
        key: "submeter",
        titulo: "Submit for Review",
        descricao: "Review normalmente <48h. Se rejeitado, a Apple manda motivo detalhado em 'Resolution Center'.",
      },
    ],
  },
];

export const GOOGLE_FASES: FaseLoja[] = [
  {
    key: "conta",
    titulo: "1. Google Play Console",
    resumo: "Base para tudo. Taxa única de US$ 25.",
    passos: [
      {
        key: "criar-conta",
        titulo: "Criar conta de desenvolvedor",
        descricao: "US$ 25 pagos uma única vez. Escolha conta 'Organization' para empresa (exige DUNS number) ou 'Personal'.",
        link: { url: "https://play.google.com/console/signup", label: "Signup" },
      },
      {
        key: "verificacao",
        titulo: "Verificação de identidade + endereço",
        descricao: "Google pede documento + comprovante de endereço. Pode levar até 48h.",
      },
    ],
  },
  {
    key: "service-account",
    titulo: "2. Service Account (CI/CD)",
    resumo: "Chave usada pelo pipeline para subir APK/AAB automaticamente.",
    passos: [
      {
        key: "criar-projeto-gcp",
        titulo: "Criar projeto no Google Cloud",
        descricao: "Se ainda não tem, crie um projeto no GCP com o mesmo email do Play Console.",
        link: { url: "https://console.cloud.google.com/projectcreate", label: "Novo projeto GCP" },
      },
      {
        key: "criar-sa",
        titulo: "Criar Service Account + baixar JSON",
        descricao: "IAM & Admin → Service Accounts → Create. Role: nenhum no GCP. Depois vá em Keys → Add Key → JSON e baixe.",
        link: { url: "https://console.cloud.google.com/iam-admin/serviceaccounts", label: "Service Accounts" },
        secrets: [{ name: "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64", label: "JSON em base64" }],
      },
      {
        key: "conceder-permissao",
        titulo: "Convidar o Service Account no Play Console",
        descricao: "Play Console → Users and Permissions → Invite new user. Cole o email da service account e conceda 'Release manager' + 'Financial data' para o app.",
        link: { url: "https://play.google.com/console/users-and-permissions", label: "Users and Permissions" },
      },
    ],
  },
  {
    key: "criar-app",
    titulo: "3. Criar app no Play Console",
    passos: [
      {
        key: "novo-app",
        titulo: "Create app",
        descricao: "Nome (30 chars), idioma padrão, tipo App ou Game, gratuito ou pago. Package name = br.com.vacatio.app (não pode mudar depois!).",
        link: { url: "https://play.google.com/console", label: "Play Console" },
        secrets: [{ name: "ANDROID_PACKAGE_NAME", label: "Package name" }],
      },
    ],
  },
  {
    key: "signing",
    titulo: "4. Assinatura do app",
    resumo: "Play App Signing: Google guarda a chave final, você só assina uploads.",
    passos: [
      {
        key: "gerar-upload-key",
        titulo: "Gerar upload keystore",
        descricao: "Comando: keytool -genkey -v -keystore upload.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000. Guarde a senha!",
        secrets: [
          { name: "ANDROID_UPLOAD_KEYSTORE_BASE64", label: "upload.keystore em base64" },
          { name: "ANDROID_UPLOAD_KEYSTORE_PASSWORD", label: "Senha do keystore" },
          { name: "ANDROID_UPLOAD_KEY_ALIAS", label: "Alias (ex: upload)" },
          { name: "ANDROID_UPLOAD_KEY_PASSWORD", label: "Senha da chave" },
        ],
      },
      {
        key: "opt-in-play-signing",
        titulo: "Ativar Play App Signing",
        descricao: "Ao subir o primeiro AAB, o Console pergunta se você quer que o Google gerencie a chave final. Aceite — é o padrão recomendado.",
      },
    ],
  },
  {
    key: "ficha",
    titulo: "5. Ficha da loja",
    passos: [
      {
        key: "titulo-desc",
        titulo: "Título (30) + descrição curta (80) + descrição longa (4000)",
        descricao: "PT-BR obrigatório se o app for para o Brasil. Sem emojis no título.",
      },
      {
        key: "assets-visuais",
        titulo: "Ícone 512x512, feature graphic 1024x500, screenshots",
        descricao: "Mínimo 2 screenshots por form factor (telefone, tablet 7\", tablet 10\"). Ícone PNG 32-bit com alpha.",
      },
      {
        key: "categoria",
        titulo: "Categoria + tags + email de contato",
        descricao: "Categoria 'Education' ou 'Books & Reference'. Email visível na ficha.",
      },
    ],
  },
  {
    key: "compliance",
    titulo: "6. Política de privacidade + Data Safety",
    passos: [
      {
        key: "url-privacidade",
        titulo: "URL de política de privacidade",
        descricao: "Obrigatória. Pode hospedar em uma página do próprio site.",
      },
      {
        key: "data-safety",
        titulo: "Questionário Data Safety",
        descricao: "Liste todos os dados coletados (email, ID de dispositivo, analytics) e para que. É pesado, reserve 30 min.",
        link: { url: "https://play.google.com/console/", label: "App content" },
      },
      {
        key: "classificacao",
        titulo: "Classificação etária (IARC)",
        descricao: "Responda o questionário. Para app jurídico, resposta 'não' em quase tudo → Livre.",
      },
      {
        key: "publico-alvo",
        titulo: "Público-alvo + declaração COPPA",
        descricao: "Marque 'não voltado a crianças' se for para adultos.",
      },
    ],
  },
  {
    key: "assinaturas",
    titulo: "7. Planos de assinatura",
    resumo: "Google Play Billing.",
    passos: [
      {
        key: "conta-pagamentos",
        titulo: "Configurar Merchant Account (Payments)",
        descricao: "Play Console → Setup → Payments profile. Dados bancários + tax forms. Obrigatório antes de criar produtos pagos.",
        link: { url: "https://play.google.com/console", label: "Payments profile" },
      },
      {
        key: "produtos",
        titulo: "Criar Subscription Products",
        descricao: "Monetize → Subscriptions. Product ID (ex: 'vacatio_mensal'), nome, descrição, benefícios.",
      },
      {
        key: "ofertas-base",
        titulo: "Base plans + ofertas (trial, desconto)",
        descricao: "Cada Subscription tem 1+ base plans (auto-renew mensal/anual) e ofertas opcionais (trial 7 dias, 50% no primeiro mês).",
      },
      {
        key: "elegibilidade",
        titulo: "Regras de elegibilidade da oferta",
        descricao: "Ex: trial só para novos assinantes. Sem isso, usuário pode reciclar trials.",
      },
    ],
  },
  {
    key: "testes",
    titulo: "8. Trilhos de teste",
    passos: [
      {
        key: "internal",
        titulo: "Internal testing (até 100)",
        descricao: "Ativação instantânea. Convide por email.",
      },
      {
        key: "closed",
        titulo: "Closed testing (alpha)",
        descricao: "Grupos maiores, review rápido do Play (~horas). Necessário para promover a produção depois.",
      },
      {
        key: "open",
        titulo: "Open testing (beta)",
        descricao: "Qualquer um com link pode testar. Aparece como 'Early access' na Play Store.",
      },
    ],
  },
  {
    key: "producao",
    titulo: "9. Produção",
    passos: [
      {
        key: "rollout",
        titulo: "Criar release de produção + rollout gradual",
        descricao: "Comece com 10-20% do público, monitore crashes por 24-48h, aumente. Review inicial do Play leva até 7 dias.",
      },
      {
        key: "monitor",
        titulo: "Vitals + Reviews",
        descricao: "Acompanhe crash rate (<1.09% para não ser rebaixado no ranking) e responda reviews em até 48h.",
      },
    ],
  },
];

export const APPLE_FAQ = [
  {
    q: "Perdi o arquivo .p8 da API Key",
    a: "Impossível recuperar. Vá em App Store Connect → Users and Access → Integrations → Revogue a chave antiga → Gere uma nova → Baixe o novo .p8 → atualize APPLE_APP_STORE_CONNECT_KEY_ID e APPLE_APP_STORE_CONNECT_KEY_P8_BASE64.",
  },
  {
    q: "Perdi a senha do .p12 (certificado de distribuição)",
    a: "Também impossível. Revogue o certificado em developer.apple.com → Certificates → gere um novo com um novo CSR (use /admin-apple-csr) → recrie o Provisioning Profile → atualize os secrets.",
  },
  {
    q: "Perdi o Provisioning Profile",
    a: "Baixe de novo em developer.apple.com → Profiles → clique no profile → Download. Nada é perdido.",
  },
  {
    q: "Bundle ID errado — posso mudar?",
    a: "Só ANTES do primeiro upload. Depois de ter build no App Store Connect, o Bundle ID é imutável — precisa criar app novo.",
  },
  {
    q: "App rejeitado — o que fazer?",
    a: "Leia a mensagem no Resolution Center. Responda com esclarecimento OU corrija e envie novo build. Rejeições comuns: falta de conta demo, IAP sem screenshot, política de privacidade quebrada.",
  },
];

export const GOOGLE_FAQ = [
  {
    q: "Perdi o JSON da Service Account",
    a: "Vá em console.cloud.google.com → IAM → Service Accounts → sua conta → Keys → adicione nova chave JSON. A antiga continua funcionando até você deletá-la manualmente.",
  },
  {
    q: "Perdi o upload keystore",
    a: "Se você ativou Play App Signing (padrão): Play Console → Setup → App integrity → 'Request upload key reset' → envie novo keystore. Google aprova em ~48h.",
  },
  {
    q: "Perdi a senha do keystore",
    a: "Mesma coisa: reset via Play Console. Se NÃO ativou Play App Signing, não há como recuperar — app precisa ser publicado como novo package name.",
  },
  {
    q: "Package name errado",
    a: "Package name é IMUTÁVEL após primeiro upload. Precisa criar app novo no Play Console e migrar usuários.",
  },
  {
    q: "Rejeitado no review",
    a: "Play Console → Policy → App content → veja a issue. Comuns: Data Safety incompleta, política de privacidade sem link, uso de permissão sensível sem justificativa.",
  },
];
