import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { browserLocalPersistence, getAuth, setPersistence, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { appEnv, firebaseConfigured } from './env'

type FirebaseServices = {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

let services: FirebaseServices | null = null

export function getFirebaseServices(): FirebaseServices {
  if (!firebaseConfigured) {
    throw new Error('Firebase não configurado. Preencha o arquivo .env com as credenciais do projeto.')
  }
  if (services) return services

  const app = getApps().length ? getApp() : initializeApp(appEnv.firebase)
  const auth = getAuth(app)
  void setPersistence(auth, browserLocalPersistence).catch(() => undefined)

  services = {
    app,
    auth,
    db: getFirestore(app),
  }
  return services
}
