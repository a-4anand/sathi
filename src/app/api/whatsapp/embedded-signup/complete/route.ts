import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  exchangeEmbeddedSignupCode,
  listWabaPhoneNumbers,
  subscribeWabaToApp,
  verifyPhoneNumber,
} from '@/lib/whatsapp/meta-api';
import { encrypt } from '@/lib/whatsapp/encryption';
import { canEditSettings, isAccountRole } from '@/lib/auth/roles';
import {
  isNumericMetaId,
  phoneNumberBelongsToWaba,
} from '@/lib/whatsapp/waba-pairing';

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

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Finishes Meta Embedded Signup for the currently authenticated workspace.
 * The browser supplies only the short-lived login code and the two asset IDs
 * Meta disclosed in its signed-up message. This route exchanges the code on
 * the server, verifies that the IDs belong together, encrypts the resulting
 * token, and subscribes the WABA to Saathi's webhook app.
 */
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
      { error: 'Your profile is not linked to a business workspace.' },
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

  let body: { code?: unknown; waba_id?: unknown; phone_number_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid signup response.' },
      { status: 400 }
    );
  }

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const wabaId = typeof body.waba_id === 'string' ? body.waba_id.trim() : '';
  const phoneNumberId =
    typeof body.phone_number_id === 'string' ? body.phone_number_id.trim() : '';
  if (!code || !isNumericMetaId(wabaId) || !isNumericMetaId(phoneNumberId)) {
    return NextResponse.json(
      {
        error:
          'Meta did not return a valid WhatsApp Business Account and phone number. Please try connecting again.',
      },
      { status: 400 }
    );
  }

  const { data: claimed, error: claimError } = await adminClient()
    .from('whatsapp_config')
    .select('account_id')
    .eq('phone_number_id', phoneNumberId)
    .neq('account_id', accountId)
    .maybeSingle();
  if (claimError) {
    console.error(
      '[embedded-signup] unable to check phone ownership:',
      claimError.message
    );
    return NextResponse.json(
      { error: 'Could not check this phone number.' },
      { status: 500 }
    );
  }
  if (claimed) {
    return NextResponse.json(
      {
        error:
          'This WhatsApp number is already connected to another Saathi business.',
      },
      { status: 409 }
    );
  }

  try {
    const { accessToken } = await exchangeEmbeddedSignupCode({ code });
    await verifyPhoneNumber({ phoneNumberId, accessToken });
    const numbers = await listWabaPhoneNumbers({ wabaId, accessToken });
    if (!phoneNumberBelongsToWaba(numbers, phoneNumberId)) {
      return NextResponse.json(
        {
          error:
            'The selected phone number does not belong to this WhatsApp business.',
        },
        { status: 400 }
      );
    }
    await subscribeWabaToApp({ wabaId, accessToken });

    const encryptedToken = encrypt(accessToken);
    const now = new Date().toISOString();
    const row = {
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
      access_token: encryptedToken,
      verify_token: null,
      // Embedded Signup grants asset access. Registering a production number
      // still needs the 6-digit PIN selected in Meta, handled by the next
      // route so no user ever has to reveal a token or an app secret.
      status: 'disconnected',
      connected_at: null,
      registered_at: null,
      subscribed_apps_at: now,
      last_registration_error:
        'Enter your six-digit Meta two-step verification PIN to finish activation.',
      updated_at: now,
    };
    const { data: existing, error: existingError } = await supabase
      .from('whatsapp_config')
      .select('id')
      .eq('account_id', accountId)
      .maybeSingle();
    if (existingError) throw existingError;
    const write = existing
      ? supabase.from('whatsapp_config').update(row).eq('account_id', accountId)
      : supabase
          .from('whatsapp_config')
          .insert({ account_id: accountId, user_id: user.id, ...row });
    const { error: writeError } = await write;
    if (writeError) throw writeError;

    return NextResponse.json({
      success: true,
      needs_pin: true,
      phone_number_id: phoneNumberId,
    });
  } catch (error) {
    // Never log or return the authorization code or token. MetaApiError's
    // message is safe to surface and is generally the fastest way for an
    // operator to distinguish app-review from asset-permission issues.
    const message =
      error instanceof Error ? error.message : 'Could not connect WhatsApp.';
    console.error('[embedded-signup] completion failed:', message);
    return NextResponse.json(
      {
        error:
          'Could not connect this WhatsApp business. Please try again or use secure setup.',
      },
      { status: 502 }
    );
  }
}
