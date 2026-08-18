/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_MODE?: 'local' | 'firebase'
  readonly VITE_LOGIN_ENABLED?: 'true' | 'false'
  readonly VITE_PREVIEW_PLAN?: 'free' | 'pro'
  readonly VITE_AUTH_MODE?: 'email' | 'anonymous'
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_GOOGLE_REWARDED_AD_UNIT_PATH?: string
  readonly VITE_GOOGLE_BANNER_AD_UNIT_PATH?: string
  readonly VITE_BANNER_PREVIEW?: 'true' | 'false'
  readonly VITE_PRO_CHECKOUT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
