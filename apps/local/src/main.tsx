import '@xyflow/react/dist/style.css'
import '@tricc/editor/styles.css'
import './app.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.js'
import { createLocalRuntime } from './adapters.js'

const local = createLocalRuntime()

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <App local={local} />
    </BrowserRouter>
  </StrictMode>,
)
