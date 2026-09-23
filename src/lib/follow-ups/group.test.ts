import { describe, expect, it } from 'vitest';

import { groupFollowUps } from './group';

type Row = { id: string; due_at: string; status: 'open' | 'completed' };

const row = (
  id: string,
  due_at: string,
  status: Row['status'] = 'open'
): Row => ({
  id,
  due_at,
  status,
});

describe('groupFollowUps', () => {
  it('uses the business timezone when deciding what is due today', () => {
    const groups = groupFollowUps(
      [
        row('today-in-india', '2026-09-23T18:15:00.000Z'),
        row('tomorrow-in-india', '2026-09-24T18:30:00.000Z'),
      ],
      'Asia/Kolkata',
      new Date('2026-09-23T18:00:00.000Z')
    );

    expect(groups.dueToday.map(({ id }) => id)).toEqual(['today-in-india']);
    expect(groups.upcoming.map(({ id }) => id)).toEqual(['tomorrow-in-india']);
  });

  it('keeps completed reminders out of overdue even when their date is past', () => {
    const groups = groupFollowUps(
      [
        row('overdue', '2026-09-22T12:00:00.000Z'),
        row('completed', '2026-09-21T12:00:00.000Z', 'completed'),
      ],
      'Asia/Kolkata',
      new Date('2026-09-23T12:00:00.000Z')
    );

    expect(groups.overdue.map(({ id }) => id)).toEqual(['overdue']);
    expect(groups.completed.map(({ id }) => id)).toEqual(['completed']);
  });
});
