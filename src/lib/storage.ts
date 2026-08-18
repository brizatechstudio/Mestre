import { seedClients, seedCosts, seedMaterials, seedQuotes, seedReceipts, seedServices, seedSettings, seedWorkOrders } from '../data/seed'
import type { AppDataSnapshot, CatalogItem, Client, CostEntry, Quote, Receipt, Settings, WorkOrder } from '../types'

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

const write = <T,>(key: string, value: T) => localStorage.setItem(key, JSON.stringify(value))

const legacyKey = (part: string) => `mestre.${part}`
const LEGACY_MIGRATION_OWNER_KEY = 'mestre.legacyMigratedTo'
const userKey = (uid: string, part: string) => `mestre.cache.${uid}.${part}`

export const store = {
  clients: { get: () => read<Client[]>(legacyKey('clients'), seedClients), set: (v: Client[]) => write(legacyKey('clients'), v) },
  services: { get: () => read<CatalogItem[]>(legacyKey('services'), seedServices), set: (v: CatalogItem[]) => write(legacyKey('services'), v) },
  materials: { get: () => read<CatalogItem[]>(legacyKey('materials'), seedMaterials), set: (v: CatalogItem[]) => write(legacyKey('materials'), v) },
  costs: { get: () => read<CostEntry[]>(legacyKey('costs'), seedCosts), set: (v: CostEntry[]) => write(legacyKey('costs'), v) },
  quotes: { get: () => read<Quote[]>(legacyKey('quotes'), seedQuotes), set: (v: Quote[]) => write(legacyKey('quotes'), v) },
  workOrders: { get: () => read<WorkOrder[]>(legacyKey('workOrders'), seedWorkOrders), set: (v: WorkOrder[]) => write(legacyKey('workOrders'), v) },
  receipts: { get: () => read<Receipt[]>(legacyKey('receipts'), seedReceipts), set: (v: Receipt[]) => write(legacyKey('receipts'), v) },
  settings: { get: () => ({ ...seedSettings, ...read<Partial<Settings>>(legacyKey('settings'), {}) }), set: (v: Settings) => write(legacyKey('settings'), v) },
}

export const legacyStore = {
  hasPersistedData() {
    if (localStorage.getItem(LEGACY_MIGRATION_OWNER_KEY)) return false
    return ['clients', 'services', 'materials', 'costs', 'quotes', 'workOrders', 'receipts', 'settings'].some((part) => localStorage.getItem(legacyKey(part)) !== null)
  },
  markMigrated(uid: string) {
    localStorage.setItem(LEGACY_MIGRATION_OWNER_KEY, uid)
  },
  snapshot(): AppDataSnapshot {
    return {
      clients: store.clients.get(),
      services: store.services.get(),
      materials: store.materials.get(),
      costs: store.costs.get(),
      quotes: store.quotes.get(),
      workOrders: store.workOrders.get(),
      receipts: store.receipts.get(),
      settings: store.settings.get(),
    }
  },
}

export function userCache(uid: string) {
  return {
    clients: { get: () => read<Client[]>(userKey(uid, 'clients'), []), set: (v: Client[]) => write(userKey(uid, 'clients'), v) },
    services: { get: () => read<CatalogItem[]>(userKey(uid, 'services'), []), set: (v: CatalogItem[]) => write(userKey(uid, 'services'), v) },
    materials: { get: () => read<CatalogItem[]>(userKey(uid, 'materials'), []), set: (v: CatalogItem[]) => write(userKey(uid, 'materials'), v) },
    costs: { get: () => read<CostEntry[]>(userKey(uid, 'costs'), []), set: (v: CostEntry[]) => write(userKey(uid, 'costs'), v) },
    quotes: { get: () => read<Quote[]>(userKey(uid, 'quotes'), []), set: (v: Quote[]) => write(userKey(uid, 'quotes'), v) },
    workOrders: { get: () => read<WorkOrder[]>(userKey(uid, 'workOrders'), []), set: (v: WorkOrder[]) => write(userKey(uid, 'workOrders'), v) },
    receipts: { get: () => read<Receipt[]>(userKey(uid, 'receipts'), []), set: (v: Receipt[]) => write(userKey(uid, 'receipts'), v) },
    settings: {
      get: () => ({ ...seedSettings, professionalName: '', businessName: '', phone: '', email: '', ...read<Partial<Settings>>(userKey(uid, 'settings'), {}) }),
      set: (v: Settings) => write(userKey(uid, 'settings'), v),
    },
    snapshot(): AppDataSnapshot {
      return {
        clients: read<Client[]>(userKey(uid, 'clients'), []),
        services: read<CatalogItem[]>(userKey(uid, 'services'), []),
        materials: read<CatalogItem[]>(userKey(uid, 'materials'), []),
        costs: read<CostEntry[]>(userKey(uid, 'costs'), []),
        quotes: read<Quote[]>(userKey(uid, 'quotes'), []),
        workOrders: read<WorkOrder[]>(userKey(uid, 'workOrders'), []),
        receipts: read<Receipt[]>(userKey(uid, 'receipts'), []),
        settings: { ...seedSettings, professionalName: '', businessName: '', phone: '', email: '', ...read<Partial<Settings>>(userKey(uid, 'settings'), {}) },
      }
    },
    setSnapshot(snapshot: AppDataSnapshot) {
      write(userKey(uid, 'clients'), snapshot.clients)
      write(userKey(uid, 'services'), snapshot.services)
      write(userKey(uid, 'materials'), snapshot.materials)
      write(userKey(uid, 'costs'), snapshot.costs)
      write(userKey(uid, 'quotes'), snapshot.quotes)
      write(userKey(uid, 'workOrders'), snapshot.workOrders)
      write(userKey(uid, 'receipts'), snapshot.receipts)
      write(userKey(uid, 'settings'), snapshot.settings)
    },
  }
}
