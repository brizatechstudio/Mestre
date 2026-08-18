# MESTRE 1.4.0

## PWA / mobile

- Web App Manifest completo.
- Service worker próprio, sem dependência extra.
- Ícones 192x192, 512x512, maskable e Apple Touch Icon.
- Botão de instalação no topo quando o navegador disponibiliza o prompt.
- Área de instalação em Configurações, incluindo orientação para iPhone/iPad.
- Cache do shell e assets estáticos; APIs Firebase/Supabase não são interceptadas pelo cache.
- Firebase Hosting configurado para não manter `sw.js` em cache indevido.

## Firebase

- `.env.example` reorganizado e com `VITE_AUTH_MODE=email` como padrão de produção.
- `firestore.rules` endurecido: somente coleções usadas pelo produto são liberadas ao UID proprietário.
- `entitlements/{uid}` continua somente leitura para o próprio usuário.
- `FIREBASE_SCHEMA.md` documenta todos os caminhos do banco.

## Supabase

- `supabase/schema.sql` pronto para colar no SQL Editor.
- Mantido `storage.sql` como cópia compatível.
- Buckets público (logo) e privado (fotos) documentados.
- Edge Function endurecida com validação da assinatura real PNG/JPEG, limite antes da decodificação e validação de caminhos pertencentes ao UID.
- `SUPABASE_SCHEMA.md` atualizado.

## Deploy

- `SETUP_CHECKLIST.md` refeito para funcionar como checklist final de publicação.
- `PWA_MOBILE.md` inclui teste e instalação Android/iOS.
