# Revisão 1.5.0

## Implementação conferida

- Banner inserido no `Layout`, portanto cobre Dashboard, Clientes, Orçamentos, Novo/Editar orçamento, Ordens de serviço, Recibos, Custos, Serviços, Materiais e Configurações.
- Banner exibido somente quando o plano é `free`.
- Plano `pro` não cria nem solicita slot de banner.
- Slot usa Google Publisher Tag / Google Ad Manager e reaproveita o mesmo script utilizado pelo rewarded.
- Tamanhos responsivos: desktop, tablet e mobile/PWA.
- Mudança de tela destrói o slot anterior antes de criar o próximo.
- Variável `VITE_GOOGLE_BANNER_AD_UNIT_PATH` adicionada e tipada.
- `doctor` atualizado para diagnosticar banner e rewarded separadamente.
- Service Worker incrementado para `mestre-1.5.0` para invalidar cache PWA antigo.
- Nenhuma dependência npm nova foi adicionada.

## Validação neste ambiente

- `npm run doctor` passou com configuração de teste: 0 erros e 0 avisos.
- JSONs principais validados.
- O build/typecheck completo requer `npm install`; este pacote não inclui `node_modules` e o ambiente de execução não conseguiu instalar dependências pela rede.
- Na máquina final, execute `npm install` e `npm run verify`.
