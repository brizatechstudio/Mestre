# Prompt mestre do projeto MESTRE

Crie um sistema web responsivo chamado **MESTRE**, destinado a profissionais autônomos para criação, envio e acompanhamento de orçamentos. A experiência deve ser mobile-first, rápida e extremamente simples, com identidade premium em modo escuro baseada na logo MESTRE, usando fundo grafite/navy, azul elétrico e ciano como acentos.

O sistema deve possuir Dashboard, Clientes, Orçamentos, Serviços, Materiais e Configurações. Serviços e materiais precisam existir como cadastros separados e também como seções separadas dentro de cada orçamento. O orçamento deve calcular subtotais, desconto e total automaticamente, possuir validade, condições de pagamento, observações e estados Rascunho, Enviado, Aguardando aprovação, Aprovado, Recusado e Concluído.

A principal diferenciação do produto é **entrada por voz**. Todo campo em que seja útil falar deve possuir um botão de microfone visível. O usuário deve poder ditar nome, descrições, endereço, serviço, material, observações e condições. Para campos numéricos, a interface deve permitir captura por voz com confirmação antes de alterar o valor. Também deve existir uma área destacada chamada “Adicionar descrição por voz”, com estado de gravação e feedback visual por waveform. Nunca executar silenciosamente uma transcrição crítica: permitir revisão antes de enviar o orçamento.

Clientes devem ter nome, telefone, e-mail, CPF/CNPJ opcional e endereço. Serviços devem ter nome, descrição, categoria, unidade e preço padrão. Materiais devem ter nome, descrição, categoria, unidade e preço. O editor de orçamento deve permitir adicionar itens do catálogo e também itens manuais.

O sistema deve gerar uma versão profissional imprimível/PDF com logo, dados do profissional, dados do cliente, serviços, materiais, observações, validade, condições e total. Deve haver opção de compartilhar. A arquitetura deve permitir no futuro link público para o cliente visualizar e aprovar sem conta, assinatura, PIX, contas a receber e relatórios.

A interface deve ser realmente responsiva: sidebar em desktop e menu deslizante em celular; tabelas devem se reorganizar ou permitir rolagem horizontal; ações principais devem permanecer acessíveis. Use componentes reutilizáveis, TypeScript e uma camada de persistência desacoplada para facilitar troca de armazenamento local por API.
