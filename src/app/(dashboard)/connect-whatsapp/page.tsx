'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  LockKeyhole,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

/**
 * Deliberately non-technical entry point for WhatsApp setup. The existing
 * Settings screen remains the secure operator fallback; this page gives a
 * small-business owner context before they ever see an ID or token field.
 *
 * Meta Embedded Signup will replace the final `settings` hand-off once the
 * Saathi Meta app has its production Embedded Signup configuration approved.
 */
export default function ConnectWhatsAppPage() {
  const t = useTranslations('ConnectWhatsApp');

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
          <Button
            render={<Link href="/settings?tab=whatsapp&source=guided" />}
            className="mt-7 h-12 rounded-2xl bg-[#e9fbf4] px-5 font-semibold text-[#123d32] hover:bg-white"
          >
            {t('startConnection')} <ArrowRight className="size-4" />
          </Button>
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
