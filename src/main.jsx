import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../SmileOS-merged.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
