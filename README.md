# Elementa — fórum público de feedback

Site web em React, Vite e TypeScript. Não usa Expo, aplicativo móvel, página de login nem Supabase. Qualquer visitante pode publicar um comentário informando nome e feedback, e todas as pessoas veem o mesmo fórum.

## Como os comentários são compartilhados

O site chama uma Netlify Function em `/api/comments`. A função grava cada comentário em um store site-wide do Netlify Blobs, persistente entre deploys, e entrega a lista aos visitantes. Cada envio recebe uma chave independente para que publicações simultâneas não sobrescrevam outros comentários. O store usa leitura consistente para que novos comentários apareçam no feed publicado.

Se a API estiver temporariamente indisponível, o comentário fica marcado como pendente no navegador de quem enviou. O site tenta publicá-lo automaticamente quando a conexão volta. Comentários pendentes ainda não estão visíveis para outros visitantes. Nome e feedback publicados são públicos; não envie informações pessoais sensíveis.

## Publicar no Netlify

1. No Netlify, crie um site a partir do repositório GitHub `CodeNoan/elementa` (ou conecte este repositório ao site existente).
2. Mantenha a branch de produção `main`. O arquivo `netlify.toml` configura o build `npm run build`, a pasta publicada `dist` e as funções em `netlify/functions`.
3. Faça o deploy. A função cria/usa o armazenamento Netlify Blobs do site; não é necessário configurar Supabase nem adicionar chaves de banco.
4. Após o deploy ficar publicado, abra o domínio do Netlify e envie um comentário. Para confirmar o compartilhamento, acesse o mesmo domínio em outro navegador ou aparelho: o comentário deve aparecer para todos.

Se o repositório já estiver conectado ao Netlify, cada push na branch de produção inicia um novo deploy automaticamente. O histórico do fórum fica no armazenamento site-wide, não na pasta de build, portanto permanece entre deploys.

## Executar localmente

Requer Node.js 22.13 ou superior.

```sh
npm ci
npm run dev
```

O comando `npm run dev` serve a interface Vite; sem a função Netlify, os comentários de teste ficam apenas no armazenamento local do navegador. Para testar as funções localmente, use Netlify CLI:

```sh
npx netlify-cli dev
```

A loja local do Netlify Dev é isolada da produção. Os comentários criados localmente não são enviados para a loja do site publicado.

## Verificações

```sh
npm run typecheck
npm test
npm run build
```

## Estrutura

- `src/App.tsx`: interface web do fórum.
- `src/comments-model.ts`: validação, tipos e ordenação/deduplicação.
- `src/comments.ts`: chamadas à API, cache local e sincronização de comentários pendentes.
- `netlify/functions/comments.mts`: endpoints GET/POST e persistência no Netlify Blobs.
- `netlify.toml`: comandos de build, pasta de publicação e pasta de funções.
- `tests/comments.test.ts`: testes da validação e ordenação.
