import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { VoiceField } from '../components/VoiceField'
import type { Client } from '../types'
import { uid } from '../lib/utils'
import { Empty } from './shared'

export default function ClientsPage({ clients, setClients, notify }: { clients: Client[]; setClients: (v: Client[]) => void; notify: (m:string)=>void }) {
  const empty: Client = { id:'', name:'', phone:'', email:'', document:'', address:'' }
  const [editing, setEditing] = useState<Client | null>(null)
  const save = () => {
    if (!editing?.name.trim()) return notify('Informe o nome do cliente.')
    const exists = clients.some(c => c.id === editing.id)
    setClients(exists ? clients.map(c => c.id === editing.id ? editing : c) : [...clients, { ...editing, id: uid('cli') }])
    setEditing(null); notify('Cliente salvo.')
  }
  return <section className="panel">
    <div className="section-heading"><div><h2>Seus clientes</h2><p>Cadastre clientes para reutilizar os dados nos próximos orçamentos.</p></div><button className="button button--primary" onClick={() => setEditing({...empty})}><Icon name="plus"/> Novo cliente</button></div>
    {clients.length ? <div className="card-list">{clients.map(c => <article className="list-card" key={c.id}><div className="list-card__avatar">{c.name.charAt(0).toUpperCase()}</div><div className="list-card__content"><h3>{c.name}</h3><p>{c.phone || 'Sem telefone'} · {c.email || 'Sem e-mail'}</p><small>{c.address || 'Sem endereço'}</small></div><div className="list-card__actions"><button className="icon-button" onClick={() => setEditing({...c})}><Icon name="edit"/></button><button className="icon-button danger" onClick={() => { if(confirm('Excluir este cliente?')) { setClients(clients.filter(x=>x.id!==c.id)); notify('Cliente excluído.') }}}><Icon name="trash"/></button></div></article>)}</div> : <Empty title="Nenhum cliente" text="Cadastre um cliente para começar." action="Novo cliente" onAction={() => setEditing({...empty})}/>} 
    <Modal open={!!editing} title={editing?.id ? 'Editar cliente' : 'Novo cliente'} onClose={() => setEditing(null)} actions={<><button className="button button--ghost" onClick={() => setEditing(null)}>Cancelar</button><button className="button button--primary" onClick={save}>Salvar cliente</button></>}>
      {editing && <div className="form-grid"><VoiceField label="Nome" value={editing.name} onChange={v=>setEditing({...editing,name:v})} placeholder="Nome do cliente"/><VoiceField label="Telefone" value={editing.phone} onChange={v=>setEditing({...editing,phone:v})} placeholder="(00) 00000-0000"/><VoiceField label="E-mail" value={editing.email} onChange={v=>setEditing({...editing,email:v})} placeholder="cliente@email.com"/><VoiceField label="CPF/CNPJ" value={editing.document} onChange={v=>setEditing({...editing,document:v})} placeholder="Opcional"/><div className="span-2"><VoiceField label="Endereço" value={editing.address} onChange={v=>setEditing({...editing,address:v})} placeholder="Rua, número, cidade..."/></div></div>}
    </Modal>
  </section>
}



