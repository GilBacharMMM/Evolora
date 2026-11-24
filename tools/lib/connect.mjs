// Connects Claude's programs to an Evolora site, signed in as the loading program's
// own account ("loader"). Only this account may add or change lessons, courses,
// classes and staff (firebase/firestore.rules, D-33, D-47).
//
// The loader account's password is made on this computer and kept outside the project,
// in ~/.evolora/<project>-loader.json, so it never goes to GitHub.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const CONFIGS = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/firebase-config.json'), 'utf8'))
export const LOADER_UID = 'evolora-loader'

// Which site to work on: "--site test" (the default) or "--site production".
export function chosenSite(argv) {
  const i = argv.indexOf('--site')
  const site = i >= 0 ? argv[i + 1] : 'test'
  if (site === 'production') {
    throw new Error('The real site (project "evolora") is not set up yet, and loading into it needs Gil\'s approval first (REQ-4.24).')
  }
  if (!CONFIGS[site]) throw new Error(`Unknown site "${site}". Use --site test.`)
  return site
}

export function siteConfig(site) {
  return CONFIGS[site]
}

function secretFile(projectId) {
  return path.join(os.homedir(), '.evolora', `${projectId}-loader.json`)
}

// Runs the Firebase command-line tool (already signed in as Gil's account on this computer).
export function firebaseCli(args) {
  const r = spawnSync(['firebase', ...args].join(' '), { cwd: ROOT, shell: true, encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`firebase ${args.join(' ')} failed:\n${r.stdout}\n${r.stderr}`)
  return r.stdout
}

// Creates (or updates) sign-in accounts with known passwords, using the Firebase command-line tool.
// Each account: { uid, email, name, password }. Emails are marked as checked, so staff rules work.
export function importAccounts(projectId, accounts) {
  const file = path.join(os.tmpdir(), `evolora-accounts-${process.pid}.json`)
  const users = accounts.map((a) => ({
    localId: a.uid,
    email: a.email,
    emailVerified: true,
    displayName: a.name,
    passwordHash: crypto.createHash('sha256').update(a.password).digest('base64'),
  }))
  fs.writeFileSync(file, JSON.stringify({ users }))
  try {
    firebaseCli(['auth:import', JSON.stringify(file), '--hash-algo=SHA256', '--rounds=1', '--project', projectId])
  } finally {
    fs.rmSync(file, { force: true })
  }
}

function loaderAccount(projectId) {
  const file = secretFile(projectId)
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
  const account = {
    uid: LOADER_UID,
    email: "loader@evolora.test",
    name: 'Evolora loading program',
    password: crypto.randomBytes(24).toString('base64url'),
  }
  importAccounts(projectId, [account])
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(account, null, 2), { mode: 0o600 })
  console.log(`Created the loading program's account for ${projectId}.`)
  return account
}

export async function connect(site) {
  const config = siteConfig(site)
  const account = loaderAccount(config.projectId)
  const app = initializeApp(config)
  const auth = getAuth(app)
  await signInWithEmailAndPassword(auth, account.email, account.password)
  return { app, auth, db: initializeFirestore(app, { ignoreUndefinedProperties: true }), storage: getStorage(app), config }
}

// The test users' passwords (D-71). Test students share the password in
// web/src/test-site/test-users.json, which is not secret. Test teachers have their own password,
// made on this computer and kept outside the project in ~/.evolora/evolora-test-teachers.json,
// so it is never on GitHub or on the students-only test address.
export function teacherPassword() {
  const file = path.join(os.homedir(), '.evolora', 'evolora-test-teachers.json')
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify({ password: crypto.randomBytes(18).toString('base64url') }, null, 2), { mode: 0o600 })
    console.log('Made a new password for the test teachers. Run tools/set-teacher-passwords.mjs to give it to them.')
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')).password
}

export function testPassword(user) {
  if (user.role === 'teacher') return teacherPassword()
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8')).password
}

// Short pause-free exit: the Firebase SDK keeps connections open otherwise.
export function finish(code = 0) {
  setTimeout(() => process.exit(code), 50)
}
