'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  MessageCircleMore,
  Radio,
  UserPlus,
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

type WhatsAppSetup = {
  phone_number_id: string | null;
  registered_at: string | null;
};

/**
 * Saathi's customer-facing home. It deliberately leads with the next useful
 * action instead of a dense CRM dashboard: reply, add a customer, send an
 * offer, or complete the one-time WhatsApp connection.
 */
export default function TodayPage() {
  const t = useTranslations('Today');
  const { accountId, profile, account } = useAuth();
  const [conversations, setConversations] = useState<ConversationAttention[]>(
    []
  );
  const [followUps, setFollowUps] = useState<FollowUpAttention[]>([]);
  const [confirmedJobs, setConfirmedJobs] = useState(0);
  const [whatsApp, setWhatsApp] = useState<WhatsAppSetup | null>(null);
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

    const [conversationsRes, followUpsRes, membersRes, jobsRes, whatsAppRes] =
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
        supabase
          .from('whatsapp_config')
          .select('phone_number_id,registered_at')
          .eq('account_id', accountId)
          .maybeSingle(),
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
          member.full_name || t('team'),
        ])
      );
      setFollowUps(
        ((followUpsRes.data ?? []) as unknown as FollowUpAttention[]).map(
          (row) => ({ ...row, ownerName: names.get(row.assigned_to_user_id) })
        )
      );
      setConfirmedJobs(jobsRes.count ?? 0);
      // A missing row is normal for a new workspace. A failed optional
      // status lookup must not make a shop owner's whole home screen fail.
      setWhatsApp((whatsAppRes.data as WhatsAppSetup | null) ?? null);
      setLoadedAt(Date.now());
    }
    setLoading(false);
  }, [accountId, t, timeZone]);

  useEffect(() => {
    // The async loader owns its state transitions once the Supabase queries
    // settle; invoking it here starts the initial external-data sync.
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
    () => [...overdue.slice(0, 3), ...conversations.slice(0, 3)],
    [overdue, conversations]
  );
  const firstName = (profile?.full_name || profile?.email || t('there'))
    .trim()
    .split(/\s+/)[0];
  const connected = Boolean(
    whatsApp?.phone_number_id && whatsApp?.registered_at
  );
  const hour = new Date().toLocaleString('en-US', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  });
  const greeting =
    Number(hour) < 12
      ? t('goodMorning')
      : Number(hour) < 17
        ? t('goodAfternoon')
        : t('goodEvening');
  const dateLabel = new Intl.DateTimeFormat(
    profile?.language_preference === 'hi' ? 'hi-IN' : 'en-IN',
    { timeZone, weekday: 'long', day: 'numeric', month: 'long' }
  ).format(new Date());

  return (
    <div
      className={`mx-auto w-full max-w-[1180px] space-y-6 pb-8 ${profile?.language_preference === 'hi' ? 'font-indic' : ''}`}
    >
      {!online ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[#f0be71] bg-[#fff5e6] p-3 text-sm text-[#8a4b08]">
          <WifiOff className="size-4" />
          {t('offline')}
        </div>
      ) : null}

      <section className="relative overflow-hidden rounded-3xl bg-[#123d32] px-5 py-6 text-white shadow-[0_18px_45px_-26px_rgba(10,70,52,0.9)] sm:px-8 sm:py-8">
        <div className="absolute -top-24 -right-20 size-64 rounded-full bg-[#79d8bd]/15 blur-2xl" />
        <div className="absolute right-24 -bottom-28 size-52 rounded-full bg-[#f8c760]/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#bce8db]">{dateLabel}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {greeting}, {firstName}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              {connected
                ? t('connectedWelcome', {
                    business: account?.name || t('yourBusiness'),
                  })
                : t('setupWelcome')}
            </p>
          </div>
          <Button
            render={<Link href={connected ? '/inbox' : '/connect-whatsapp'} />}
            className="h-12 rounded-2xl bg-[#e9fbf4] px-5 text-sm font-semibold text-[#123d32] hover:bg-white"
          >
            {connected ? (
              <MessageCircleMore className="size-4" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {connected ? t('openInbox') : t('connectWhatsApp')}
          </Button>
        </div>
      </section>

      {!connected ? (
        <section className="overflow-hidden rounded-3xl border border-[#b8dfd1] bg-[#f3fbf7] p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#126b56] text-white shadow-sm">
                <MessageCircleMore className="size-6" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[#17382e]">
                  {t('connectionCardTitle')}
                </p>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#4a665d]">
                  {t('connectionCardBody')}
                </p>
              </div>
            </div>
            <Button
              render={<Link href="/connect-whatsapp" />}
              className="h-11 shrink-0 rounded-xl px-4"
            >
              {t('startSetup')} <ArrowRight className="size-4" />
            </Button>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3">
          <h2 className="text-xl font-semibold tracking-tight">
            {t('quickActions')}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('quickActionsHint')}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            href="/inbox"
            icon={MessageCircleMore}
            title={t('replyCustomers')}
            description={t('replyCustomersHint')}
            tone="green"
          />
          <QuickAction
            href="/contacts"
            icon={UserPlus}
            title={t('addCustomer')}
            description={t('addCustomerHint')}
            tone="blue"
          />
          <QuickAction
            href="/broadcasts/new"
            icon={Radio}
            title={t('sendOffer')}
            description={t('sendOfferHint')}
            tone="amber"
          />
          <QuickAction
            href="/follow-ups"
            icon={BellRing}
            title={t('planFollowUp')}
            description={t('planFollowUpHint')}
            tone="violet"
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          title={t('waitingForReply')}
          value={conversations.length}
          hint={t('waitingHint')}
          icon={MessageCircleMore}
          tone="green"
        />
        <MetricCard
          title={t('followUpsDue')}
          value={overdue.length}
          hint={t('followUpHint')}
          icon={Clock3}
          tone="amber"
        />
        <MetricCard
          title={t('jobsConfirmed')}
          value={confirmedJobs}
          hint={t('jobsHint')}
          icon={CheckCircle2}
          tone="blue"
        />
      </section>

      {error ? (
        <div
          role="alert"
          className="border-destructive/30 text-destructive rounded-2xl border bg-[#fff2f0] p-4 text-sm"
        >
          {error}. {t('migrationHint')}{' '}
          <button onClick={load} className="font-semibold underline">
            {t('retry')}
          </button>
        </div>
      ) : null}

      <section className="bg-card rounded-3xl border p-4 shadow-[0_12px_30px_-25px_rgba(22,55,45,0.45)] sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {t('needsAttention')}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {attention.length
                ? t('attentionCount', {
                    count: attention.length,
                    overdue: overdue.length,
                  })
                : t('allCaughtUp')}
            </p>
          </div>
          {attention.length ? (
            <Link
              href={conversations.length ? '/inbox' : '/follow-ups'}
              className="text-primary text-sm font-semibold hover:underline"
            >
              {t('viewAll')} <ArrowRight className="ml-1 inline size-3.5" />
            </Link>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-5 space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="bg-muted h-16 animate-pulse rounded-2xl"
              />
            ))}
          </div>
        ) : attention.length === 0 && later.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-[#f6faf8] px-5 py-8 text-center">
            <div className="text-primary mx-auto grid size-12 place-items-center rounded-2xl bg-[#dff3ea]">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="mt-3 font-semibold">{t('emptyTitle')}</h3>
            <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm leading-6">
              {t('friendlyEmptyBody')}
            </p>
          </div>
        ) : (
          <div className="divide-border/80 mt-5 divide-y">
            {overdue.slice(0, 3).map((item) => (
              <FollowUpRow
                key={item.id}
                item={item}
                timeZone={timeZone}
                overdue
              />
            ))}
            {conversations.slice(0, 3).map((item) => (
              <ConversationRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {!loading && later.length ? (
        <section className="bg-card rounded-3xl border p-4 sm:p-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                {t('laterToday')}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {t('laterHint')}
              </p>
            </div>
            <Link
              href="/follow-ups"
              className="text-primary text-sm font-semibold hover:underline"
            >
              {t('viewAll')}
            </Link>
          </div>
          <div className="divide-border/80 mt-4 divide-y">
            {later.slice(0, 3).map((item) => (
              <FollowUpRow key={item.id} item={item} timeZone={timeZone} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
  tone,
}: {
  href: string;
  icon: typeof Clock3;
  title: string;
  description: string;
  tone: 'green' | 'blue' | 'amber' | 'violet';
}) {
  const tones = {
    green: 'bg-[#e4f5ee] text-[#126b56] group-hover:bg-[#ccebdc]',
    blue: 'bg-[#e8f0ff] text-[#255dc1] group-hover:bg-[#d6e4ff]',
    amber: 'bg-[#fff3d8] text-[#a76500] group-hover:bg-[#ffe8b5]',
    violet: 'bg-[#f1ebff] text-[#6b43b5] group-hover:bg-[#e4d8ff]',
  };
  return (
    <Link
      href={href}
      className="group bg-card rounded-3xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-22px_rgba(22,55,45,0.5)]"
    >
      <div
        className={`grid size-11 place-items-center rounded-2xl transition-colors ${tones[tone]}`}
      >
        <Icon className="size-5" />
      </div>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="text-muted-foreground mt-1 text-sm leading-5">
        {description}
      </p>
    </Link>
  );
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  hint: string;
  icon: typeof Clock3;
  tone: 'green' | 'blue' | 'amber';
}) {
  const tones = {
    green: 'bg-[#e4f5ee] text-[#126b56]',
    blue: 'bg-[#e8f0ff] text-[#255dc1]',
    amber: 'bg-[#fff3d8] text-[#a76500]',
  };
  return (
    <div className="bg-card rounded-3xl border p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm font-medium">{title}</p>
        <span
          className={`grid size-9 place-items-center rounded-xl ${tones[tone]}`}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">
        {value.toLocaleString('en-IN')}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
    </div>
  );
}

function FollowUpRow({
  item,
  timeZone,
  overdue = false,
}: {
  item: FollowUpAttention;
  timeZone: string;
  overdue?: boolean;
}) {
  return (
    <Link
      href="/follow-ups"
      className="hover:bg-muted/30 flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${overdue ? 'text-destructive bg-[#fff0ed]' : 'bg-[#fff3d8] text-[#a76500]'}`}
      >
        <Clock3 className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {item.contact?.name || item.contact?.phone}
        </span>
        <span className="text-muted-foreground mt-0.5 block truncate text-xs">
          {item.purpose}
        </span>
      </span>
      <span
        className={`text-right text-xs font-semibold ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}
      >
        {new Intl.DateTimeFormat('en-IN', {
          timeZone,
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
        }).format(new Date(item.due_at))}
      </span>
      <ArrowRight className="text-muted-foreground size-4 shrink-0" />
    </Link>
  );
}

function ConversationRow({ item }: { item: ConversationAttention }) {
  return (
    <Link
      href={`/inbox?c=${item.id}`}
      className="hover:bg-muted/30 flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"
    >
      <span className="text-primary grid size-10 shrink-0 place-items-center rounded-xl bg-[#e4f5ee]">
        <MessageCircleMore className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {item.contact?.name || item.contact?.phone}
        </span>
        <span className="text-muted-foreground mt-0.5 block truncate text-xs">
          {item.last_message_text || 'New customer message'}
        </span>
      </span>
      <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
        {item.unread_count}
      </span>
      <ArrowRight className="text-muted-foreground size-4 shrink-0" />
    </Link>
  );
}
