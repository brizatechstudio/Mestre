import { useMemo } from 'react'
import { Icon } from '../components/Icon'
import type { Client, Quote } from '../types'
import { money, quoteTotal, shortDate } from '../lib/utils'
import { Empty, Status } from './shared'

export default function Dashboard({ quotes, clients, onNew, onOpen }: { quotes: Quote[]; clients: Client[]; onNew: () => void; onOpen: (id: string) => void }) {
  const metrics = useMemo(() => {
    const approved = quotes.filter(q => ['Aprovado', 'Concluído'].includes(q.status))
    const approvedValue = approved.reduce((sum, q) => sum + quoteTotal(q.services, q.materials, q.discount,q.taxPercent??0,q.profitMarginPercent??0).total, 0)
    return { total: quotes.length, pending: quotes.filter(q => ['Enviado', 'Aguardando aprovação'].includes(q.status)).length, approved: approved.length, approvedValue }
  }, [quotes])
  return <div className="stack-lg">
    <section className="hero-card">
      <div><span className="eyebrow">ORÇAMENTOS SEM COMPLICAÇÃO</span><h2>Crie, fale, envie e feche negócios.</h2><p>Monte propostas profissionais em poucos minutos. Digite ou use o microfone nos campos principais.</p></div>
      <button className="button button--primary button--large" onClick={onNew}><Icon name="mic" /> Criar orçamento</button>
    </section>
    <section className="metrics-grid">
      <Metric label="Orçamentos" value={String(metrics.total)} detail="Total cadastrado" icon="quote" />
      <Metric label="Aguardando" value={String(metrics.pending)} detail="Precisam de retorno" icon="arrow" />
      <Metric label="Aprovados" value={String(metrics.approved)} detail="Negócios ganhos" icon="check" />
      <Metric label="Valor aprovado" value={money(metrics.approvedValue)} detail={`${clients.length} clientes cadastrados`} icon="dashboard" />
    </section>
    <section className="panel dashboard-recent">
      <div className="section-heading"><div><h2>Orçamentos recentes</h2><p>Acompanhe as propostas mais recentes.</p></div><button className="button button--ghost" onClick={onNew}><Icon name="plus"/> Novo</button></div>
      {quotes.length ? <div className="table-wrap"><table><thead><tr><th>Número</th><th>Cliente</th><th>Status</th><th>Total</th><th>Atualizado</th><th></th></tr></thead><tbody>
        {quotes.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,6).map(q => <tr key={q.id}><td data-label="Número"><b>{q.number}</b></td><td data-label="Cliente">{q.clientSnapshot?.name || clients.find(c=>c.id===q.clientId)?.name || 'Sem cliente'}</td><td data-label="Status"><Status status={q.status}/></td><td data-label="Total">{money(quoteTotal(q.services,q.materials,q.discount,q.taxPercent??0,q.profitMarginPercent??0).total)}</td><td data-label="Atualizado">{shortDate(q.updatedAt)}</td><td className="dashboard-recent__action"><button className="icon-button" aria-label={`Abrir orçamento ${q.number}`} onClick={() => onOpen(q.id)}><Icon name="arrow"/></button></td></tr>)}
      </tbody></table></div> : <Empty title="Nenhum orçamento ainda" text="Crie seu primeiro orçamento e ele aparecerá aqui." action="Criar orçamento" onAction={onNew} />}
    </section>
  </div>
}

function Metric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: Parameters<typeof Icon>[0]['name'] }) {
  return <article className="metric-card"><div className="metric-card__icon"><Icon name={icon}/></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>
}


