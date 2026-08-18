export type Unit = 'un' | 'h' | 'dia' | 'm' | 'm²' | 'm³' | 'kg' | 'l' | 'pct'
export type QuoteStatus = 'Rascunho' | 'Enviado' | 'Aguardando aprovação' | 'Aprovado' | 'Recusado' | 'Concluído'
export type WorkOrderStatus = 'Aberta' | 'Em andamento' | 'Concluída' | 'Cancelada'
export type BackendMode = 'local' | 'firebase'
export type PlanTier = 'free' | 'pro'
export type PremiumFeature = 'voice' | 'pdf'

export interface Client {
  id: string
  name: string
  phone: string
  email: string
  document: string
  address: string
}

export interface CatalogItem {
  id: string
  name: string
  description: string
  unit: Unit
  price: number
  category: string
}


export interface CostEntry {
  id: string
  name: string
  category: string
  /** Custo mensal equivalente usado para calcular a base operacional. */
  monthlyAmount: number
  notes: string
}

export interface QuoteItem {
  id: string
  catalogId?: string
  name: string
  description: string
  quantity: number
  unit: Unit
  unitPrice: number
}

export interface QuotePhoto {
  id: string
  path: string
  caption: string
  createdAt: string
  localDataUrl?: string
}

export interface Quote {
  id: string
  number: string
  clientId: string
  clientSnapshot?: Client
  services: QuoteItem[]
  materials: QuoteItem[]
  photos?: QuotePhoto[]
  discount: number
  /** Percentual aplicado sobre a base após desconto. */
  profitMarginPercent?: number
  /** Percentual aplicado sobre a base após desconto. */
  taxPercent?: number
  /** Controla somente a exibição no PDF; o cálculo continua sendo aplicado. */
  showProfitMarginInPdf?: boolean
  /** Controla somente a exibição no PDF; o cálculo continua sendo aplicado. */
  showTaxInPdf?: boolean
  observations: string
  validityDays: number
  paymentTerms: string
  status: QuoteStatus
  createdAt: string
  updatedAt: string
}

export interface WorkOrder {
  id: string
  number: string
  quoteId?: string
  quoteNumber?: string
  clientId: string
  clientSnapshot?: Client
  services: QuoteItem[]
  materials: QuoteItem[]
  description: string
  scheduledDate: string
  status: WorkOrderStatus
  createdAt: string
  updatedAt: string
}

export interface Receipt {
  id: string
  number: string
  quoteId?: string
  quoteNumber?: string
  clientId: string
  clientSnapshot?: Client
  amount: number
  paymentMethod: string
  description: string
  issueDate: string
  createdAt: string
  updatedAt: string
}

export interface Settings {
  professionalLogo: string
  professionalLogoPath?: string
  professionalName: string
  businessName: string
  phone: string
  email: string
  document: string
  pixKey: string
  defaultValidityDays: number
  defaultPaymentTerms: string
  /** Imposto padrão aplicado em novos orçamentos. */
  defaultTaxPercent: number
  /** Margem de lucro padrão aplicada em novos orçamentos. */
  defaultProfitMarginPercent: number
  /** Define se a margem aparece por padrão no PDF de novos orçamentos. */
  defaultShowProfitMarginInPdf: boolean
  /** Define se o imposto aparece por padrão no PDF de novos orçamentos. */
  defaultShowTaxInPdf: boolean
  /** Horas produtivas estimadas por mês para calcular o custo operacional por hora. */
  productiveHoursPerMonth: number
}

export interface AppDataSnapshot {
  clients: Client[]
  services: CatalogItem[]
  materials: CatalogItem[]
  costs: CostEntry[]
  quotes: Quote[]
  workOrders: WorkOrder[]
  receipts: Receipt[]
  settings: Settings
}

export interface SessionUser {
  uid: string
  email: string
  displayName: string
}

export interface AccountEntitlement {
  uid: string
  plan: PlanTier
  proUntil?: string
  source?: string
}
