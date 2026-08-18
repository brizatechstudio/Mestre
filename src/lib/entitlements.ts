import { doc, getDoc, onSnapshot, type DocumentSnapshot } from 'firebase/firestore'
import type { AccountEntitlement, PlanTier } from '../types'
import { getFirebaseServices } from './firebase'

const freeEntitlement = (uid: string, source = 'default'): AccountEntitlement => ({
  uid,
  plan: 'free',
  source,
})

function normalizePlan(value: unknown, proUntil?: string): PlanTier {
  if (value !== 'pro') return 'free'
  if (!proUntil) return 'pro'
  const expiresAt = Date.parse(proUntil)
  if (!Number.isFinite(expiresAt)) return 'free'
  return expiresAt > Date.now() ? 'pro' : 'free'
}

function fromSnapshot(uid: string, snapshot: DocumentSnapshot): AccountEntitlement {
  if (!snapshot.exists()) return freeEntitlement(uid)
  const data = snapshot.data()
  const proUntil = typeof data.proUntil === 'string' ? data.proUntil : undefined
  const plan = normalizePlan(data.plan, proUntil)
  return {
    uid,
    plan,
    proUntil,
    source: plan === 'free' && data.plan === 'pro' && proUntil ? 'expired' : typeof data.source === 'string' ? data.source : 'firestore',
  }
}

export async function loadEntitlement(uid: string): Promise<AccountEntitlement> {
  const { db } = getFirebaseServices()
  return fromSnapshot(uid, await getDoc(doc(db, 'entitlements', uid)))
}

export function observeEntitlement(uid: string, onChange: (entitlement: AccountEntitlement) => void, onError?: (error: unknown) => void) {
  const { db } = getFirebaseServices()
  return onSnapshot(
    doc(db, 'entitlements', uid),
    (snapshot) => onChange(fromSnapshot(uid, snapshot)),
    (error) => {
      onError?.(error)
      onChange(freeEntitlement(uid, 'fallback'))
    },
  )
}
