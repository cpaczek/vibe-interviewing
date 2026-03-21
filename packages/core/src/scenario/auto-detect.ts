import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

export interface DetectedProject {
  /** Detected language/runtime */
  language: string
  /** Package manager or build tool */
  packageManager?: string
  /** Commands that should be wrapped for Docker */
  commands: string[]
  /** Whether a Dockerfile already exists */
  hasDockerfile: boolean
  /** Whether a docker-compose file already exists */
  hasDockerCompose: boolean
  /** Detected ports from common patterns */
  ports: string[]
  /** Suggested Dockerfile content */
  suggestedDockerfile?: string
}

/** Detect project type and configuration from a directory */
export async function detectProject(projectPath: string): Promise<DetectedProject> {
  const result: DetectedProject = {
    language: 'unknown',
    commands: [],
    hasDockerfile: false,
    hasDockerCompose: false,
    ports: [],
  }

  // Check for Dockerfile
  result.hasDockerfile =
    existsSync(join(projectPath, 'Dockerfile')) || existsSync(join(projectPath, 'dockerfile'))

  // Check for docker-compose
  result.hasDockerCompose =
    existsSync(join(projectPath, 'docker-compose.yml')) ||
    existsSync(join(projectPath, 'docker-compose.yaml')) ||
    existsSync(join(projectPath, 'compose.yml')) ||
    existsSync(join(projectPath, 'compose.yaml'))

  // Detect Node.js
  if (existsSync(join(projectPath, 'package.json'))) {
    result.language = 'node'
    result.commands = ['npm', 'node', 'npx']

    const pkg = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'))
    if (pkg.packageManager?.startsWith('pnpm')) {
      result.packageManager = 'pnpm'
      result.commands.push('pnpm')
    } else if (pkg.packageManager?.startsWith('yarn')) {
      result.packageManager = 'yarn'
      result.commands.push('yarn')
    } else {
      result.packageManager = 'npm'
    }

    if (!result.hasDockerfile) {
      result.suggestedDockerfile = generateNodeDockerfile(result.packageManager)
    }

    // Detect port from scripts
    const startScript = pkg.scripts?.start ?? pkg.scripts?.dev ?? ''
    const portMatch = startScript.match(/(?:PORT|port)[=\s]+(\d+)/)
    if (portMatch?.[1]) {
      result.ports.push(`${portMatch[1]}:${portMatch[1]}`)
    } else {
      result.ports.push('3000:3000') // Common default
    }
  }

  // Detect Python
  if (
    existsSync(join(projectPath, 'requirements.txt')) ||
    existsSync(join(projectPath, 'pyproject.toml')) ||
    existsSync(join(projectPath, 'setup.py'))
  ) {
    result.language = 'python'
    result.commands = ['python', 'pip', 'pytest']

    if (existsSync(join(projectPath, 'pyproject.toml'))) {
      result.packageManager = 'poetry/pip'
    }

    if (!result.hasDockerfile) {
      result.suggestedDockerfile = generatePythonDockerfile()
    }

    result.ports.push('8000:8000') // Common FastAPI/Django default
  }

  // Detect Go
  if (existsSync(join(projectPath, 'go.mod'))) {
    result.language = 'go'
    result.commands = ['go']
    result.ports.push('8080:8080')

    if (!result.hasDockerfile) {
      result.suggestedDockerfile = generateGoDockerfile()
    }
  }

  // Detect Rust
  if (existsSync(join(projectPath, 'Cargo.toml'))) {
    result.language = 'rust'
    result.commands = ['cargo']
    result.ports.push('8080:8080')
  }

  // Add common utility commands
  result.commands.push('curl')

  return result
}

function generateNodeDockerfile(packageManager: string): string {
  const installCmd =
    packageManager === 'pnpm'
      ? 'RUN corepack enable && pnpm install'
      : packageManager === 'yarn'
        ? 'RUN yarn install'
        : 'RUN npm install'

  return `FROM node:20-slim
WORKDIR /app
COPY package*.json ./
${installCmd}
COPY . .
CMD ["npm", "start"]
`
}

function generatePythonDockerfile(): string {
  return `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`
}

function generateGoDockerfile(): string {
  return `FROM golang:1.22-alpine
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main .
CMD ["./main"]
`
}
