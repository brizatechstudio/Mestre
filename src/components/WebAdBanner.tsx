import { useEffect, useId, useState } from 'react'
import { appEnv, bannerAdsConfigured } from '../lib/env'

const GPT_SCRIPT_ID = 'mestre-google-publisher-tag'
const GPT_SCRIPT_URL = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js'

type AdSize = [number, number]
type SizeMapping = unknown

type SlotRenderEndedEvent = { slot: GptSlot; isEmpty: boolean }

type PubAdsService = {
  addEventListener: (event: 'slotRenderEnded', handler: (event: SlotRenderEndedEvent) => void) => void
  removeEventListener: (event: 'slotRenderEnded', handler: (event: SlotRenderEndedEvent) => void) => void
}

type GptSlot = {
  addService: (service: PubAdsService) => GptSlot
  defineSizeMapping: (mapping: SizeMapping) => GptSlot
  setTargeting: (key: string, value: string | string[]) => GptSlot
}

type SizeMappingBuilder = {
  addSize: (viewport: [number, number], sizes: AdSize | AdSize[]) => SizeMappingBuilder
  build: () => SizeMapping
}

type GoogleTag = {
  cmd: Array<() => void>
  defineSlot: (adUnitPath: string, sizes: AdSize | AdSize[], divId: string) => GptSlot | null
  sizeMapping: () => SizeMappingBuilder
  pubads: () => PubAdsService
  enableServices: () => void
  display: (divId: string) => void
  destroySlots: (slots?: GptSlot[]) => boolean
}

type GptHost = Window & { googletag?: GoogleTag | { cmd: Array<() => void> } }

let scriptPromise: Promise<void> | null = null

function loadGptScript() {
  if (scriptPromise) return scriptPromise
  const host = window as GptHost
  if (!host.googletag) host.googletag = { cmd: [] }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GPT_SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve()
      else {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener('error', () => reject(new Error('Falha ao carregar o provedor de anúncios.')), { once: true })
      }
      return
    }

    const script = document.createElement('script')
    script.id = GPT_SCRIPT_ID
    script.async = true
    script.src = GPT_SCRIPT_URL
    script.crossOrigin = 'anonymous'
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true'
      resolve()
    }, { once: true })
    script.addEventListener('error', () => reject(new Error('Falha ao carregar o provedor de anúncios.')), { once: true })
    document.head.appendChild(script)
  })

  return scriptPromise
}

export function WebAdBanner({ placement }: { placement: string }) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const divId = `mestre-banner-${reactId}`
  const [state, setState] = useState<'loading' | 'ready' | 'unconfigured' | 'empty' | 'error'>(bannerAdsConfigured ? 'loading' : 'unconfigured')

  useEffect(() => {
    if (!bannerAdsConfigured) {
      setState('unconfigured')
      return
    }

    let cancelled = false
    let slot: GptSlot | null = null
    let idleHandle: number | undefined
    let pubads: PubAdsService | null = null
    let onRenderEnded: ((event: SlotRenderEndedEvent) => void) | null = null
    const start = () => {
      if (cancelled) return

      void loadGptScript().then(() => {
      if (cancelled) return
      const host = window as GptHost
      const stub = host.googletag
      if (!stub) {
        setState('error')
        return
      }

      stub.cmd.push(() => {
        if (cancelled) return
        const gpt = host.googletag as GoogleTag | undefined
        if (!gpt?.defineSlot || !gpt.sizeMapping) {
          setState('error')
          return
        }

        const mapping = gpt.sizeMapping()
          .addSize([1024, 0], [[970, 90], [728, 90]])
          .addSize([768, 0], [[728, 90], [468, 60]])
          .addSize([0, 0], [[320, 100], [320, 50]])
          .build()

        slot = gpt.defineSlot(
          appEnv.ads.bannerAdUnitPath,
          [[970, 90], [728, 90], [468, 60], [320, 100], [320, 50]],
          divId,
        )

        if (!slot) {
          setState('error')
          return
        }

        pubads = gpt.pubads()
        slot
          .defineSizeMapping(mapping)
          .setTargeting('mestre_screen', placement)
          .addService(pubads)

        onRenderEnded = (event) => {
          if (event.slot !== slot || cancelled) return
          setState(event.isEmpty ? 'empty' : 'ready')
        }
        pubads.addEventListener('slotRenderEnded', onRenderEnded)

        // É seguro chamar novamente; o GPT ignora chamadas posteriores. Isso mantém
        // o banner independente do anúncio premiado, que usa a mesma biblioteca.
        gpt.enableServices()
        gpt.display(divId)
      })
      }).catch(() => {
        if (!cancelled) setState('error')
      })
    }

    // Publicidade não é crítica para o primeiro conteúdo. Aguarda o tempo
    // ocioso (ou um pequeno atraso em navegadores sem requestIdleCallback).
    const idle = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
      cancelIdleCallback?: (handle: number) => void
    }
    if (idle.requestIdleCallback) idleHandle = idle.requestIdleCallback(start, { timeout: 2000 })
    else idleHandle = window.setTimeout(start, 900)

    return () => {
      cancelled = true
      if (idleHandle !== undefined) {
        if (idle.cancelIdleCallback) idle.cancelIdleCallback(idleHandle)
        else window.clearTimeout(idleHandle)
      }
      const gpt = (window as GptHost).googletag as GoogleTag | undefined
      if (pubads && onRenderEnded) pubads.removeEventListener('slotRenderEnded', onRenderEnded)
      if (slot && gpt?.destroySlots) gpt.destroySlots([slot])
    }
  }, [divId, placement])

  return <section className="web-ad-shell" aria-label="Publicidade">
    <div className="web-ad-label">PUBLICIDADE</div>
    <div className={`web-ad-frame web-ad-frame--${state}`}>
      <div id={divId} className="web-ad-slot" />
      {state === 'unconfigured' && <div className="web-ad-placeholder"><strong>Espaço publicitário</strong><span>O banner será exibido aqui quando a unidade do Google Ad Manager for configurada.</span></div>}
      {state === 'loading' && <div className="web-ad-placeholder"><strong>Carregando publicidade...</strong><span>A página continua disponível enquanto o banner é solicitado.</span></div>}
      {state === 'empty' && <div className="web-ad-placeholder"><strong>Publicidade indisponível agora</strong><span>Não houve preenchimento para este espaço. O sistema continua funcionando normalmente.</span></div>}
      {state === 'error' && <div className="web-ad-placeholder"><strong>Anúncio indisponível</strong><span>O sistema continua funcionando normalmente.</span></div>}
    </div>
  </section>
}
