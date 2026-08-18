import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { MicButton } from '../components/MicButton'
import { VoiceField } from '../components/VoiceField'
import { usePremiumAccess } from '../components/PremiumAccess'
import type { CatalogItem, Client, CostEntry, Quote, QuoteItem, QuotePhoto, QuoteStatus, Settings, Unit } from '../types'
import { costSummary, money, nextQuoteNumber, quoteTotal, shortDate, uid } from '../lib/utils'
import { usingFirebaseBackend } from '../lib/env'
import { reserveQuoteNumber } from '../lib/cloudStore'
import { MAX_QUOTE_PHOTOS, getQuotePhotoPreviewUrl, processQuotePhotoFile, quotePhotoProviderLabel, removeQuotePhoto, resolveQuotePhotoDataUrls, storeQuotePhoto } from '../lib/quotePhotoStorage'
import { Status } from './shared'

const units: Unit[] = ['un', 'h', 'dia', 'm', 'm²', 'm³', 'kg', 'l', 'pct']
const statuses: QuoteStatus[] = ['Rascunho', 'Enviado', 'Aguardando aprovação', 'Aprovado', 'Recusado', 'Concluído']

export default function QuoteEditor({ quoteId, clients, services, materials, costs, quotes, setQuotes, settings, notify, onDone, ownerId }: { quoteId:string|null; clients:Client[]; services:CatalogItem[]; materials:CatalogItem[]; costs:CostEntry[]; quotes:Quote[]; setQuotes:(v:Quote[])=>void; settings:Settings; notify:(m:string)=>void; onDone:()=>void; ownerId?:string }) {
  const { isPro, requestAccess } = usePremiumAccess()
  const existing=quoteId?quotes.find(q=>q.id===quoteId):undefined
  const [quote,setQuote]=useState<Quote>(()=>existing?{...structuredClone(existing),photos:structuredClone(existing.photos??[]),profitMarginPercent:existing.profitMarginPercent??settings.defaultProfitMarginPercent,taxPercent:existing.taxPercent??settings.defaultTaxPercent,showProfitMarginInPdf:existing.showProfitMarginInPdf??settings.defaultShowProfitMarginInPdf??true,showTaxInPdf:existing.showTaxInPdf??settings.defaultShowTaxInPdf??true}:{
    id:uid('orc'),number:usingFirebaseBackend&&ownerId?'ORC-...':nextQuoteNumber(quotes.map(item=>item.number)),clientId:'',services:[],materials:[],photos:[],discount:0,profitMarginPercent:settings.defaultProfitMarginPercent,taxPercent:settings.defaultTaxPercent,showProfitMarginInPdf:settings.defaultShowProfitMarginInPdf??true,showTaxInPdf:settings.defaultShowTaxInPdf??true,observations:'',validityDays:settings.defaultValidityDays,paymentTerms:settings.defaultPaymentTerms,status:'Rascunho',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
  })
  const [numberReady,setNumberReady]=useState(Boolean(existing)||!usingFirebaseBackend||!ownerId)
  const [uploadingPhotos,setUploadingPhotos]=useState(false)
  const [removingPhotoId,setRemovingPhotoId]=useState<string|null>(null)
  const [generatingPdf,setGeneratingPdf]=useState(false)
  const [photoUrls,setPhotoUrls]=useState<Record<string,string>>(()=>Object.fromEntries((existing?.photos??[]).flatMap(photo=>photo.localDataUrl?[[photo.id,photo.localDataUrl]]:[])))

  useEffect(()=>{
    if(quoteId||!usingFirebaseBackend||!ownerId)return
    let active=true
    void reserveQuoteNumber(ownerId).then(number=>{if(active){setQuote(current=>({...current,number}));setNumberReady(true)}}).catch(error=>{console.error(error);notify('Não foi possível reservar o número do orçamento.')})
    return()=>{active=false}
  },[quoteId,ownerId])

  const photoSignature=(quote.photos??[]).map(photo=>`${photo.id}:${photo.path}:${Boolean(photo.localDataUrl)}`).join('|')
  useEffect(()=>{
    let active=true
    const photos=quote.photos??[]
    photos.forEach(photo=>{
      if(photo.localDataUrl){
        setPhotoUrls(current=>current[photo.id]?current:{...current,[photo.id]:photo.localDataUrl!})
        return
      }
      if(!photo.path||!ownerId)return
      void getQuotePhotoPreviewUrl(ownerId,photo).then(url=>{
        if(active&&url)setPhotoUrls(current=>({...current,[photo.id]:url}))
      }).catch(error=>console.error('previewQuotePhoto',error))
    })
    return()=>{active=false}
  },[quote.id,ownerId,photoSignature])

  const totals=quoteTotal(quote.services,quote.materials,quote.discount,quote.taxPercent??0,quote.profitMarginPercent??0)
  const costBase=costSummary(costs,settings.productiveHoursPerMonth)
  const selectedClient=clients.find(c=>c.id===quote.clientId)
  const updateItems=(key:'services'|'materials', items:QuoteItem[])=>setQuote({...quote,[key]:items})
  const addCatalog=(key:'services'|'materials', id:string)=>{
    const source=key==='services'?services:materials; const item=source.find(x=>x.id===id); if(!item)return
    updateItems(key,[...quote[key],{id:uid('qi'),catalogId:item.id,name:item.name,description:item.description,quantity:1,unit:item.unit,unitPrice:item.price}])
  }
  const addBlank=(key:'services'|'materials')=>updateItems(key,[...quote[key],{id:uid('qi'),name:'',description:'',quantity:1,unit:'un',unitPrice:0}])
  const addLaborBase=()=>updateItems('services',[...quote.services,{id:uid('qi'),name:'Mão de obra',description:'Base calculada a partir dos custos operacionais mensais.',quantity:1,unit:'h',unitPrice:Number(costBase.hourlyBase.toFixed(2))}])
  const updateItem=(key:'services'|'materials', id:string, patch:Partial<QuoteItem>)=>updateItems(key,quote[key].map(i=>i.id===id?{...i,...patch}:i))
  const removeItem=(key:'services'|'materials', id:string)=>updateItems(key,quote[key].filter(i=>i.id!==id))

  const saveQuoteState=(source:Quote,status?:QuoteStatus,showMessage=true)=>{
    if(!numberReady){if(showMessage)notify('Aguarde a numeração do orçamento.');return source}
    const client=clients.find(c=>c.id===source.clientId)
    const final={...source,status:status??source.status,clientSnapshot:client?{...client}:source.clientSnapshot,updatedAt:new Date().toISOString()}
    setQuote(final)
    setQuotes(quotes.some(q=>q.id===final.id)?quotes.map(q=>q.id===final.id?final:q):[...quotes,final])
    if(showMessage)notify(status==='Enviado'?'Orçamento marcado como enviado.':'Orçamento salvo.')
    return final
  }

  const deliveryError=()=>{
    if(!numberReady)return 'Aguarde a numeração do orçamento ser reservada no Firebase.'
    if(!selectedClient)return 'Selecione um cliente antes de enviar ou gerar o PDF.'
    const items=[...quote.services,...quote.materials]
    if(!items.length)return 'Adicione pelo menos um serviço ou material.'
    if(items.some(item=>!item.name.trim()))return 'Preencha a descrição de todos os itens.'
    if(items.some(item=>!Number.isFinite(item.quantity)||item.quantity<=0))return 'As quantidades devem ser maiores que zero.'
    if(items.some(item=>!Number.isFinite(item.unitPrice)||item.unitPrice<0))return 'Revise os valores dos itens.'
    if(!Number.isFinite(quote.discount)||quote.discount<0)return 'O desconto não pode ser negativo.'
    if(!Number.isFinite(quote.profitMarginPercent??0)||(quote.profitMarginPercent??0)<0)return 'A margem de lucro não pode ser negativa.'
    if(!Number.isFinite(quote.taxPercent??0)||(quote.taxPercent??0)<0)return 'O imposto não pode ser negativo.'
    if(!Number.isFinite(quote.validityDays)||quote.validityDays<1)return 'A validade deve ser de pelo menos 1 dia.'
    return ''
  }

  const persist=(status?:QuoteStatus)=>saveQuoteState(quote,status,true)

  const addPhotos=async(files:File[])=>{
    if(uploadingPhotos||!files.length)return
    if(!numberReady){notify('Aguarde a numeração do orçamento antes de adicionar fotos.');return}
    const currentPhotos=quote.photos??[]
    const available=MAX_QUOTE_PHOTOS-currentPhotos.length
    if(available<=0){notify(`Você pode adicionar até ${MAX_QUOTE_PHOTOS} fotos por orçamento.`);return}
    const selected=files.slice(0,available)
    if(files.length>available)notify(`Somente ${available} foto(s) foram selecionadas porque o limite é ${MAX_QUOTE_PHOTOS}.`)

    setUploadingPhotos(true)
    let nextQuote=quote
    let nextUrls={...photoUrls}
    let added=0
    let firstError=''
    try{
      for(const file of selected){
        try{
          const photoId=uid('foto')
          const processed=await processQuotePhotoFile(file)
          const stored=await storeQuotePhoto(ownerId??'local',quote.id,photoId,processed)
          const metadata:QuotePhoto={id:photoId,path:stored.path,caption:'',createdAt:new Date().toISOString(),localDataUrl:stored.localDataUrl}
          nextQuote={...nextQuote,photos:[...(nextQuote.photos??[]),metadata]}
          nextUrls[photoId]=stored.previewUrl
          added+=1
        }catch(error){
          console.error(error)
          if(!firstError)firstError=error instanceof Error?error.message:'Não foi possível enviar uma das fotos.'
        }
      }

      if(added){
        setPhotoUrls(nextUrls)
        saveQuoteState(nextQuote,undefined,false)
        notify(`${added} ${added===1?'foto adicionada':'fotos adicionadas'} ao orçamento.`)
      }else if(firstError){
        notify(firstError)
      }
    }finally{
      setUploadingPhotos(false)
    }
  }

  const removePhoto=async(photo:QuotePhoto)=>{
    if(removingPhotoId)return
    setRemovingPhotoId(photo.id)
    try{
      await removeQuotePhoto(ownerId??'local',photo)
      const next={...quote,photos:(quote.photos??[]).filter(item=>item.id!==photo.id)}
      setPhotoUrls(current=>{const copy={...current};delete copy[photo.id];return copy})
      saveQuoteState(next,undefined,false)
      notify('Foto removida do orçamento.')
    }catch(error){
      console.error(error)
      notify(error instanceof Error?error.message:'Não foi possível remover a foto.')
    }finally{
      setRemovingPhotoId(null)
    }
  }

  const updatePhotoCaption=(photoId:string,caption:string)=>{
    setQuote(current=>({...current,photos:(current.photos??[]).map(photo=>photo.id===photoId?{...photo,caption}:photo)}))
  }

  const refreshPhoto=async(photo:QuotePhoto)=>{
    if(photo.localDataUrl){setPhotoUrls(current=>({...current,[photo.id]:photo.localDataUrl!}));return}
    if(!ownerId)return
    try{
      const url=await getQuotePhotoPreviewUrl(ownerId,photo)
      if(url)setPhotoUrls(current=>({...current,[photo.id]:url}))
    }catch(error){console.error(error)}
  }

  const share=async()=>{
    const error=deliveryError()
    if(error){notify(error);return}
    persist()
    const text=`${quote.number} — ${selectedClient?.name || 'Cliente'}\nTotal: ${money(totals.total)}\nValidade: ${quote.validityDays} dias`
    try{if(navigator.share)await navigator.share({title:`Orçamento ${quote.number}`,text});else{await navigator.clipboard.writeText(text);notify('Resumo copiado para a área de transferência.')}}catch{/* usuário cancelou */}
  }

  const generatePdf=async()=>{
    if(generatingPdf)return
    const validation=deliveryError()
    if(validation){notify(validation);return}
    const allowed=await requestAccess('pdf')
    if(!allowed)return
    setGeneratingPdf(true)
    try{
      persist()
      const photoDataUrls=await resolveQuotePhotoDataUrls(ownerId??'local',quote.photos??[])
      const { generateQuotePdf } = await import('../lib/pdf')
      await generateQuotePdf(quote,selectedClient,settings,photoDataUrls)
      notify(isPro?'PDF gerado.':'PDF liberado pelo anúncio e gerado com sucesso.')
    }catch(error){
      console.error(error)
      notify('Não foi possível gerar o PDF.')
    }finally{
      setGeneratingPdf(false)
    }
  }

  return <div className="quote-layout">
    <div className="quote-main stack-md">
      <div className="quote-top-actions"><Status status={quote.status}/><div><button disabled={!numberReady} className="button button--ghost" onClick={()=>persist()}><Icon name="save"/> Salvar</button><button disabled={!numberReady} className="button button--primary" onClick={()=>{const error=deliveryError();if(error){notify(error);return}persist('Enviado')}}><Icon name="send"/> Enviar orçamento</button></div></div>
      <section className="panel quote-section"><SectionTitle number="1" title="Informações do cliente" subtitle="Selecione um cliente já cadastrado."/>
        <div className="form-grid"><label className="field span-2"><span>Cliente</span><select value={quote.clientId} onChange={e=>setQuote({...quote,clientId:e.target.value})}><option value="">Selecione um cliente</option>{clients.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>{selectedClient&&<><div className="client-summary"><span>Telefone</span><strong>{selectedClient.phone||'—'}</strong></div><div className="client-summary"><span>E-mail</span><strong>{selectedClient.email||'—'}</strong></div><div className="client-summary span-2"><span>Endereço</span><strong>{selectedClient.address||'—'}</strong></div></>}</div>
      </section>
      <QuoteItemsSection number="2" title="Serviços" kind="services" items={quote.services} catalog={services} addCatalog={addCatalog} addBlank={addBlank} updateItem={updateItem} removeItem={removeItem} hourlyCostBase={costs.length?costBase.hourlyBase:undefined} onAddLaborBase={costs.length?addLaborBase:undefined}/>
      <QuoteItemsSection number="3" title="Materiais" kind="materials" items={quote.materials} catalog={materials} addCatalog={addCatalog} addBlank={addBlank} updateItem={updateItem} removeItem={removeItem}/>
      <QuotePhotosSection number="4" photos={quote.photos??[]} photoUrls={photoUrls} uploading={uploadingPhotos} removingPhotoId={removingPhotoId} disabled={!numberReady} onAddFiles={addPhotos} onRemove={removePhoto} onCaption={updatePhotoCaption} onRefresh={refreshPhoto}/>
      <section className="panel quote-section"><SectionTitle number="5" title="Observações e entrada por voz" subtitle="Fale sobre prazos, garantia, escopo ou qualquer detalhe da proposta."/>
        <div className="voice-notes"><div className="voice-notes__mic"><MicButton title="Ditado por voz" onText={text=>setQuote({...quote,observations:quote.observations?`${quote.observations} ${text}`:text})}/><div><strong>Adicionar descrição por voz</strong><span>Toque no microfone e transforme sua fala em texto.</span></div><div className="wave"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div><textarea value={quote.observations} onChange={e=>setQuote({...quote,observations:e.target.value})} placeholder="Observações do orçamento..." rows={5}/></div>
        <div className="form-grid form-grid--compact"><label className="field"><span>Validade da proposta</span><div className="suffix-input"><input type="number" min="1" value={quote.validityDays} onChange={e=>setQuote({...quote,validityDays:Number(e.target.value)})}/><span>dias</span></div></label><VoiceField label="Condições de pagamento" value={quote.paymentTerms} onChange={value=>setQuote({...quote,paymentTerms:value})}/></div>
      </section>
    </div>
    <aside className="quote-summary"><div className="summary-card"><h2>Resumo do orçamento</h2><div className="summary-row"><span>Subtotal serviços</span><strong>{money(totals.servicesTotal)}</strong></div><div className="summary-row"><span>Subtotal materiais</span><strong>{money(totals.materialsTotal)}</strong></div>{(quote.photos?.length??0)>0&&<div className="summary-row"><span>Fotos anexadas</span><strong>{quote.photos?.length}</strong></div>}<label className="summary-discount"><span>Desconto</span><input type="number" min="0" step="0.01" value={quote.discount} onChange={e=>setQuote({...quote,discount:Number(e.target.value)})}/></label><label className="summary-percentage"><span>Margem de lucro</span><div><input type="number" min="0" step="0.1" value={quote.profitMarginPercent??0} onChange={e=>setQuote({...quote,profitMarginPercent:Number(e.target.value)})}/><b>{money(totals.profitAmount)}</b></div><span className="pdf-visibility-toggle"><input type="checkbox" checked={quote.showProfitMarginInPdf!==false} onChange={e=>setQuote({...quote,showProfitMarginInPdf:e.target.checked})}/><span>Mostrar margem no PDF</span></span></label><label className="summary-percentage"><span>Imposto</span><div><input type="number" min="0" step="0.1" value={quote.taxPercent??0} onChange={e=>setQuote({...quote,taxPercent:Number(e.target.value)})}/><b>{money(totals.taxAmount)}</b></div><span className="pdf-visibility-toggle"><input type="checkbox" checked={quote.showTaxInPdf!==false} onChange={e=>setQuote({...quote,showTaxInPdf:e.target.checked})}/><span>Mostrar imposto no PDF</span></span></label><div className="summary-total"><span>Total geral</span><strong>{money(totals.total)}</strong></div><div className="summary-status"><Status status={quote.status}/><select value={quote.status} onChange={e=>setQuote({...quote,status:e.target.value as QuoteStatus})}>{statuses.map(status=><option key={status}>{status}</option>)}</select></div><button disabled={!numberReady||generatingPdf} className="button button--primary button--full" onClick={()=>void generatePdf()}><Icon name="download"/> {generatingPdf?'Preparando PDF...':'Gerar PDF'} {!isPro&&<span className="premium-action-tag">PRO/ANÚNCIO</span>}</button><button disabled={!numberReady} className="button button--ghost button--full" onClick={share}><Icon name="share"/> Compartilhar</button><button disabled={!numberReady} className="button button--soft button--full" onClick={()=>{persist();onDone()}}>Salvar e voltar</button></div></aside>
    <PrintQuote quote={quote} client={selectedClient} settings={settings} photoUrls={photoUrls}/>
  </div>
}

function QuotePhotosSection({number,photos,photoUrls,uploading,removingPhotoId,disabled,onAddFiles,onRemove,onCaption,onRefresh}:{number:string;photos:QuotePhoto[];photoUrls:Record<string,string>;uploading:boolean;removingPhotoId:string|null;disabled:boolean;onAddFiles:(files:File[])=>Promise<void>;onRemove:(photo:QuotePhoto)=>Promise<void>;onCaption:(photoId:string,caption:string)=>void;onRefresh:(photo:QuotePhoto)=>Promise<void>}){
  const remaining=MAX_QUOTE_PHOTOS-photos.length
  const handleFiles=(input:HTMLInputElement)=>{
    const files=Array.from(input.files??[])
    input.value=''
    void onAddFiles(files)
  }

  return <section className="panel quote-section quote-photos-section">
    <div className="quote-section__row quote-photos-heading">
      <SectionTitle number={number} title="Fotos do serviço" subtitle={`Fotografe o local ou o item que será atendido. Até ${MAX_QUOTE_PHOTOS} fotos aparecem no PDF.`}/>
      <div className="quote-photo-actions">
        <label className={`button button--primary button--small file-button ${(uploading||disabled||remaining<=0)?'is-disabled':''}`}><Icon name="image" size={16}/> {uploading?'Enviando...':'Tirar foto'}<input disabled={uploading||disabled||remaining<=0} type="file" accept="image/*" capture="environment" onChange={e=>handleFiles(e.currentTarget)}/></label>
        <label className={`button button--ghost button--small file-button ${(uploading||disabled||remaining<=0)?'is-disabled':''}`}><Icon name="upload" size={16}/> Galeria<input disabled={uploading||disabled||remaining<=0} type="file" accept="image/*" multiple onChange={e=>handleFiles(e.currentTarget)}/></label>
      </div>
    </div>
    <div className="quote-photo-note"><Icon name="cloud" size={16}/><span>{quotePhotoProviderLabel()}. As fotos do orçamento ficam privadas e o PDF recebe uma cópia somente no momento da exportação.</span><strong>{photos.length}/{MAX_QUOTE_PHOTOS}</strong></div>
    {photos.length?<div className="quote-photo-grid">{photos.map((photo,index)=><article className="quote-photo-card" key={photo.id}>
      <div className="quote-photo-image">
        {photoUrls[photo.id]?<img src={photoUrls[photo.id]} alt={photo.caption||`Foto ${index+1} do orçamento`} onError={()=>void onRefresh(photo)}/>:<div className="quote-photo-loading"><Icon name="image" size={28}/><span>Carregando foto...</span></div>}
        <span className="quote-photo-index">{index+1}</span>
        <button type="button" disabled={removingPhotoId===photo.id} className="icon-button danger quote-photo-remove" onClick={()=>void onRemove(photo)} title="Remover foto"><Icon name="trash" size={15}/></button>
      </div>
      <input className="quote-photo-caption" maxLength={120} value={photo.caption} onChange={e=>onCaption(photo.id,e.target.value)} placeholder="Legenda opcional: Ex. tomada que será substituída"/>
    </article>)}</div>:<div className="quote-photo-empty"><div><Icon name="image" size={30}/></div><strong>Nenhuma foto adicionada</strong><p>No celular, toque em <b>Tirar foto</b> para abrir a câmera. As imagens serão incluídas automaticamente no PDF.</p></div>}
  </section>
}

function SectionTitle({number,title,subtitle}:{number:string;title:string;subtitle?:string}){return <div className="quote-section__heading"><div className="step-number">{number}</div><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div></div>}

function QuoteItemsSection({number,title,kind,items,catalog,addCatalog,addBlank,updateItem,removeItem,hourlyCostBase,onAddLaborBase}:{number:string;title:string;kind:'services'|'materials';items:QuoteItem[];catalog:CatalogItem[];addCatalog:(k:'services'|'materials',id:string)=>void;addBlank:(k:'services'|'materials')=>void;updateItem:(k:'services'|'materials',id:string,p:Partial<QuoteItem>)=>void;removeItem:(k:'services'|'materials',id:string)=>void;hourlyCostBase?:number;onAddLaborBase?:()=>void}){
  const [choice,setChoice]=useState('')
  return <section className="panel quote-section"><div className="quote-section__row"><SectionTitle number={number} title={title}/><div className="add-item-controls"><select value={choice} onChange={e=>{setChoice(e.target.value);if(e.target.value){addCatalog(kind,e.target.value);setChoice('')}}}><option value="">Adicionar do cadastro...</option>{catalog.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><button className="button button--ghost button--small" onClick={()=>addBlank(kind)}><Icon name="plus" size={15}/> Manual</button></div></div>
    {kind==='services'&&typeof hourlyCostBase==='number'&&<div className="labor-cost-base"><div><Icon name="costs" size={17}/><span>Base operacional calculada pelos seus custos</span><strong>{money(hourlyCostBase)}/h</strong></div>{onAddLaborBase&&<button type="button" className="button button--soft button--small" onClick={onAddLaborBase}><Icon name="plus" size={14}/> Usar como mão de obra</button>}</div>}
    {items.length?<div className="quote-items"><div className="quote-items__head"><span>Descrição</span><span>Qtd.</span><span>Un.</span><span>Preço unit.</span><span>Total</span><span/></div>{items.map(item=><div className="quote-item" key={item.id}><div className="input-with-action"><input value={item.name} onChange={e=>updateItem(kind,item.id,{name:e.target.value})} placeholder={kind==='services'?'Descrição do serviço':'Descrição do material'}/><MicButton onText={t=>updateItem(kind,item.id,{name:t})}/></div><div className="input-with-action"><input type="number" min="0" step="0.01" value={item.quantity} onChange={e=>updateItem(kind,item.id,{quantity:Number(e.target.value)})}/><MicButton onText={t=>{const n=Number(t.replace(/[^\d,.]/g,'').replace(',','.'));if(Number.isFinite(n))updateItem(kind,item.id,{quantity:n})}}/></div><select value={item.unit} onChange={e=>updateItem(kind,item.id,{unit:e.target.value as Unit})}>{units.map(u=><option key={u}>{u}</option>)}</select><div className="input-with-action"><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e=>updateItem(kind,item.id,{unitPrice:Number(e.target.value)})}/><MicButton onText={t=>{const n=Number(t.replace(/[^\d,.]/g,'').replace(',','.'));if(Number.isFinite(n))updateItem(kind,item.id,{unitPrice:n})}}/></div><strong>{money(item.quantity*item.unitPrice)}</strong><button className="icon-button danger" onClick={()=>removeItem(kind,item.id)}><Icon name="trash"/></button></div>)}</div>:<div className="inline-empty"><p>Nenhum item adicionado.</p><button className="link-button" onClick={()=>addBlank(kind)}>+ Adicionar manualmente</button></div>}
  </section>
}


function PrintQuote({quote,client,settings,photoUrls}:{quote:Quote;client?:Client;settings:Settings;photoUrls:Record<string,string>}){
  const totals=quoteTotal(quote.services,quote.materials,quote.discount,quote.taxPercent??0,quote.profitMarginPercent??0)
  const photos=quote.photos??[]
  return <section className="print-sheet"><header><img src={settings.professionalLogo || "/mestre-logo-original.png"} className={settings.professionalLogo?"print-professional-logo":""}/><div><h1>ORÇAMENTO</h1><strong>{quote.number}</strong><span>{shortDate(quote.createdAt)}</span></div></header><div className="print-cols"><div><small>DE</small><b>{settings.businessName}</b><span>{settings.professionalName}</span><span>{settings.phone} · {settings.email}</span></div><div><small>PARA</small><b>{client?.name || 'Cliente não informado'}</b><span>{client?.phone}</span><span>{client?.email}</span><span>{client?.address}</span></div></div><PrintItems title="Serviços" items={quote.services}/><PrintItems title="Materiais" items={quote.materials}/>{photos.length>0&&<div className="print-photos"><h3>Fotos do serviço</h3><div>{photos.map((photo,index)=>photoUrls[photo.id]?<figure key={photo.id}><img src={photoUrls[photo.id]} alt={photo.caption||`Foto ${index+1}`}/>{photo.caption&&<figcaption>{photo.caption}</figcaption>}</figure>:null)}</div></div>}<div className="print-bottom"><div><h3>Observações</h3><p>{quote.observations || 'Sem observações.'}</p><p><b>Condições:</b> {quote.paymentTerms}</p><p><b>Validade:</b> {quote.validityDays} dias</p></div><div className="print-totals"><span>Serviços <b>{money(totals.servicesTotal)}</b></span><span>Materiais <b>{money(totals.materialsTotal)}</b></span><span>Desconto <b>- {money(quote.discount)}</b></span>{quote.showProfitMarginInPdf!==false&&(quote.profitMarginPercent??0)>0&&<span>Margem ({quote.profitMarginPercent}%) <b>{money(totals.profitAmount)}</b></span>}{quote.showTaxInPdf!==false&&(quote.taxPercent??0)>0&&<span>Imposto ({quote.taxPercent}%) <b>{money(totals.taxAmount)}</b></span>}<strong>Total <b>{money(totals.total)}</b></strong></div></div></section>
}
function PrintItems({title,items}:{title:string;items:QuoteItem[]}){if(!items.length)return null;return <div className="print-items"><h3>{title}</h3><table><thead><tr><th>Descrição</th><th>Qtd.</th><th>Unit.</th><th>Total</th></tr></thead><tbody>{items.map(i=><tr key={i.id}><td>{i.name}</td><td>{i.quantity} {i.unit}</td><td>{money(i.unitPrice)}</td><td>{money(i.quantity*i.unitPrice)}</td></tr>)}</tbody></table></div>}


