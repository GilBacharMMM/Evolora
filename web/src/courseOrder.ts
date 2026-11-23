// Course orders and due dates (REQ-5.8, 5.9, D-60). Pure rules with no imports, so the
// automatic tests in functions/order.test.js can check them too.

export type Order = 'oneByOne' | 'paired' | 'any'
export type Status = 'open' | 'done' | 'locked'

export interface OrderItem {
  lessonId: string
  practice: { lessonId: string }[]
}

// Which lessons are open (REQ-5.8):
// - one after another: every lesson in the list opens when the one before it is finished (D-55);
// - paired: teaching lessons open in order, each when the previous teaching lesson is finished;
//   the practice lessons of a finished teaching lesson are open, in any order;
// - any order: everything is open.
// Always: a finished lesson is done; a lesson the student started, or the teacher opened early for
// them (REQ-5.20), is open.
export function orderStatuses(items: OrderItem[], order: Order, finished: Set<string>, started: Set<string>, openedEarly: Set<string> = new Set()): Map<string, Status> {
  const out = new Map<string, Status>()
  const flat = items.flatMap((it) => [it.lessonId, ...it.practice.map((p) => p.lessonId)])
  const set = (id: string, openByOrder: boolean) => {
    out.set(id, finished.has(id) ? 'done' : openByOrder || started.has(id) || openedEarly.has(id) ? 'open' : 'locked')
  }
  if (order === 'any') {
    for (const id of flat) set(id, true)
  } else if (order === 'paired') {
    items.forEach((it, i) => {
      set(it.lessonId, i === 0 || finished.has(items[i - 1].lessonId))
      for (const p of it.practice) set(p.lessonId, finished.has(it.lessonId))
    })
  } else {
    flat.forEach((id, i) => set(id, i === 0 || finished.has(flat[i - 1])))
  }
  return out
}

// A selection of single lessons in the order given, with practice lessons grouped under the
// teaching lesson before them (a practice lesson with no teaching lesson before it stands alone).
export function groupLessons(lessons: { lessonId: string; type: string }[]): OrderItem[] {
  const items: OrderItem[] = []
  for (const l of lessons) {
    const last = items[items.length - 1]
    if (l.type === 'practice' && last && (last as OrderItem & { teaching?: boolean }).teaching) last.practice.push({ lessonId: l.lessonId })
    else items.push({ lessonId: l.lessonId, practice: [], ...(l.type === 'teaching' ? { teaching: true } : {}) } as OrderItem)
  }
  return items
}

export interface DueRule {
  due: number | null
  afterDue: 'reduce' | 'lock'
  reduceBy: number
  extensions?: Record<string, number>
}

// The due date for one student: their own extension, if any, or the assignment's (REQ-5.9).
export function dueFor(rule: DueRule, uid: string): number | null {
  return rule.extensions?.[uid] ?? rule.due ?? null
}

// Is the lesson late? Unfinished after the due date, or finished after it.
export function isLate(due: number | null, finishedAt: number | null, now: number): boolean {
  if (!due) return false
  return finishedAt ? finishedAt > due : now > due
}

// The grade after the late rule (D-60): "reduce" takes reduceBy points off a lesson finished late.
export function lateGrade(percent: number | null, rule: DueRule, due: number | null, finishedAt: number | null): number | null {
  if (percent == null || rule.afterDue !== 'reduce' || !due || !finishedAt || finishedAt <= due) return percent
  return Math.max(0, percent - rule.reduceBy)
}

// Locked after the due date (REQ-5.9): an unfinished lesson can't be opened.
export function lockedByDue(rule: DueRule, due: number | null, finished: boolean, now: number): boolean {
  return rule.afterDue === 'lock' && !!due && !finished && now > due
}
