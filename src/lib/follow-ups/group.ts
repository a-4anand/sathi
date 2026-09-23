import type { FollowUp } from '@/types';

export type FollowUpGroups<T extends Pick<FollowUp, 'due_at' | 'status'>> = {
  overdue: T[];
  dueToday: T[];
  upcoming: T[];
  completed: T[];
};

export function dayKey(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

/** Groups reminders by their business-local calendar day, never the browser day. */
export function groupFollowUps<T extends Pick<FollowUp, 'due_at' | 'status'>>(
  rows: T[],
  timeZone: string,
  now = new Date()
): FollowUpGroups<T> {
  const today = dayKey(now, timeZone);
  const groups: FollowUpGroups<T> = {
    overdue: [],
    dueToday: [],
    upcoming: [],
    completed: [],
  };

  for (const row of rows) {
    if (row.status === 'completed') {
      groups.completed.push(row);
      continue;
    }

    const dueAt = new Date(row.due_at);
    if (dueAt < now) groups.overdue.push(row);
    else if (dayKey(dueAt, timeZone) === today) groups.dueToday.push(row);
    else groups.upcoming.push(row);
  }

  return groups;
}
