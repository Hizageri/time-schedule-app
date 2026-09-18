import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load environment variables using Vite's loadEnv
  const env = loadEnv(mode || 'development', process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [
      react(),
      {
        name: 'local-api-handler',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith('/api/')) {
              return next()
            }

            // Ensure env vars are injected on every API request in dev mode
            const currentEnv = loadEnv(server.config.mode || mode || 'development', process.cwd(), '')
            Object.assign(process.env, currentEnv)

            const apiName = req.url.replace('/api/', '').split('?')[0]
            const apiFilePath = path.resolve(process.cwd(), `api/${apiName}.ts`)

            if (!fs.existsSync(apiFilePath)) {
              return next()
            }

            try {
              // Parse JSON body for POST/PUT requests
              let body = {}
              if (req.method === 'POST' || req.method === 'PUT') {
                const buffers: Buffer[] = []
                for await (const chunk of req) {
                  buffers.push(chunk)
                }
                const dataStr = Buffer.concat(buffers).toString('utf-8')
                if (dataStr) {
                  try {
                    body = JSON.parse(dataStr)
                  } catch {
                    body = {}
                  }
                }
              }

              // Express/Vercel-like mock req and res
              const mockReq = Object.assign(req, { body })
              const mockRes = Object.assign(res, {
                status(code: number) {
                  res.statusCode = code
                  return mockRes
                },
                json(data: any) {
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify(data))
                  return mockRes
                }
              })

              // Dynamically load and execute the TypeScript API module
              const module = await server.ssrLoadModule(`/api/${apiName}.ts`)
              const handler = module.default
              await handler(mockReq, mockRes)

            } catch (err: any) {
              console.error(`[API Dev Error] Failed to handle /api/${apiName}:`, err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }))
            }
          })
        }
      }
    ],
    define: {
      'process.version': JSON.stringify('v18.0.0'),
      'process.stdout': JSON.stringify({ isTTY: false }),
      'process.stderr': JSON.stringify({ isTTY: false }),
    },
  }
})