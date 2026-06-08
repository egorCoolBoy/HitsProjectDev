import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import './styles/globals.css'
import './styles/index.css'
import App from './app/App.tsx'

createRoot(document.getElementById('root')!).render(
  <App />,
)
