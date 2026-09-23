'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Check, Clock3, MoreHorizontal, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { groupFollowUps } from '@/lib/follow-ups/group';
import type { Contact, FollowUp } from '@/types';
import { FollowUpDialog } from '@/components/follow-ups/follow-up-dialog';

type FollowUpRow = FollowUp & {
  contact: Pick<Contact, 'id' | 'name' | 'phone'>;
  ownerName?: string;
};

export default function FollowUpsPage() {
  const t = useTranslations('FollowUps');
  const { accountId, canSendMessages, profile } = useAuth();
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [contacts, setContacts] = useState<
    Array<Pick<Contact, 'id' | 'name' | 'phone'>>
  >([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const pendingIdsRef = useRef(new Set<string>());
  const timeZone = profile?.business_timezone ?? 'Asia/Kolkata';

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const [followUpsRes, contactsRes, profilesRes] = await Promise.all([
      supabase
        .from('follow_ups')
        .select('*, contact:contacts(id,name,phone)')
        .eq('account_id', accountId)
        .order('due_at', { ascending: true }),
      supabase
        .from('contacts')
        .select('id,name,phone')
        .eq('account_id', accountId)
        .order('name', { ascending: true })
        .limit(200),
      supabase
        .from('profiles')
        .select('user_id,full_name')
        .eq('account_id', accountId),
    ]);

    if (followUpsRes.error) {
      setError(followUpsRes.error.message);
    } else {
      const ownerNames = new Map(
        (profilesRes.data ?? []).map((p) => [
          p.user_id,
          p.full_name || t('teamMember'),
        ])
      );
      setRows(
        ((followUpsRes.data ?? []) as unknown as FollowUpRow[]).map((row) => ({
          ...row,
          ownerName: ownerNames.get(row.assigned_to_user_id),
        }))
      );
    }

    const contactRows = (contactsRes.data ?? []) as Array<
      Pick<Contact, 'id' | 'name' | 'phone'>
    >;
    setContacts(contactRows);
    setSelectedContactId((current) => current || contactRows[0]?.id || '');
    setLoading(false);
  }, [accountId, t]);

  useEffect(() => {
    // Data fetch resolves asynchronously; state is not derived synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const { groups, filteredCount, ownerOptions } = useMemo(() => {
    const allGroups = groupFollowUps(rows, timeZone);
    const dueIds =
      dueFilter === 'overdue'
        ? new Set(allGroups.overdue.map((row) => row.id))
        : dueFilter === 'today'
          ? new Set(allGroups.dueToday.map((row) => row.id))
          : dueFilter === 'upcoming'
            ? new Set(allGroups.upcoming.map((row) => row.id))
            : null;
    const normalizedCustomer = customerFilter.trim().toLocaleLowerCase();
    const filtered = rows.filter((row) => {
      const customer =
        `${row.contact?.name ?? ''} ${row.contact?.phone ?? ''}`.toLocaleLowerCase();
      return (
        (ownerFilter === 'all' || row.assigned_to_user_id === ownerFilter) &&
        (statusFilter === 'all' || row.status === statusFilter) &&
        (!dueIds || dueIds.has(row.id)) &&
        (!normalizedCustomer || customer.includes(normalizedCustomer))
      );
    });
    const owners = Array.from(
      new Map(
        rows.map((row) => [
          row.assigned_to_user_id,
          row.ownerName || t('teamMember'),
        ])
      )
    );
    return {
      groups: groupFollowUps(filtered, timeZone),
      filteredCount: filtered.length,
      ownerOptions: owners,
    };
  }, [customerFilter, dueFilter, ownerFilter, rows, statusFilter, t, timeZone]);

  async function setCompleted(row: FollowUpRow, completed: boolean) {
    if (pendingIdsRef.current.has(row.id)) return;
    pendingIdsRef.current.add(row.id);
    setPendingIds((current) => new Set(current).add(row.id));
    const previous = rows;
    setRows((current) =>
      current.map((item) =>
        item.id === row.id
          ? { ...item, status: completed ? 'completed' : 'open' }
          : item
      )
    );
    const { error: updateError } = await createClient()
      .from('follow_ups')
      .update({ status: completed ? 'completed' : 'open' })
      .eq('id', row.id);
    if (updateError) {
      setRows(previous);
      toast.error(updateError.message);
      pendingIdsRef.current.delete(row.id);
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
      return;
    }
    toast.success(completed ? t('completedSuccess') : t('reopenedSuccess'));
    pendingIdsRef.current.delete(row.id);
    setPendingIds((current) => {
      const next = new Set(current);
      next.delete(row.id);
      return next;
    });
  }

  const selectedContact = contacts.find(
    (contact) => contact.id === selectedContactId
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('subtitle')} · {timeZone}
          </p>
        </div>
        {selectedContact ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="follow-up-contact">
              Customer
            </label>
            <select
              id="follow-up-contact"
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="border-input bg-card h-11 min-w-52 rounded-[10px] border px-3 text-sm"
            >
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name || contact.phone}
                </option>
              ))}
            </select>
            <div className="sm:w-48">
              <FollowUpDialog contact={selectedContact} onCreated={load} />
            </div>
          </div>
        ) : null}
      </div>

      <div
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Follow-up filters"
      >
        <select
          value={ownerFilter}
          onChange={(event) => setOwnerFilter(event.target.value)}
          aria-label={t('allOwners')}
          className="border-input bg-card h-11 rounded-[10px] border px-3 text-sm"
        >
          <option value="all">{t('allOwners')}</option>
          {ownerOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label={t('allStatuses')}
          className="border-input bg-card h-11 rounded-[10px] border px-3 text-sm"
        >
          <option value="all">{t('allStatuses')}</option>
          <option value="open">{t('openStatus')}</option>
          <option value="completed">{t('completed')}</option>
        </select>
        <select
          value={dueFilter}
          onChange={(event) => setDueFilter(event.target.value)}
          aria-label={t('dueDate')}
          className="border-input bg-card h-11 rounded-[10px] border px-3 text-sm"
        >
          <option value="all">{t('allDates')}</option>
          <option value="overdue">{t('overdue')}</option>
          <option value="today">{t('today')}</option>
          <option value="upcoming">{t('upcoming')}</option>
        </select>
        <input
          value={customerFilter}
          onChange={(event) => setCustomerFilter(event.target.value)}
          aria-label={t('customer')}
          placeholder={t('customerPlaceholder')}
          className="border-input bg-card h-11 rounded-[10px] border px-3 text-sm"
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="border-destructive text-destructive rounded-[14px] border bg-[#fdecea] p-4 text-sm"
        >
          {error}. {t('migrationError')}{' '}
          <button className="font-semibold underline" onClick={load}>
            {t('retry')}
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-label="Loading follow-ups">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="bg-muted h-20 animate-pulse rounded-[14px]"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="border-border bg-card rounded-[14px] border border-dashed p-10 text-center">
          <Clock3 className="text-primary mx-auto size-8" />
          <h2 className="mt-3 font-semibold">{t('emptyTitle')}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t('emptyBody')}</p>
        </div>
      ) : filteredCount === 0 ? (
        <div className="border-border bg-card rounded-[14px] border border-dashed p-10 text-center">
          <h2 className="font-semibold">{t('noMatchesTitle')}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('noMatchesBody')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <FollowUpSection
            title={t('overdue')}
            rows={groups.overdue}
            variant="overdue"
            timeZone={timeZone}
            canEdit={canSendMessages}
            pendingIds={pendingIds}
            onToggle={setCompleted}
            labels={{
              taskCount: (count) => t('taskCount', { count }),
              owner: t('owner'),
              teamMember: t('teamMember'),
              customer: t('customer'),
              reopen: t('reopen'),
              complete: t('complete'),
            }}
          />
          <FollowUpSection
            title={t('today')}
            rows={groups.dueToday}
            variant="today"
            timeZone={timeZone}
            canEdit={canSendMessages}
            pendingIds={pendingIds}
            onToggle={setCompleted}
            labels={{
              taskCount: (count) => t('taskCount', { count }),
              owner: t('owner'),
              teamMember: t('teamMember'),
              customer: t('customer'),
              reopen: t('reopen'),
              complete: t('complete'),
            }}
          />
          <FollowUpSection
            title={t('upcoming')}
            rows={groups.upcoming}
            variant="upcoming"
            timeZone={timeZone}
            canEdit={canSendMessages}
            pendingIds={pendingIds}
            onToggle={setCompleted}
            labels={{
              taskCount: (count) => t('taskCount', { count }),
              owner: t('owner'),
              teamMember: t('teamMember'),
              customer: t('customer'),
              reopen: t('reopen'),
              complete: t('complete'),
            }}
          />
          <FollowUpSection
            title={t('completed')}
            rows={groups.completed}
            variant="completed"
            timeZone={timeZone}
            canEdit={canSendMessages}
            pendingIds={pendingIds}
            onToggle={setCompleted}
            labels={{
              taskCount: (count) => t('taskCount', { count }),
              owner: t('owner'),
              teamMember: t('teamMember'),
              customer: t('customer'),
              reopen: t('reopen'),
              complete: t('complete'),
            }}
          />
        </div>
      )}

      <div className="flex items-center justify-between rounded-[14px] bg-[#102a23] px-4 py-3 text-sm text-white">
        <span>✓ {t('internalOnly')}</span>
        <Link href="/inbox" className="font-semibold text-[#6fd1b3]">
          {t('openInbox')}
        </Link>
      </div>
    </div>
  );
}

function FollowUpSection({
  title,
  rows,
  variant,
  timeZone,
  canEdit,
  pendingIds,
  onToggle,
  labels,
}: {
  title: string;
  rows: FollowUpRow[];
  variant: 'overdue' | 'today' | 'upcoming' | 'completed';
  timeZone: string;
  canEdit: boolean;
  pendingIds: Set<string>;
  onToggle: (row: FollowUpRow, completed: boolean) => void;
  labels: {
    taskCount: (count: number) => string;
    owner: string;
    teamMember: string;
    customer: string;
    reopen: string;
    complete: string;
  };
}) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-muted-foreground text-sm">
          {labels.taskCount(rows.length)}
        </span>
      </div>
      {rows.map((row) => (
        <article
          key={row.id}
          className={`bg-card grid gap-3 rounded-[14px] border p-4 sm:grid-cols-[auto_170px_1fr_170px_auto] sm:items-center ${variant === 'overdue' ? 'border-l-destructive border-l-4' : 'border-border'}`}
        >
          <button
            type="button"
            disabled={!canEdit || pendingIds.has(row.id)}
            onClick={() => onToggle(row, row.status !== 'completed')}
            className={`flex size-6 items-center justify-center rounded-md border ${row.status === 'completed' ? 'border-primary bg-primary text-white' : 'border-border'}`}
            aria-label={
              row.status === 'completed' ? labels.reopen : labels.complete
            }
          >
            {row.status === 'completed' ? <Check className="size-4" /> : null}
          </button>
          <div>
            <p className="font-semibold">
              {row.contact?.name || row.contact?.phone || labels.customer}
            </p>
            <p className="text-muted-foreground text-xs">
              {labels.owner}: {row.ownerName || labels.teamMember}
            </p>
          </div>
          <div>
            <p className="text-sm">{row.purpose}</p>
            {row.note ? (
              <p className="text-muted-foreground mt-0.5 text-xs">{row.note}</p>
            ) : null}
          </div>
          <div>
            <p
              className={`text-sm font-semibold ${variant === 'overdue' ? 'text-destructive' : 'text-foreground'}`}
            >
              {new Intl.DateTimeFormat('en-IN', {
                timeZone,
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
              }).format(new Date(row.due_at))}
            </p>
            <span
              className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${variant === 'overdue' ? 'text-destructive bg-[#fdecea]' : variant === 'today' ? 'bg-[#e8f0ff] text-[#255dc1]' : variant === 'completed' ? 'bg-primary-soft text-primary' : 'bg-muted text-muted-foreground'}`}
            >
              {title}
            </span>
          </div>
          {row.status === 'completed' ? (
            <RotateCcw className="text-muted-foreground size-4" />
          ) : (
            <MoreHorizontal className="text-muted-foreground size-5" />
          )}
        </article>
      ))}
    </section>
  );
}
