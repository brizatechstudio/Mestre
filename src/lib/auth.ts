import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { getFirebaseServices } from './firebase'
import type { SessionUser } from '../types'
import { usingAnonymousAuthentication } from './env'

const toSessionUser = (user: User): SessionUser => ({
  uid: user.uid,
  email: user.email ?? '',
  displayName: user.displayName ?? '',
})

export function observeAuth(onChange: (user: SessionUser | null) => void, onError?: (error: unknown) => void) {
  const { auth } = getFirebaseServices()
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      onChange(toSessionUser(user))
      return
    }

    if (!usingAnonymousAuthentication) {
      onChange(null)
      return
    }

    void signInAnonymously(auth).catch(onError)
  }, onError)
}

export async function loginWithEmail(email: string, password: string) {
  const { auth } = getFirebaseServices()
  const result = await signInWithEmailAndPassword(auth, email.trim(), password)
  return toSessionUser(result.user)
}

export async function registerWithEmail(name: string, email: string, password: string) {
  const { auth } = getFirebaseServices()
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password)
  if (name.trim()) await updateProfile(result.user, { displayName: name.trim() })
  return toSessionUser(result.user)
}

export async function requestPasswordReset(email: string) {
  const { auth } = getFirebaseServices()
  await sendPasswordResetEmail(auth, email.trim())
}

export async function logout() {
  const { auth } = getFirebaseServices()
  await signOut(auth)
}
