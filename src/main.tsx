import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/main.css'
import { HeroUIProvider, ToastProvider } from '@heroui/react'
import App from '@/App'
import MyRouter from '@/router/MyRouter'

const root = document.getElementById('root')!

const app = (
  <HeroUIProvider>
    <ToastProvider placement="top-center" toastOffset={68} />
    <MyRouter>
      <App />
    </MyRouter>
  </HeroUIProvider>
)

createRoot(root).render(import.meta.env.DEVELOPMENT ? <StrictMode>{app}</StrictMode> : app)
