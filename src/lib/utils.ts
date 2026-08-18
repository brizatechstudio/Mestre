export const uid = (prefix = 'id') => `${prefix}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`

export const money = (value: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
}).format(Number.isFinite(value) ? value : 0)

export const shortDate = (iso: string) => {
  const dateOnly = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`
  return new Intl.DateTimeFormat('pt-BR').format(new Date(iso))
}

export const normalizeNumber = (value: string) => {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\.(?=.*\.)/g, '').replace(',', '.')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

export const quoteTotal = (
  services: {quantity:number;unitPrice:number}[],
  materials: {quantity:number;unitPrice:number}[],
  discount = 0,
  taxPercent = 0,
  profitMarginPercent = 0,
) => {
  const servicesTotal = services.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const materialsTotal = materials.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const subtotal = servicesTotal + materialsTotal
  const baseAfterDiscount = Math.max(0, subtotal - Math.max(0, discount || 0))
  const safeProfitPercent = Math.max(0, Number.isFinite(profitMarginPercent) ? profitMarginPercent : 0)
  const safeTaxPercent = Math.max(0, Number.isFinite(taxPercent) ? taxPercent : 0)
  const profitAmount = baseAfterDiscount * safeProfitPercent / 100
  const taxAmount = baseAfterDiscount * safeTaxPercent / 100
  const total = baseAfterDiscount + profitAmount + taxAmount
  return { servicesTotal, materialsTotal, subtotal, baseAfterDiscount, profitAmount, taxAmount, total }
}


export const costSummary = (costs: { monthlyAmount: number }[], productiveHoursPerMonth = 160) => {
  const monthlyTotal = costs.reduce((sum, item) => sum + Math.max(0, Number.isFinite(item.monthlyAmount) ? item.monthlyAmount : 0), 0)
  const hours = Math.max(1, Number.isFinite(productiveHoursPerMonth) ? productiveHoursPerMonth : 160)
  const hourlyBase = monthlyTotal / hours
  return { monthlyTotal, productiveHoursPerMonth: hours, hourlyBase }
}

export const nextDocumentNumber = (numbers: string[], prefix: string) => {
  const max = numbers.reduce((current, number) => {
    const match = number.match(/(\d+)$/)
    return match ? Math.max(current, Number(match[1])) : current
  }, 0)
  return `${prefix}-${String(max + 1).padStart(4, '0')}`
}

export const nextQuoteNumber = (numbers: string[]) => nextDocumentNumber(numbers, 'ORC')
