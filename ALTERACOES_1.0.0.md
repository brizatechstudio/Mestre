# MESTRE 1.0.0

## Release estável

- Plano grátis com orçamentos ilimitados.
- Plano Pro preparado via `entitlements/{uid}`.
- Voz premium em todos os microfones.
- PDF premium com lazy loading preservado.
- Liberação de voz/PDF por anúncio recompensado para contas grátis.
- Integração Google Publisher Tag Rewarded preparada por `.env`.
- Modal de upgrade/assistir anúncio.
- Indicador GRÁTIS/PRO na interface e em Configurações.
- Entitlement acompanhado em tempo real pelo Firestore.
- Regras Firestore impedem auto-upgrade pelo frontend.
- Supabase Storage revisado e Edge Function endurecida.
- Firebase Project ID da Edge Function reconciliado.
- CORS da Edge Function fail-closed.
- Suporte a chaves atuais/legadas de servidor Supabase.
- `npm run doctor` adicionado ao processo de `verify`.
- Versão do pacote: `1.0.0`.

## Endurecimento final

- Ao trocar de conta, o plano volta imediatamente para Grátis enquanto o entitlement da nova conta é carregado, evitando reaproveitamento momentâneo do plano da sessão anterior.
- `proUntil`, quando informado no entitlement, agora é respeitado: um plano Pro expirado volta automaticamente para Grátis no cliente.
- `npm run doctor` também verifica se nenhuma chave Supabase privilegiada foi colocada em variáveis `VITE_*` e valida a coerência básica de CORS/Storage.
