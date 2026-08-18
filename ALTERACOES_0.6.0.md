# MESTRE 0.6.0 — Firebase Backend Foundation

> **Nota:** a versão 0.6.1 substituiu o fluxo de imagens desta versão. Firebase Storage e Firebase Cloud Functions não são mais usados no MESTRE atual.

Esta versão troca a arquitetura local por uma arquitetura pronta para backend real com Firebase, mantendo um modo local opcional.

## Incluído

- Firebase Authentication com cadastro, login, logout e recuperação de senha por e-mail.
- Cloud Firestore para clientes, serviços, materiais, orçamentos e configurações.
- Isolamento dos dados por UID do profissional.
- Regras de segurança do Firestore incluídas no projeto.
- Cache local separado por usuário para evitar mistura de dados entre contas.
- Migração automática dos dados antigos do `localStorage` no primeiro login, quando existirem dados persistidos da versão anterior; a migração é marcada para não copiar os mesmos dados para uma segunda conta no mesmo navegador.
- Numeração de orçamento reservada por transação no Firestore para evitar duplicação entre dispositivos, inclusive ao duplicar uma proposta.
- Firebase Storage pronto para armazenar a logo do profissional.
- Supabase Storage opcional por meio de Cloud Functions autenticadas pelo Firebase.
- Serviço de logo desacoplado para permitir trocar o provedor sem reescrever a tela de Configurações.
- `.env.example` pronto para receber as credenciais do Firebase.
- `firebase.json`, `firestore.rules`, `storage.rules` e `firestore.indexes.json` incluídos.
- Firebase Hosting pronto para SPA.
- Cloud Functions em Node.js 22 para integração segura com Supabase.

## Segurança

A `SUPABASE_SERVICE_ROLE_KEY` nunca é colocada em `VITE_*` nem enviada ao navegador. Ela é configurada como secret da Cloud Function.

## Modos de armazenamento da logo

Defina no `.env`:

```env
VITE_LOGO_STORAGE_PROVIDER=firebase
```

Opções:

- `firebase`: recomendado para começar; usa Firebase Storage diretamente com Firebase Auth.
- `supabase`: usa uma Cloud Function autenticada que faz o upload no Supabase Storage.
- `local`: apenas para desenvolvimento/compatibilidade sem backend.
