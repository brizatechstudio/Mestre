import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { registerPwaServiceWorker } from './lib/pwa'

registerPwaServiceWorker()

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
