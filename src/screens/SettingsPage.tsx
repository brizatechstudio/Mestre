import { useState } from 'react'
import { Icon } from '../components/Icon'
import { VoiceField } from '../components/VoiceField'
import type { AccountEntitlement, Settings } from '../types'
import { logoProviderLabel, processLogoFile, removeProfessionalLogo, storeProfessionalLogo } from '../lib/logoStorage'

export default function SettingsPage({settings,setSettings,notify,ownerId,entitlement,pwaInstallAvailable,pwaInstalled,pwaIos,onInstallPwa}:{settings:Settings;setSettings:(s:Settings)=>void;notify:(m:string)=>void;ownerId:string;entitlement:AccountEntitlement;pwaInstallAvailable:boolean;pwaInstalled:boolean;pwaIos:boolean;onInstallPwa:()=>void}){
  const [draft,setDraft]=useState(settings)
  const [uploadingLogo,setUploadingLogo]=useState(false)

  const save=()=>{
    try{
      setSettings(draft)
      notify('Configurações salvas. A identidade será usada no próximo PDF.')
    }catch(error){
      console.error(error)
      notify('Não foi possível salvar as configurações.')
    }
  }

  const chooseLogo=async(file?:File)=>{
    if(!file)return
    setUploadingLogo(true)
    try{
      const processed=await processLogoFile(file)
      const stored=await storeProfessionalLogo(ownerId,processed,draft.professionalLogoPath)
      setDraft(current=>({...current,professionalLogo:stored.url,professionalLogoPath:stored.path}))
      notify(`Logo enviada para ${logoProviderLabel()}. Salve as configurações.`)
    }catch(error){
      console.error(error)
      notify(error instanceof Error?error.message:'Não foi possível enviar a logo.')
    }finally{
      setUploadingLogo(false)
    }
  }

  const removeLogo=async()=>{
    setUploadingLogo(true)
    try{
      await removeProfessionalLogo(ownerId,draft.professionalLogoPath)
      setDraft(current=>({...current,professionalLogo:'',professionalLogoPath:''}))
      notify('Logo removida. Salve as configurações.')
    }catch(error){
      console.error(error)
      notify('Não foi possível remover a logo do armazenamento.')
    }finally{
      setUploadingLogo(false)
    }
  }

  return <section className="panel settings-panel">
    <div className="section-heading"><div><h2>Dados profissionais</h2><p>Esses dados e sua logo aparecem no PDF do orçamento.</p></div><button className="button button--primary" onClick={save}><Icon name="save"/> Salvar alterações</button></div>
    <div className="settings-brand"><img src="/mestre-logo-dark.png" alt="MESTRE"/><div><strong>Identidade MESTRE</strong><span>Identidade visual para o seu trabalho.</span></div></div>
    <div className={`plan-card plan-card--${entitlement.plan}`}><div><span className="plan-card__eyebrow">SEU PLANO</span><strong>{entitlement.plan==='pro'?'MESTRE PRO':'MESTRE GRÁTIS'}</strong><p>{entitlement.plan==='pro'?'Voz e PDF liberados sem anúncios.':'Orçamentos ilimitados. Voz e PDF podem ser liberados assistindo a um anúncio.'}</p></div><span className="plan-pill">{entitlement.plan==='pro'?'PRO':'GRÁTIS'}</span></div>
    <div className="pwa-card"><div className="pwa-card__icon"><Icon name="download" size={23}/></div><div className="pwa-card__copy"><strong>Aplicativo MESTRE no celular</strong><p>{pwaInstalled?'O MESTRE já está instalado neste dispositivo.':pwaIos?'No iPhone/iPad, use Compartilhar → Adicionar à Tela de Início. Em Android/Chrome, use o botão de instalar quando disponível.':'Instale como aplicativo para abrir pela tela inicial, com interface em tela própria e acesso rápido no celular.'}</p></div>{pwaInstalled?<span className="pwa-installed-badge"><Icon name="check" size={14}/> Instalado</span>:pwaInstallAvailable?<button type="button" className="button button--primary" onClick={onInstallPwa}><Icon name="download" size={16}/> Instalar app</button>:<button type="button" className="button button--ghost" onClick={onInstallPwa}><Icon name="download" size={16}/> Como instalar</button>}</div>
    <div className="professional-logo-card">
      <div className="professional-logo-preview">{draft.professionalLogo?<img src={draft.professionalLogo} alt="Logo do profissional"/>:<div className="professional-logo-placeholder"><Icon name="image" size={28}/><span>Sua logo</span></div>}</div>
      <div className="professional-logo-copy"><strong>Logo do profissional</strong><p>Ela será exibida no PDF e suas cores serão usadas automaticamente. Armazenamento atual: <b>{logoProviderLabel()}</b>. Use PNG, JPG ou WebP de até 5 MB.</p><div className="professional-logo-actions"><label className={`button button--ghost file-button ${uploadingLogo?'is-disabled':''}`}><Icon name="upload" size={16}/> {uploadingLogo?'Enviando...':'Escolher logo'}<input disabled={uploadingLogo} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>chooseLogo(e.target.files?.[0])}/></label>{draft.professionalLogo&&<button disabled={uploadingLogo} className="button button--soft" onClick={removeLogo}><Icon name="trash" size={16}/> Remover</button>}</div></div>
    </div>
    <div className="form-grid"><VoiceField label="Seu nome" value={draft.professionalName} onChange={v=>setDraft({...draft,professionalName:v})}/><VoiceField label="Nome do negócio" value={draft.businessName} onChange={v=>setDraft({...draft,businessName:v})}/><VoiceField label="Telefone" value={draft.phone} onChange={v=>setDraft({...draft,phone:v})}/><VoiceField label="E-mail" value={draft.email} onChange={v=>setDraft({...draft,email:v})}/><VoiceField label="CPF/CNPJ" value={draft.document} onChange={v=>setDraft({...draft,document:v})}/><VoiceField label="Chave PIX" value={draft.pixKey} onChange={v=>setDraft({...draft,pixKey:v})}/><label className="field"><span>Validade padrão</span><div className="suffix-input"><input type="number" min="1" value={draft.defaultValidityDays} onChange={e=>setDraft({...draft,defaultValidityDays:Number(e.target.value)})}/><span>dias</span></div></label><VoiceField label="Pagamento padrão" value={draft.defaultPaymentTerms} onChange={v=>setDraft({...draft,defaultPaymentTerms:v})}/><div className="field percentage-setting"><span>Margem de lucro padrão</span><div className="suffix-input"><input type="number" min="0" step="0.1" value={draft.defaultProfitMarginPercent} onChange={e=>setDraft({...draft,defaultProfitMarginPercent:Math.max(0,Number(e.target.value))})}/><span>%</span></div><label className="pdf-default-toggle"><input type="checkbox" checked={draft.defaultShowProfitMarginInPdf!==false} onChange={e=>setDraft({...draft,defaultShowProfitMarginInPdf:e.target.checked})}/><span>Mostrar margem por padrão no PDF</span></label><small className="field-hint">O cálculo sempre é aplicado, mesmo quando a linha fica oculta no PDF.</small></div><div className="field percentage-setting"><span>Imposto padrão</span><div className="suffix-input"><input type="number" min="0" step="0.1" value={draft.defaultTaxPercent} onChange={e=>setDraft({...draft,defaultTaxPercent:Math.max(0,Number(e.target.value))})}/><span>%</span></div><label className="pdf-default-toggle"><input type="checkbox" checked={draft.defaultShowTaxInPdf!==false} onChange={e=>setDraft({...draft,defaultShowTaxInPdf:e.target.checked})}/><span>Mostrar imposto por padrão no PDF</span></label><small className="field-hint">O cálculo sempre é aplicado, mesmo quando a linha fica oculta no PDF.</small></div><label className="field"><span>Horas produtivas por mês</span><div className="suffix-input"><input type="number" min="1" step="1" value={draft.productiveHoursPerMonth||160} onChange={e=>setDraft({...draft,productiveHoursPerMonth:Math.max(1,Number(e.target.value))})}/><span>h</span></div><small className="field-hint">Usadas na tabela de Custos para calcular sua base operacional por hora.</small></label></div>
  </section>
}


