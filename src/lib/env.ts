import type { BackendMode, PlanTier } from '../types'

const value = (name: keyof ImportMetaEnv) => String(import.meta.env[name] ?? '').trim()

export const appEnv = {
  backendMode: (value('VITE_BACKEND_MODE') || 'local') as BackendMode,
  loginEnabled: value('VITE_LOGIN_ENABLED') === 'true',
  authMode: value('VITE_AUTH_MODE') === 'anonymous' ? 'anonymous' : 'email',
  previewPlan: (value('VITE_PREVIEW_PLAN') === 'free' ? 'free' : 'pro') as PlanTier,
  firebase: {
    apiKey: value('VITE_FIREBASE_API_KEY'),
    authDomain: value('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: value('VITE_FIREBASE_PROJECT_ID'),
    messagingSenderId: value('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: value('VITE_FIREBASE_APP_ID'),
  },
  supabase: {
    url: value('VITE_SUPABASE_URL').replace(/\/$/, ''),
    publishableKey: value('VITE_SUPABASE_PUBLISHABLE_KEY'),
  },
  ads: {
    rewardedAdUnitPath: value('VITE_GOOGLE_REWARDED_AD_UNIT_PATH'),
    bannerAdUnitPath: value('VITE_GOOGLE_BANNER_AD_UNIT_PATH'),
    bannerPreview: value('VITE_BANNER_PREVIEW') !== 'false',
  },
  billing: {
    proCheckoutUrl: value('VITE_PRO_CHECKOUT_URL'),
  },
}

export const firebaseConfigured = Boolean(
  appEnv.firebase.apiKey &&
  appEnv.firebase.authDomain &&
  appEnv.firebase.projectId &&
  appEnv.firebase.appId,
)

export const supabaseConfigured = Boolean(
  appEnv.supabase.url &&
  appEnv.supabase.publishableKey,
)

// Enquanto VITE_LOGIN_ENABLED=false, o app fica em modo local de prévia.
// Isso mantém a tela de login fora do fluxo e evita leituras/escritas no Firestore sem sessão.
export const usingFirebaseBackend = appEnv.loginEnabled && appEnv.backendMode === 'firebase' && firebaseConfigured

export const usingAnonymousAuthentication = usingFirebaseBackend && appEnv.authMode === 'anonymous'

export const rewardedAdsConfigured = Boolean(appEnv.ads.rewardedAdUnitPath)

export const bannerAdsConfigured = Boolean(appEnv.ads.bannerAdUnitPath)
