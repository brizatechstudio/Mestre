# Revisão técnica — MESTRE 1.3.0

## Validações executadas

- TypeScript (`tsc -b --pretty false`): **sem erros**.
- Parser TypeScript/TSX: **25 arquivos, 0 erros de sintaxe**.
- `package.json` e `package-lock.json`: JSON válido.
- Firestore: a coleção `users/{uid}/costs` já é coberta pelas regras privadas existentes em `users/{uid}/{document=**}`.
- Supabase: nenhuma alteração necessária; custos são dados estruturados no Firestore e não usam Storage.
- PDF: margem e imposto continuam compondo o total mesmo quando suas linhas são ocultadas.

## Observação sobre o build neste ambiente

O `vite build` não foi concluído no container porque o `node_modules` reaproveitado para a checagem veio de uma instalação Windows e contém somente o binding nativo Windows do Rolldown. Isso não representa erro do código do projeto. O ZIP entregue não inclui `node_modules`.

Na máquina de desenvolvimento, execute:

```powershell
npm install
npm run verify
```
