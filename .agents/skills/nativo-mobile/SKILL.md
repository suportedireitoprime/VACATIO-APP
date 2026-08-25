---
name: nativo-mobile
description: Diretrizes e práticas para tornar a aplicação Capacitor 100% nativa em Android e iOS.
---

# Nativo Mobile (Capacitor)

Esta skill define as regras, melhores práticas e diretrizes para garantir que a aplicação web/híbrida se comporte de maneira **100% nativa** nos dispositivos móveis (Android e iOS) utilizando o Capacitor. Sempre que for trabalhar em funcionalidades de UI/UX, navegação ou interação com hardware, estas regras devem ser aplicadas rigorosamente.

## Regras Essenciais

### 1. Priorize APIs Nativas
- **Notificações**: Use `@capacitor/push-notifications` e `@capacitor/local-notifications` em vez de Web Notifications API.
- **Geolocalização**: Use `@capacitor/geolocation`.
- **Compartilhamento**: Use `@capacitor/share` no lugar do `navigator.share`.
- **Armazenamento**: Para dados críticos de sessão ou cache, considere integrações nativas (SQLite, Capacitor Filesystem) para evitar volatilidade.
- **Feedback Tátil (Haptics)**: Use `@capacitor/haptics` em cliques principais, sucessos e seleções em vez de `navigator.vibrate`.

### 2. Edge-to-Edge: Status Bar e Safe Areas
- **Status Bar**: Gerencie a barra através do `@capacitor/status-bar`.
- **Safe Area Insets**: Utilize o `@capacitor-community/safe-area`. Aplique rigorosamente `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)` nos contêineres e barras flutuantes para não esconder nada pelo "notch" ou pílulas de navegação por gestos.

### 3. Gestão Inteligente do Teclado (Keyboard)
Use `@capacitor/keyboard` para lidar perfeitamente com formulários:
- Desative o comportamento que "esmaga" a interface inteira (`resize`) se não for o ideal.
- Role automaticamente para os inputs focados.
- Esconda a barra extra de navegação (accessory bar) no iOS.

### 4. Modais Físicos e Botão Voltar (Hardware Back Button)
- Intercepte sempre o botão de voltar físico do Android via `App.addListener('backButton')`.
- O botão de voltar **deve sempre fechar modais/sheets** ativos antes de voltar a navegação de página.
- Só suspenda/feche o app se for a última rota do histórico.

### 5. Remova as "Heranças" da Web
- **Seleção de Texto Acidental**: Aplique `user-select: none` globalmente, exceto em artigos e áreas exclusivas de leitura. Desative a lupa magnética do iOS (`touch-callout: none`).
- **Fim do Overscroll (Efeito Elástico)**: Evite os "cantos brancos" do navegador ao puxar demais a tela.
- **Evite Zoom Acidental**: Empregue as meta tags `user-scalable=no` adequadas e evite que duplos toques ampliem partes indesejadas da interface.

### 6. Performance e Ciclo de Vida
- Use `loading="lazy"` e `decoding="async"` nas imagens.
- Virtualize listas longas.
- Controle processos intensos em segundo plano ouvindo o evento de suspensão do sistema (`appStateChange`).

---

## Técnicas Avançadas de Realismo Nativo

### 7. Transições de Rota Push/Pop
Substitua o fading básico por transições de tela deslizantes, simulando o `UINavigationController` do iOS e a pilha do Android, empilhando as telas de maneira visual e orgânica.

### 8. Context Menus (Action Sheets)
Substitua os menus nativos rudimentares do navegador (ao dar long-press em imagens/links) pelo uso de um Action Sheet nativo (`@capacitor/action-sheet` ou Bottom Sheet equivalente renderizado na camada mais alta).

### 9. Gestos Baseados em Molas (Spring Physics)
Abandone `ease-in-out` de CSS puro para arrasto de modais. Use bibliotecas baseadas em física elástica (como Framer Motion com `type: 'spring'`) para fechar gavetas e arrastar painéis com exatamente a mesma velocidade/momentum do dedo do usuário.

### 10. Pull-to-Refresh Ultra Responsivo
Use indicadores de atualização orgânicos que reajam progressivamente e acompanhem milimetricamente a força que o usuário puxa o topo da tela, recriando o padrão de scroll-bounce nativo.

### 11. Feedbacks Visuais Específicos por Plataforma
Sempre que possível, adapte os botões de acordo com o SO: Efeito *Ripple* (Onda) ao tocar no Android vs Efeito *Fade down* (Redução de Opacidade) instantâneo no iOS.

### 12. Navegação Inteligente por Deep Links
Intercepte App Links nativamente (ex: `vacatio://` ou URLs de domínio via `@capacitor/app`) e injete o usuário na rota exata, reconstruindo a pilha de histórico ("back stack") para que o botão voltar aja de forma intuitiva.

### 13. Splash Screen "Seamless"
Sincronize rigidamente o ocultamento da SplashScreen nativa (`@capacitor/splash-screen`) apenas quando o primeiro frame/componente pesado terminar a montagem (useEffect), extirpando 100% de qualquer rastro de "tela branca" no boot.

### 14. Estado Sincronizado de Conexão (Offline-first)
Substitua interceptadores que quebram o fluxo por um monitoramento contínuo via `@capacitor/network`. Ao ficar sem internet, exiba apenas um leve "SnackBar" ou "Toast" flutuante informando que está operando offline.

### 15. Escala de Fonte Dinâmica (Dynamic Type / Acessibilidade)
O design nunca deve ter textos com contêineres de altura rígida (`height` fixo) que escondem letras quando o usuário aumenta as fontes do sistema em +200%. Todos os botões e balões devem fluir (*wrap*) ou redimensionar elegantemente.

### 16. Teclados Contextuais Perfeitos
Configure meticulosamente atributos no HTML dos inputs para invocar o teclado certo no momento certo: `inputmode="numeric"` para senhas/PINs, `type="email"` para e-mails e `enterkeyhint="search"` para transformar o botão Enter em uma Lupa.

### 17. Prevenção de Foco Fantasma
Bottom Sheets não devem permitir que o TalkBack (Android) ou VoiceOver (iOS) consigam focar ou ler botões/títulos que ficaram parados e inativos atrás da sobreposição. Trate focos corretamente.

### 18. Proteção de Privacidade (Multitarefa)
Caso alguma tela do app processe informações confidenciais ou sensíveis, ofusque visualmente ou aplique fundo opaco via evento de background para proteger os dados quando o app ficar lado a lado no menu de Multitarefas (App Switcher) do celular.

### 19. Sistema de Arquivos Nativo e Profundo
Para baixar livros inteiros pesados na nuvem para uso sem internet, ignore as limitações estritas de quota de armazenamento do IndexedDB/Navegador; manipule dados usando acesso real de I/O de disco do `@capacitor/filesystem`.

### 20. Virtualização e Isolamento para "Jank-Free" Mobile
Processamentos imensos (como buscar uma palavra-chave cruzando milhares de artigos em segundo plano) devem, onde for cabível, utilizar Web Workers (ou chamadas nativas pesadas limitadas) para que a interface e animações de scroll do usuário principal do React mantenham exatos 60/120 FPS cravados e nunca congelem.

## Regra de Ouro
Sempre analise o impacto tátil da sua alteração: *"Isso reage como se fosse nativo?"*. Um app móvel genuíno não possui delay de toque e mescla perfeitamente navegação, botões do sistema, engates de teclado e layouts sem "rasgos" no design!
