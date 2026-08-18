# MESTRE 0.2.0

## Implementado

1. **Logo do profissional em Configurações**
   - Upload de PNG, JPG e WebP.
   - Limite de 5 MB.
   - Redimensionamento automático no navegador.
   - Pré-visualização e opção de remover.
   - Persistência no `localStorage`.
   - Uso da logo no cabeçalho do orçamento.

2. **Exportação real de PDF**
   - O botão **Gerar PDF** agora baixa um arquivo PDF diretamente.
   - PDF A4 com identificação do profissional e cliente.
   - Serviços e materiais em seções separadas.
   - Subtotais, desconto e total geral.
   - Observações, pagamento, validade e PIX.
   - Paginação automática para listas maiores.
   - Rodapé com número da página.

## Dependência nova

```bash
npm install
```

A versão 0.2.0 usa `jspdf` para gerar o PDF no próprio navegador.
