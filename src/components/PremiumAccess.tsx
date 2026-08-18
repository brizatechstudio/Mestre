import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { Icon } from './Icon'
import { Modal } from './Modal'
import { appEnv, rewardedAdsConfigured } from '../lib/env'
import type { AccountEntitlement, PremiumFeature } from '../types'

type PremiumContextValue = {
  entitlement: AccountEntitlement
  isPro: boolean
  requestAccess: (feature: PremiumFeature) => Promise<boolean>
}

type PendingRequest = {
  feature: PremiumFeature
  resolve: (allowed: boolean) => void
}

const featureCopy: Record<PremiumFeature, { title: string; description: string }> = {
  voice: {
    title: 'Recurso de voz',
    description: 'No plano grátis, assista a um anúncio para liberar esta ação de voz. No MESTRE Pro, a voz é liberada sem anúncios.',
  },
  pdf: {
    title: 'Exportar PDF',
    description: 'No plano grátis, assista a um anúncio para gerar este PDF. No MESTRE Pro, as exportações são ilimitadas e sem anúncios.',
  },
}

const fallbackEntitlement: AccountEntitlement = { uid: 'local', plan: 'pro', source: 'local' }
const PremiumContext = createContext<PremiumContextValue>({
  entitlement: fallbackEntitlement,
  isPro: true,
  requestAccess: async () => true,
})

export function PremiumProvider({ entitlement = fallbackEntitlement, children }: { entitlement?: AccountEntitlement; children: ReactNode }) {
  const [pending, setPending] = useState<PendingRequest | null>(null)
  const [message, setMessage] = useState('')
  const [watching, setWatching] = useState(false)
  const pendingRef = useRef<PendingRequest | null>(null)
  const isPro = entitlement.plan === 'pro'

  const settle = useCallback((allowed: boolean) => {
    const request = pendingRef.current
    pendingRef.current = null
    setPending(null)
    setWatching(false)
    setMessage('')
    request?.resolve(allowed)
  }, [])

  const requestAccess = useCallback((feature: PremiumFeature) => {
    if (isPro) return Promise.resolve(true)
    if (pendingRef.current) return Promise.resolve(false)
    return new Promise<boolean>((resolve) => {
      const request = { feature, resolve }
      pendingRef.current = request
      setPending(request)
      setMessage('')
    })
  }, [isPro])

  const watchAd = async () => {
    if (!pending || watching) return
    if (!rewardedAdsConfigured) {
      setMessage('Os anúncios premiados ainda não foram configurados. Preencha o ad unit do Google Ad Manager no .env ou use o MESTRE Pro.')
      return
    }

    setWatching(true)
    setMessage('Carregando anúncio...')
    // O GPT e a implementação de anúncios premiados só são baixados após uma
    // ação explícita do usuário; eles não competem com a abertura do app.
    const { showRewardedAd } = await import('../lib/rewardedAds')
    const result = await showRewardedAd()
    if (result === 'granted') {
      settle(true)
      return
    }
    setWatching(false)
    if (result === 'closed') setMessage('O anúncio foi fechado antes da recompensa. Assista até o final para liberar o recurso.')
    else if (result === 'unavailable') setMessage('Não há anúncio disponível agora neste dispositivo. Tente novamente em instantes ou use o MESTRE Pro.')
    else setMessage('Não foi possível carregar o anúncio. Verifique sua conexão e tente novamente.')
  }

  const openPro = async () => {
    if (!appEnv.billing.proCheckoutUrl) {
      setMessage('O link de assinatura ainda não foi configurado. Preencha VITE_PRO_CHECKOUT_URL quando definir o meio de pagamento.')
      return
    }
    if (Capacitor.isNativePlatform()) {
      try {
        await Browser.open({ url: appEnv.billing.proCheckoutUrl })
      } catch (error) {
        console.error(error)
        setMessage('Não foi possível abrir o checkout. Tente novamente em instantes.')
      }
      return
    }
    window.open(appEnv.billing.proCheckoutUrl, '_blank', 'noopener,noreferrer')
  }

  const value = useMemo(() => ({ entitlement, isPro, requestAccess }), [entitlement, isPro, requestAccess])
  const copy = pending ? featureCopy[pending.feature] : null

  return <PremiumContext.Provider value={value}>
    {children}
    <Modal
      open={Boolean(pending)}
      title={copy?.title || 'MESTRE Pro'}
      onClose={() => { if (!watching) settle(false) }}
      actions={<>
        <button className="button button--ghost" onClick={() => settle(false)} disabled={watching}>Agora não</button>
        <button className="button button--soft" onClick={() => void openPro()} disabled={watching}><Icon name="star" size={16}/> Conhecer Pro</button>
        <button className="button button--primary" onClick={() => void watchAd()} disabled={watching}><Icon name="play" size={16}/> {watching ? 'Carregando...' : 'Assistir anúncio e liberar'}</button>
      </>}
    >
      <div className="premium-gate">
        <div className="premium-gate__icon"><Icon name="star" size={26}/></div>
        <div><strong>{copy?.title}</strong><p>{copy?.description}</p></div>
      </div>
      <div className="premium-gate__benefits"><span>✓ Orçamentos continuam ilimitados no plano grátis</span><span>✓ O anúncio libera somente esta ação</span><span>✓ MESTRE Pro remove anúncios de voz e PDF</span></div>
      {message && <div className="auth-message auth-message--info">{message}</div>}
    </Modal>
  </PremiumContext.Provider>
}

export function usePremiumAccess() {
  return useContext(PremiumContext)
}
