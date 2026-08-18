import { useRef, useState } from 'react'
import { Icon } from './Icon'
import { usePremiumAccess } from './PremiumAccess'

export function MicButton({ onText, title = 'Preencher por voz' }: { onText: (text: string) => void; title?: string }) {
  const [active, setActive] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const stopRef = useRef<() => void>(() => undefined)
  const { isPro, requestAccess } = usePremiumAccess()

  const start = async () => {
    if (active) {
      stopRef.current()
      setActive(false)
      return
    }
    if (waiting) return

    setWaiting(true)
    const allowed = await requestAccess('voice')
    setWaiting(false)
    if (!allowed) return

    const { startSpeech } = await import('../lib/speech')
    stopRef.current = startSpeech(onText, setActive, () => alert('O reconhecimento de voz não está disponível neste navegador. Tente Chrome ou Edge e permita o uso do microfone.'))
  }

  const premiumTitle = isPro ? title : `${title} · anúncio no plano grátis`
  return <button className={`mic-button ${active ? 'is-listening' : ''} ${waiting ? 'is-waiting' : ''}`} type="button" onClick={() => void start()} title={active ? 'Parar gravação' : premiumTitle} aria-label={active ? 'Parar gravação' : premiumTitle} disabled={waiting}>
    <Icon name="mic" size={16} />
  </button>
}
