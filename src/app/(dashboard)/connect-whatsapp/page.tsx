'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  CircleHelp,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type MetaSignupAssets = { wabaId: string; phoneNumberId: string };

type FacebookSdk = {
  init: (options: {
    appId: string;
    cookie: boolean;
    xfbml: boolean;
    version: string;
  }) => void;
  login: (
    callback: (response: { authResponse?: { code?: string } }) => void,
    options: {
      config_id: string;
      response_type: 'code';
      override_default_response_type: true;
    }
  ) => void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
  }
}

const META_EVENT_ORIGINS = new Set([
  'https://www.facebook.com',
  'https://web.facebook.com',
  'https://business.facebook.com',
]);

function parseSignupAssets(value: unknown): MetaSignupAssets | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as {
    type?: unknown;
    event?: unknown;
    data?: { waba_id?: unknown; phone_number_id?: unknown };
  };
  if (event.type !== 'WA_EMBEDDED_SIGNUP' || event.event !== 'FINISH')
    return null;
  const wabaId = event.data?.waba_id;
  const phoneNumberId = event.data?.phone_number_id;
  if (
    typeof wabaId !== 'string' ||
    typeof phoneNumberId !== 'string' ||
    !/^\d+$/.test(wabaId) ||
    !/^\d+$/.test(phoneNumberId)
  ) {
    return null;
  }
  return { wabaId, phoneNumberId };
}

/**
 * Meta Embedded Signup returns a short-lived browser code and asset IDs.
 * The API route exchanges that code server-side, so a secret or permanent
 * access token never reaches a customer's browser.
 */
export default function ConnectWhatsAppPage() {
  const t = useTranslations('ConnectWhatsApp');
  const router = useRouter();
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const configurationId =
    process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID;
  const enabled = Boolean(appId && configurationId);
  const [sdkReady, setSdkReady] = useState(false);
  const [stage, setStage] = useState<
    'idle' | 'connecting' | 'pin' | 'finishing'
  >('idle');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<string | null>(null);
  const assetsRef = useRef<MetaSignupAssets | null>(null);
  const completingRef = useRef(false);

  const completeConnection = useCallback(async () => {
    if (!codeRef.current || !assetsRef.current || completingRef.current) return;
    completingRef.current = true;
    setStage('connecting');
    setError(null);
    try {
      const response = await fetch('/api/whatsapp/embedded-signup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeRef.current,
          waba_id: assetsRef.current.wabaId,
          phone_number_id: assetsRef.current.phoneNumberId,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
      };
      if (!response.ok || !result.success)
        throw new Error(result.error || t('connectionError'));
      setStage('pin');
    } catch (cause) {
      completingRef.current = false;
      setStage('idle');
      setError(cause instanceof Error ? cause.message : t('connectionError'));
    }
  }, [t]);

  useEffect(() => {
    if (!enabled || !appId) return;
    const initialise = () => {
      if (!window.FB) return;
      window.FB.init({ appId, cookie: true, xfbml: false, version: 'v21.0' });
      setSdkReady(true);
    };
    const existing = document.getElementById(
      'meta-facebook-sdk'
    ) as HTMLScriptElement | null;
    if (window.FB) {
      initialise();
    } else if (existing) {
      existing.addEventListener('load', initialise, { once: true });
    } else {
      const script = document.createElement('script');
      script.id = 'meta-facebook-sdk';
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.addEventListener('load', initialise, { once: true });
      document.head.appendChild(script);
    }
  }, [appId, enabled]);

  useEffect(() => {
    const receiveMetaEvent = (message: MessageEvent<unknown>) => {
      if (!META_EVENT_ORIGINS.has(message.origin)) return;
      let payload: unknown = message.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      const assets = parseSignupAssets(payload);
      if (!assets) return;
      assetsRef.current = assets;
      void completeConnection();
    };
    window.addEventListener('message', receiveMetaEvent);
    return () => window.removeEventListener('message', receiveMetaEvent);
  }, [completeConnection]);

  const beginSignup = () => {
    if (!configurationId || !window.FB || !sdkReady) return;
    setError(null);
    codeRef.current = null;
    assetsRef.current = null;
    completingRef.current = false;
    setStage('connecting');
    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (!code) {
          setStage('idle');
          setError(t('cancelled'));
          return;
        }
        codeRef.current = code;
        void completeConnection();
      },
      {
        config_id: configurationId,
        response_type: 'code',
        override_default_response_type: true,
      }
    );
  };

  const finishRegistration = async () => {
    if (!/^\d{6}$/.test(pin)) {
      setError(t('pinError'));
      return;
    }
    setStage('finishing');
    setError(null);
    try {
      const response = await fetch('/api/whatsapp/embedded-signup/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
      };
      if (!response.ok || !result.success)
        throw new Error(result.error || t('pinError'));
      router.replace('/dashboard?connected=whatsapp');
      router.refresh();
    } catch (cause) {
      setStage('pin');
      setError(cause instanceof Error ? cause.message : t('pinError'));
    }
  };

  const working = stage === 'connecting' || stage === 'finishing';

  return (
    <div className="mx-auto w-full max-w-4xl pb-10">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="size-4" />
        {t('back')}
      </Link>

      <section className="relative mt-5 overflow-hidden rounded-[2rem] bg-[#123d32] px-6 py-9 text-white sm:px-10 sm:py-12">
        <div className="absolute -top-20 -right-20 size-72 rounded-full bg-[#6ed4b5]/15 blur-3xl" />
        <div className="absolute right-20 -bottom-24 size-64 rounded-full bg-[#f7c660]/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="grid size-14 place-items-center rounded-2xl bg-white/12 text-[#c8f2e4]">
            <MessageCircleMore className="size-7" />
          </div>
          <p className="mt-7 text-sm font-medium text-[#bce8db]">
            {t('eyebrow')}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
            {t('description')}
          </p>

          {stage === 'pin' ? (
            <div className="mt-7 max-w-md rounded-2xl bg-white/10 p-4">
              <div className="flex items-center gap-2 font-semibold">
                <KeyRound className="size-4 text-[#c8f2e4]" />
                {t('pinTitle')}
              </div>
              <p className="mt-1 text-sm leading-6 text-white/75">
                {t('pinBody')}
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Input
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  aria-label={t('pinLabel')}
                  className="h-11 border-white/20 bg-white text-center tracking-[0.35em] text-[#123d32] placeholder:tracking-normal"
                />
                <Button
                  onClick={finishRegistration}
                  className="h-11 rounded-xl bg-[#e9fbf4] px-5 font-semibold text-[#123d32] hover:bg-white"
                >
                  {t('finishConnection')}
                </Button>
              </div>
            </div>
          ) : enabled ? (
            <Button
              onClick={beginSignup}
              disabled={!sdkReady || working}
              className="mt-7 h-12 rounded-2xl bg-[#e9fbf4] px-5 font-semibold text-[#123d32] hover:bg-white"
            >
              {working ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              {working ? t('connecting') : t('startConnection')}
            </Button>
          ) : (
            <div className="mt-7">
              <p className="text-sm text-[#c8f2e4]">{t('notReadyBody')}</p>
              <Button
                render={<Link href="/settings?tab=whatsapp&source=guided" />}
                className="mt-3 h-11 rounded-xl bg-[#e9fbf4] px-5 font-semibold text-[#123d32] hover:bg-white"
              >
                {t('useSecureSetup')} <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
          {error && (
            <p
              className="mt-4 flex items-start gap-2 text-sm leading-6 text-[#ffd0cc]"
              role="alert"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Step
          icon={ShieldCheck}
          label={t('step', { number: '1' })}
          title={t('step1Title')}
          body={t('step1Body')}
          tone="green"
        />
        <Step
          icon={LockKeyhole}
          label={t('step', { number: '2' })}
          title={t('step2Title')}
          body={t('step2Body')}
          tone="blue"
        />
        <Step
          icon={Sparkles}
          label={t('step', { number: '3' })}
          title={t('step3Title')}
          body={t('step3Body')}
          tone="amber"
        />
      </section>

      <section className="bg-card mt-6 rounded-3xl border p-5 sm:p-6">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1ebff] text-[#6b43b5]">
            <CircleHelp className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">{t('needTitle')}</h2>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {t('needBody')}
            </p>
          </div>
        </div>
        <ul className="text-muted-foreground mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {[t('check1'), t('check2'), t('check3'), t('check4')].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="text-primary mt-0.5 size-4 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Step({
  icon: Icon,
  label,
  title,
  body,
  tone,
}: {
  icon: typeof ShieldCheck;
  label: string;
  title: string;
  body: string;
  tone: 'green' | 'blue' | 'amber';
}) {
  const tones = {
    green: 'bg-[#e4f5ee] text-[#126b56]',
    blue: 'bg-[#e8f0ff] text-[#255dc1]',
    amber: 'bg-[#fff3d8] text-[#a76500]',
  };
  return (
    <article className="bg-card rounded-3xl border p-5">
      <div className="flex items-center justify-between">
        <span
          className={`grid size-10 place-items-center rounded-2xl ${tones[tone]}`}
        >
          <Icon className="size-5" />
        </span>
        <span className="text-muted-foreground text-sm font-semibold">
          {label}
        </span>
      </div>
      <h2 className="mt-5 font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-1 text-sm leading-6">{body}</p>
    </article>
  );
}
