# Elementa

Tabela periódica para Android, iOS e navegador, construída com Expo, React Native e TypeScript. Interface em português, tema escuro e dados disponíveis offline.

## Rodar no VS Code

1. Instale o Node.js 22 LTS (22.13 ou superior) e o VS Code.
2. Extraia este ZIP e abra a pasta `elementa-sdk57` no VS Code.
3. No terminal dessa pasta, execute:

```sh
npm ci
npm start
```

Instale o Expo Go no celular e leia o QR code. Computador e celular precisam estar na mesma rede. O projeto usa Expo SDK 57; use um cliente compatível com esse SDK. Em Android, versões compatíveis podem ser obtidas em https://expo.dev/go. Se o Expo Go instalado exigir outro SDK, use um development build com EAS ou siga a documentação de atualização do Expo.

Para abrir no navegador:

```sh
npm run web
```

O navegador é a alternativa imediata se não houver um cliente Expo Go compatível. Para testar em emulador Android, instale e inicie o emulador pelo Android Studio e execute `npm run android`. O simulador iOS exige macOS e Xcode.

## Funcionalidades

- 118 elementos com nomes em português, massa, configuração eletrônica, camadas, categoria e propriedades físicas disponíveis na fonte.
- Tabela com grupos e períodos, rolagem horizontal, controles de escala e visualização em cartões.
- Busca sem diferenciar acentos, por nome, símbolo ou número; filtros por categoria.
- Detalhes, favoritos e comparação entre dois elementos.
- Quiz por tema, três faixas de dificuldade e sessões de 5, 10 ou 20 perguntas.
- Correção imediata, explicações, revisão ao final, experiência, nível e conquistas.
- Meta diária, histórico dos últimos 100 quizzes e estatísticas.
- Modo visitante com dados locais; contas reais e sincronização com Supabase quando configurado.

## Ativar cadastro e login

O app funciona sem servidor no modo visitante. Cadastro e login requerem seu próprio projeto Supabase; não há contas fictícias nem credenciais incluídas.

1. Crie um projeto em https://supabase.com.
2. No SQL Editor, execute `supabase/schema.sql` uma única vez. As políticas permitem que cada usuário acesse somente seu progresso.
3. Copie `.env.example` para `.env` na raiz do projeto.
4. Preencha a URL do projeto e a chave pública anon/publishable:

```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=SUA-CHAVE-PUBLICA
```

Nunca coloque a chave `service_role` no aplicativo.

5. Ative o provedor Email em Authentication > Providers.
6. Reinicie o Expo: `npx expo start --clear`.
7. Faça o cadastro e confirme o e-mail, se a confirmação estiver habilitada. Depois, volte ao app e faça login.

### Recuperação de senha

A recuperação usa uma página web incluída em `recovery/index.html`.

1. Abra esse arquivo e preencha `SUPABASE_URL` e `SUPABASE_KEY` com as mesmas credenciais públicas do app.
2. Hospede a pasta `recovery` em um serviço de hospedagem estática com HTTPS.
3. Em Supabase > Authentication > URL Configuration, use a URL dessa página como Site URL e adicione-a às Redirect URLs.
4. O botão “Esqueci minha senha” envia o link. O usuário define a nova senha nessa página e volta ao aplicativo para entrar.

As mensagens transacionais e limites de envio dependem da configuração do seu projeto Supabase. Para distribuição, configure seu próprio SMTP e a URL pública de recuperação. O app não precisa de domínio para testes como visitante.

### Armazenamento e sincronização

Cada conta possui cache separado no aparelho. Sessões são persistidas pelo Supabase; as senhas não são armazenadas pelo código do aplicativo. Favoritos e resultados são salvos localmente e enviados à nuvem após mudanças. Ao abrir uma conta, o registro mais recente entre o cache e a nuvem é carregado. Mudanças simultâneas em vários aparelhos seguem a última gravação, sem mesclagem de conflitos. Visitante e conta têm históricos separados.

A consulta de elementos e o quiz funcionam offline depois de instalar o aplicativo. Login, recuperação e sincronização exigem internet. No desenvolvimento, o Expo Go normalmente precisa alcançar o servidor de desenvolvimento para carregar o projeto.

## Verificação

```sh
npm run typecheck
npm test
npx expo export --platform web
```

## Estrutura

- `App.tsx`: interface, navegação por abas, fluxos de estudo e conta.
- `src/elements.json`: base local dos elementos.
- `src/quiz.ts`: geração de perguntas.
- `src/backend.ts`: cliente de autenticação e persistência.
- `supabase/schema.sql`: tabela e políticas de acesso.
- `recovery/index.html`: página de redefinição de senha.
- `tests/quiz.test.ts`: integridade da base e perguntas.

## Conteúdo e limites

Aplicações cotidianas foram incluídas para uma seleção de elementos comuns. Nos demais, o app apresenta a classificação e o link de consulta; não inventa aplicações ou curiosidades. Propriedades desconhecidas aparecem como “Não disponível”. Não inclui ilustrações de orbitais, ranking público ou cronômetro. A cor é acompanhada por nomes de categoria.

Temperaturas são apresentadas em kelvin. A densidade segue a convenção da base: g/L para gases e g/cm³ para sólidos e líquidos. O estado físico é uma classificação de referência da base, sem controle de pressão e temperatura. Valores de superpesados podem ser previsões. A massa não deve ser usada para calcular o número exato de nêutrons sem identificar o isótopo.

## Fontes e licenças

Dados adaptados de Bowserinator, Periodic-Table-JSON:
https://github.com/Bowserinator/Periodic-Table-JSON

O arquivo `src/elements.json` é uma adaptação: nomes, fases e categorias traduzidos para português; seleção de propriedades; halogênios identificados como categoria própria. A base adaptada permanece sob CC BY-SA 3.0. A licença e os créditos estão em `DATA-LICENSE.md`. Links individuais de consulta acompanham cada elemento.

Documentação de execução: https://docs.expo.dev/versions/v57.0.0/ e https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/.

## Atalho no Windows

Depois de instalar o Node.js, você também pode abrir `START-WINDOWS.bat`. Ele instala as dependências na primeira execução e inicia o Expo. O código continua disponível para edição pelo VS Code.

## Gerar um APK de teste

O arquivo `eas.json` inclui um perfil `preview` que gera APK. Com uma conta Expo, execute `npx eas-cli build --platform android --profile preview` e siga a configuração solicitada. Esse comando usa o serviço de compilação do Expo; o ZIP contém o projeto, não um APK já compilado.

## Verificações realizadas nesta entrega

- TypeScript sem erros.
- Cinco testes automatizados aprovados: integridade dos 118 elementos e alternativas dos quatro temas de quiz.
- Compatibilidade das dependências conferida pelo Expo.
- Exportação de produção para navegador e bundle Android concluídos.

Não foi realizada instalação em aparelho físico nem autenticação contra um projeto Supabase de produção. Faça esses testes com seu projeto configurado antes de distribuir o aplicativo.

## Atualização para SDK 57

Esta edição usa Expo SDK 57 para o Expo Go compatível com SDK 57. Extraia em uma nova pasta para evitar dependências antigas. Se usa Supabase, copie seu arquivo `.env` da versão anterior para a nova pasta.

No terminal da pasta nova:

```sh
npm ci
npx expo start --clear
```

Pare o terminal da versão antiga com Ctrl+C antes de iniciar a nova. Leia o novo QR code, sem reabrir o projeto antigo pelo histórico do Expo Go.
