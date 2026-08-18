import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  runTransaction,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'
import { seedSettings } from '../data/seed'
import type { AppDataSnapshot, CatalogItem, Client, CostEntry, Quote, Receipt, SessionUser, Settings, WorkOrder } from '../types'
import { getFirebaseServices } from './firebase'
import { legacyStore, userCache } from './storage'

type Entity = { id: string }
export type UserCollection = 'clients' | 'services' | 'materials' | 'costs' | 'quotes' | 'workOrders' | 'receipts'

const cleanForFirestore = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function cloudSafeSettings(settings: Settings): Settings {
  if (!settings.professionalLogo.startsWith('data:image/')) return settings
  return { ...settings, professionalLogo: '', professionalLogoPath: '' }
}

function maxSequence(numbers: string[]) {
  return numbers.reduce((max, number) => {
    const match = number.match(/(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
}

async function ensureCounter(uid: string, counter: string, numbers: string[]) {
  const { db } = getFirebaseServices()
  const counterRef = doc(db, 'users', uid, 'counters', counter)
  const initialNext = maxSequence(numbers) + 1
  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(counterRef)
    if (!current.exists()) transaction.set(counterRef, { next: initialNext })
  })
}

async function reserveDocumentNumber(uid: string, counter: string, prefix: string) {
  const { db } = getFirebaseServices()
  const counterRef = doc(db, 'users', uid, 'counters', counter)
  return runTransaction(db, async (transaction) => {
    const current = await transaction.get(counterRef)
    const next = current.exists() && Number.isFinite(Number(current.data().next)) ? Number(current.data().next) : 1
    transaction.set(counterRef, { next: next + 1 }, { merge: true })
    return `${prefix}-${String(next).padStart(4, '0')}`
  })
}

export const reserveQuoteNumber = (uid: string) => reserveDocumentNumber(uid, 'quotes', 'ORC')
export const reserveWorkOrderNumber = (uid: string) => reserveDocumentNumber(uid, 'workOrders', 'OS')
export const reserveReceiptNumber = (uid: string) => reserveDocumentNumber(uid, 'receipts', 'REC')

function blankSettings(user: SessionUser): Settings {
  return {
    ...seedSettings,
    professionalLogo: '',
    professionalLogoPath: '',
    professionalName: user.displayName || '',
    businessName: user.displayName || '',
    phone: '',
    email: user.email || '',
    document: '',
    pixKey: '',
    defaultTaxPercent: 0,
    defaultProfitMarginPercent: 0,
  }
}

async function readCollection<T extends Entity>(db: Firestore, uid: string, name: UserCollection): Promise<T[]> {
  const snapshot = await getDocs(collection(db, 'users', uid, name))
  return snapshot.docs.map((item) => ({ ...(item.data() as T), id: item.id }))
}

async function writeEntities<T extends Entity>(db: Firestore, uid: string, name: UserCollection, values: T[]) {
  const chunkSize = 400
  for (let start = 0; start < values.length; start += chunkSize) {
    const batch = writeBatch(db)
    values.slice(start, start + chunkSize).forEach((value) => {
      batch.set(doc(db, 'users', uid, name, value.id), cleanForFirestore(value) as DocumentData)
    })
    await batch.commit()
  }
}

async function bootstrapRemote(uid: string, snapshot: AppDataSnapshot, user: SessionUser) {
  const { db } = getFirebaseServices()
  await Promise.all([
    writeEntities(db, uid, 'clients', snapshot.clients),
    writeEntities(db, uid, 'services', snapshot.services),
    writeEntities(db, uid, 'materials', snapshot.materials),
    writeEntities(db, uid, 'costs', snapshot.costs),
    writeEntities(db, uid, 'quotes', snapshot.quotes),
    writeEntities(db, uid, 'workOrders', snapshot.workOrders),
    writeEntities(db, uid, 'receipts', snapshot.receipts),
    setDoc(doc(db, 'users', uid, 'settings', 'profile'), cleanForFirestore(cloudSafeSettings(snapshot.settings)), { merge: true }),
    setDoc(doc(db, 'users', uid), {
      email: user.email,
      displayName: user.displayName,
      initializedAt: new Date().toISOString(),
    }, { merge: true }),
  ])
  await Promise.all([
    ensureCounter(uid, 'quotes', snapshot.quotes.map(item => item.number)),
    ensureCounter(uid, 'workOrders', snapshot.workOrders.map(item => item.number)),
    ensureCounter(uid, 'receipts', snapshot.receipts.map(item => item.number)),
  ])
}

function cacheHasContent(snapshot: AppDataSnapshot) {
  return snapshot.clients.length > 0 || snapshot.services.length > 0 || snapshot.materials.length > 0 || snapshot.costs.length > 0 || snapshot.quotes.length > 0 || snapshot.workOrders.length > 0 || snapshot.receipts.length > 0 || Boolean(snapshot.settings.professionalName || snapshot.settings.businessName)
}

export async function loadCloudData(user: SessionUser): Promise<{ data: AppDataSnapshot; migratedLegacy: boolean; usedCache: boolean }> {
  const cache = userCache(user.uid)
  const cached = cache.snapshot()
  const { db } = getFirebaseServices()

  try {
    const [clients, services, materials, costs, quotes, workOrders, receipts, settingsDoc] = await Promise.all([
      readCollection<Client>(db, user.uid, 'clients'),
      readCollection<CatalogItem>(db, user.uid, 'services'),
      readCollection<CatalogItem>(db, user.uid, 'materials'),
      readCollection<CostEntry>(db, user.uid, 'costs'),
      readCollection<Quote>(db, user.uid, 'quotes'),
      readCollection<WorkOrder>(db, user.uid, 'workOrders'),
      readCollection<Receipt>(db, user.uid, 'receipts'),
      getDoc(doc(db, 'users', user.uid, 'settings', 'profile')),
    ])

    const remoteExists = settingsDoc.exists() || clients.length > 0 || services.length > 0 || materials.length > 0 || costs.length > 0 || quotes.length > 0 || workOrders.length > 0 || receipts.length > 0
    if (!remoteExists) {
      let initial: AppDataSnapshot
      let migratedLegacy = false

      if (legacyStore.hasPersistedData()) {
        initial = legacyStore.snapshot()
        migratedLegacy = true
      } else if (cacheHasContent(cached)) {
        initial = cached
      } else {
        initial = { clients: [], services: [], materials: [], costs: [], quotes: [], workOrders: [], receipts: [], settings: blankSettings(user) }
      }

      initial.settings = { ...blankSettings(user), ...initial.settings }
      await bootstrapRemote(user.uid, initial, user)
      if (migratedLegacy) legacyStore.markMigrated(user.uid)
      cache.setSnapshot(initial)
      return { data: initial, migratedLegacy, usedCache: false }
    }

    const settings = settingsDoc.exists()
      ? { ...blankSettings(user), ...(settingsDoc.data() as Partial<Settings>) }
      : blankSettings(user)
    const data: AppDataSnapshot = { clients, services, materials, costs, quotes, workOrders, receipts, settings }
    cache.setSnapshot(data)
    void Promise.all([
      ensureCounter(user.uid, 'quotes', quotes.map(item => item.number)),
      ensureCounter(user.uid, 'workOrders', workOrders.map(item => item.number)),
      ensureCounter(user.uid, 'receipts', receipts.map(item => item.number)),
    ]).catch(() => undefined)
    void setDoc(doc(db, 'users', user.uid), { email: user.email, displayName: user.displayName, lastSeenAt: new Date().toISOString() }, { merge: true })
    return { data, migratedLegacy: false, usedCache: false }
  } catch (error) {
    if (cacheHasContent(cached)) return { data: cached, migratedLegacy: false, usedCache: true }
    throw error
  }
}

async function commitOperations(db: Firestore, operations: Array<(batch: ReturnType<typeof writeBatch>) => void>) {
  const chunkSize = 400
  for (let start = 0; start < operations.length; start += chunkSize) {
    const batch = writeBatch(db)
    operations.slice(start, start + chunkSize).forEach((operation) => operation(batch))
    await batch.commit()
  }
}

export async function syncEntityList<T extends Entity>(uid: string, name: UserCollection, previous: T[], next: T[]) {
  const { db } = getFirebaseServices()
  const previousMap = new Map(previous.map((item) => [item.id, item]))
  const nextMap = new Map(next.map((item) => [item.id, item]))
  const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = []

  next.forEach((item) => {
    const before = previousMap.get(item.id)
    if (!before || JSON.stringify(before) !== JSON.stringify(item)) {
      operations.push((batch) => batch.set(doc(db, 'users', uid, name, item.id), cleanForFirestore(item) as DocumentData))
    }
  })

  previous.forEach((item) => {
    if (!nextMap.has(item.id)) operations.push((batch) => batch.delete(doc(db, 'users', uid, name, item.id)))
  })

  if (operations.length) await commitOperations(db, operations)
}

export async function saveCloudSettings(uid: string, settings: Settings) {
  if (settings.professionalLogo.startsWith('data:image/')) {
    throw new Error('A logo precisa ser enviada ao Storage antes de salvar as configurações no Firestore.')
  }
  const { db } = getFirebaseServices()
  await setDoc(doc(db, 'users', uid, 'settings', 'profile'), cleanForFirestore(settings), { merge: true })
}
