# Revisão técnica — MESTRE 1.4.0

## Resultado

A versão 1.4.0 foi revisada com foco em Firebase, Supabase, PWA e segurança de configuração.

### Validações executadas

- TypeScript do frontend: **sem erros** (`tsc -b --pretty false`).
- JSONs de configuração: válidos (`package.json`, `package-lock.json`, `firebase.json`, `firestore.indexes.json`, `manifest.webmanifest`).
- Service worker: sintaxe JavaScript válida.
- Edge Function Supabase: transpilação/sintaxe TypeScript sem erros.
- `npm run doctor` com credenciais fictícias coerentes: configuração principal consistente; somente anúncio premiado e checkout ficaram como avisos opcionais.
- Conferido que `.env` e `supabase/.env` não entram no pacote final.
- Conferido que não existe chave `service_role`/`sb_secret_` prevista no frontend.

### Build Vite neste ambiente

O build Vite não foi usado como critério final aqui porque as dependências disponíveis para teste vieram de uma instalação do Windows e o Rolldown necessita de binding nativo Linux neste container. O TypeScript passou integralmente. Na máquina do projeto, execute o teste definitivo:

```powershell
npm install
npm run verify
```

## Firebase

- `firestore.rules` permite somente o UID proprietário nas coleções operacionais.
- `entitlements/{uid}` é leitura pelo proprietário e escrita bloqueada no frontend.
- contadores ORC/OS/REC continuam graváveis apenas pelo dono da conta.
- `.env.example` usa autenticação por e-mail como padrão para produção.

## Supabase

- `supabase/schema.sql` cria um bucket público para logo e um privado para fotos.
- Edge Function valida ID token Firebase, `issuer`, `audience`, assinatura, UID e caminhos.
- imagens recebem validação de formato, tamanho e assinatura PNG/JPEG.
- fotos privadas usam URL assinada temporária.

## PWA

- manifest, service worker e ícones adicionados;
- install prompt integrado ao app;
- instrução específica para iOS/iPadOS;
- cache restrito a recursos da própria origem; Firebase/Supabase permanecem fora do cache do service worker;
- `firebase.json` evita cache persistente do `sw.js`.
