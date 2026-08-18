import { appEnv, rewardedAdsConfigured } from './env'

export type RewardedAdResult = 'granted' | 'closed' | 'unavailable' | 'error'

type GptSlot = {
  addService: (service: PubAdsService) => GptSlot
}

type RewardedReadyEvent = { slot: GptSlot; makeRewardedVisible: () => boolean }
type RewardedGrantedEvent = { slot: GptSlot }
type RewardedClosedEvent = { slot: GptSlot }
type SlotRenderEndedEvent = { slot: GptSlot; isEmpty: boolean }

type GptEventMap = {
  rewardedSlotReady: RewardedReadyEvent
  rewardedSlotGranted: RewardedGrantedEvent
  rewardedSlotClosed: RewardedClosedEvent
  slotRenderEnded: SlotRenderEndedEvent
}

type PubAdsService = {
  addEventListener: <K extends keyof GptEventMap>(type: K, listener: (event: GptEventMap[K]) => void) => void
  removeEventListener: <K extends keyof GptEventMap>(type: K, listener: (event: GptEventMap[K]) => void) => void
}

type GoogleTag = {
  cmd: Array<() => void>
  enums: { OutOfPageFormat: { REWARDED: unknown } }
  defineOutOfPageSlot: (adUnitPath: string, format: unknown) => GptSlot | null
  pubads: () => PubAdsService
  enableServices: () => void
  display: (slot: GptSlot) => void
  destroySlots: (slots?: GptSlot[]) => boolean
}

type GptHost = Window & { googletag?: GoogleTag | { cmd: Array<() => void> } }

const GPT_SCRIPT_ID = 'mestre-google-publisher-tag'
const GPT_SCRIPT_URL = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js'
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
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true'
      resolve()
    }, { once: true })
    script.addEventListener('error', () => reject(new Error('Falha ao carregar o provedor de anúncios.')), { once: true })
    document.head.appendChild(script)
  })

  return scriptPromise
}

export async function showRewardedAd(): Promise<RewardedAdResult> {
  if (!rewardedAdsConfigured) return 'unavailable'

  try {
    await loadGptScript()
  } catch {
    return 'error'
  }

  const host = window as GptHost
  const stub = host.googletag
  if (!stub) return 'error'

  return new Promise<RewardedAdResult>((resolve) => {
    stub.cmd.push(() => {
      const gpt = host.googletag as GoogleTag | undefined
      if (!gpt?.defineOutOfPageSlot || !gpt.enums?.OutOfPageFormat?.REWARDED) {
        resolve('error')
        return
      }

      const slot = gpt.defineOutOfPageSlot(appEnv.ads.rewardedAdUnitPath, gpt.enums.OutOfPageFormat.REWARDED)
      if (!slot) {
        resolve('unavailable')
        return
      }

      const pubads = gpt.pubads()
      slot.addService(pubads)
      let granted = false
      let settled = false

      const cleanup = () => {
        window.clearTimeout(timeout)
        pubads.removeEventListener('rewardedSlotReady', onReady)
        pubads.removeEventListener('rewardedSlotGranted', onGranted)
        pubads.removeEventListener('rewardedSlotClosed', onClosed)
        pubads.removeEventListener('slotRenderEnded', onRenderEnded)
        gpt.destroySlots([slot])
      }

      const finish = (result: RewardedAdResult) => {
        if (settled) return
        settled = true
        cleanup()
        resolve(result)
      }

      const onReady = (event: RewardedReadyEvent) => {
        if (event.slot !== slot) return
        const shown = event.makeRewardedVisible()
        if (!shown) finish('unavailable')
      }
      const onGranted = (event: RewardedGrantedEvent) => {
        if (event.slot === slot) granted = true
      }
      const onClosed = (event: RewardedClosedEvent) => {
        if (event.slot === slot) finish(granted ? 'granted' : 'closed')
      }
      const onRenderEnded = (event: SlotRenderEndedEvent) => {
        if (event.slot === slot && event.isEmpty) finish('unavailable')
      }

      pubads.addEventListener('rewardedSlotReady', onReady)
      pubads.addEventListener('rewardedSlotGranted', onGranted)
      pubads.addEventListener('rewardedSlotClosed', onClosed)
      pubads.addEventListener('slotRenderEnded', onRenderEnded)

      const timeout = window.setTimeout(() => finish('unavailable'), 20000)
      gpt.enableServices()
      gpt.display(slot)
    })
  })
}
