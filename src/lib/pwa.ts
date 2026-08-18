import { useCallback, useEffect, useState } from 'react'

type InstallChoice = { outcome: 'accepted' | 'dismissed'; platform?: string }

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<InstallChoice>
}

function detectStandalone() {
  if (typeof window === 'undefined') return false
  const navigatorStandalone = 'standalone' in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  return window.matchMedia('(display-mode: standalone)').matches || navigatorStandalone
}

function detectIos() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const appleMobile = /iPad|iPhone|iPod/.test(ua)
  const iPadDesktopMode = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return appleMobile || iPadDesktopMode
}

export function registerPwaServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    const hadController = Boolean(navigator.serviceWorker.controller)
    let refreshing = false

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Em uma atualização real, a nova versão assume o controle e a aba é
      // recarregada uma única vez para nunca misturar HTML/JS/CSS antigos.
      if (hadController && !refreshing) {
        refreshing = true
        window.location.reload()
      }
    })

    void navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => registration.update())
      .catch((error) => {
        console.error('Falha ao registrar o service worker do MESTRE.', error)
      })
  })
}

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(detectStandalone)
  const [ios] = useState(detectIos)

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    const appInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
    }
    const media = window.matchMedia('(display-mode: standalone)')
    const displayChanged = () => setInstalled(detectStandalone())

    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', appInstalled)
    media.addEventListener?.('change', displayChanged)

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', appInstalled)
      media.removeEventListener?.('change', displayChanged)
    }
  }, [])

  const install = useCallback(async () => {
    if (!promptEvent) return 'unavailable' as const
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') {
      setPromptEvent(null)
      return 'accepted' as const
    }
    return 'dismissed' as const
  }, [promptEvent])

  return {
    install,
    installAvailable: Boolean(promptEvent) && !installed,
    installed,
    ios,
  }
}
