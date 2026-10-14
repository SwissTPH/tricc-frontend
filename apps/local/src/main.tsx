import '@xyflow/react/dist/style.css'
import '@tricc/editor/styles.css'
import './app.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { App } from './App.js'
import { createLocalRuntime } from './adapters.js'

const local = createLocalRuntime()

// Static hosts without a fallback route (GitHub Pages) cannot serve `/project/…` on reload,
// so that build keeps the route in the hash instead.
const Router = import.meta.env.VITE_HASH_ROUTER === 'true' ? HashRouter : BrowserRouter

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Router basename={Router === BrowserRouter ? import.meta.env.BASE_URL : undefined}>
      <App local={local} />
    </Router>
  </StrictMode>,
)
