# Elementa — Fórum de comentários

Aplicativo Android, iOS e Web construído com Expo, React Native e TypeScript. A tela única permite publicar feedback com nome e comentário obrigatórios; não há cadastro nem página de login.

## Funcionalidades

- Formulário que exige nome e feedback, com validação e limites de tamanho.
- Lista de comentários mais recentes primeiro e atualização manual do fórum.
- Salvamento persistente no aparelho com AsyncStorage.
- Fórum compartilhado com Supabase quando o banco estiver configurado; sem credenciais, o app informa que o envio fica apenas no aparelho.
- Aviso de que nome e comentário podem ficar visíveis a outras pessoas.

## Rodar localmente

Instale Node.js 22 LTS (22.13 ou superior) e execute na pasta do projeto:

```sh
npm ci
npm start
```

Para Web, rode `npm run web`. O projeto usa Expo SDK 57. Para abrir no Android com Expo Go, use um cliente compatível com esse SDK; para instalar um APK de teste, siga a seção abaixo.

## Ativar o fórum compartilhado

O app funciona sem servidor, salvando os comentários apenas neste dispositivo. Para que os comentários apareçam para todas as pessoas:

1. Crie um projeto Supabase.
2. No SQL Editor, execute `supabase/schema.sql`.
3. Copie `.env.example` para `.env` e preencha a URL do projeto e a chave pública `anon`/`publishable`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=SUA-CHAVE-PUBLICA
```

4. Reinicie o Expo com `npx expo start --clear`.

Nunca coloque a chave `service_role` no aplicativo. O fórum é público: qualquer pessoa pode ler e enviar comentários, mas o app não permite editar ou excluir comentários. Para uma publicação aberta na internet, configure também controles anti-spam/rate limit no Supabase e uma política de moderação adequada.

Para EAS Build, configure as mesmas variáveis como variáveis de ambiente do projeto Expo no ambiente `preview`; o `.env` local é ignorado pelo Git e não é enviado ao build remoto.

## Gerar APK Android

O perfil `preview` em `eas.json` já está configurado para gerar um APK de instalação. Entre na sua conta Expo e execute:

```sh
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

O EAS compila na nuvem e disponibiliza um link para baixar o APK ao concluir. A conta Expo e o identificador do projeto EAS precisam estar configurados para iniciar o build.

## Verificações

```sh
npm run typecheck
npm test
npx expo export --platform android
npx expo export --platform web
```

A exportação valida os bundles, mas não substitui um build APK nem um teste em aparelho físico.

## Estrutura

- `App.tsx`: interface do fórum de comentários.
- `src/comments-model.ts`: validação, tipos e ordenação/deduplicação.
- `src/comments.ts`: cache local e integração opcional com o Supabase.
- `src/backend.ts`: cliente do banco opcional.
- `supabase/schema.sql`: tabela pública e políticas RLS do fórum.
- `tests/comments.test.ts`: testes de validação e ordenação.
