import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/whatsapp/encryption';
import { registerPhoneNumber } from '@/lib/whatsapp/meta-api';
import { canEditSettings, isAccountRole } from '@/lib/auth/roles';

async function resolveAccount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ accountId: string; canEdit: boolean } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_id,account_role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data?.account_id) return null;
  return {
    accountId: data.account_id as string,
    canEdit:
      isAccountRole(data.account_role) && canEditSettings(data.account_role),
  };
}

/** Complete the PIN-only final step after Embedded Signup. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const account = await resolveAccount(supabase, user.id);
  if (!account) {
    return NextResponse.json(
      { error: 'Business workspace not found.' },
      { status: 403 }
    );
  }
  if (!account.canEdit) {
    return NextResponse.json(
      { error: 'Only an owner or admin can connect WhatsApp.' },
      { status: 403 }
    );
  }
  const { accountId } = account;

  const { pin } = await request.json().catch(() => ({}));
  if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
    return NextResponse.json(
      { error: 'Enter the six-digit PIN from Meta.' },
      { status: 400 }
    );
  }

  const { data: config, error: configError } = await supabase
    .from('whatsapp_config')
    .select('phone_number_id,access_token')
    .eq('account_id', accountId)
    .maybeSingle();
  if (configError || !config) {
    return NextResponse.json(
      { error: 'Start the WhatsApp connection first.' },
      { status: 400 }
    );
  }

  try {
    await registerPhoneNumber({
      phoneNumberId: config.phone_number_id,
      accessToken: decrypt(config.access_token),
      pin,
    });
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('whatsapp_config')
      .update({
        status: 'connected',
        connected_at: now,
        registered_at: now,
        last_registration_error: null,
        updated_at: now,
      })
      .eq('account_id', accountId);
    if (updateError) throw updateError;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    console.error('[embedded-signup] register failed:', message);
    return NextResponse.json(
      {
        error:
          'Meta could not activate this number. Check the six-digit PIN and try again.',
      },
      { status: 400 }
    );
  }
}
