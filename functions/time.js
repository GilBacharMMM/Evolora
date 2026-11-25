// Time on each lesson and time away (REQ-5.33, D-73, D-76): the rules the checking service uses.
// Tested by time.test.js.

export const AWAY_DEFAULT = 5
// The browser reports about every 20 seconds; anything much bigger than the time since the last
// report can't be real working time.
const SLACK_MS = 5000
const MAX_REPORT_MS = 2 * 60 * 1000

export function awayLimit(classData) {
  const n = classData?.awayWarnAt
  return Number.isInteger(n) && n >= 1 && n <= 100 ? n : AWAY_DEFAULT
}

export function validReport(report) {
  const { netMs, away, opened } = report || {}
  return Number.isFinite(netMs) && netMs >= 0 && Number.isInteger(away) && away >= 0 && away <= 50 && (opened === undefined || typeof opened === 'boolean')
}

// Adds one report to what is saved. Opening the lesson again after an earlier sitting counts as
// coming back from being away.
export function applyTimeReport(prev, report, now) {
  const since = prev ? Math.max(0, now - prev.lastAt) : MAX_REPORT_MS
  const net = Math.min(Math.round(report.netMs), since + SLACK_MS, MAX_REPORT_MS)
  return {
    firstAt: prev?.firstAt ?? now,
    lastAt: now,
    netMs: (prev?.netMs || 0) + net,
    awayCount: (prev?.awayCount || 0) + report.away + (report.opened && prev ? 1 : 0),
    flaggedFor: prev?.flaggedFor || [],
  }
}

// What the teacher sees for one lesson: total time from the start to the finish (or to the last
// time worked, if not finished), net working time, times away and time away.
export function timeSummary(t, finishedAt) {
  if (!t) return null
  const end = finishedAt && finishedAt >= t.firstAt ? finishedAt : t.lastAt
  const totalMs = Math.max(0, end - t.firstAt)
  const netMs = Math.min(t.netMs || 0, totalMs)
  return { totalMs, netMs, awayCount: t.awayCount || 0, awayMs: totalMs - netMs }
}

// "Away a lot": more times away in one lesson than the class's number.
export function awayALot(summary, limit) {
  return !!summary && summary.awayCount > limit
}
