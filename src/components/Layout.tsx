import { useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import type { PlanTier } from '../types'
import { WebAdBanner } from './WebAdBanner'

type Page = 'dashboard' | 'clients' | 'quotes' | 'quote' | 'workOrders' | 'receipts' | 'costs' | 'services' | 'materials' | 'settings'
type NavigationItem = { id: Page; label: string; mobileLabel?: string; icon: Parameters<typeof Icon>[0]['name'] }
const items: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Início', icon: 'dashboard' },
  { id: 'clients', label: 'Clientes', icon: 'clients' },
  { id: 'quotes', label: 'Orçamentos', mobileLabel: 'Orçar', icon: 'quote' },
  { id: 'workOrders', label: 'Ordens de serviço', mobileLabel: 'O.S.', icon: 'clipboard' },
  { id: 'receipts', label: 'Recibos', icon: 'receipt' },
  { id: 'costs', label: 'Custos', icon: 'costs' },
  { id: 'services', label: 'Serviços', icon: 'services' },
  { id: 'materials', label: 'Materiais', icon: 'materials' },
  { id: 'settings', label: 'Configurações', icon: 'settings' },
]

export function Layout({ page, setPage, title, subtitle, professionalName, userEmail, onLogout, backendLabel, plan, installAvailable, onInstall, adPreview, children, actions }: {
  page: Page
  setPage: (p: Page) => void
  title: string
  subtitle?: string
  professionalName: string
  userEmail?: string
  onLogout?: () => void
  backendLabel?: string
  plan?: PlanTier
  installAvailable?: boolean
  onInstall?: () => void
  adPreview?: boolean
  children: ReactNode
  actions?: ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const go = (id: Page) => { setPage(id); setMobileOpen(false) }
  const profileName = professionalName || userEmail || 'Usuário'
  const isCurrentPage = (id: Page) => page === id || (page === 'quote' && id === 'quotes')
  const mobileItems = items.filter(item => ['dashboard', 'clients', 'quotes', 'workOrders'].includes(item.id))

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
      <div className="brand"><img src="/mestre-logo-dark.png" alt="MESTRE" /></div>
      <nav>{items.map(item => <button key={item.id} className={isCurrentPage(item.id) ? 'active' : ''} onClick={() => go(item.id)}><Icon name={item.icon}/><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-account">
        {backendLabel && <span className="backend-badge"><Icon name="cloud" size={14}/>{backendLabel}</span>}
        {plan && <span className={`plan-badge plan-badge--${plan}`}><Icon name="star" size={13}/>{plan === 'pro' ? 'MESTRE PRO' : 'MESTRE GRÁTIS'}</span>}
        <strong>{profileName}</strong>
        {userEmail && <small>{userEmail}</small>}
        {onLogout && <button className="button button--ghost button--full button--small" onClick={onLogout}><Icon name="logout" size={15}/> Sair</button>}
      </div>
    </aside>
    {mobileOpen && <button className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" />}
    <main className="main">
      <header className="topbar">
        <div className="topbar__heading"><button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Icon name="menu" /></button><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></div>
        <div className="topbar__right">
          <div className="global-search"><Icon name="search" size={16}/><input placeholder="Buscar..." aria-label="Buscar" /></div>
          {installAvailable && onInstall && <button className="icon-button pwa-install-top" onClick={onInstall} title="Instalar MESTRE" aria-label="Instalar MESTRE como aplicativo"><Icon name="download" /></button>}
          {actions}
          <div className="avatar" title={profileName}>{profileName.charAt(0).toUpperCase()}</div>
        </div>
      </header>
      {(plan === 'free' || adPreview) && <WebAdBanner placement={page} />}
      <div className="content">{children}</div>
    </main>
    <nav className="mobile-bottom-nav" aria-label="Navegação principal">
      {mobileItems.map(item => <button key={item.id} className={isCurrentPage(item.id) ? 'active' : ''} onClick={() => go(item.id)} aria-current={isCurrentPage(item.id) ? 'page' : undefined}><Icon name={item.icon} size={19}/><span>{item.mobileLabel ?? item.label}</span></button>)}
      <button onClick={() => setMobileOpen(true)} aria-label="Abrir todos os menus"><Icon name="menu" size={20}/><span>Mais</span></button>
    </nav>
  </div>
}

export type { Page }
