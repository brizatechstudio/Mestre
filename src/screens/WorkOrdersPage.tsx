import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { usePremiumAccess } from '../components/PremiumAccess'
import type { Client, Quote, Settings, WorkOrder, WorkOrderStatus } from '../types'
import { nextDocumentNumber, shortDate, uid } from '../lib/utils'
import { usingFirebaseBackend } from '../lib/env'
import { reserveWorkOrderNumber } from '../lib/cloudStore'
import { Empty } from './shared'

export default function WorkOrdersPage({workOrders,setWorkOrders,quotes,clients,settings,notify,ownerId}:{workOrders:WorkOrder[];setWorkOrders:(v:WorkOrder[])=>void;quotes:Quote[];clients:Client[];settings:Settings;notify:(m:string)=>void;ownerId?:string}){
  const {isPro,requestAccess}=usePremiumAccess()
  const [editing,setEditing]=useState<WorkOrder|null>(null)
  const [busy,setBusy]=useState(false)
  const statuses:WorkOrderStatus[]=['Aberta','Em andamento','Concluída','Cancelada']

  const newOrder=async()=>{
    if(busy)return
    setBusy(true)
    try{
      const number=usingFirebaseBackend&&ownerId?await reserveWorkOrderNumber(ownerId):nextDocumentNumber(workOrders.map(item=>item.number),'OS')
      const now=new Date().toISOString()
      setEditing({id:uid('os'),number,clientId:'',services:[],materials:[],description:'',scheduledDate:now.slice(0,10),status:'Aberta',createdAt:now,updatedAt:now})
    }catch(error){console.error(error);notify('Não foi possível reservar o número da ordem de serviço.')}finally{setBusy(false)}
  }

  const applyQuote=(quoteId:string)=>{
    if(!editing)return
    const quote=quotes.find(item=>item.id===quoteId)
    if(!quote){setEditing({...editing,quoteId:'',quoteNumber:'',services:[],materials:[]});return}
    const client=clients.find(item=>item.id===quote.clientId)??quote.clientSnapshot
    setEditing({...editing,quoteId:quote.id,quoteNumber:quote.number,clientId:quote.clientId,clientSnapshot:client?{...client}:undefined,services:structuredClone(quote.services),materials:structuredClone(quote.materials),description:quote.observations||`Execução referente ao orçamento ${quote.number}.`})
  }

  const save=()=>{
    if(!editing)return
    const client=clients.find(item=>item.id===editing.clientId)
    if(!client&&!editing.clientSnapshot){notify('Selecione um cliente para a ordem de serviço.');return}
    const final={...editing,clientSnapshot:client?{...client}:editing.clientSnapshot,updatedAt:new Date().toISOString()}
    setWorkOrders(workOrders.some(item=>item.id===final.id)?workOrders.map(item=>item.id===final.id?final:item):[...workOrders,final])
    setEditing(null)
    notify('Ordem de serviço salva.')
  }

  const generatePdf=async(order:WorkOrder)=>{
    const allowed=await requestAccess('pdf');if(!allowed)return
    try{const {generateWorkOrderPdf}=await import('../lib/pdf');await generateWorkOrderPdf(order,order.clientSnapshot??clients.find(c=>c.id===order.clientId),settings);notify(isPro?'PDF da ordem de serviço gerado.':'PDF liberado pelo anúncio e gerado.')}catch(error){console.error(error);notify('Não foi possível gerar o PDF da ordem de serviço.')}
  }

  return <section className="panel"><div className="section-heading"><div><h2>Ordens de serviço</h2><p>Transforme o orçamento aprovado em instrução de execução para o serviço.</p></div><button disabled={busy} className="button button--primary" onClick={()=>void newOrder()}><Icon name="plus"/> Nova O.S.</button></div>
    {workOrders.length?<div className="table-wrap"><table><thead><tr><th>Número</th><th>Cliente</th><th>Orçamento</th><th>Status</th><th>Agendada</th><th></th></tr></thead><tbody>{workOrders.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(order=><tr key={order.id}><td data-label="Número"><b>{order.number}</b></td><td data-label="Cliente">{order.clientSnapshot?.name||clients.find(c=>c.id===order.clientId)?.name||'—'}</td><td data-label="Orçamento">{order.quoteNumber||'Avulsa'}</td><td data-label="Status"><span className="doc-status">{order.status}</span></td><td data-label="Agendada">{order.scheduledDate?shortDate(order.scheduledDate):'—'}</td><td className="table-actions" data-label="Ações"><div className="row-actions"><button className="icon-button" title="Editar" onClick={()=>setEditing(structuredClone(order))}><Icon name="edit"/></button><button className="icon-button" title="Gerar PDF" onClick={()=>void generatePdf(order)}><Icon name="download"/></button><button className="icon-button danger" title="Excluir" onClick={()=>{if(confirm('Excluir esta ordem de serviço?'))setWorkOrders(workOrders.filter(item=>item.id!==order.id))}}><Icon name="trash"/></button></div></td></tr>)}</tbody></table></div>:<Empty title="Nenhuma ordem de serviço" text="Crie uma O.S. a partir de um orçamento ou de forma avulsa." action="Nova ordem de serviço" onAction={()=>void newOrder()}/>}
    <Modal open={Boolean(editing)} title={editing?.number||'Ordem de serviço'} onClose={()=>setEditing(null)} actions={<><button className="button button--ghost" onClick={()=>setEditing(null)}>Cancelar</button><button className="button button--primary" onClick={save}><Icon name="save"/> Salvar O.S.</button></>}>{editing&&<div className="form-grid"><label className="field span-2"><span>Vincular a um orçamento</span><select value={editing.quoteId??''} onChange={e=>applyQuote(e.target.value)}><option value="">O.S. avulsa</option>{quotes.map(quote=><option key={quote.id} value={quote.id}>{quote.number} — {quote.clientSnapshot?.name||clients.find(c=>c.id===quote.clientId)?.name||'Sem cliente'}</option>)}</select></label><label className="field"><span>Cliente</span><select value={editing.clientId} onChange={e=>{const client=clients.find(c=>c.id===e.target.value);setEditing({...editing,clientId:e.target.value,clientSnapshot:client?{...client}:undefined})}}><option value="">Selecione</option>{clients.map(client=><option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label className="field"><span>Status</span><select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value as WorkOrderStatus})}>{statuses.map(status=><option key={status}>{status}</option>)}</select></label><label className="field"><span>Data agendada</span><input type="date" value={editing.scheduledDate} onChange={e=>setEditing({...editing,scheduledDate:e.target.value})}/></label><div className="client-summary"><span>Itens vinculados</span><strong>{editing.services.length} serviço(s) · {editing.materials.length} material(is)</strong></div><label className="field span-2"><span>Descrição / instruções de execução</span><textarea rows={5} value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})} placeholder="Descreva o que deve ser executado, cuidados, local e observações..."/></label></div>}</Modal>
  </section>
}



