import '@ant-design/v5-patch-for-react-19';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Ant Design v5不需要显式导入CSS
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
