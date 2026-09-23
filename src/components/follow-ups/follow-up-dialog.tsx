'use client';

import { useEffect, useMemo, useState } from 'react';
import { BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import type { Contact } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface MemberOption {
  user_id: string;
  full_name: string | null;
}

interface FollowUpDialogProps {
  contact: Pick<Contact, 'id' | 'name' | 'phone'>;
  conversationId?: string | null;
  onCreated?: () => void;
}

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function FollowUpDialog({
  contact,
  conversationId,
  onCreated,
}: FollowUpDialogProps) {
  const t = useTranslations('FollowUps');
  const { accountId, user, canSendMessages, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [date, setDate] = useState(() => dateInputValue(new Date()));
  const [time, setTime] = useState('16:00');
  const [ownerId, setOwnerId] = useState(user?.id ?? '');
  const [purpose, setPurpose] = useState(() => t('defaultPurpose'));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const customerName = contact.name || contact.phone;
  const minDate = useMemo(() => dateInputValue(new Date()), []);

  useEffect(() => {
    if (!open || !accountId) return;
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('account_id', accountId)
      .order('full_name')
      .then(({ data }) => {
        const rows = (data ?? []) as MemberOption[];
        setMembers(rows);
        setOwnerId((current) => current || user?.id || rows[0]?.user_id || '');
      });
  }, [open, accountId, user?.id]);

  async function createFollowUp() {
    if (saving || !accountId || !user?.id || !ownerId || !purpose.trim())
      return;
    setError(null);

    // The first supported business timezone is explicit IST. It is encoded
    // independently from the browser timezone so travel cannot move a task.
    const offset =
      profile?.business_timezone === 'Asia/Kolkata' ? '+05:30' : '';
    const due = new Date(`${date}T${time}:00${offset}`);
    if (Number.isNaN(due.getTime()) || due.getTime() < Date.now()) {
      setError(t('futureError'));
      return;
    }

    setSaving(true);
    const { error: insertError } = await createClient()
      .from('follow_ups')
      .insert({
        account_id: accountId,
        contact_id: contact.id,
        conversation_id: conversationId ?? null,
        purpose: purpose.trim(),
        note: note.trim() || null,
        due_at: due.toISOString(),
        assigned_to_user_id: ownerId,
        created_by_user_id: user.id,
      });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    toast.success(t('createdSuccess', { customer: customerName }));
    setOpen(false);
    onCreated?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        disabled={!canSendMessages}
        render={<Button className="h-11 w-full rounded-[10px]" />}
      >
        <BellRing /> {t('create')}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[18px] p-6 sm:max-w-xl">
        <DialogHeader>
          <p className="text-primary text-xs font-bold tracking-wide uppercase">
            {t('fromConversation', { customer: customerName })}
          </p>
          <DialogTitle className="text-2xl font-bold">
            {t('create')}
          </DialogTitle>
          <DialogDescription>
            {t('dialogDescription', { customer: customerName })}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-primary-soft flex items-start gap-3 rounded-[14px] p-4">
          <span className="bg-primary mt-1 size-3 shrink-0 rounded-full" />
          <div>
            <p className="text-foreground font-semibold">{t('remindTeam')}</p>
            <p className="text-muted-foreground text-xs">{t('internalTask')}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="follow-up-date">{t('date')}</Label>
            <Input
              id="follow-up-date"
              type="date"
              min={minDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="follow-up-time">{t('time')}</Label>
            <Input
              id="follow-up-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-11"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="follow-up-owner">{t('owner')}</Label>
          <select
            id="follow-up-owner"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            className="border-input bg-background focus-visible:ring-ring/50 h-11 w-full rounded-[10px] border px-3 text-sm outline-none focus-visible:ring-3"
          >
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.full_name || t('teamMember')}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="follow-up-purpose">{t('purpose')}</Label>
          <Input
            id="follow-up-purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="follow-up-note">{t('optionalNote')}</Label>
          <Textarea
            id="follow-up-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('notePlaceholder')}
          />
        </div>

        <div className="rounded-[14px] bg-[#fff3d6] p-4 text-sm">
          <p className="font-semibold text-[#8a4b08]">
            {t('contactLaterTitle')}
          </p>
          <p className="text-foreground mt-1 text-xs">
            {t('contactLaterBody')}
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="border-destructive text-destructive rounded-[14px] border bg-[#fdecea] p-3 text-sm"
          >
            {error}
          </div>
        ) : null}

        <DialogFooter className="-mx-6 -mb-6 px-6">
          <Button
            variant="outline"
            className="h-11"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            {t('cancel')}
          </Button>
          <Button
            className="h-11"
            onClick={createFollowUp}
            disabled={saving || !ownerId || !purpose.trim()}
          >
            {saving ? t('creating') : t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
