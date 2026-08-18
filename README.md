# MESTRE Orçamentos 1.6.1

Sistema web/PWA responsivo para autônomos e prestadores de serviço criarem orçamentos, ordens de serviço, recibos e acompanharem custos.

## Arquitetura

- **Firebase Authentication** — conta do profissional por e-mail/senha;
- **Cloud Firestore** — clientes, serviços, materiais, custos, orçamentos, O.S., recibos, configurações e entitlement;
- **Supabase Storage** — logos e fotos dos serviços;
- **Supabase Edge Function** — valida o ID token Firebase antes de operar no Storage;
- **PWA** — instalável no Android/iOS/desktop a partir do mesmo frontend;
- **Android nativo** — projeto Capacitor pronto para abrir no Android Studio e gerar APK/AAB;
- **jsPDF sob demanda** — gerador carregado somente quando necessário;
- **Rewarded Ads / Pro** — voz e PDF podem ser monetizados sem limitar a quantidade de orçamentos.

O projeto **não usa Firebase Storage** e **não depende de Firebase Cloud Functions**.

## Principais recursos

- orçamentos ilimitados;
- clientes, serviços e materiais;
- tabela de custos e base operacional por hora;
- margem de lucro e imposto com opção de ocultar essas linhas do PDF sem alterar o cálculo;
- fotos do serviço pelo celular/galeria com legendas e inclusão no PDF;
- ordem de serviço e recibo com PDF;
- identidade visual automática baseada na logo do profissional;
- modo claro/escuro;
- voz;
- conta sincronizada entre web e PWA;
- plano Grátis/Pro.

## Configuração rápida

```powershell
Copy-Item .env.example .env
Copy-Item supabase\.env.example supabase\.env
npm install
npm run doctor
npm run verify
```

Depois siga `SETUP_CHECKLIST.md`. Enquanto `VITE_LOGIN_ENABLED=false`, o app abre em **prévia local sem tela de login** e não inicia o Firebase. Para produção, altere para `true` e use `VITE_BACKEND_MODE=firebase`.

Para a versão Android, consulte `ANDROID.md`. Após instalar o Android Studio/SDK, execute `npm run android:open`.

## Arquivos para copiar nos serviços

- Firebase Firestore Rules: `firestore.rules`
- Firebase indexes: `firestore.indexes.json`
- Estrutura Firestore: `FIREBASE_SCHEMA.md`
- Supabase SQL: `supabase/schema.sql`
- Supabase Edge Function: `supabase/functions/mestre-storage/index.ts`
- Estrutura Supabase: `SUPABASE_SCHEMA.md`
- PWA/mobile: `PWA_MOBILE.md`

## Publicação

Após configurar Firebase/Supabase:

```powershell
npm run verify
npx firebase-tools deploy --only firestore:rules,firestore:indexes,hosting
```

Para a Edge Function do Supabase:

```powershell
npx supabase secrets set --env-file supabase/.env
npx supabase functions deploy mestre-storage
```

A URL final precisa estar em `ALLOWED_ORIGINS` da Edge Function.


## Anúncios web

A configuração de banners e anúncios premiados está documentada em `ANUNCIOS_WEB.md`. Na prévia local com `VITE_PREVIEW_PLAN=pro`, os espaços de banner aparecem como placeholders mesmo antes de configurar o Google Ad Manager. Em produção, banners aparecem somente no plano grátis.
