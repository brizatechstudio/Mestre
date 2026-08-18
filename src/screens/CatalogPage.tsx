import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { VoiceField } from '../components/VoiceField'
import type { CatalogItem, Unit } from '../types'
import { money, uid } from '../lib/utils'

const units: Unit[] = ['un', 'h', 'dia', 'm', 'm²', 'm³', 'kg', 'l', 'pct']

export default function CatalogPage({ kind, title, items, setItems, notify }: { kind: 'service'|'material'; title: string; items: CatalogItem[]; setItems:(v:CatalogItem[])=>void; notify:(m:string)=>void }) {
  const empty: CatalogItem = { id:'', name:'', description:'', unit:'un', price:0, category:'' }
  const [editing, setEditing] = useState<CatalogItem | null>(null)
  const save = () => {
    if (!editing?.name.trim()) return notify(`Informe o nome do ${kind === 'service' ? 'serviço' : 'material'}.`)
    const next = items.some(x=>x.id===editing.id) ? items.map(x=>x.id===editing.id?editing:x) : [...items,{...editing,id:uid(kind==='service'?'srv':'mat')}]
    setItems(next); setEditing(null); notify(`${kind === 'service' ? 'Serviço' : 'Material'} salvo.`)
  }
  return <section className="panel">
    <div className="section-heading"><div><h2>{title} cadastrados</h2><p>Crie uma biblioteca para montar orçamentos ainda mais rápido.</p></div><button className="button button--primary" onClick={()=>setEditing({...empty})}><Icon name="plus"/> Adicionar {kind === 'service' ? 'serviço' : 'material'}</button></div>
    <div className="catalog-grid">{items.map(item=><article className="catalog-card" key={item.id}><div className="catalog-card__top"><div className="catalog-icon"><Icon name={kind==='service'?'services':'materials'}/></div><div><span className="catalog-category">{item.category || 'Sem categoria'}</span><h3>{item.name}</h3></div></div><p>{item.description || 'Sem descrição.'}</p><div className="catalog-card__footer"><div><strong>{money(item.price)}</strong><small>/ {item.unit}</small></div><div><button className="icon-button" onClick={()=>setEditing({...item})}><Icon name="edit"/></button><button className="icon-button danger" onClick={()=>{if(confirm('Excluir este item?')){setItems(items.filter(x=>x.id!==item.id));notify('Item excluído.')}}}><Icon name="trash"/></button></div></div></article>)}</div>
    <Modal open={!!editing} title={`${editing?.id?'Editar':'Novo'} ${kind==='service'?'serviço':'material'}`} onClose={()=>setEditing(null)} actions={<><button className="button button--ghost" onClick={()=>setEditing(null)}>Cancelar</button><button className="button button--primary" onClick={save}>Salvar</button></>}>
      {editing && <div className="form-grid"><div className="span-2"><VoiceField label="Nome" value={editing.name} onChange={v=>setEditing({...editing,name:v})} placeholder={kind==='service'?'Ex.: Instalação de tomada':'Ex.: Cabo 2,5 mm'}/></div><div className="span-2"><VoiceField multiline label="Descrição" value={editing.description} onChange={v=>setEditing({...editing,description:v})} placeholder="Descreva o item..."/></div><label className="field"><span>Preço padrão</span><input type="number" step="0.01" min="0" value={editing.price} onChange={e=>setEditing({...editing,price:Number(e.target.value)})}/></label><label className="field"><span>Unidade</span><select value={editing.unit} onChange={e=>setEditing({...editing,unit:e.target.value as Unit})}>{units.map(u=><option key={u}>{u}</option>)}</select></label><div className="span-2"><VoiceField label="Categoria" value={editing.category} onChange={v=>setEditing({...editing,category:v})} placeholder="Ex.: Elétrica, Pintura, Design..."/></div></div>}
    </Modal>
  </section>
}


