# MESTRE 1.3.0

## Base de custos

- Nova tela **Custos** no menu principal.
- Cadastro de custos mensais com nome, categoria, valor e observação.
- Cálculo automático de custos mensais totais.
- Configuração de horas produtivas por mês.
- Cálculo automático da **base operacional por hora**.
- No orçamento, a seção Serviços mostra essa base e oferece **Usar como mão de obra** para inserir um item em horas com o valor-base calculado.
- Custos são dados internos e não aparecem no PDF do cliente.
- No Firebase, os custos ficam em `users/{uid}/costs/{costId}`.

## Margem e imposto no PDF

- Cada orçamento possui dois checkboxes independentes: **Mostrar margem no PDF** e **Mostrar imposto no PDF**.
- Desmarcar uma opção oculta apenas a linha correspondente no PDF.
- Os valores continuam sendo calculados normalmente e continuam compondo o total final.
- Configurações ganhou preferências padrão para novos orçamentos.
- Orçamentos antigos preservam o comportamento anterior: margem e imposto aparecem até que o profissional desmarque as opções.

## Compatibilidade

- Mantidos Firebase Authentication, Firestore, Supabase Storage, fotos, O.S., recibos, plano Grátis/Pro e geração de PDF sob demanda.
- Não foi necessária alteração nos buckets do Supabase.
