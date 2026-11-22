#!/usr/bin/env node
// Evolora loading program (REQ-4.24, REQ-4.10, system-design 2.2).
// Loads lesson files and course files into a site, after the lesson check passes.
//
//   node tools/load.mjs lessons/circles-teaching
//   node tools/load.mjs courses/circles-demo.md          (also loads the course's lessons)
//   node tools/load.mjs --site test lessons/archimedes-density courses/density-demo.md
//
// What it does, in order:
// 1. Runs tools/check-lesson.mjs on everything. If there is any error, nothing is loaded.
// 2. Uploads each lesson's images to file storage.
// 3. Saves each lesson as a new version (an unchanged lesson is skipped), with its
//    answers in the protected area that students can never read (D-17).
// 4. Saves each course with its lessons in order.
//
// Options:
//   --site test          which site (only the test site for now)
//   --skip-images        load without images, if file storage isn't switched on yet
//                        (the lesson then shows "image not available yet")

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes } from 'firebase/storage'
import { parseLesson, parseCourse } from './lib/lesson-parser.mjs'
import { ROOT, chosenSite, connect, finish } from './lib/connect.mjs'

const CONTENT_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp' }

export function runCheck(targets) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/check-lesson.mjs'), ...targets], { cwd: ROOT, encoding: 'utf8' })
  return { ok: r.status === 0, output: r.stdout + r.stderr }
}

// Works out which lessons and courses the targets mean. A course brings its lessons with it.
export function resolveTargets(targets) {
  const lessons = new Set()
  const courses = []
  for (const t of targets) {
    const full = path.resolve(ROOT, t)
    const isCourse = full.endsWith('.md') && path.basename(path.dirname(full)) === 'courses'
    if (isCourse) {
      const course = parseCourse(full)
      courses.push({ file: full, course })
      for (const id of course.lessonIds) lessons.add(path.join(ROOT, 'lessons', id))
    } else {
      lessons.add(full.endsWith('lesson.md') ? path.dirname(full) : full)
    }
  }
  return { lessonDirs: [...lessons], courses }
}

async function storageWorks(storage) {
  try {
    await uploadBytes(ref(storage, 'lessons/_check/storage-check.txt'), new TextEncoder().encode('ok'), { contentType: 'text/plain' })
    return true
  } catch (e) {
    return { error: e.code || e.message }
  }
}

export async function loadAll(conn, targets, { skipImages = false, log = console.log } = {}) {
  const { db, storage } = conn
  const { lessonDirs, courses } = resolveTargets(targets)

  const check = runCheck([...lessonDirs.map((d) => path.relative(ROOT, d)), ...courses.map((c) => path.relative(ROOT, c.file))])
  if (!check.ok) {
    log(check.output)
    throw new Error('The lesson check found errors (listed above). Nothing was loaded.')
  }

  const parsed = lessonDirs.map((d) => parseLesson(d))
  const needImages = parsed.some((p) => p.images.length > 0)
  let uploadImages = needImages && !skipImages
  if (uploadImages) {
    const works = await storageWorks(storage)
    if (works !== true) {
      throw new Error(`File storage doesn't work yet (${works.error}). It needs the Blaze plan and "Get started" in Storage (docs/setup-google-cloud.md). Nothing was loaded. To load without images for now, add --skip-images.`)
    }
  }

  const report = []
  for (const lesson of parsed) {
    const lessonRef = doc(db, 'lessons', lesson.id)
    const existing = await getDoc(lessonRef)
    const old = existing.exists() ? existing.data() : null
    const imagesState = uploadImages ? 'uploaded' : lesson.images.length ? 'missing' : 'none'
    if (old && old.fingerprint === lesson.fingerprint && (old.imagesState !== 'missing' || imagesState === 'missing')) {
      report.push(`${lesson.id}: unchanged (still version ${old.currentVersion}), not loaded again.`)
      continue
    }
    const version = (old?.versionCount || 0) + 1

    if (uploadImages) {
      for (const img of lesson.images) {
        const storagePath = `lessons/${lesson.id}/v${version}/${img.block.file}`
        const ext = path.extname(img.localPath).toLowerCase()
        await uploadBytes(ref(storage, storagePath), fs.readFileSync(img.localPath), {
          contentType: CONTENT_TYPES[ext] || 'application/octet-stream',
          cacheControl: 'public, max-age=31536000, immutable',
        })
        img.block.storagePath = storagePath
      }
    }

    const versionRef = doc(db, 'lessons', lesson.id, 'versions', String(version))
    const batch = writeBatch(db)
    batch.set(versionRef, { version, lessonId: lesson.id, details: lesson.details, ...lesson.content, imagesState, loadedAt: serverTimestamp() })
    batch.set(doc(versionRef, 'secret', 'answers'), lesson.secret)
    batch.set(lessonRef, {
      ...lesson.details,
      currentVersion: version,
      versionCount: version,
      fingerprint: lesson.fingerprint,
      imagesState,
      counts: lesson.counts,
      classIds: old?.classIds || [],
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
    report.push(`${lesson.id}: loaded as version ${version} (${lesson.counts.topics} topics, ${lesson.counts.questions} questions, ${lesson.counts.images} images${imagesState === 'missing' ? ', images NOT uploaded yet' : ''}).`)
  }

  const byId = Object.fromEntries(parsed.map((p) => [p.id, p]))
  for (const { course } of courses) {
    const courseRef = doc(db, 'courses', course.id)
    const existing = await getDoc(courseRef)
    const entry = (id) => ({ lessonId: id, title: byId[id].details.title, type: byId[id].details.type })
    const batch = writeBatch(db)
    batch.set(courseRef, {
      ...course.details,
      items: course.items.map((it) => ({ ...entry(it.lessonId), kind: it.kind, practice: it.practice.map(entry) })),
      lessonIds: course.lessonIds,
      classIds: existing.exists() ? existing.data().classIds || [] : [],
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
    report.push(`course ${course.id}: loaded (${course.lessonIds.length} lesson${course.lessonIds.length === 1 ? '' : 's'}).`)
  }
  return report
}

// Run from the command line
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(ROOT, 'tools/load.mjs')) {
  const argv = process.argv.slice(2)
  const skipImages = argv.includes('--skip-images')
  const targets = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--site')
  if (targets.length === 0) {
    console.log('Usage: node tools/load.mjs [--site test] [--skip-images] <lessons/<name> | courses/<name>.md> ...')
    finish(2)
  } else {
    try {
      const site = chosenSite(argv)
      const conn = await connect(site)
      const report = await loadAll(conn, targets, { skipImages })
      console.log(`\nLoaded into the ${site} site:`)
      for (const line of report) console.log(`  ${line}`)
      finish(0)
    } catch (e) {
      console.error(`\n${e.message}`)
      finish(1)
    }
  }
}
