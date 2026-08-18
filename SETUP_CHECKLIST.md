# Checklist de publicação — MESTRE 1.4.0

## 1. Firebase — Authentication + Firestore

- [ ] Criar/selecionar o projeto Firebase.
- [ ] Registrar um **App Web**.
- [ ] Em Authentication > Sign-in method, ativar **E-mail/senha**.
- [ ] Criar Cloud Firestore.
- [ ] Copiar `.env.example` para `.env`.
- [ ] Manter `VITE_BACKEND_MODE=firebase`.
- [ ] Manter `VITE_AUTH_MODE=email` para produção.
- [ ] Preencher todos os `VITE_FIREBASE_*`.
- [ ] Colar/publicar exatamente o arquivo `firestore.rules`.
- [ ] Publicar `firestore.indexes.json`.

CLI:

```powershell
npx firebase-tools login
npx firebase-tools use SEU_FIREBASE_PROJECT_ID
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

Estrutura detalhada: `FIREBASE_SCHEMA.md`.

## 2. Supabase — logos e fotos

- [ ] Criar/selecionar o projeto Supabase.
- [ ] Preencher `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env`.
- [ ] Executar **todo** o arquivo `supabase/schema.sql` no SQL Editor.
- [ ] Copiar `supabase/.env.example` para `supabase/.env`.
- [ ] Definir `FIREBASE_PROJECT_ID` igual ao Firebase do frontend.
- [ ] Colocar localhost e o domínio HTTPS final em `ALLOWED_ORIGINS`.
- [ ] Publicar a Edge Function.

```powershell
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase secrets set --env-file supabase/.env
npx supabase functions deploy mestre-storage
```

Estrutura detalhada: `SUPABASE_SCHEMA.md`.

## 3. Validar configuração e build

```powershell
npm install
npm run doctor
npm run verify
```

O `doctor` valida credenciais públicas obrigatórias, correspondência do Firebase Project ID, buckets, CORS e arquivos da PWA.

## 4. PWA / mobile

- [ ] Publicar em uma URL HTTPS.
- [ ] Abrir no Android/Chrome e instalar pelo botão **Instalar app**.
- [ ] Abrir no iPhone/Safari e testar **Compartilhar > Adicionar à Tela de Início**.
- [ ] Testar modo claro e escuro após instalação.
- [ ] Testar câmera e galeria em Fotos do serviço.
- [ ] Testar fechar/abrir o PWA e confirmar sessão/dados.

Detalhes: `PWA_MOBILE.md`.

## 5. Plano Grátis / Pro

O padrão é `free`. Para teste manual de Pro, crie no Console do Firestore:

```text
entitlements/{UID_DO_USUARIO}
```

```json
{
  "plan": "pro",
  "source": "manual"
}
```

Opcionalmente adicione `proUntil` em ISO-8601. O frontend não possui permissão para escrever nesse documento.

## 6. Recursos externos opcionais antes do lançamento comercial

- [ ] `VITE_GOOGLE_REWARDED_AD_UNIT_PATH` para anúncio premiado.
- [ ] `VITE_PRO_CHECKOUT_URL` para checkout do Pro.
- [ ] Política de privacidade/consentimento aplicável aos anúncios.
- [ ] Webhook de pagamento confiável para alterar `entitlements/{uid}` automaticamente.

Esses itens não impedem Firebase, Supabase, PWA, orçamentos, O.S., recibos ou custos de funcionarem.

## 7. Teste final ponta a ponta

- [ ] cadastro / login / logout / recuperação de senha;
- [ ] mesmo login no desktop e no celular;
- [ ] clientes, serviços, materiais e custos;
- [ ] margem, imposto e visibilidade no PDF;
- [ ] orçamento, fotos e PDF;
- [ ] ordem de serviço e PDF;
- [ ] recibo e PDF;
- [ ] upload/remoção da logo;
- [ ] exclusão das fotos do orçamento;
- [ ] modo claro/escuro;
- [ ] instalação PWA;
- [ ] reabertura do PWA após fechar;
- [ ] plano grátis e Pro.
