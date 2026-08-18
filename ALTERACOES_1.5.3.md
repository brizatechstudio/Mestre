# Alterações 1.5.3

- limpeza do pacote-fonte: sem `.env`, `supabase/.env`, `node_modules`, `dist` e ZIP interno antigo;
- `.env.example` e `supabase/.env.example` sanitizados, sem credenciais do projeto real;
- login temporariamente controlado por `VITE_LOGIN_ENABLED`; padrão da prévia: desativado;
- prévia local usa `VITE_PREVIEW_PLAN=pro` por padrão para conferir banners e gates do plano grátis;
- Firebase/Firestore não são iniciados enquanto o login está desativado;
- banner GPT revisado: tamanhos responsivos, destruição do slot ao trocar de tela e tratamento de `slotRenderEnded`/sem preenchimento;
- novo `npm run check:ads` para validar a estrutura de banner e rewarded;
- Service Worker atualizado para `mestre-1.5.3`;
- README/PWA/documentação de anúncios atualizados.
