import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./index.css";
import "katex/dist/katex.min.css";
import App from './App.tsx'
import { Toaster } from 'sonner'
import { setUnauthorizedHandler } from './lib/api'
import { useAuthStore } from './store/useAuthStore'

setUnauthorizedHandler(() => useAuthStore.getState().logout());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="bottom-center" richColors />
  </StrictMode>,
)
