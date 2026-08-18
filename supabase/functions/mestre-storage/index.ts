import { createClient } from 'npm:@supabase/supabase-js@2'
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@6'

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID') ?? ''
const publicBucket = Deno.env.get('MESTRE_STORAGE_BUCKET') || 'mestre-public-assets'
const privateBucket = Deno.env.get('MESTRE_PRIVATE_BUCKET') || 'mestre-private-media'
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''

function supabaseServerKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (legacy) return legacy
  const current = Deno.env.get('SUPABASE_SECRET_KEYS') ?? ''
  if (!current) return ''
  try {
    const parsed = JSON.parse(current) as Record<string, string>
    return parsed.default ?? Object.values(parsed)[0] ?? ''
  } catch {
    return ''
  }
}

const serviceRoleKey = supabaseServerKey()
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  const allowed = !origin || allowedOrigins.includes(origin)
  if (!allowed) throw new Error('ORIGIN_NOT_ALLOWED')
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function json(request: Request, status: number, body: Record<string, unknown>) {
  let headers: Record<string, string>
  try {
    headers = corsHeaders(request)
  } catch {
    headers = { 'Content-Type': 'application/json' }
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

async function authenticatedUid(request: Request) {
  if (!firebaseProjectId) throw new Error('FIREBASE_PROJECT_ID_NOT_CONFIGURED')
  const authorization = request.headers.get('authorization') ?? ''
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) throw new Error('AUTH_REQUIRED')

  const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
    algorithms: ['RS256'],
    issuer: `https://securetoken.google.com/${firebaseProjectId}`,
    audience: firebaseProjectId,
  })

  if (!payload.sub || payload.sub.length > 128) throw new Error('INVALID_USER')
  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.iat !== 'number' || payload.iat > now + 60) throw new Error('INVALID_TOKEN_TIME')
  if (typeof payload.auth_time === 'number' && payload.auth_time > now + 60) throw new Error('INVALID_AUTH_TIME')
  return payload.sub
}

function imageSignatureIsValid(bytes: Uint8Array, contentType: string) {
  if (contentType === 'image/png') {
    return bytes.length >= 8
      && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  }
  if (contentType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  return false
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/)
  if (!match) throw new Error('INVALID_IMAGE')
  const contentType = match[1]
  const encoded = match[2]
  // Evita decodificar payloads muito acima do limite de 3 MB.
  if (encoded.length > 4_300_000) throw new Error('IMAGE_TOO_LARGE')
  const raw = atob(encoded)
  if (!raw.length || raw.length > 3 * 1024 * 1024) throw new Error('IMAGE_TOO_LARGE')
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  if (!imageSignatureIsValid(bytes, contentType)) throw new Error('INVALID_IMAGE')
  return { bytes, contentType, extension: contentType === 'image/jpeg' ? 'jpg' : 'png' }
}

function safeId(value?: string) {
  return Boolean(value && /^[A-Za-z0-9_-]{3,120}$/.test(value))
}

function ownedStoragePath(value: string | undefined, prefix: string) {
  if (!value || !value.startsWith(prefix)) return false
  if (value.includes('..') || value.includes('\\') || value.includes('//')) return false
  return /^[A-Za-z0-9_./-]+$/.test(value)
}

function quoteFolder(uid: string, quoteId: string) {
  return `quote-photos/${uid}/${quoteId}`
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    try {
      return new Response('ok', { headers: corsHeaders(request) })
    } catch {
      return new Response('origin not allowed', { status: 403 })
    }
  }

  if (request.method !== 'POST') return json(request, 405, { error: 'Método não permitido.' })
  if (!supabaseUrl || !serviceRoleKey) return json(request, 500, { error: 'Supabase Storage não configurado no servidor.' })

  let uid: string
  try {
    corsHeaders(request)
    uid = await authenticatedUid(request)
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    if (code === 'ORIGIN_NOT_ALLOWED') return json(request, 403, { error: 'Origem não permitida.' })
    return json(request, 401, { error: 'Sessão Firebase inválida ou expirada.' })
  }

  let body: {
    action?: string
    dataUrl?: string
    fileName?: string
    previousPath?: string
    path?: string
    quoteId?: string
    photoId?: string
  }
  try {
    body = await request.json()
  } catch {
    return json(request, 400, { error: 'Corpo da requisição inválido.' })
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Logo profissional: bucket público, pois ela aparece nos PDFs e na interface.
  if (body.action === 'upload') {
    try {
      if (!body.dataUrl) throw new Error('INVALID_IMAGE')
      const image = parseDataUrl(body.dataUrl)
      const path = `user-logos/${uid}/professional-logo.${image.extension}`
      const { error } = await client.storage.from(publicBucket).upload(path, image.bytes, {
        contentType: image.contentType,
        cacheControl: '3600',
        upsert: true,
      })
      if (error) throw error

      if (body.previousPath && body.previousPath !== path && ownedStoragePath(body.previousPath, `user-logos/${uid}/`)) {
        await client.storage.from(publicBucket).remove([body.previousPath]).catch(() => undefined)
      }

      const { data } = client.storage.from(publicBucket).getPublicUrl(path)
      return json(request, 200, { ok: true, path, url: `${data.publicUrl}?v=${Date.now()}` })
    } catch (error) {
      console.error('uploadProfessionalLogo', error)
      const code = error instanceof Error ? error.message : ''
      if (code === 'IMAGE_TOO_LARGE') return json(request, 413, { error: 'A imagem processada ultrapassou 3 MB.' })
      if (code === 'INVALID_IMAGE') return json(request, 400, { error: 'Formato de imagem inválido.' })
      return json(request, 500, { error: 'Não foi possível salvar a imagem no Supabase.' })
    }
  }

  if (body.action === 'delete') {
    if (!body.path || !ownedStoragePath(body.path, `user-logos/${uid}/`)) {
      return json(request, 400, { error: 'Caminho de imagem inválido.' })
    }
    const { error } = await client.storage.from(publicBucket).remove([body.path])
    if (error) {
      console.error('deleteProfessionalLogo', error)
      return json(request, 500, { error: 'Não foi possível remover a imagem do Supabase.' })
    }
    return json(request, 200, { ok: true })
  }

  // Fotos do orçamento: bucket PRIVADO. O navegador recebe apenas URLs assinadas temporárias.
  if (body.action === 'uploadQuotePhoto') {
    try {
      if (!safeId(body.quoteId) || !safeId(body.photoId) || !body.dataUrl) {
        return json(request, 400, { error: 'Dados da foto inválidos.' })
      }
      const image = parseDataUrl(body.dataUrl)
      const folder = quoteFolder(uid, body.quoteId!)
      const path = `${folder}/${body.photoId}.${image.extension}`
      const { error } = await client.storage.from(privateBucket).upload(path, image.bytes, {
        contentType: image.contentType,
        cacheControl: '3600',
        upsert: true,
      })
      if (error) throw error

      const { data, error: signedError } = await client.storage.from(privateBucket).createSignedUrl(path, 60 * 60)
      if (signedError || !data?.signedUrl) throw signedError ?? new Error('SIGNED_URL_FAILED')
      return json(request, 200, { ok: true, path, url: data.signedUrl })
    } catch (error) {
      console.error('uploadQuotePhoto', error)
      const code = error instanceof Error ? error.message : ''
      if (code === 'IMAGE_TOO_LARGE') return json(request, 413, { error: 'A foto processada ultrapassou 3 MB.' })
      if (code === 'INVALID_IMAGE') return json(request, 400, { error: 'Formato de foto inválido.' })
      return json(request, 500, { error: 'Não foi possível salvar a foto no Supabase.' })
    }
  }

  if (body.action === 'signedQuotePhoto') {
    if (!body.path || !ownedStoragePath(body.path, `quote-photos/${uid}/`)) {
      return json(request, 400, { error: 'Caminho de foto inválido.' })
    }
    const { data, error } = await client.storage.from(privateBucket).createSignedUrl(body.path, 60 * 60)
    if (error || !data?.signedUrl) {
      console.error('signedQuotePhoto', error)
      return json(request, 500, { error: 'Não foi possível abrir a foto.' })
    }
    return json(request, 200, { ok: true, path: body.path, url: data.signedUrl })
  }

  if (body.action === 'deleteQuotePhoto') {
    if (!body.path || !ownedStoragePath(body.path, `quote-photos/${uid}/`)) {
      return json(request, 400, { error: 'Caminho de foto inválido.' })
    }
    const { error } = await client.storage.from(privateBucket).remove([body.path])
    if (error) {
      console.error('deleteQuotePhoto', error)
      return json(request, 500, { error: 'Não foi possível remover a foto.' })
    }
    return json(request, 200, { ok: true })
  }

  if (body.action === 'deleteQuotePhotos') {
    if (!safeId(body.quoteId)) return json(request, 400, { error: 'Orçamento inválido.' })
    const folder = quoteFolder(uid, body.quoteId!)
    const { data, error: listError } = await client.storage.from(privateBucket).list(folder, { limit: 100 })
    if (listError) {
      console.error('listQuotePhotos', listError)
      return json(request, 500, { error: 'Não foi possível localizar as fotos do orçamento.' })
    }
    const paths = (data ?? []).filter((item) => item.name).map((item) => `${folder}/${item.name}`)
    if (paths.length) {
      const { error } = await client.storage.from(privateBucket).remove(paths)
      if (error) {
        console.error('deleteQuotePhotos', error)
        return json(request, 500, { error: 'Não foi possível remover as fotos do orçamento.' })
      }
    }
    return json(request, 200, { ok: true, paths })
  }

  return json(request, 400, { error: 'Ação inválida.' })
})
