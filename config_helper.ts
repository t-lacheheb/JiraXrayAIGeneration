import fs from 'fs'
import path from 'path'

export type AppConfig = {
  jira: {
    baseUrl: string
    projectKeyDefault: string
    credentials?: {
      username?: string
      password?: string
    }
  }
  ai: {
    provider: 'ollama' | 'openai'
    baseUrl: string
    model: string
  }
}

export function loadConfig(): AppConfig {
  const p = path.join(process.cwd(), 'config.json')
  try {
    const raw = fs.readFileSync(p, 'utf-8')
    const cfg = JSON.parse(raw)
    return {
      jira: {
        baseUrl: cfg.jira?.baseUrl || 'https://opm.ooredoo.dz',
        projectKeyDefault: cfg.jira?.projectKeyDefault || 'XTP',
        credentials: cfg.jira?.credentials
      },
      ai: {
        provider: cfg.ai?.provider === 'openai' ? 'openai' : 'ollama',
        baseUrl: cfg.ai?.baseUrl || 'http://localhost:11434',
        model: cfg.ai?.model || 'llama3.1:8b'
      }
    }
  } catch {
    return {
      jira: { baseUrl: 'https://opm.ooredoo.dz', projectKeyDefault: 'XTP' },
      ai: { provider: 'ollama', baseUrl: 'http://localhost:11434', model: 'llama3.1:8b' }
    }
  }
}
