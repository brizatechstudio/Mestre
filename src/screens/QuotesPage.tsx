import { useState } from 'react'
import { Icon } from '../components/Icon'
import type { Client, Quote, QuoteStatus } from '../types'
import { money, nextQuoteNumber, quoteTotal, shortDate, uid } from '../lib/utils'
import { usingFirebaseBackend } from '../lib/env'
import { reserveQuoteNumber } from '../lib/cloudStore'
import { removeQuotePhotosForQuote } from '../lib/quotePhotoStorage'
import { Empty, Status } from './shared'

export default function QuotesPage({ quotes, clients, setQuotes, onOpen, onNew, notify, ownerId }: { quotes:Quote[]; clients:Client[]; setQuotes:(v:Quote[])=>void; onOpen:(id:string)=>void; onNew:()=>void; notify:(m:string)=>void; ownerId?:string }) {
  const [query,setQuery]=useState('')
  const [duplicatingId,setDuplicatingId]=useState<string|null>(null)
  const [deletingId,setDeletingId]=useState<string|null>(null)
  const filtered=quotes.filter(q=>`${q.number} ${q.clientSnapshot?.name || clients.find(c=>c.id===q.clientId)?.name || ''} ${q.status}`.toLowerCase().includes(query.toLowerCase()))

  const duplicateQuote=async(q:Quote)=>{
    if(duplicatingId)return
    setDuplicatingId(q.id)
    try{
      const number=usingFirebaseBackend&&ownerId?await reserveQuoteNumber(ownerId):nextQuoteNumber(quotes.map(item=>item.number))
      const copy={
        ...q,
        id:uid('orc'),
        number,
        status:'Rascunho' as QuoteStatus,
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString(),
        services:q.services.map(i=>({...i,id:uid('qi')})),
        materials:q.materials.map(i=>({...i,id:uid('qi')})),
        // Fotos não são compartilhadas entre orçamentos para evitar vínculos de Storage.
        photos:[],
      }
      setQuotes([...quotes,copy])
      notify((q.photos?.length??0)>0?'Orçamento duplicado. As fotos não foram copiadas.':'Orçamento duplicado.')
    }catch(error){
      console.error(error)
      notify('Não foi possível reservar um número para a cópia.')
    }finally{
      setDuplicatingId(null)
    }
  }

  const deleteQuote=async(q:Quote)=>{
    if(deletingId || !confirm('Excluir este orçamento?'))return
    setDeletingId(q.id)
    try{
      if(usingFirebaseBackend&&ownerId&&(q.photos?.length??0)>0){
        await removeQuotePhotosForQuote(ownerId,q.id)
      }
      setQuotes(quotes.filter(x=>x.id!==q.id))
      notify('Orçamento excluído.')
    }catch(error){
      console.error(error)
      notify('Não foi possível excluir as fotos do orçamento. Tente novamente.')
    }finally{
      setDeletingId(null)
    }
  }

  return <section className="panel"><div className="section-heading"><div><h2>Todos os orçamentos</h2><p>Pesquise, acompanhe status e reutilize suas propostas.</p></div><button className="button button--primary" onClick={onNew}><Icon name="plus"/> Novo orçamento</button></div>
    <div className="toolbar"><div className="search-box"><Icon name="search"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por número, cliente ou status..."/></div></div>
    {filtered.length?<div className="table-wrap"><table><thead><tr><th>Número</th><th>Cliente</th><th>Status</th><th>Total</th><th>Fotos</th><th>Data</th><th></th></tr></thead><tbody>{filtered.map(q=><tr key={q.id}><td data-label="Número"><button className="link-button" onClick={()=>onOpen(q.id)}>{q.number}</button></td><td data-label="Cliente">{q.clientSnapshot?.name || clients.find(c=>c.id===q.clientId)?.name || 'Sem cliente'}</td><td data-label="Status"><Status status={q.status}/></td><td data-label="Total"><b>{money(quoteTotal(q.services,q.materials,q.discount,q.taxPercent??0,q.profitMarginPercent??0).total)}</b></td><td data-label="Fotos">{q.photos?.length??0}</td><td data-label="Data">{shortDate(q.createdAt)}</td><td className="table-actions" data-label="Ações"><div className="row-actions"><button className="icon-button" onClick={()=>onOpen(q.id)} title="Editar"><Icon name="edit"/></button><button disabled={duplicatingId===q.id||deletingId===q.id} className="icon-button" title="Duplicar" onClick={()=>void duplicateQuote(q)}><Icon name="copy"/></button><button disabled={deletingId===q.id} className="icon-button danger" onClick={()=>void deleteQuote(q)} title="Excluir"><Icon name="trash"/></button></div></td></tr>)}</tbody></table></div>:<Empty title="Nada encontrado" text="Tente outra busca ou crie um novo orçamento." action="Novo orçamento" onAction={onNew}/>}
  </section>
}


