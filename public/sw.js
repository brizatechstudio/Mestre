const VERSION = 'mestre-1.6.1'
const APP_CACHE = `${VERSION}-app`
const RUNTIME_CACHE = `${VERSION}-runtime`
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('mestre-') && ![APP_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put('/index.html', copy)).catch(() => undefined)
          return response
        })
        .catch(async () => (await caches.match('/index.html')) || (await caches.match('/')) || Response.error()),
    )
    return
  }

  if (!['script', 'style', 'image', 'font', 'manifest'].includes(request.destination)) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE)
      const cached = await cache.match(request)

      // JS e CSS devem sempre tentar a rede primeiro. Os nomes de arquivo já
      // têm hash, mas esta regra também impede uma versão antiga em cenários
      // de CDN, proxy ou atualização parcial.
      if (request.destination === 'script' || request.destination === 'style' || request.destination === 'manifest') {
        try {
          const response = await fetch(request)
          if (response.ok) event.waitUntil(cache.put(request, response.clone()))
          return response
        } catch {
          return cached || Response.error()
        }
      }

      if (cached) return cached
      try {
        const response = await fetch(request)
        if (response.ok) event.waitUntil(cache.put(request, response.clone()))
        return response
      } catch {
        return Response.error()
      }
    })(),
  )
})
