import { useState, type FormEvent } from 'react'
import { loginWithEmail, registerWithEmail, requestPasswordReset } from '../lib/auth'
import { Icon } from './Icon'

type Mode = 'login' | 'register'

function authMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : ''
  if (code.includes('invalid-credential')) return 'E-mail ou senha inválidos.'
  if (code.includes('email-already-in-use')) return 'Este e-mail já possui uma conta.'
  if (code.includes('weak-password')) return 'Use uma senha com pelo menos 6 caracteres.'
  if (code.includes('invalid-email')) return 'Informe um e-mail válido.'
  if (code.includes('too-many-requests')) return 'Muitas tentativas. Aguarde um pouco e tente novamente.'
  if (code.includes('network-request-failed')) return 'Falha de conexão. Verifique sua internet.'
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.'
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    if (!email.trim() || !password) return setMessage('Preencha e-mail e senha.')
    if (mode === 'register' && !name.trim()) return setMessage('Informe seu nome.')

    setBusy(true)
    try {
      if (mode === 'register') await registerWithEmail(name, email, password)
      else await loginWithEmail(email, password)
    } catch (error) {
      setMessage(authMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    if (!email.trim()) return setMessage('Digite seu e-mail para recuperar a senha.')
    setBusy(true)
    setMessage('')
    try {
      await requestPasswordReset(email)
      setMessage('Enviamos o link de recuperação para seu e-mail.')
    } catch (error) {
      setMessage(authMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-page">
    <section className="auth-shell">
      <div className="auth-brand">
        <img src="/mestre-logo-dark.png" alt="MESTRE" />
        <span>Orçamentos profissionais para autônomos</span>
      </div>
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-card__heading">
          <span className="auth-lock"><Icon name="clients" size={18}/></span>
          <div><h1>{mode === 'login' ? 'Entrar no MESTRE' : 'Criar sua conta'}</h1><p>{mode === 'login' ? 'Acesse seus clientes, serviços e orçamentos.' : 'Seus dados ficarão separados e protegidos pela sua conta.'}</p></div>
        </div>
        {mode === 'register' && <label className="field"><span>Seu nome</span><input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome"/></label>}
        <label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com"/></label>
        <label className="field"><span>Senha</span><input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label>
        {message && <div className="auth-message">{message}</div>}
        <button className="button button--primary button--full button--large" disabled={busy}>{busy ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
        {mode === 'login' && <button type="button" className="auth-link" onClick={reset} disabled={busy}>Esqueci minha senha</button>}
        <div className="auth-divider"><span>ou</span></div>
        <button type="button" className="button button--ghost button--full" onClick={()=>{setMode(mode === 'login' ? 'register' : 'login');setMessage('')}}>{mode === 'login' ? 'Criar uma conta' : 'Já tenho uma conta'}</button>
      </form>
      <small className="auth-footer">Firebase Authentication + Firestore · imagens no Supabase</small>
    </section>
  </main>
}

export function BackendSetupScreen({ firebaseConfigured, supabaseConfigured }: { firebaseConfigured: boolean; supabaseConfigured: boolean }) {
  const missing = [
    !firebaseConfigured ? 'Firebase Authentication / Firestore' : '',
    !supabaseConfigured ? 'Supabase Storage' : '',
  ].filter(Boolean).join(' e ')

  return <main className="auth-page"><section className="auth-shell"><div className="auth-brand"><img src="/mestre-logo-dark.png" alt="MESTRE"/><span>Configuração do backend gratuito</span></div><div className="auth-card"><div className="auth-card__heading"><span className="auth-lock"><Icon name="settings"/></span><div><h1>Configuração incompleta</h1><p>Falta configurar <b>{missing}</b>. Copie <b>.env.example</b> para <b>.env</b> e preencha as credenciais indicadas.</p></div></div><div className="auth-message auth-message--info">O MESTRE não usa Firebase Storage nem Cloud Functions. As imagens ficam no Supabase Storage. Depois de preencher o .env, reinicie <b>npm run dev</b>.</div></div></section></main>
}

export function AppLoadingScreen({ message = 'Carregando seus dados...' }: { message?: string }) {
  return <main className="auth-page"><section className="loading-card"><img src="/mestre-logo-dark.png" alt="MESTRE"/><div className="loading-spinner"/><p>{message}</p></section></main>
}
