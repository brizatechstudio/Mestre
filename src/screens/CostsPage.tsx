import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { VoiceField } from '../components/VoiceField'
import type { CostEntry, Settings } from '../types'
import { costSummary, money, uid } from '../lib/utils'
import { Empty } from './shared'

export default function CostsPage({costs,setCosts,settings,setSettings,notify}:{costs:CostEntry[];setCosts:(v:CostEntry[])=>void;settings:Settings;setSettings:(s:Settings)=>void;notify:(m:string)=>void}){
  const empty:CostEntry={id:'',name:'',category:'',monthlyAmount:0,notes:''}
  const [editing,setEditing]=useState<CostEntry|null>(null)
  const [hours,setHours]=useState(settings.productiveHoursPerMonth||160)
  useEffect(()=>setHours(settings.productiveHoursPerMonth||160),[settings.productiveHoursPerMonth])
  const summary=costSummary(costs,hours)

  const saveCost=()=>{
    if(!editing?.name.trim())return notify('Informe o nome do custo.')
    if(!Number.isFinite(editing.monthlyAmount)||editing.monthlyAmount<0)return notify('Informe um valor mensal válido.')
    const next=costs.some(item=>item.id===editing.id)?costs.map(item=>item.id===editing.id?editing:item):[...costs,{...editing,id:uid('cus')}]
    setCosts(next)
    setEditing(null)
    notify('Custo salvo.')
  }

  const saveHours=()=>{
    const safe=Math.max(1,Number.isFinite(hours)?hours:160)
    setHours(safe)
    setSettings({...settings,productiveHoursPerMonth:safe})
    notify('Horas produtivas salvas. A base de mão de obra foi recalculada.')
  }

  return <section className="panel costs-panel">
    <div className="section-heading"><div><h2>Base de custos</h2><p>Cadastre seus custos mensais para saber quanto sua operação custa por hora antes de aplicar margem e impostos.</p></div><button className="button button--primary" onClick={()=>setEditing({...empty})}><Icon name="plus"/> Adicionar custo</button></div>
    <div className="cost-summary-grid">
      <article className="cost-summary-card"><span>Custos mensais</span><strong>{money(summary.monthlyTotal)}</strong><small>{costs.length} item(ns) cadastrado(s)</small></article>
      <article className="cost-summary-card"><span>Horas produtivas/mês</span><div className="cost-hours-edit"><input type="number" min="1" step="1" value={hours} onChange={e=>setHours(Math.max(1,Number(e.target.value)))}/><button className="button button--soft button--small" onClick={saveHours}>Salvar</button></div><small>Horas realmente disponíveis para serviços faturáveis.</small></article>
      <article className="cost-summary-card cost-summary-card--accent"><span>Base operacional por hora</span><strong>{money(summary.hourlyBase)}<small>/h</small></strong><small>Use como referência mínima de mão de obra no orçamento.</small></article>
    </div>
    <div className="cost-formula-note"><Icon name="costs" size={17}/><span><b>Como calculamos:</b> custos mensais ÷ horas produtivas. Margem de lucro e imposto continuam sendo aplicados separadamente no orçamento.</span></div>
    {costs.length?<div className="table-wrap"><table><thead><tr><th>Custo</th><th>Categoria</th><th>Valor mensal</th><th>Observação</th><th></th></tr></thead><tbody>{costs.slice().sort((a,b)=>b.monthlyAmount-a.monthlyAmount).map(cost=><tr key={cost.id}><td data-label="Custo"><b>{cost.name}</b></td><td data-label="Categoria">{cost.category||'Outros'}</td><td data-label="Valor mensal"><b>{money(cost.monthlyAmount)}</b></td><td data-label="Observação">{cost.notes||'—'}</td><td className="table-actions" data-label="Ações"><div className="row-actions"><button className="icon-button" title="Editar" onClick={()=>setEditing({...cost})}><Icon name="edit"/></button><button className="icon-button danger" title="Excluir" onClick={()=>{if(confirm('Excluir este custo?')){setCosts(costs.filter(item=>item.id!==cost.id));notify('Custo excluído.')}}}><Icon name="trash"/></button></div></td></tr>)}</tbody></table></div>:<Empty title="Nenhum custo cadastrado" text="Adicione aluguel, combustível, internet, ferramentas, veículo e outros custos para calcular sua base por hora." action="Adicionar primeiro custo" onAction={()=>setEditing({...empty})}/>}
    <Modal open={Boolean(editing)} title={editing?.id?'Editar custo':'Novo custo'} onClose={()=>setEditing(null)} actions={<><button className="button button--ghost" onClick={()=>setEditing(null)}>Cancelar</button><button className="button button--primary" onClick={saveCost}><Icon name="save"/> Salvar custo</button></>}>
      {editing&&<div className="form-grid"><div className="span-2"><VoiceField label="Nome do custo" value={editing.name} onChange={value=>setEditing({...editing,name:value})} placeholder="Ex.: Combustível, aluguel, internet, ferramentas..."/></div><VoiceField label="Categoria" value={editing.category} onChange={value=>setEditing({...editing,category:value})} placeholder="Ex.: Transporte, fixo, ferramenta..."/><label className="field"><span>Valor mensal equivalente</span><input type="number" min="0" step="0.01" value={editing.monthlyAmount} onChange={e=>setEditing({...editing,monthlyAmount:Number(e.target.value)})}/><small className="field-hint">Se for um custo anual, divida por 12 antes de informar.</small></label><div className="span-2"><VoiceField multiline label="Observações" value={editing.notes} onChange={value=>setEditing({...editing,notes:value})} placeholder="Opcional. Ex.: média mensal dos últimos 3 meses."/></div></div>}
    </Modal>
  </section>
}


