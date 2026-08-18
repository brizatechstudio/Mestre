import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { MicButton } from './MicButton'

type Props = {
  label?: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  placeholder?: string
  inputProps?: InputHTMLAttributes<HTMLInputElement>
  textareaProps?: TextareaHTMLAttributes<HTMLTextAreaElement>
}

export function VoiceField({ label, value, onChange, multiline, placeholder, inputProps, textareaProps }: Props) {
  return <label className="field">
    {label && <span>{label}</span>}
    <div className={`voice-field ${multiline ? 'voice-field--textarea' : ''}`}>
      {multiline
        ? <textarea {...textareaProps} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        : <input {...inputProps} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />}
      <MicButton onText={(text) => onChange(value ? `${value} ${text}` : text)} />
    </div>
  </label>
}
