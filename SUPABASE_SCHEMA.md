# MESTRE 1.4.0 — estrutura do Supabase

O MESTRE usa Supabase **somente para arquivos/imagens**. Clientes, orçamentos, custos, ordens de serviço e recibos continuam no Firestore.

## 1. SQL pronto

Abra **Supabase > SQL Editor**, cole todo o conteúdo de:

```text
supabase/schema.sql
```

e execute uma vez. O SQL é idempotente e pode ser executado novamente para atualizar os limites dos buckets.

Ele cria:

```text
mestre-public-assets       (público)
└── user-logos/{firebaseUid}/professional-logo.png|jpg

mestre-private-media       (privado)
└── quote-photos/{firebaseUid}/{quoteId}/{photoId}.jpg|png
```

## 2. Por que existem dois buckets

A logo pode ser pública porque aparece nos PDFs e na interface. Fotos de serviço podem conter ambientes do cliente, então ficam em bucket privado e o navegador recebe somente **signed URLs temporárias** geradas pela Edge Function.

## 3. Edge Function

Arquivo:

```text
supabase/functions/mestre-storage/index.ts
```

A função aceita ID token do Firebase, valida o token contra o projeto configurado e só então permite operar nos caminhos pertencentes ao UID autenticado.

`supabase/config.toml` contém:

```toml
[functions.mestre-storage]
verify_jwt = false
```

Isso é proposital: o token recebido é do Firebase, não do Supabase Auth. A função executa a validação Firebase internamente.

## 4. Secrets da função

Copie:

```powershell
Copy-Item supabase\.env.example supabase\.env
```

Preencha:

```env
FIREBASE_PROJECT_ID=SEU_FIREBASE_PROJECT_ID
MESTRE_STORAGE_BUCKET=mestre-public-assets
MESTRE_PRIVATE_BUCKET=mestre-private-media
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173,https://SEU_DOMINIO
```

`SUPABASE_URL` e as chaves de servidor existem automaticamente no ambiente hospedado da Edge Function. Não copie secret/service-role para o `.env` do Vite.

## 5. Deploy

```powershell
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase secrets set --env-file supabase/.env
npx supabase functions deploy mestre-storage
```

Depois confirme que o domínio final do PWA foi adicionado em `ALLOWED_ORIGINS` e redeploy os secrets caso tenha alterado esse valor.
