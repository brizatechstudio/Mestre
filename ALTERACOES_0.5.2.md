# Alterações 0.5.2

## Gerador de PDF carregado sob demanda

O módulo de geração de PDF não faz mais parte do carregamento inicial do MESTRE.

### O que mudou

- Removida a importação estática do gerador de PDF.
- `src/lib/pdf.ts` agora é carregado com `import()` somente quando o usuário clica em **Gerar PDF**.
- O `jsPDF` e as dependências usadas pelo módulo de PDF ficam fora do bundle inicial da aplicação.
- Nenhuma funcionalidade do PDF foi removida ou alterada.
- Logo, identidade visual automática, cores, serviços, materiais, observações e totais continuam funcionando normalmente.

### Benefício

A tela inicial e as páginas de uso normal do MESTRE carregam menos JavaScript. O custo das bibliotecas de PDF só acontece quando o recurso realmente é usado.

### Validação recomendada

Execute:

```powershell
npm run verify
```

No resultado do Vite, o módulo principal deve ficar menor e o código relacionado ao PDF deve aparecer em chunk separado.
