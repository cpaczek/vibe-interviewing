/**
 * Cloudflare Worker for vibe-interviewing session hosting.
 *
 * Handles session upload (interviewer) and download (candidate) via R2 storage.
 * Sessions auto-expire after a configurable TTL (default 24 hours).
 */

export interface Env {
  SESSIONS: R2Bucket
  SESSION_TTL_HOURS: string
  MAX_UPLOAD_SIZE_MB: string
}

interface SessionMetadata {
  scenarioName: string
  type: string
  difficulty: string
  estimatedTime: string
  briefing: string
  setupCommands: string[]
  createdAt: string
  expiresAt: string
}

/** Generate a random 6-character alphanumeric session code */
function generateSessionCode(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz'
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

/** Check if a session has expired */
function isExpired(metadata: SessionMetadata): boolean {
  return new Date(metadata.expiresAt) < new Date()
}

/** CORS headers for all responses */
function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    const url = new URL(request.url)
    const path = url.pathname

    // POST /sessions — create a new session
    if (request.method === 'POST' && path === '/sessions') {
      return handleCreateSession(request, env)
    }

    // GET /sessions/:code/metadata
    const metadataMatch = path.match(/^\/sessions\/([a-z0-9]{6})\/metadata$/)
    if (request.method === 'GET' && metadataMatch) {
      return handleGetMetadata(metadataMatch[1], env)
    }

    // GET /sessions/:code/system-prompt
    const promptMatch = path.match(/^\/sessions\/([a-z0-9]{6})\/system-prompt$/)
    if (request.method === 'GET' && promptMatch) {
      return handleGetSystemPrompt(promptMatch[1], env)
    }

    // GET /sessions/:code/workspace
    const workspaceMatch = path.match(/^\/sessions\/([a-z0-9]{6})\/workspace$/)
    if (request.method === 'GET' && workspaceMatch) {
      return handleGetWorkspace(workspaceMatch[1], env)
    }

    // DELETE /sessions/:code
    const deleteMatch = path.match(/^\/sessions\/([a-z0-9]{6})$/)
    if (request.method === 'DELETE' && deleteMatch) {
      return handleDeleteSession(deleteMatch[1], env)
    }

    // GET / — health check
    if (request.method === 'GET' && path === '/') {
      return jsonResponse({ service: 'vibe-interviewing', status: 'ok' })
    }

    return errorResponse('Not found', 404)
  },
}

async function handleCreateSession(request: Request, env: Env): Promise<Response> {
  const contentType = request.headers.get('Content-Type') || ''

  if (!contentType.includes('multipart/form-data')) {
    return errorResponse('Content-Type must be multipart/form-data', 400)
  }

  const maxSize = parseInt(env.MAX_UPLOAD_SIZE_MB || '100') * 1024 * 1024
  const contentLength = parseInt(request.headers.get('Content-Length') || '0')
  if (contentLength > maxSize) {
    return errorResponse(`Upload exceeds maximum size of ${env.MAX_UPLOAD_SIZE_MB}MB`, 413)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return errorResponse('Invalid multipart form data', 400)
  }

  const metadataRaw = formData.get('metadata')
  const systemPrompt = formData.get('systemPrompt')
  const workspace = formData.get('workspace')

  if (!metadataRaw || typeof metadataRaw !== 'string') {
    return errorResponse('Missing "metadata" field (JSON string)', 400)
  }
  if (!systemPrompt || typeof systemPrompt !== 'string') {
    return errorResponse('Missing "systemPrompt" field (text)', 400)
  }
  if (!workspace || !(workspace instanceof File)) {
    return errorResponse('Missing "workspace" field (tarball file)', 400)
  }

  let parsedMetadata: Record<string, unknown>
  try {
    parsedMetadata = JSON.parse(metadataRaw)
  } catch {
    return errorResponse('Invalid JSON in "metadata" field', 400)
  }

  // Generate a unique session code (retry on collision)
  let code: string
  let attempts = 0
  do {
    code = generateSessionCode()
    const existing = await env.SESSIONS.head(`sessions/${code}/metadata.json`)
    if (!existing) break
    attempts++
  } while (attempts < 10)

  if (attempts >= 10) {
    return errorResponse('Failed to generate unique session code', 500)
  }

  const ttlHours = parseInt(env.SESSION_TTL_HOURS || '24')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000)

  const sessionMetadata: SessionMetadata = {
    scenarioName: String(parsedMetadata['scenarioName'] || 'unknown'),
    type: String(parsedMetadata['type'] || 'debug'),
    difficulty: String(parsedMetadata['difficulty'] || 'medium'),
    estimatedTime: String(parsedMetadata['estimatedTime'] || '30-45m'),
    briefing: String(parsedMetadata['briefing'] || ''),
    setupCommands: Array.isArray(parsedMetadata['setupCommands'])
      ? (parsedMetadata['setupCommands'] as string[])
      : [],
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }

  // Store all three objects in R2
  await Promise.all([
    env.SESSIONS.put(`sessions/${code}/metadata.json`, JSON.stringify(sessionMetadata), {
      httpMetadata: { contentType: 'application/json' },
    }),
    env.SESSIONS.put(`sessions/${code}/system-prompt.md`, systemPrompt, {
      httpMetadata: { contentType: 'text/plain' },
    }),
    env.SESSIONS.put(`sessions/${code}/workspace.tar.gz`, workspace.stream(), {
      httpMetadata: { contentType: 'application/gzip' },
    }),
  ])

  return jsonResponse(
    {
      code: `VIBE-${code.toUpperCase()}`,
      expiresAt: expiresAt.toISOString(),
      expiresIn: `${ttlHours} hours`,
    },
    201,
  )
}

async function getSessionMetadata(code: string, env: Env): Promise<SessionMetadata | null> {
  const obj = await env.SESSIONS.get(`sessions/${code}/metadata.json`)
  if (!obj) return null

  const metadata = (await obj.json()) as SessionMetadata
  if (isExpired(metadata)) {
    // Clean up expired session in the background
    await Promise.all([
      env.SESSIONS.delete(`sessions/${code}/metadata.json`),
      env.SESSIONS.delete(`sessions/${code}/system-prompt.md`),
      env.SESSIONS.delete(`sessions/${code}/workspace.tar.gz`),
    ])
    return null
  }

  return metadata
}

async function handleGetMetadata(code: string, env: Env): Promise<Response> {
  const metadata = await getSessionMetadata(code, env)
  if (!metadata) {
    return errorResponse('Session not found or expired', 404)
  }
  return jsonResponse(metadata)
}

async function handleGetSystemPrompt(code: string, env: Env): Promise<Response> {
  // Check expiry first
  const metadata = await getSessionMetadata(code, env)
  if (!metadata) {
    return errorResponse('Session not found or expired', 404)
  }

  const obj = await env.SESSIONS.get(`sessions/${code}/system-prompt.md`)
  if (!obj) {
    return errorResponse('System prompt not found', 404)
  }

  return new Response(obj.body, {
    headers: { 'Content-Type': 'text/plain', ...corsHeaders() },
  })
}

async function handleGetWorkspace(code: string, env: Env): Promise<Response> {
  // Check expiry first
  const metadata = await getSessionMetadata(code, env)
  if (!metadata) {
    return errorResponse('Session not found or expired', 404)
  }

  const obj = await env.SESSIONS.get(`sessions/${code}/workspace.tar.gz`)
  if (!obj) {
    return errorResponse('Workspace not found', 404)
  }

  return new Response(obj.body, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Length': String(obj.size),
      ...corsHeaders(),
    },
  })
}

async function handleDeleteSession(code: string, env: Env): Promise<Response> {
  const metadata = await env.SESSIONS.head(`sessions/${code}/metadata.json`)
  if (!metadata) {
    return errorResponse('Session not found', 404)
  }

  await Promise.all([
    env.SESSIONS.delete(`sessions/${code}/metadata.json`),
    env.SESSIONS.delete(`sessions/${code}/system-prompt.md`),
    env.SESSIONS.delete(`sessions/${code}/workspace.tar.gz`),
  ])

  return jsonResponse({ deleted: true })
}
