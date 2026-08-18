# Firebase — MESTRE 1.4.0

O Firebase é usado somente para **Authentication + Cloud Firestore + Hosting**. Imagens ficam no Supabase.

## 1. Projeto e App Web

No Firebase Console:

1. crie/selecione o projeto;
2. adicione um **App Web**;
3. copie os valores de configuração para o `.env`;
4. ative **Authentication > E-mail/senha**;
5. crie o **Cloud Firestore**.

Use em produção:

```env
VITE_BACKEND_MODE=firebase
VITE_AUTH_MODE=email
```

Depois preencha `VITE_FIREBASE_API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `MESSAGING_SENDER_ID` e `APP_ID`.

## 2. Firestore Rules

O arquivo pronto é:

```text
firestore.rules
```

Ele libera somente os caminhos usados pelo MESTRE e somente quando `request.auth.uid` corresponde ao UID do profissional. `entitlements/{uid}` é somente leitura pelo frontend.

Publicar:

```powershell
npx firebase-tools login
npx firebase-tools use SEU_FIREBASE_PROJECT_ID
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

A estrutura completa está em `FIREBASE_SCHEMA.md`.

## 3. Hosting / PWA

O `firebase.json` já aponta para `dist`, faz rewrite SPA e contém headers específicos para `sw.js`, `manifest.webmanifest` e assets.

```powershell
npm run verify
npx firebase-tools deploy --only hosting
```

Depois adicione a URL HTTPS publicada no `ALLOWED_ORIGINS` do `supabase/.env` e publique novamente os secrets da Edge Function.

## 4. O que não ativar para esta arquitetura

- Firebase Storage;
- Firebase Cloud Functions;
- service account/chave privada no navegador.

Use `SUPABASE_SCHEMA.md` para imagens.
