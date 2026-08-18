import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { usePremiumAccess } from '../components/PremiumAccess'
import type { Client, Quote, Receipt, Settings } from '../types'
import { money, nextDocumentNumber, quoteTotal, shortDate, uid } from '../lib/utils'
import { usingFirebaseBackend } from '../lib/env'
import { reserveReceiptNumber } from '../lib/cloudStore'
import { Empty } from './shared'

export default function ReceiptsPage({receipts,setReceipts,quotes,clients,settings,notify,ownerId}:{receipts:Receipt[];setReceipts:(v:Receipt[])=>void;quotes:Quote[];clients:Client[];settings:Settings;notify:(m:string)=>void;ownerId?:string}){
  const {isPro,requestAccess}=usePremiumAccess()
  const [editing,setEditing]=useState<Receipt|null>(null)
  const [busy,setBusy]=useState(false)

  const newReceipt=async()=>{
    if(busy)return
    setBusy(true)
    try{
      const number=usingFirebaseBackend&&ownerId?await reserveReceiptNumber(ownerId):nextDocumentNumber(receipts.map(item=>item.number),'REC')
      const now=new Date().toISOString()
      setEditing({id:uid('rec'),number,clientId:'',amount:0,paymentMethod:'PIX',description:'',issueDate:now.slice(0,10),createdAt:now,updatedAt:now})
    }catch(error){console.error(error);notify('Não foi possível reservar o número do recibo.')}finally{setBusy(false)}
  }

  const applyQuote=(quoteId:string)=>{
    if(!editing)return
    const quote=quotes.find(item=>item.id===quoteId)
    if(!quote){setEditing({...editing,quoteId:'',quoteNumber:''});return}
    const client=clients.find(item=>item.id===quote.clientId)??quote.clientSnapshot
    const totals=quoteTotal(quote.services,quote.materials,quote.discount,quote.taxPercent??0,quote.profitMarginPercent??0)
    setEditing({...editing,quoteId:quote.id,quoteNumber:quote.number,clientId:quote.clientId,clientSnapshot:client?{...client}:undefined,amount:totals.total,description:`Recebimento referente ao orçamento ${quote.number}.`})
  }

  const save=()=>{
    if(!editing)return
    const client=clients.find(item=>item.id===editing.clientId)
    if(!client&&!editing.clientSnapshot){notify('Selecione o cliente do recibo.');return}
    if(!Number.isFinite(editing.amount)||editing.amount<=0){notify('Informe um valor maior que zero.');return}
    const final={...editing,clientSnapshot:client?{...client}:editing.clientSnapshot,updatedAt:new Date().toISOString()}
    setReceipts(receipts.some(item=>item.id===final.id)?receipts.map(item=>item.id===final.id?final:item):[...receipts,final])
    setEditing(null)
    notify('Recibo salvo.')
  }

  const generatePdf=async(receipt:Receipt)=>{
    const allowed=await requestAccess('pdf');if(!allowed)return
    try{const {generateReceiptPdf}=await import('../lib/pdf');await generateReceiptPdf(receipt,receipt.clientSnapshot??clients.find(c=>c.id===receipt.clientId),settings);notify(isPro?'PDF do recibo gerado.':'PDF liberado pelo anúncio e gerado.')}catch(error){console.error(error);notify('Não foi possível gerar o PDF do recibo.')}
  }

  return <section className="panel"><div className="section-heading"><div><h2>Recibos</h2><p>Registre pagamentos recebidos e gere um comprovante profissional em PDF.</p></div><button disabled={busy} className="button button--primary" onClick={()=>void newReceipt()}><Icon name="plus"/> Novo recibo</button></div>
    {receipts.length?<div className="table-wrap"><table><thead><tr><th>Número</th><th>Cliente</th><th>Referência</th><th>Valor</th><th>Pagamento</th><th>Data</th><th></th></tr></thead><tbody>{receipts.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(receipt=><tr key={receipt.id}><td><b>{receipt.number}</b></td><td>{receipt.clientSnapshot?.name||clients.find(c=>c.id===receipt.clientId)?.name||'—'}</td><td>{receipt.quoteNumber||'Avulso'}</td><td><b>{money(receipt.amount)}</b></td><td>{receipt.paymentMethod}</td><td>{shortDate(receipt.issueDate)}</td><td><div className="row-actions"><button className="icon-button" title="Editar" onClick={()=>setEditing(structuredClone(receipt))}><Icon name="edit"/></button><button className="icon-button" title="Gerar PDF" onClick={()=>void generatePdf(receipt)}><Icon name="download"/></button><button className="icon-button danger" title="Excluir" onClick={()=>{if(confirm('Excluir este recibo?'))setReceipts(receipts.filter(item=>item.id!==receipt.id))}}><Icon name="trash"/></button></div></td></tr>)}</tbody></table></div>:<Empty title="Nenhum recibo" text="Crie recibos vinculados aos seus orçamentos ou recebimentos avulsos." action="Novo recibo" onAction={()=>void newReceipt()}/>} 
    <Modal open={Boolean(editing)} title={editing?.number||'Recibo'} onClose={()=>setEditing(null)} actions={<><button className="button button--ghost" onClick={()=>setEditing(null)}>Cancelar</button><button className="button button--primary" onClick={save}><Icon name="save"/> Salvar recibo</button></>}>{editing&&<div className="form-grid"><label className="field span-2"><span>Vincular a um orçamento</span><select value={editing.quoteId??''} onChange={e=>applyQuote(e.target.value)}><option value="">Recibo avulso</option>{quotes.map(quote=><option key={quote.id} value={quote.id}>{quote.number} — {quote.clientSnapshot?.name||clients.find(c=>c.id===quote.clientId)?.name||'Sem cliente'}</option>)}</select></label><label className="field"><span>Cliente</span><select value={editing.clientId} onChange={e=>{const client=clients.find(c=>c.id===e.target.value);setEditing({...editing,clientId:e.target.value,clientSnapshot:client?{...client}:undefined})}}><option value="">Selecione</option>{clients.map(client=><option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label className="field"><span>Data de emissão</span><input type="date" value={editing.issueDate} onChange={e=>setEditing({...editing,issueDate:e.target.value})}/></label><label className="field"><span>Valor recebido</span><input type="number" min="0" step="0.01" value={editing.amount} onChange={e=>setEditing({...editing,amount:Number(e.target.value)})}/></label><label className="field"><span>Forma de pagamento</span><select value={editing.paymentMethod} onChange={e=>setEditing({...editing,paymentMethod:e.target.value})}><option>PIX</option><option>Dinheiro</option><option>Cartão</option><option>Transferência</option><option>Boleto</option><option>Outro</option></select></label><label className="field span-2"><span>Descrição</span><textarea rows={4} value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})} placeholder="Ex.: pagamento referente à instalação elétrica..."/></label></div>}</Modal>
  </section>
}


