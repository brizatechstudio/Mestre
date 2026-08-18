# Supabase Storage — MESTRE 1.4.0

Todas as imagens do MESTRE ficam no Supabase. O frontend não recebe chave privilegiada.

## Configuração

No `.env` do frontend:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=
```

No SQL Editor execute:

```text
supabase/schema.sql
```

Isso cria/atualiza:

- `mestre-public-assets` — logo;
- `mestre-private-media` — fotos privadas dos orçamentos.

## Edge Function

Copie `supabase/.env.example` para `supabase/.env`, configure o mesmo Firebase Project ID e o domínio final do PWA em `ALLOWED_ORIGINS`.

```powershell
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase secrets set --env-file supabase/.env
npx supabase functions deploy mestre-storage
```

A função valida o token Firebase, limita formatos/tamanho, confere assinatura PNG/JPEG e restringe caminhos ao UID autenticado. Fotos privadas são entregues por signed URL temporária.

Detalhes completos: `SUPABASE_SCHEMA.md`.
