# MESTRE 1.2.0

## Novidades

- Novo módulo **Ordens de serviço** com numeração própria, vínculo opcional ao orçamento, cliente, data agendada, status, instruções e PDF profissional.
- Novo módulo **Recibos** com numeração própria, vínculo opcional ao orçamento, cliente, valor recebido, forma de pagamento, descrição, data e PDF profissional.
- Configurações agora têm **Margem de lucro padrão (%)** e **Imposto padrão (%)**.
- Novos orçamentos recebem automaticamente esses percentuais, que continuam editáveis no resumo do orçamento.
- O valor final do orçamento agora considera: subtotal - desconto + margem de lucro + imposto.
- O PDF do orçamento mostra margem, imposto e total final.
- Ordens de serviço e recibos são persistidos localmente ou no Firestore, seguindo o backend já configurado.
- Firebase recebeu contadores transacionais separados para ORC, OS e REC, evitando duplicidade de numeração entre dispositivos.

## Regra de cálculo

1. Base = serviços + materiais - desconto.
2. Margem = base × margem %.
3. Imposto = base × imposto %.
4. Total = base + margem + imposto.

Os percentuais são congelados no próprio orçamento depois que ele é criado, evitando que uma mudança futura nas Configurações altere silenciosamente propostas antigas.
