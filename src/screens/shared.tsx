import { Icon } from '../components/Icon'
import type { QuoteStatus } from '../types'

export function Status({ status }: { status: QuoteStatus }) {
  const cls = status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll(' ','-')
  return <span className={`status status--${cls}`}>{status}</span>
}

export function Empty({title,text,action,onAction}:{title:string;text:string;action:string;onAction:()=>void}){return <div className="empty"><div><Icon name="quote" size={30}/></div><h3>{title}</h3><p>{text}</p><button className="button button--primary" onClick={onAction}>{action}</button></div>}



