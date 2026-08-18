import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function Modal({ open, title, onClose, children, actions }: { open: boolean; title: string; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  if (!open) return null
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <header><h3>{title}</h3><button className="icon-button" onClick={onClose}><Icon name="close" /></button></header>
      <div className="modal-body">{children}</div>
      {actions && <footer>{actions}</footer>}
    </section>
  </div>
}
