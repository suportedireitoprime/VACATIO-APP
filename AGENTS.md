# Regras para o Assistente (Agent)

- Toda vez que você fizer uma alteração de código ou modificação no projeto, você **deve** fazer um commit automático das suas mudanças e enviá-las para o GitHub (`git add .`, `git commit -m "..."`, `git push`).
- Isso garante que qualquer nova build (ou o GitHub Actions) sempre terá o código mais recente disponível.
- Não pergunte antes de fazer o commit se você acabou de finalizar um bloco lógico de alterações solicitadas pelo usuário. Simplesmente faça o commit e o push e avise o usuário que as alterações já estão no GitHub.
- Toda vez que você for implementar uma alteração de código ou nova funcionalidade, **pesquise na internet antes**. Busque por documentações oficiais atualizadas, boas práticas ou sugestões mais modernas para a tarefa em questão. Se encontrar algo mais recente ou adequado, você deve sugerir ou aplicar na solução.
- Quando houver um problema grave (ex: crash fatal, erro de compilação bloqueante), pesquise a causa raiz na internet e leia a documentação das bibliotecas/plataformas envolvidas antes de fazer tentativas cegas de correção.
