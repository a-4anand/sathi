'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  MessageSquareReply,
  WifiOff,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { dayKey } from '@/lib/follow-ups/group';
import type { Contact, FollowUp } from '@/types';
import { Button } from '@/components/ui/button';

type ConversationAttention = {
  id: string;
  unread_count: number;
  last_message_text: string | null;
  last_message_at: string | null;
  contact: Pick<Contact, 'id' | 'name' | 'phone'>;
};

type FollowUpAttention = FollowUp & {
  contact: Pick<Contact, 'id' | 'name' | 'phone'>;
  ownerName?: string;
};

export default function TodayPage() {
  const t = useTranslations('Today');
  const { accountId, profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationAttention[]>(
    []
  );
  const [followUps, setFollowUps] = useState<FollowUpAttention[]>([]);
  const [confirmedJobs, setConfirmedJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [loadedAt, setLoadedAt] = useState(0);
  const timeZone = profile?.business_timezone ?? 'Asia/Kolkata';

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const now = new Date();
    const todayStart =
      timeZone === 'Asia/Kolkata'
        ? new Date(`${dayKey(now, timeZone)}T00:00:00+05:30`).toISOString()
        : new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          ).toISOString();
    const [conversationsRes, followUpsRes, membersRes, jobsRes] =
      await Promise.all([
        supabase
          .from('conversations')
          .select(
            'id,unread_count,last_message_text,last_message_at,contact:contacts(id,name,phone)'
          )
          .eq('account_id', accountId)
          .gt('unread_count', 0)
          .order('last_message_at', { ascending: false })
          .limit(8),
        supabase
          .from('follow_ups')
          .select('*,contact:contacts(id,name,phone)')
          .eq('account_id', accountId)
          .eq('status', 'open')
          .order('due_at', { ascending: true })
          .limit(12),
        supabase
          .from('profiles')
          .select('user_id,full_name')
          .eq('account_id', accountId),
        supabase
          .from('deals')
          .select('id', { count: 'exact', head: true })
          .eq('account_id', accountId)
          .eq('status', 'won')
          .gte('updated_at', todayStart),
      ]);

    const firstError =
      conversationsRes.error || followUpsRes.error || jobsRes.error;
    if (firstError) {
      setError(firstError.message);
    } else {
      setConversations(
        (conversationsRes.data ?? []) as unknown as ConversationAttention[]
      );
      const names = new Map(
        (membersRes.data ?? []).map((member) => [
          member.user_id,
          member.full_name || 'Team member',
        ])
      );
      setFollowUps(
        ((followUpsRes.data ?? []) as unknown as FollowUpAttention[]).map(
          (row) => ({ ...row, ownerName: names.get(row.assigned_to_user_id) })
        )
      );
      setConfirmedJobs(jobsRes.count ?? 0);
      setLoadedAt(Date.now());
    }
    setLoading(false);
  }, [accountId, timeZone]);

  useEffect(() => {
    // All state changes happen after Supabase promises settle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const overdue = followUps.filter(
    (item) => new Date(item.due_at).getTime() < loadedAt
  );
  const later = followUps.filter(
    (item) => new Date(item.due_at).getTime() >= loadedAt
  );
  const attention = useMemo(
    () => [...overdue.slice(0, 4), ...conversations.slice(0, 4)],
    [overdue, conversations]
  );

  const dateLabel = new Intl.DateTimeFormat(
    profile?.language_preference === 'hi' ? 'hi-IN' : 'en-IN',
    {
      timeZone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }
  ).format(new Date());

  return (
    <div
      className={`mx-auto w-full max-w-[1200px] space-y-5 ${profile?.language_preference === 'hi' ? 'font-indic' : ''}`}
    >
      {!online ? (
        <div className="flex items-center gap-2 rounded-[14px] border border-[#8a4b08] bg-[#fff3d6] p-3 text-sm text-[#8a4b08]">
          <WifiOff className="size-4" />
          {t('offline')}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{dateLabel}</p>
        </div>
        <p className="text-muted-foreground max-w-sm text-left text-xs leading-5 sm:text-right">
          {t('jobsNote')}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          title={t('waitingForReply')}
          value={conversations.length}
          hint={t('waitingHint')}
          icon={MessageSquareReply}
        />
        <SummaryCard
          title={t('followUpsDue')}
          value={overdue.length}
          hint={t('followUpHint')}
          icon={Clock3}
          warning
        />
        <SummaryCard
          title={t('jobsConfirmed')}
          value={confirmedJobs}
          hint={t('jobsHint')}
          icon={BriefcaseBusiness}
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="border-destructive text-destructive rounded-[14px] border bg-[#fdecea] p-4 text-sm"
        >
          {error}. {t('migrationHint')}{' '}
          <button onClick={load} className="font-semibold underline">
            {t('retry')}
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="bg-muted h-20 animate-pulse rounded-[14px]"
            />
          ))}
        </div>
      ) : attention.length === 0 && later.length === 0 ? (
        <div className="border-border bg-card rounded-[14px] border border-dashed p-10 text-center">
          <h2 className="text-lg font-semibold">{t('emptyTitle')}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t('emptyBody')}</p>
        </div>
      ) : (
        <>
          <section className="space-y-2">
            <div>
              <h2 className="text-xl font-bold">{t('needsAttention')}</h2>
              <p className="text-muted-foreground text-xs">
                {t('attentionCount', {
                  count: attention.length,
                  overdue: overdue.length,
                })}
              </p>
            </div>
            {overdue.slice(0, 4).map((item) => (
              <FollowUpTodayRow
                key={item.id}
                item={item}
                timeZone={timeZone}
                overdue
                labels={{
                  owner: t('owner'),
                  due: t('due'),
                  team: t('team'),
                  edit: t('editFollowUp'),
                }}
              />
            ))}
            {conversations.slice(0, 4).map((item) => (
              <ConversationTodayRow
                key={item.id}
                item={item}
                labels={{
                  unread: t('unread'),
                  received: t('received'),
                  newMessage: t('newCustomerMessage'),
                  now: t('now'),
                  open: t('openConversation'),
                }}
              />
            ))}
          </section>

          {later.length ? (
            <section className="space-y-2">
              <div>
                <h2 className="text-xl font-bold">{t('laterToday')}</h2>
                <p className="text-muted-foreground text-xs">
                  {t('laterHint')}
                </p>
              </div>
              {later.slice(0, 5).map((item) => (
                <FollowUpTodayRow
                  key={item.id}
                  item={item}
                  timeZone={timeZone}
                  labels={{
                    owner: t('owner'),
                    due: t('due'),
                    team: t('team'),
                    edit: t('editFollowUp'),
                  }}
                />
              ))}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  hint,
  icon: Icon,
  warning = false,
}: {
  title: string;
  value: number;
  hint: string;
  icon: typeof Clock3;
  warning?: boolean;
}) {
  return (
    <div
      className={`border-border rounded-[14px] border p-4 ${warning ? 'bg-[#fff3d6]' : 'bg-card'}`}
    >
      <div className="flex items-center justify-between">
        <p
          className={`text-sm font-bold ${warning ? 'text-[#8a4b08]' : 'text-primary'}`}
        >
          {title}
        </p>
        <Icon
          className={`size-4 ${warning ? 'text-[#8a4b08]' : 'text-primary'}`}
        />
      </div>
      <p className="mt-1 text-2xl font-bold">{value.toLocaleString('en-IN')}</p>
      <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
    </div>
  );
}

function FollowUpTodayRow({
  item,
  timeZone,
  overdue = false,
  labels,
}: {
  item: FollowUpAttention;
  timeZone: string;
  overdue?: boolean;
  labels: { owner: string; due: string; team: string; edit: string };
}) {
  return (
    <article
      className={`bg-card grid gap-3 rounded-[14px] border p-4 sm:grid-cols-[190px_1fr_110px_165px_auto] sm:items-center ${overdue ? 'border-l-destructive border-l-4' : 'border-border'}`}
    >
      <div>
        <p className="font-semibold">
          {item.contact?.name || item.contact?.phone}
        </p>
        <p className="text-muted-foreground text-xs">{item.contact?.phone}</p>
      </div>
      <div>
        <p className="text-sm">{item.purpose}</p>
        {item.note ? (
          <p className="text-muted-foreground mt-1 text-xs">{item.note}</p>
        ) : null}
      </div>
      <div>
        <p className="text-muted-foreground text-[10px] uppercase">
          {labels.owner}
        </p>
        <p className="text-sm font-semibold">{item.ownerName || labels.team}</p>
      </div>
      <div>
        <p className="text-muted-foreground text-[10px] uppercase">
          {labels.due}
        </p>
        <p
          className={`text-sm font-semibold ${overdue ? 'text-destructive' : ''}`}
        >
          {new Intl.DateTimeFormat('en-IN', {
            timeZone,
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
          }).format(new Date(item.due_at))}
        </p>
      </div>
      <Button
        render={<Link href="/follow-ups" />}
        className="h-11 rounded-[10px]"
      >
        {labels.edit}
      </Button>
    </article>
  );
}

function ConversationTodayRow({
  item,
  labels,
}: {
  item: ConversationAttention;
  labels: {
    unread: string;
    received: string;
    newMessage: string;
    now: string;
    open: string;
  };
}) {
  return (
    <article className="border-border bg-card grid gap-3 rounded-[14px] border p-4 sm:grid-cols-[190px_1fr_110px_165px_auto] sm:items-center">
      <div>
        <p className="font-semibold">
          {item.contact?.name || item.contact?.phone}
        </p>
        <p className="text-muted-foreground text-xs">{item.contact?.phone}</p>
      </div>
      <p className="truncate text-sm">
        {item.last_message_text || labels.newMessage}
      </p>
      <div>
        <p className="text-muted-foreground text-[10px] uppercase">
          {labels.unread}
        </p>
        <p className="text-sm font-semibold">{item.unread_count}</p>
      </div>
      <div>
        <p className="text-muted-foreground text-[10px] uppercase">
          {labels.received}
        </p>
        <p className="text-sm font-semibold">
          {item.last_message_at
            ? new Intl.DateTimeFormat('en-IN', {
                hour: 'numeric',
                minute: '2-digit',
              }).format(new Date(item.last_message_at))
            : labels.now}
        </p>
      </div>
      <Button
        render={<Link href={`/inbox?c=${item.id}`} />}
        className="h-11 rounded-[10px]"
      >
        {labels.open} <ArrowRight />
      </Button>
    </article>
  );
}
