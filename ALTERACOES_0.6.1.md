# MESTRE 0.6.1 — Free Stack Storage

## Objetivo

Remover dependências do Firebase que exigiriam habilitar billing/Blaze para o fluxo de imagens e manter o projeto preparado para operar dentro de planos gratuitos.

## Alterações

- Firebase Storage removido do código.
- Firebase Cloud Functions removidas do projeto.
- Todas as logos passam a ser armazenadas no Supabase Storage.
- Nova Supabase Edge Function `mestre-storage` para upload e exclusão.
- A Edge Function valida diretamente o ID token do Firebase antes de autorizar operações.
- `SUPABASE_SERVICE_ROLE_KEY` permanece somente no servidor Supabase.
- `.env.example` simplificado: Firebase Auth/Firestore + URL/publishable key do Supabase.
- `firebase.json` não contém mais Storage ou Functions.
- Criado `supabase/storage.sql` para configurar o bucket de identidade visual.
- Criado `supabase/config.toml` com autenticação customizada da Edge Function.
- Documentação e checklist atualizados.

## Arquitetura

```text
Navegador
  ├─ Firebase Auth
  ├─ Firestore
  └─ Firebase ID Token
          │
          ▼
    Supabase Edge Function
          │ valida token Firebase
          ▼
    Supabase Storage
```

## Observação

"Gratuito" significa operar dentro das cotas dos planos gratuitos. Ao atingir limites, serviços podem ser restringidos até a renovação da cota. A versão 0.6.1 não depende de um cartão/billing Firebase para o fluxo de imagens.
