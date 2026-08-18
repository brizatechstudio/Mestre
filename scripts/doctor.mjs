import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function parseEnv(file) {
  const full = path.join(root, file)
  if (!fs.existsSync(full)) return {}
  return Object.fromEntries(fs.readFileSync(full, 'utf8').split(/\r?\n/).flatMap((raw) => {
    const line = raw.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) return []
    const index = line.indexOf('=')
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
    return [[key, value]]
  }))
}

const exists = (file) => fs.existsSync(path.join(root, file))
const hasRuntimeEnv = exists('.env')
const hasEdgeEnv = exists('supabase/.env')
const env = parseEnv(hasRuntimeEnv ? '.env' : '.env.example')
const edge = parseEnv(hasEdgeEnv ? 'supabase/.env' : 'supabase/.env.example')
const results = []
const ok = (name, condition, optional = false) => results.push({ name, condition: Boolean(condition), optional })

const loginEnabled = env.VITE_LOGIN_ENABLED === 'true'
const firebaseMode = env.VITE_BACKEND_MODE === 'firebase'
const productionBackend = loginEnabled && firebaseMode
const clientValues = Object.entries(env).filter(([key]) => key.startsWith('VITE_')).map(([, value]) => String(value))
const hasPrivilegedSupabaseKeyInClient = clientValues.some((value) => /(?:service_role|sb_secret_)/i.test(value))
const corsOrigins = String(edge.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean)

ok('Arquivo .env local criado', hasRuntimeEnv, true)
ok('Login temporariamente desativado ou explicitamente ativado', ['true', 'false'].includes(String(env.VITE_LOGIN_ENABLED || 'false')))
ok('Backend definido como Firebase ou local', ['firebase', 'local'].includes(env.VITE_BACKEND_MODE))
ok('Plano da prévia definido', ['free', 'pro'].includes(env.VITE_PREVIEW_PLAN || 'pro'))
ok('Prévia visual de banner definida', ['true', 'false'].includes(env.VITE_BANNER_PREVIEW || 'true'))
ok('Modo de autenticação definido', ['email', 'anonymous'].includes(env.VITE_AUTH_MODE))
ok('Autenticação por e-mail selecionada para produção', env.VITE_AUTH_MODE === 'email', true)

ok('Firebase API key preenchida', env.VITE_FIREBASE_API_KEY, !productionBackend)
ok('Firebase Auth Domain preenchido', env.VITE_FIREBASE_AUTH_DOMAIN, !productionBackend)
ok('Firebase Project ID preenchido', env.VITE_FIREBASE_PROJECT_ID, !productionBackend)
ok('Firebase Messaging Sender ID preenchido', env.VITE_FIREBASE_MESSAGING_SENDER_ID, !productionBackend)
ok('Firebase App ID preenchido', env.VITE_FIREBASE_APP_ID, !productionBackend)
ok('Supabase URL preenchida', env.VITE_SUPABASE_URL && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(env.VITE_SUPABASE_URL), !productionBackend)
ok('Supabase Publishable Key preenchida', env.VITE_SUPABASE_PUBLISHABLE_KEY && !/(?:service_role|sb_secret_)/i.test(env.VITE_SUPABASE_PUBLISHABLE_KEY), !productionBackend)
ok('Nenhuma chave Supabase privilegiada está em VITE_*', !hasPrivilegedSupabaseKeyInClient)

const projectIdsMatch = edge.FIREBASE_PROJECT_ID && env.VITE_FIREBASE_PROJECT_ID && edge.FIREBASE_PROJECT_ID === env.VITE_FIREBASE_PROJECT_ID
ok('Edge Function usa o mesmo Firebase Project ID', projectIdsMatch, !productionBackend)
ok('Bucket público do Supabase correto', !edge.MESTRE_STORAGE_BUCKET || edge.MESTRE_STORAGE_BUCKET === 'mestre-public-assets')
ok('Bucket privado de fotos correto', !edge.MESTRE_PRIVATE_BUCKET || edge.MESTRE_PRIVATE_BUCKET === 'mestre-private-media')
ok('CORS da Edge Function configurado', corsOrigins.length > 0, !productionBackend)
ok('CORS inclui ambiente local de desenvolvimento', corsOrigins.some((origin) => /^http:\/\/localhost(?::\d+)?$/i.test(origin)), !productionBackend)

ok('Firestore Rules pronto', exists('firestore.rules'))
ok('Firestore indexes pronto', exists('firestore.indexes.json'))
ok('Schema Supabase pronto', exists('supabase/schema.sql'))
ok('Edge Function mestre-storage presente', exists('supabase/functions/mestre-storage/index.ts'))
ok('Manifest PWA presente', exists('public/manifest.webmanifest'))
ok('Service worker PWA presente', exists('public/sw.js'))
ok('Ícone PWA 192 presente', exists('public/icons/icon-192.png'))
ok('Ícone PWA 512 presente', exists('public/icons/icon-512.png'))
ok('Ícone maskable presente', exists('public/icons/icon-maskable-512.png'))
ok('Apple Touch Icon presente', exists('public/icons/apple-touch-icon.png'))
ok('Configuração Capacitor presente', exists('capacitor.config.ts'))
ok('Projeto Android nativo presente', exists('android/app/build.gradle'))

if (exists('public/manifest.webmanifest')) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/manifest.webmanifest'), 'utf8'))
    ok('Manifest usa display standalone', manifest.display === 'standalone')
    ok('Manifest possui start_url e scope', manifest.start_url === '/' && manifest.scope === '/')
  } catch {
    ok('Manifest PWA é JSON válido', false)
  }
}

ok('Google Rewarded Ad Unit configurado', env.VITE_GOOGLE_REWARDED_AD_UNIT_PATH, true)
ok('Google Banner Ad Unit configurado', env.VITE_GOOGLE_BANNER_AD_UNIT_PATH, true)
ok('Checkout Pro configurado', env.VITE_PRO_CHECKOUT_URL, true)

console.log('\nMESTRE 1.6.1 — diagnóstico de configuração\n')
if (!loginEnabled) console.log('Modo atual: PRÉVIA LOCAL — tela de login desativada e Firebase não é iniciado.\n')
for (const item of results) {
  const mark = item.condition ? 'OK ' : item.optional ? 'AVISO' : 'ERRO '
  console.log(`[${mark}] ${item.name}`)
}

const failures = results.filter((item) => !item.condition && !item.optional)
const warnings = results.filter((item) => !item.condition && item.optional)
console.log(`\n${failures.length ? `${failures.length} erro(s)` : 'Configuração principal consistente'}. ${warnings.length} aviso(s) opcional(is).`)
if (warnings.length) console.log('Avisos opcionais não impedem o sistema; na prévia podem indicar credenciais, anúncios ou checkout ainda não configurados.')
if (failures.length) process.exitCode = 1
