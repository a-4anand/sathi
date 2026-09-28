import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }
  return value;
}

/** Exchanges Supabase's PKCE email code and returns to the app. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const nextPath = safeNextPath(request.nextUrl.searchParams.get('next'));
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent('The verification link is invalid or has expired.')}`,
        origin
      )
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent('Email verification could not be completed. Please request a new link.')}`,
        origin
      )
    );
  }

  return NextResponse.redirect(new URL(nextPath, origin));
}
