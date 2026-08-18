# MESTRE 1.4.0 — estrutura do Firebase

O Cloud Firestore é **NoSQL/schemaless**: não existe um `CREATE TABLE` para colar. A estrutura abaixo é o contrato de dados usado pelo MESTRE, enquanto `firestore.rules` é o arquivo pronto para publicar no console/CLI.

## Authentication

Para produção, use:

- **Authentication > Sign-in method > E-mail/senha: ATIVADO**
- `VITE_AUTH_MODE=email`

O modo `anonymous` continua suportado apenas para testes/demonstração, mas não é a configuração recomendada para a conta real do profissional porque a conta precisa funcionar em mais de um dispositivo.

## Coleções e documentos

```text
users/{uid}
├── settings/profile
├── clients/{clientId}
├── services/{serviceId}
├── materials/{materialId}
├── costs/{costId}
├── quotes/{quoteId}
├── workOrders/{workOrderId}
├── receipts/{receiptId}
└── counters/
    ├── quotes
    ├── workOrders
    └── receipts

entitlements/{uid}
```

## `users/{uid}`

```json
{
  "email": "profissional@exemplo.com",
  "displayName": "Nome do profissional",
  "initializedAt": "ISO-8601",
  "lastSeenAt": "ISO-8601"
}
```

## `users/{uid}/settings/profile`

Principais campos:

```json
{
  "appearance": "dark",
  "professionalLogo": "https://...supabase.co/storage/...",
  "professionalLogoPath": "user-logos/UID/professional-logo.png",
  "professionalName": "Nome",
  "businessName": "Empresa",
  "phone": "",
  "email": "",
  "document": "",
  "pixKey": "",
  "defaultValidityDays": 15,
  "defaultPaymentTerms": "",
  "defaultTaxPercent": 0,
  "defaultProfitMarginPercent": 0,
  "defaultShowProfitMarginInPdf": true,
  "defaultShowTaxInPdf": true,
  "productiveHoursPerMonth": 160
}
```

## Coleções de trabalho

- `clients`: cadastro de clientes.
- `services`: catálogo de mão de obra/serviços.
- `materials`: catálogo de materiais.
- `costs`: custos operacionais usados como base para cálculo da hora.
- `quotes`: orçamento completo, itens, percentuais, status e referências das fotos.
- `workOrders`: ordens de serviço.
- `receipts`: recibos.

As fotos não ficam dentro do Firestore. O orçamento guarda somente metadados/caminhos; os arquivos ficam no Supabase Storage.

## Contadores

Cada documento em `counters` contém:

```json
{
  "next": 2
}
```

Eles são alterados por transação do Firestore para reservar números sem repetição entre dispositivos.

## Plano da conta

`entitlements/{uid}`:

```json
{
  "plan": "pro",
  "source": "manual",
  "proUntil": "2027-01-01T00:00:00.000Z"
}
```

`proUntil` é opcional. O usuário pode ler seu próprio entitlement, mas `firestore.rules` impede que o navegador transforme a própria conta em Pro.

## Publicar regras e índices

### Console

Abra **Firestore Database > Rules**, substitua pelo conteúdo de `firestore.rules` e clique em **Publish**.

### CLI

```powershell
npx firebase-tools login
npx firebase-tools use SEU_FIREBASE_PROJECT_ID
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

O arquivo `firestore.indexes.json` está pronto. Nesta versão não há índices compostos obrigatórios.
