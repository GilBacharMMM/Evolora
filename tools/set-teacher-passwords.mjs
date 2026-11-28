#!/usr/bin/env node
// Gives the test teachers on the test site their own password (D-71), so the students-only
// test address can't be used to sign in as a teacher. The password is made on this computer and
// kept in ~/.evolora/evolora-test-teachers.json (outside the project, never on GitHub).
// Their progress and classes are not touched.
//
//   node tools/set-teacher-passwords.mjs

import fs from 'node:fs'
import path from 'node:path'
import { ROOT, importAccounts, siteConfig, testPassword } from './lib/connect.mjs'

const TEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/test-site/test-users.json'), 'utf8'))
const teachers = TEST.users.filter((u) => u.role === 'teacher' || u.role === 'admin')
importAccounts(siteConfig('test').projectId, teachers.map((u) => ({ ...u, password: testPassword(u) })))
console.log(`Gave ${teachers.length} test teachers their own password. Rebuild and publish the test site (npm run build:test in web).`)
