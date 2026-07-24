import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'

// Ensure dist/client exists so Wrangler doesn't fail due to missing assets directory
await mkdir(new URL('../dist/client', import.meta.url), { recursive: true })

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function run(command, args) {
  return spawn(command, args, { stdio: 'inherit', env: process.env })
}

const migrate = run(npmCommand, ['run', 'db:migrate:local'])
const migrationExitCode = await new Promise((resolve) => migrate.once('exit', resolve))

if (migrationExitCode !== 0) process.exit(migrationExitCode ?? 1)

const api = run(npmCommand, ['run', 'dev:api'])
const web = run(npmCommand, ['run', 'dev:web'])
const children = [api, web]
let stopping = false

function stop(signal = 'SIGTERM') {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (!child.killed) child.kill(signal)
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => stop(signal))
}

for (const child of children) {
  child.once('exit', (code) => {
    stop()
    process.exitCode = code ?? 1
  })
}
