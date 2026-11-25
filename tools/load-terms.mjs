#!/usr/bin/env node
// Puts the terms of use (REQ-10.8, D-75) on the test site, from terms/terms.he.md, terms.ar.md
// and terms.en.md. All three must have the same version. When the version is new, everyone is
// asked to agree again at their next visit.
//
//   node tools/load-terms.mjs                       check and load
//   node tools/load-terms.mjs --check               only check the files
//   node tools/load-terms.mjs --agree-test-users    also mark every test user except Test Student 7
//                                                   as agreed to this version (test site only)

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { doc, getDoc, serverTimestamp, setDoc, writeBatch, deleteField } from 'firebase/firestore'
import { ROOT, chosenSite, connect, finish } from './lib/connect.mjs'
import { TERMS_LANGUAGES, checkSet, parseTerms } from './lib/terms-parser.mjs'

export function readTermsFiles(folder = path.join(ROOT, 'terms')) {
  const parsed = {}
  for (const lang of TERMS_LANGUAGES) {
    const file = path.join(folder, `terms.${lang}.md`)
    if (fs.existsSync(file)) parsed[lang] = parseTerms(fs.readFileSync(file, 'utf8'))
  }
  return { parsed, problems: checkSet(parsed) }
}

// Saves the terms as the current ones, with a copy kept under their version.
export async function saveTerms(db, parsed) {
  const version = parsed.he.terms.version
  const languages = Object.fromEntries(TERMS_LANGUAGES.map((l) => [l, { title: parsed[l].terms.title, summary: parsed[l].terms.summary, text: parsed[l].terms.text }]))
  const before = (await getDoc(doc(db, 'terms', 'current'))).data()
  const record = { version, languages, loadedAt: serverTimestamp() }
  await setDoc(doc(db, 'terms', `v${version}`), record)
  await setDoc(doc(db, 'terms', 'current'), record)
  const sameVersionChanged = before && before.version === version && JSON.stringify(before.languages) !== JSON.stringify(languages)
  return { version, previous: before?.version ?? null, sameVersionChanged }
}

// Test users agree to this version, except Test Student 7, who is left to try the first sign-in.
export async function agreeTestUsers(db, version) {
  const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
  const batch = writeBatch(db)
  for (const u of TEST.users) {
    const agreed = u.uid === 'test-student-7' ? deleteField() : { version, at: serverTimestamp(), by: 'test data' }
    batch.set(doc(db, 'users', u.uid), { termsAccepted: agreed }, { merge: true })
  }
  await batch.commit()
}

async function main() {
  const argv = process.argv.slice(2)
  const { parsed, problems } = readTermsFiles()
  if (problems.length) {
    console.log('The terms files need fixing; nothing was loaded:')
    for (const p of problems) console.log(`  - ${p}`)
    return 1
  }
  console.log(`The terms files are fine (version ${parsed.he.terms.version}).`)
  if (argv.includes('--check')) return 0
  chosenSite(argv)
  const { db } = await connect('test')
  const r = await saveTerms(db, parsed)
  if (r.previous === r.version) {
    console.log(`Loaded version ${r.version} again.`)
    if (r.sameVersionChanged) console.log('  Warning: the text changed but the version did not, so nobody is asked to agree again. Raise the version if people should agree to the change.')
  } else {
    console.log(`Loaded version ${r.version}${r.previous ? ` (was ${r.previous})` : ''}. Everyone is asked to agree at their next visit.`)
  }
  if (argv.includes('--agree-test-users')) {
    await agreeTestUsers(db, r.version)
    console.log('The test users are marked as agreed, except Test Student 7.')
  }
  return 0
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(finish).catch((e) => {
    console.error(e.message)
    finish(1)
  })
}
