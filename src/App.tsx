import { lazy, Suspense, useEffect, useState } from 'react'
import { Layout, type Page } from './components/Layout'
import { Icon } from './components/Icon'
import { AppLoadingScreen, AuthScreen, BackendSetupScreen } from './components/AuthScreen'
import { PremiumProvider } from './components/PremiumAccess'
import { store, userCache } from './lib/storage'
import { appEnv, firebaseConfigured, supabaseConfigured, usingAnonymousAuthentication, usingFirebaseBackend } from './lib/env'
import { logout, observeAuth } from './lib/auth'
import { loadCloudData, saveCloudSettings, syncEntityList } from './lib/cloudStore'
import { observeEntitlement } from './lib/entitlements'
import { storeLegacyDataUrlLogo } from './lib/logoStorage'
import { usePwaInstall } from './lib/pwa'
import type { AccountEntitlement, CatalogItem, Client, CostEntry, Quote, Receipt, SessionUser, Settings, WorkOrder } from './types'

const DashboardPage = lazy(() => import('./screens/Dashboard'))
const ClientsPage = lazy(() => import('./screens/ClientsPage'))
const QuotesPage = lazy(() => import('./screens/QuotesPage'))
const QuoteEditorPage = lazy(() => import('./screens/QuoteEditorPage'))
const CatalogPage = lazy(() => import('./screens/CatalogPage'))
const CostsPage = lazy(() => import('./screens/CostsPage'))
const WorkOrdersPage = lazy(() => import('./screens/WorkOrdersPage'))
const ReceiptsPage = lazy(() => import('./screens/ReceiptsPage'))
const SettingsPage = lazy(() => import('./screens/SettingsPage'))

function RouteLoading() {
  return <section className="panel route-loading" role="status" aria-live="polite"><div className="route-loading__mark"><Icon name="quote" size={22}/></div><div><strong>Carregando tela...</strong><span>Preparando o MESTRE para você.</span></div></section>
}

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [clients, setClientsState] = useState<Client[]>(store.clients.get())
  const [services, setServicesState] = useState<CatalogItem[]>(store.services.get())
  const [materials, setMaterialsState] = useState<CatalogItem[]>(store.materials.get())
  const [costs, setCostsState] = useState<CostEntry[]>(store.costs.get())
  const [quotes, setQuotesState] = useState<Quote[]>(store.quotes.get())
  const [workOrders, setWorkOrdersState] = useState<WorkOrder[]>(store.workOrders.get())
  const [receipts, setReceiptsState] = useState<Receipt[]>(store.receipts.get())
  const [settings, setSettingsState] = useState<Settings>(store.settings.get())
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [authReady, setAuthReady] = useState(!usingFirebaseBackend)
  const [authError, setAuthError] = useState('')
  const [dataReady, setDataReady] = useState(!usingFirebaseBackend)
  const [startupMessage, setStartupMessage] = useState('Carregando seus dados...')
  const [entitlement, setEntitlement] = useState<AccountEntitlement>({ uid: 'local', plan: usingFirebaseBackend ? 'free' : appEnv.previewPlan, source: usingFirebaseBackend ? 'default' : 'local' })
  const pwa = usePwaInstall()

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3000)
  }

  const reportSyncError = (error: unknown) => {
    console.error(error)
    notify('Alteração salva neste dispositivo, mas ainda não sincronizou com o Firebase.')
  }

  useEffect(() => {
    if (!usingFirebaseBackend) return
    let active = true
    let loadSequence = 0

    const unsubscribe = observeAuth((user) => {
      if (!active) return
      loadSequence += 1
      const sequence = loadSequence
      setAuthReady(true)
      setAuthError('')
      setSessionUser(user)
      setActiveQuoteId(null)
      setPage('dashboard')

      if (!user) {
        setDataReady(false)
        setEntitlement({ uid: 'anonymous', plan: 'free', source: 'default' })
        return
      }

      // Nunca reaproveita temporariamente o plano da conta anterior enquanto
      // o entitlement da conta atual ainda está sendo carregado.
      setEntitlement({ uid: user.uid, plan: 'free', source: 'loading' })
      setDataReady(false)
      setStartupMessage('Sincronizando seus dados com o Firebase...')
      void loadCloudData(user).then(async ({ data, migratedLegacy, usedCache }) => {
        if (!active || sequence !== loadSequence) return
        let nextData = data

        if (data.settings.professionalLogo.startsWith('data:image/')) {
          try {
            const storedLogo = await storeLegacyDataUrlLogo(user.uid, data.settings.professionalLogo)
            const migratedSettings = { ...data.settings, professionalLogo: storedLogo.url, professionalLogoPath: storedLogo.path }
            await saveCloudSettings(user.uid, migratedSettings)
            nextData = { ...data, settings: migratedSettings }
            userCache(user.uid).setSnapshot(nextData)
          } catch (logoError) {
            console.error(logoError)
            const cleanSettings = { ...data.settings, professionalLogo: '', professionalLogoPath: '' }
            nextData = { ...data, settings: cleanSettings }
            userCache(user.uid).setSnapshot(nextData)
            notify('Os dados foram migrados, mas reenvie sua logo em Configurações.')
          }
        }

        if (!active || sequence !== loadSequence) return
        setClientsState(nextData.clients)
        setServicesState(nextData.services)
        setMaterialsState(nextData.materials)
        setCostsState(nextData.costs)
        setQuotesState(nextData.quotes)
        setWorkOrdersState(nextData.workOrders)
        setReceiptsState(nextData.receipts)
        setSettingsState(nextData.settings)
        setDataReady(true)
        if (migratedLegacy) notify('Seus dados locais foram migrados para a sua conta Firebase.')
        else if (usedCache) notify('Sem conexão com o Firebase. Usando a cópia local desta conta.')
      }).catch((error) => {
        console.error(error)
        if (!active || sequence !== loadSequence) return
        setStartupMessage('Não foi possível carregar os dados. Verifique o Firebase e tente novamente.')
      })
    }, (error) => {
      console.error(error)
      if (!active) return
      setAuthReady(true)
      setAuthError('Nao foi possivel conectar ao Firebase. Verifique a configuracao do projeto e recarregue a pagina.')
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!usingFirebaseBackend || !sessionUser) return
    return observeEntitlement(
      sessionUser.uid,
      setEntitlement,
      (error) => console.error('Não foi possível acompanhar o plano da conta.', error),
    )
  }, [sessionUser?.uid])

  const saveClients = (value: Client[]) => {
    if (usingFirebaseBackend && sessionUser) {
      const previous = clients
      userCache(sessionUser.uid).clients.set(value)
      setClientsState(value)
      void syncEntityList(sessionUser.uid, 'clients', previous, value).catch(reportSyncError)
      return
    }
    store.clients.set(value)
    setClientsState(value)
  }

  const saveServices = (value: CatalogItem[]) => {
    if (usingFirebaseBackend && sessionUser) {
      const previous = services
      userCache(sessionUser.uid).services.set(value)
      setServicesState(value)
      void syncEntityList(sessionUser.uid, 'services', previous, value).catch(reportSyncError)
      return
    }
    store.services.set(value)
    setServicesState(value)
  }

  const saveMaterials = (value: CatalogItem[]) => {
    if (usingFirebaseBackend && sessionUser) {
      const previous = materials
      userCache(sessionUser.uid).materials.set(value)
      setMaterialsState(value)
      void syncEntityList(sessionUser.uid, 'materials', previous, value).catch(reportSyncError)
      return
    }
    store.materials.set(value)
    setMaterialsState(value)
  }

  const saveCosts = (value: CostEntry[]) => {
    if (usingFirebaseBackend && sessionUser) {
      const previous = costs
      userCache(sessionUser.uid).costs.set(value)
      setCostsState(value)
      void syncEntityList(sessionUser.uid, 'costs', previous, value).catch(reportSyncError)
      return
    }
    store.costs.set(value)
    setCostsState(value)
  }

  const saveQuotes = (value: Quote[]) => {
    if (usingFirebaseBackend && sessionUser) {
      const previous = quotes
      userCache(sessionUser.uid).quotes.set(value)
      setQuotesState(value)
      void syncEntityList(sessionUser.uid, 'quotes', previous, value).catch(reportSyncError)
      return
    }
    store.quotes.set(value)
    setQuotesState(value)
  }

  const saveWorkOrders = (value: WorkOrder[]) => {
    if (usingFirebaseBackend && sessionUser) {
      const previous = workOrders
      userCache(sessionUser.uid).workOrders.set(value)
      setWorkOrdersState(value)
      void syncEntityList(sessionUser.uid, 'workOrders', previous, value).catch(reportSyncError)
      return
    }
    store.workOrders.set(value)
    setWorkOrdersState(value)
  }

  const saveReceipts = (value: Receipt[]) => {
    if (usingFirebaseBackend && sessionUser) {
      const previous = receipts
      userCache(sessionUser.uid).receipts.set(value)
      setReceiptsState(value)
      void syncEntityList(sessionUser.uid, 'receipts', previous, value).catch(reportSyncError)
      return
    }
    store.receipts.set(value)
    setReceiptsState(value)
  }

  const saveSettings = (value: Settings) => {
    if (usingFirebaseBackend && sessionUser) {
      userCache(sessionUser.uid).settings.set(value)
      setSettingsState(value)
      void saveCloudSettings(sessionUser.uid, value).catch(reportSyncError)
      return
    }
    store.settings.set(value)
    setSettingsState(value)
  }

  useEffect(() => {
    document.documentElement.dataset.theme = 'dark'
    document.documentElement.style.colorScheme = 'dark'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#07101f')
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error(error)
      notify('Não foi possível encerrar a sessão.')
    }
  }


  const handleInstallPwa = async () => {
    try {
      const result = await pwa.install()
      if (result === 'accepted') notify('Instalação do MESTRE iniciada.')
      else if (result === 'dismissed') notify('Instalação cancelada. Você pode tentar novamente quando quiser.')
      else if (pwa.ios) notify('No iPhone/iPad: Compartilhar → Adicionar à Tela de Início.')
      else notify('Use a opção “Instalar app” do menu do navegador quando ela estiver disponível.')
    } catch (error) {
      console.error(error)
      notify('Não foi possível iniciar a instalação do aplicativo.')
    }
  }

  if (appEnv.loginEnabled && appEnv.backendMode === 'firebase' && (!firebaseConfigured || !supabaseConfigured)) return <BackendSetupScreen firebaseConfigured={firebaseConfigured} supabaseConfigured={supabaseConfigured} />
  if (usingFirebaseBackend && !authReady) return <AppLoadingScreen message="Conectando ao Firebase..." />
  if (usingAnonymousAuthentication && !sessionUser) return <AppLoadingScreen message={authError || 'Conectando aos seus dados...'} />
  if (usingFirebaseBackend && !sessionUser) return <AuthScreen />
  if (usingFirebaseBackend && !dataReady) return <AppLoadingScreen message={startupMessage} />

  const openQuote = (id?: string) => { setActiveQuoteId(id ?? null); setPage('quote') }
  const openNewQuote = () => openQuote()
  const backToQuotes = () => setPage('quotes')

  const titleMap: Record<Page, string> = {
    dashboard: 'Dashboard', clients: 'Clientes', quotes: 'Orçamentos', quote: activeQuoteId ? 'Editar orçamento' : 'Novo orçamento',
    workOrders: 'Ordens de serviço', receipts: 'Recibos', costs: 'Custos', services: 'Serviços', materials: 'Materiais', settings: 'Configurações',
  }

  return <PremiumProvider entitlement={entitlement}>
    <Layout page={page} setPage={setPage} title={titleMap[page]} subtitle={page === 'dashboard' ? 'Visão geral do seu negócio' : undefined}
      professionalName={settings.professionalName} userEmail={sessionUser?.email}
      onLogout={usingFirebaseBackend && !usingAnonymousAuthentication ? handleLogout : undefined} backendLabel={usingFirebaseBackend ? 'Firebase + Supabase' : appEnv.loginEnabled ? 'Modo local' : 'Prévia local'} plan={entitlement.plan}
      installAvailable={pwa.installAvailable} onInstall={handleInstallPwa} adPreview={!usingFirebaseBackend && appEnv.ads.bannerPreview}
      actions={page !== 'quote' ? <button className="button button--primary top-action" onClick={() => openQuote()}><Icon name="plus" size={17}/> Novo orçamento</button> : undefined}>
      <Suspense fallback={<RouteLoading />}>
        {page === 'dashboard' && <DashboardPage quotes={quotes} clients={clients} onNew={openNewQuote} onOpen={openQuote} />}
        {page === 'clients' && <ClientsPage clients={clients} setClients={saveClients} notify={notify} />}
        {page === 'quotes' && <QuotesPage quotes={quotes} clients={clients} setQuotes={saveQuotes} onOpen={openQuote} onNew={openNewQuote} notify={notify} ownerId={sessionUser?.uid} />}
        {page === 'quote' && <QuoteEditorPage key={activeQuoteId ?? 'new'} quoteId={activeQuoteId} clients={clients} services={services} materials={materials} costs={costs} quotes={quotes} setQuotes={saveQuotes} settings={settings} notify={notify} onDone={backToQuotes} ownerId={sessionUser?.uid} />}
        {page === 'workOrders' && <WorkOrdersPage workOrders={workOrders} setWorkOrders={saveWorkOrders} quotes={quotes} clients={clients} settings={settings} notify={notify} ownerId={sessionUser?.uid} />}
        {page === 'receipts' && <ReceiptsPage receipts={receipts} setReceipts={saveReceipts} quotes={quotes} clients={clients} settings={settings} notify={notify} ownerId={sessionUser?.uid} />}
        {page === 'costs' && <CostsPage costs={costs} setCosts={saveCosts} settings={settings} setSettings={saveSettings} notify={notify} />}
        {page === 'services' && <CatalogPage kind="service" title="Serviços" items={services} setItems={saveServices} notify={notify} />}
        {page === 'materials' && <CatalogPage kind="material" title="Materiais" items={materials} setItems={saveMaterials} notify={notify} />}
        {page === 'settings' && <SettingsPage settings={settings} setSettings={saveSettings} notify={notify} ownerId={sessionUser?.uid ?? 'local'} entitlement={entitlement} pwaInstallAvailable={pwa.installAvailable} pwaInstalled={pwa.installed} pwaIos={pwa.ios} onInstallPwa={handleInstallPwa} />}
      </Suspense>
    </Layout>
    {toast && <div className="toast"><Icon name="check" size={17}/>{toast}</div>}
  </PremiumProvider>
}

