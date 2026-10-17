import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default {
  plugins: [react()],
  // PDF-файлы должны отдаваться как отдельные файлы, а не base64-строками
  // (иначе <iframe> с PDF не откроется в Firefox)
  assetsInlineLimit: 0,
  server: {
    host: true, // слушаем все интерфейсы, чтобы фронт был доступен по локальной сети
    allowedHosts: ['abundantly-dazzled-gazelle.cloudpub.ru'],
  }
};