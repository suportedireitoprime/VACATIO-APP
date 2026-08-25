---
name: nativo-mobile
description: Diretrizes e práticas para tornar a aplicação Capacitor 100% nativa em Android e iOS.
---

# Nativo Mobile (Capacitor)

Esta skill define as regras, melhores práticas e diretrizes para garantir que a aplicação web/híbrida se comporte de maneira **100% nativa** nos dispositivos móveis (Android e iOS) utilizando o Capacitor. Sempre que for trabalhar em funcionalidades de UI/UX, navegação ou interação com hardware, estas regras devem ser aplicadas rigorosamente.

## 1. Priorize APIs Nativas
Sempre prefira usar os plugins oficiais do Capacitor em vez de APIs web padrão quando estiver no contexto nativo.
- **Notificações**: Use `@capacitor/push-notifications` e `@capacitor/local-notifications` em vez de Web Notifications API.
- **Geolocalização**: Use `@capacitor/geolocation` em vez de `navigator.geolocation`.
- **Compartilhamento**: Use `@capacitor/share` no lugar do Web Share API (`navigator.share`), verificando sempre se o dispositivo suporta a ação.
- **Armazenamento**: Para dados críticos de sessão, cache de arquivos (ex: PDFs offline) ou leitura intensiva, confira se não há integrações nativas (como SQLite ou Capacitor Filesystem) para evitar o limite e a volatilidade de IndexedDB/localStorage.
- **Feedback Tátil (Haptics)**: Use `@capacitor/haptics` em interações importantes (ex: cliques em botões principais, sucessos, avisos de erro, seleções) para aumentar a imersão e simular a resposta de um app nativo, evitando o obsoleto `navigator.vibrate`.

## 2. Edge-to-Edge: Status Bar e Safe Areas
O aplicativo não deve ter barras pretas/brancas mortas no topo ou embaixo. A interface deve fluir por debaixo das áreas do sistema.
- **Status Bar**: Gerencie a barra através do `@capacitor/status-bar`. Configure a barra de acordo com o fundo da tela (Dark/Light).
- **Safe Area Insets**: Utilize rigorosamente o plugin `@capacitor-community/safe-area`. Sempre aplique as variáveis CSS `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`, etc. (ex: usando classes como `pt-safe` e `pb-safe`) nos contêineres e barras flutuantes para garantir que áreas clicáveis não fiquem escondidas pelo "notch" ou pelas pílulas de navegação por gestos do iOS e Android.

## 3. Gestão Inteligente do Teclado (Keyboard)
Use `@capacitor/keyboard` para lidar perfeitamente com os formulários no mobile.
- Ajuste as configurações para que o teclado **não** "esmague" a interface inteira (`resize` behavior do Android) caso atrapalhe o layout.
- Certifique-se de que os inputs fiquem visíveis (scroll automático ao focar).
- Esconda a barra extra de navegação (accessory bar) no iOS se for irrelevante para a experiência.

## 4. Modais Físicos e Botão Voltar (Hardware Back Button)
- Intercepte sempre o botão de voltar físico do Android usando `App.addListener('backButton')` (`@capacitor/app`).
- Se houver Bottom Sheets, Modais, Lightboxes de Imagem ou Menus Abertos: O botão de voltar **deve apenas fechar essas sobreposições**.
- Se não houver nada aberto, o botão volta na navegação (React Router). Somente feche/suspenda o app se for a última rota na pilha de histórico!

## 5. Remova as "Heranças" da Web
A aplicação **não pode** parecer um simples site encapsulado no navegador:
- **Desabilite a Lupa e a Seleção Acidental**: Se não for um texto explicitamente preparado para seleção (como um artigo jurídico), impeça que o toque contínuo abra barras nativas de seleção de texto (callout).
  ```css
  /* Aplicar globalmente, exceto em artigos e áreas de leitura! */
  .no-select {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
  ```
- **Fim do Overscroll (Efeito Elástico)**: Evite que os cantos brancos do navegador apareçam caso o usuário puxe demais a tela, a menos que exista um "Pull to Refresh" intencional.
- **Scroll Suave e Sem "Jank"**: Para listas enormes, não use rolagem nativa desenfreada (use Virtualização — ex: `@tanstack/react-virtual`).

## 6. Performance e Vida Útil
- **Imagens e Memória**: Mobile tem pouca RAM livre para WebViews pesadas. Aplique sempre imagens lazy load (`loading="lazy"`) e decodificação assíncrona (`decoding="async"`).
- **Processamento em Background**: WebWorkers e processos intensos JavaScript são pausados quando o Capacitor entra em segundo plano. Use `App.addListener('appStateChange')` para gerenciar a suspensão e salvar progresso.

## Regra de Ouro
Sempre se pergunte antes de escrever código: *"Isso está com sensação de sistema nativo?"*. Um app nativo não tem delay de 300ms no clique, responde com pequenas animações nas interações e integra perfeitamente botões físicos, bordas curvas das telas, notches e teclado!
