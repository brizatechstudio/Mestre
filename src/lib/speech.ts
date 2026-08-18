export type SpeechResultHandler = (text: string) => void

type RecognitionCtor = new () => SpeechRecognition

declare global {
  interface Window {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  interface SpeechRecognition extends EventTarget {
    lang: string
    interimResults: boolean
    continuous: boolean
    onresult: ((event: SpeechRecognitionEvent) => void) | null
    onerror: (() => void) | null
    onend: (() => void) | null
    start(): void
    stop(): void
  }
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList
  }
}

export const startSpeech = (onResult: SpeechResultHandler, onState: (active: boolean) => void, onUnavailable: () => void) => {
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
  if (!Ctor) { onUnavailable(); return () => undefined }
  const recognition = new Ctor()
  recognition.lang = 'pt-BR'
  recognition.interimResults = false
  recognition.continuous = false
  recognition.onresult = (event) => {
    const text = Array.from(event.results).map(r => r[0]?.transcript ?? '').join(' ').trim()
    if (text) onResult(text)
  }
  recognition.onerror = () => onState(false)
  recognition.onend = () => onState(false)
  onState(true)
  recognition.start()
  return () => recognition.stop()
}
