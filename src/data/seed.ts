import type { CatalogItem, Client, CostEntry, Quote, Receipt, Settings, WorkOrder } from '../types'

export const seedClients: Client[] = [
  { id: 'cli-maria', name: 'Maria Oliveira', phone: '(11) 98765-4321', email: 'maria@email.com', document: '', address: 'Rua das Flores, 123 - São Paulo - SP' },
  { id: 'cli-carlos', name: 'Carlos Mendes', phone: '(11) 97654-1122', email: 'carlos@email.com', document: '', address: 'Av. Central, 88 - São Paulo - SP' },
]

export const seedServices: CatalogItem[] = [
  { id: 'srv-identidade', name: 'Projeto de identidade visual', description: 'Criação de identidade visual completa.', unit: 'un', price: 1200, category: 'Design' },
  { id: 'srv-site', name: 'Desenvolvimento de site institucional', description: 'Site responsivo com páginas institucionais.', unit: 'un', price: 2500, category: 'Digital' },
  { id: 'srv-visita', name: 'Visita técnica', description: 'Avaliação técnica presencial.', unit: 'un', price: 150, category: 'Atendimento' },
]

export const seedMaterials: CatalogItem[] = [
  { id: 'mat-papel', name: 'Papel Couchê 300g', description: 'Material gráfico premium.', unit: 'un', price: 1.8, category: 'Gráfica' },
  { id: 'mat-tinta', name: 'Tinta Original HP 662 Color', description: 'Cartucho colorido.', unit: 'un', price: 89.9, category: 'Impressão' },
  { id: 'mat-cabo', name: 'Cabo 2,5 mm', description: 'Cabo elétrico flexível.', unit: 'm', price: 4, category: 'Elétrica' },
]

export const seedCosts: CostEntry[] = []

export const seedSettings: Settings = {
  professionalLogo: '',
  professionalName: 'João Silva',
  businessName: 'MESTRE Serviços',
  phone: '(11) 99999-0000',
  email: 'contato@mestre.app',
  document: '',
  pixKey: '',
  defaultValidityDays: 10,
  defaultPaymentTerms: '50% na aprovação e 50% na conclusão',
  defaultTaxPercent: 0,
  defaultProfitMarginPercent: 0,
  defaultShowProfitMarginInPdf: true,
  defaultShowTaxInPdf: true,
  productiveHoursPerMonth: 160,
}

export const seedWorkOrders: WorkOrder[] = []
export const seedReceipts: Receipt[] = []

export const seedQuotes: Quote[] = [
  {
    id: 'orc-demo', number: 'ORC-0001', clientId: 'cli-maria',
    services: [
      { id: 'qi-1', catalogId: 'srv-identidade', name: 'Projeto de identidade visual', description: '', quantity: 1, unit: 'un', unitPrice: 1200 },
      { id: 'qi-2', catalogId: 'srv-site', name: 'Desenvolvimento de site institucional', description: '', quantity: 1, unit: 'un', unitPrice: 2500 },
    ],
    materials: [
      { id: 'qi-3', catalogId: 'mat-papel', name: 'Papel Couchê 300g', description: '', quantity: 100, unit: 'un', unitPrice: 1.8 },
      { id: 'qi-4', catalogId: 'mat-tinta', name: 'Tinta Original HP 662 Color', description: '', quantity: 1, unit: 'un', unitPrice: 89.9 },
    ],
    discount: 200,
    profitMarginPercent: 0,
    taxPercent: 0,
    showProfitMarginInPdf: true,
    showTaxInPdf: true,
    observations: 'Prazo estimado de 7 dias úteis após a aprovação. Materiais especiais serão confirmados antes da compra.',
    validityDays: 10,
    paymentTerms: '50% na aprovação e 50% na conclusão',
    status: 'Rascunho', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
]
