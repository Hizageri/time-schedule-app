import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // process の深い階層までダミーを作るべ！
    'process.env': {},
    'process.version': JSON.stringify('v18.0.0'),
    'process.stdout': JSON.stringify({ isTTY: false }),
    'process.stderr': JSON.stringify({ isTTY: false }),
  },
})