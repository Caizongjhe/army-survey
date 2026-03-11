import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // ⚠️ 如果你的專案名稱叫 my-survey，這裡就要改成 '/my-survey/'
  base: '/army-survey/', 
})
