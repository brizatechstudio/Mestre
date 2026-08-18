# Auditoria pré-backend — MESTRE 0.5.0

## Veredito

O front-end está adequado como **MVP local e base visual/funcional para integração com um backend**, mas **não deve ser publicado como produto multiusuário usando apenas o armazenamento atual**. Antes de produção, autenticação, autorização, persistência e compartilhamento precisam sair do navegador e ir para uma API segura.

## O que está em bom estado

- Fluxo principal de clientes, serviços, materiais e orçamentos está separado e coerente.
- Layout é responsivo e agora possui modo claro e escuro.
- Entrada por voz está desacoplada em componentes próprios.
- PDF possui logo do profissional, identidade automática pela logo e geração no navegador.
- Tipos centrais estão concentrados em `src/types.ts`.
- Persistência local está centralizada em `src/lib/storage.ts`, o que facilita trocar a implementação por uma camada de API.
- Orçamentos armazenam `clientSnapshot`, preservando os dados do cliente que foram usados na proposta.

## Bloqueadores antes de produção

### 1. Autenticação e sessões

Hoje não existe login real nem sessão. O backend precisa ter cadastro/login, recuperação de senha, sessão segura e expiração/revogação.

### 2. Autorização e isolamento por conta

Clientes, serviços, materiais, configurações, logos e orçamentos deverão pertencer a um `user_id`/`workspace_id`. Toda consulta e mutação deve validar o dono no servidor; o front-end nunca pode ser a fonte de autorização.

### 3. Banco de dados e integridade

O `localStorage` atual é apenas para demonstração/local. No backend, use IDs gerados no servidor/banco, timestamps confiáveis, constraints e transações. A numeração de orçamento deverá ser gerada atomicamente no servidor para evitar duplicidade entre dispositivos.

### 4. Logo e arquivos

A logo hoje é salva como Data URL no navegador. Em produção, armazene arquivos em storage próprio/objeto, valide MIME, tamanho e conteúdo no servidor e salve no banco somente a referência/URL autorizada.

### 5. Compartilhamento e aprovação do cliente

O botão Compartilhar hoje envia apenas um resumo textual. Para uso real, o backend deve gerar um link público com token aleatório, prazo de validade e escopo mínimo. Aprovação/recusa deve ser registrada no servidor com data/hora e trilha de auditoria.

### 6. PDF

O PDF no navegador funciona bem para o MVP. Para histórico imutável, considere gerar ou armazenar no servidor a versão final enviada ao cliente, junto do snapshot do orçamento. Assim uma edição posterior não altera o documento que já foi enviado/aprovado.

### 7. Validação

A versão 0.5.0 adiciona validação importante no front-end, mas todas as regras precisam ser repetidas no servidor. Nunca confie em preço, desconto, total, status ou identidade do usuário enviados pelo navegador.

## Melhorias recomendadas durante a integração

- Criar camada `api/` ou `repositories/` em vez de chamar `fetch` diretamente nas telas.
- Separar modelos de API (`DTOs`) dos tipos de interface quando a API estiver definida.
- Usar paginação/busca no servidor quando houver muitos clientes/orçamentos.
- Registrar mudanças de status do orçamento em uma tabela de histórico.
- Criar migrations de banco e seeds apenas para desenvolvimento.
- Adicionar testes para cálculos, numeração, validação, persistência e geração de PDF.
- Adicionar tratamento global de erros da API e estados de carregamento.
- Implementar política de backup e restauração do banco/storage.

## Modelo mínimo sugerido para o backend

Entidades iniciais: `users`, `workspaces`, `workspace_members`, `clients`, `services`, `materials`, `quotes`, `quote_items`, `quote_status_history`, `professional_settings` e `files`/`assets`.

Cada entidade de negócio deve carregar `workspace_id`. O orçamento deve armazenar snapshots suficientes do cliente e itens para preservar o conteúdo histórico.

## Estado para a próxima etapa

**Pode avançar para a construção do backend**, desde que os sete bloqueadores acima façam parte da primeira implementação de infraestrutura e segurança. O front-end 0.5.0 pode ser usado como contrato visual e funcional inicial, mas não como mecanismo de segurança ou persistência definitiva.
