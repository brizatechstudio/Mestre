# Revisão 1.5.3

## Estado temporário

O projeto é entregue em prévia local com login desativado. Isso é intencional enquanto o domínio e Google Ad Manager não estão configurados.

## Anúncios

O banner está no Layout global e portanto cobre Dashboard, Clientes, Orçamentos, editor de orçamento, O.S., Recibos, Custos, Serviços, Materiais e Configurações. No plano grátis ele reserva espaço responsivo. Na prévia local, `VITE_BANNER_PREVIEW=true` força o mesmo espaço mesmo com o plano de teste Pro. Sem Ad Unit, mostra placeholder; com Ad Unit, usa Google Publisher Tag. Rewarded continua concedendo acesso somente após o evento de recompensa.

## Produção

Antes de publicar, copie `.env.example` para `.env`, preencha Firebase/Supabase, configure os Ad Units quando disponíveis e altere `VITE_LOGIN_ENABLED=true` + `VITE_BACKEND_MODE=firebase`.
