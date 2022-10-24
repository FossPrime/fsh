import { readdir, readFile } from 'node:fs/promises'
import { exec } from 'node:child_process'
import { relative, resolve } from 'node:path'
import { chdir, cwd } from 'node:process'
import os from 'node:os'

const initialPath = cwd()
export const getPaths = () => process?.env?.PATH?.split(':') || []

export const getKnownBins = async () => {
  return JSON.parse(
    await readFile('./fixtures/commands-2022.json', { encoding: 'utf-8' })
  )
}

export const getAllBins = async () => {
  const pwd = resolve('.')
  const path = getPaths().map((p) => (p.startsWith(pwd) ? relative(pwd, p) : p))

  let lsResults = new Map()
  for (const d of path) {
    try {
      const ls = await readdir(d)
      lsResults.set(d, ls)
      lsResults.entries
    } catch (_e) {}
  }

  const allBins = []
  for (const dir of lsResults.keys()) {
    allBins.push(...lsResults.get(dir).map((b) => dir + '/' + b))
  }
  return allBins
}

const getPrettyPwd = () => {
  const pwd = cwd()
  const result = pwd.startsWith(initialPath)
    ? '📦' + pwd.slice(initialPath.length)
    : pwd
  return result.endsWith('/') ? result : result + '/'
}

// https://nodejs.org/api/child_process.html#event-exit
export const sh = (commandRaw) =>
  new Promise((ok) => {
    const command = commandRaw ? commandRaw.trim() : commandRaw
    const result = {
      stdout: '',
      stderr: ''
    }
    if (command === undefined) {
      return ok(command)
      // Remember to handle `cd node_modules && ls`
    } else if (command.startsWith('cd ') && command.split(' ').length === 2) {
      chdir(command.slice(3))
      result.pwd = getPrettyPwd()
      result.stdout = cwd()
      return ok(result)
    } else {
      result.pwd = getPrettyPwd()
      console.log(`[INFO] Running "${command}"`)
    }

    const child = exec(command)

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')

    child.stdout.on('data', (data) => {
      result.stdout += data
    })

    child.stderr.on('data', (data) => {
      result.stderr += data
    })

    child.on('exit', (event) => {
      ok(result)
    })
  })

export const getOSInfo = () => {
  const m = new Map()
  m.set('homedir', os.homedir())
  m.set('hostname', os.hostname())
  m.set('release', os.release())
  m.set('userInfo', os.userInfo())
  return m
}
