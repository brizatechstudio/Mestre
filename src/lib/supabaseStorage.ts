import { appEnv, supabaseConfigured } from './env'
import { getFirebaseServices } from './firebase'

export type StorageResponse = {
  ok?: boolean
  url?: string
  path?: string
  error?: string
  paths?: string[]
}

export async function callSupabaseStorage(payload: Record<string, unknown>): Promise<StorageResponse> {
  if (!supabaseConfigured) {
    throw new Error('Supabase Storage não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env.')
  }

  const { auth } = getFirebaseServices()
  const user = auth.currentUser
  if (!user) throw new Error('Sua sessão expirou. Entre novamente para acessar as imagens.')
  const token = await user.getIdToken(false)

  const response = await fetch(`${appEnv.supabase.url}/functions/v1/mestre-storage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': appEnv.supabase.publishableKey,
    },
    body: JSON.stringify(payload),
  })

  let body: StorageResponse = {}
  try {
    body = await response.json() as StorageResponse
  } catch {
    // Mantém a mensagem genérica abaixo quando a resposta não vier em JSON.
  }

  if (!response.ok) {
    throw new Error(body.error || `Falha no Supabase Storage (${response.status}).`)
  }
  return body
}
