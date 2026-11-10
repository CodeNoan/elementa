# Elementa — tabela periódica interativa

O Elementa é um site web de química. A tabela periódica continua sendo a tela principal, com busca, filtro por família, visualização em lista, escala ajustável e detalhes de cada elemento. O site também mantém quiz, favoritos e progresso local. **O fórum de feedback é uma aba separada**, sem substituir a tabela. Não há login nem dependência do Expo.

## O que está no site

- Tabela interativa com os 118 elementos, cores por família, busca por nome/símbolo/número atômico e detalhes de propriedades.
- Ficha individual com configuração eletrônica, elétrons por camada, propriedades físicas, usos cotidianos e fonte.
- Comparação lado a lado de elementos, lista de favoritos e quiz introdutório com temas e número de questões configuráveis.
- Progresso, favoritos e histórico de quiz guardados no navegador, sem cadastro.
- Aba pública de feedback. Qualquer visitante pode publicar um nome e comentário, e os feedbacks publicados ficam visíveis para todos.

## Fórum compartilhado no Netlify

A aba Feedback chama a Netlify Function `/api/comments`. A função guarda os comentários em Netlify Blobs do site; a tabela periódica e as demais abas continuam disponíveis normalmente. O armazenamento site-wide permanece entre deploys. Se a função ficar indisponível temporariamente, um comentário fica como pendente apenas no navegador de quem enviou e o site tenta sincronizá-lo quando a conexão voltar.

O fórum é público e não tem login. Nomes e comentários publicados ficam visíveis para qualquer pessoa; não envie informações pessoais sensíveis. A tabela e os dados de estudo são independentes do fórum.

## Publicar no Netlify

1. Conecte o repositório GitHub `CodeNoan/elementa` a um site Netlify novo ou existente.
2. Mantenha a branch de produção `main`. O `netlify.toml` configura `npm run build`, a pasta publicada `dist` e a função em `netlify/functions`.
3. Faça o deploy pelo Netlify. Não é necessário configurar Supabase nem inserir chaves de banco.
4. Na URL publicada, abra a aba **Feedback** para enviar comentários. A tabela periódica abre primeiro e continua disponível na aba **Tabela**.

Se o repositório já estiver conectado ao Netlify, cada push em `main` pode iniciar o deploy automaticamente. O arquivo `DATA-LICENSE.md` atribui a base periódica original e explica a licença CC BY-SA 3.0.

## Executar localmente

Requer Node.js 22.13 ou superior.

```sh
npm ci
npm run dev
```

Para testar as Netlify Functions localmente, use:

```sh
npx netlify-cli dev
```

O armazenamento local do Netlify Dev é separado do site publicado. Comentários criados localmente não são enviados ao fórum de produção.

## Verificações

```sh
npm run typecheck
npm test
npm run build
```

## Estrutura

- `src/App.tsx`: tabela, página inicial, quiz, favoritos, perfil e aba de feedback.
- `src/elements.json`: dados dos 118 elementos.
- `src/quiz.ts`: perguntas simples sobre símbolos, nomes e usos cotidianos.
- `src/comments-model.ts` e `src/comments.ts`: validação, cache local e sincronização de feedback.
- `netlify/functions/comments.mts`: leitura e gravação pública no Netlify Blobs.
- `netlify.toml`: build e configuração da função Netlify.
- `DATA-LICENSE.md`: atribuição e licença dos dados periódicos.
- `tests/`: testes do quiz, da base de elementos e do fórum.
