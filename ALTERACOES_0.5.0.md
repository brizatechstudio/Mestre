# MESTRE 0.5.0

## Modo claro e modo escuro

- Adicionado seletor rápido de aparência no topo do sistema.
- Adicionada seção **Aparência** em Configurações com opções Claro e Escuro.
- A preferência é persistida no navegador junto com as configurações do profissional.
- O layout responsivo foi revisado nos dois temas, incluindo dashboard, clientes, serviços, materiais, orçamentos, modais, formulários e resumo financeiro.
- O PDF continua independente do tema da interface e mantém a identidade automática baseada na logo do profissional.

## Revisão antes do backend

Além do tema, foram feitos ajustes preventivos:

- Numeração local de orçamento não reutiliza um número apenas porque um orçamento anterior foi apagado; agora considera o maior número existente.
- Validação antes de marcar como enviado, compartilhar ou gerar PDF: cliente obrigatório, ao menos um item, descrições preenchidas, quantidades válidas, valores válidos, desconto não negativo e validade mínima.
- Persistência local passa a gravar primeiro e somente depois atualizar o estado da interface, reduzindo divergência caso o armazenamento do navegador falhe.
- Configurações antigas continuam compatíveis; quem vem de versões anteriores recebe `dark` como tema padrão.

Consulte `AUDITORIA_PRE_BACKEND.md` para os pontos que devem ser tratados na etapa de backend real.
