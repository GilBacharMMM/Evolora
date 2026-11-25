// Small helpers shared by the end-to-end tests.

import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { getStorage, ref, uploadBytes } from 'firebase/storage'

// Answers an audio question (REQ-6.6) with a tiny stand-in recording, the way the website does:
// first the file into the student's own folder, then the answer pointing at it.
export async function answerWithRecording(app, call, uid, lessonId, questionId) {
  const path = `recordings/${uid}/${lessonId}/${questionId}/test.webm`
  await uploadBytes(ref(getStorage(app), path), new Uint8Array(500).fill(3), { contentType: 'audio/webm' })
  return call('answer', { lessonId, questionId, value: path })
}

// Gil may have added co-teachers to the test class while trying things. Tests that check "another
// teacher can't see this class" take them out for the test and put them back afterwards.
export async function soloTeacher(ldb, classId) {
  const ref_ = doc(ldb, 'classes', classId)
  const before = (await getDoc(ref_)).data()
  const keep = before.teacherIds.indexOf('test-teacher-1')
  await updateDoc(ref_, { teacherIds: ['test-teacher-1'], teacherNames: [before.teacherNames[keep] || 'Test Teacher 1'] })
  return () => updateDoc(ref_, { teacherIds: before.teacherIds, teacherNames: before.teacherNames })
}

// Test Student 7 hasn't agreed to the terms of use (D-75), and the checking service refuses work
// until they do (D-76). Tests that use them agree for them, and put it back afterwards.
export async function agreeForTest(ldb, uid) {
  const terms = await getDoc(doc(ldb, 'terms', 'current'))
  if (!terms.exists()) return async () => {}
  const userRef = doc(ldb, 'users', uid)
  const before = (await getDoc(userRef)).data()?.termsAccepted ?? null
  await setDoc(userRef, { termsAccepted: { version: terms.data().version, at: Date.now(), by: 'test' } }, { merge: true })
  return () => setDoc(userRef, { termsAccepted: before ?? deleteField() }, { merge: true })
}
