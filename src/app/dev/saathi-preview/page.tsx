import { notFound } from 'next/navigation';
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  Inbox,
  LayoutDashboard,
  Menu,
  MessageCircleMore,
  Radio,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react';

const nav = [
  { label: 'Today', icon: LayoutDashboard, active: true },
  { label: 'Inbox', icon: Inbox, badge: '6' },
  { label: 'Customers', icon: Users },
  { label: 'Campaigns', icon: Radio },
  { label: 'Follow-ups', icon: BellRing, badge: '4' },
];

const actions = [
  {
    label: 'Reply to customers',
    detail: 'See new WhatsApp messages',
    icon: MessageCircleMore,
    tone: 'green',
  },
  {
    label: 'Add a customer',
    detail: 'Save a number for later',
    icon: UserPlus,
    tone: 'blue',
  },
  {
    label: 'Send an offer',
    detail: 'Share a template with customers',
    icon: Radio,
    tone: 'amber',
  },
  {
    label: 'Plan a follow-up',
    detail: 'Never miss a customer again',
    icon: BellRing,
    tone: 'violet',
  },
] as const;

const attention = [
  {
    name: 'Meera Sharma',
    detail: 'Confirm the installation slot and access notes',
    time: 'Overdue · 9:30 AM',
    kind: 'follow-up',
  },
  {
    name: 'Rohan Iyer',
    detail: 'Can you share the revised estimate today?',
    time: '2 unread',
    kind: 'message',
  },
  {
    name: 'Kavya Foods',
    detail: 'Send the final menu confirmation',
    time: 'Today · 11:00 AM',
    kind: 'follow-up',
  },
] as const;

export default function SaathiPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <div className="flex min-h-screen bg-[#f6f7f5] text-[#17231e]">
      <aside className="hidden w-60 shrink-0 flex-col bg-[#102a23] p-4 text-white lg:flex">
        <div className="flex h-12 items-center gap-3 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-[#e5f3ec] font-bold text-[#126b56]">
            S
          </span>
          <div>
            <p className="font-bold">Saathi</p>
            <p className="text-[11px] text-white/60">For your business</p>
          </div>
        </div>
        <nav className="mt-8 space-y-1">
          {nav.map(({ label, icon: Icon, active, badge }) => (
            <div
              key={label}
              className={`flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm ${active ? 'bg-white/12 font-semibold' : 'text-white/75'}`}
            >
              <Icon className="size-4" />
              <span className="flex-1">{label}</span>
              {badge ? (
                <span className="rounded-full bg-[#e5f3ec] px-2 py-0.5 text-[11px] font-bold text-[#126b56]">
                  {badge}
                </span>
              ) : null}
            </div>
          ))}
        </nav>
        <button className="mt-5 flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm text-white/70">
          <span className="flex-1 text-left">More tools</span>⌄
        </button>
        <div className="mt-auto flex h-11 items-center gap-3 px-3 text-sm text-white/75">
          <Settings className="size-4" /> Settings
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-14 items-center justify-between border-b bg-white/70 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <Menu className="size-5 lg:hidden" />
            <p className="font-semibold">Today</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#52635b]">
            <span>English · EN</span>
            <span className="grid size-8 place-items-center rounded-full bg-[#e5f3ec] font-bold text-[#126b56]">
              AS
            </span>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1180px] space-y-6 pb-8">
            <div className="rounded-2xl border border-[#255dc1]/25 bg-[#edf4ff] px-4 py-3 text-xs text-[#255dc1]">
              Preview data · isolated development fixture · no customer messages
              can be sent
            </div>

            <section className="relative overflow-hidden rounded-3xl bg-[#123d32] px-5 py-6 text-white shadow-[0_18px_45px_-26px_rgba(10,70,52,0.9)] sm:px-8 sm:py-8">
              <div className="absolute -top-24 -right-20 size-64 rounded-full bg-[#79d8bd]/15 blur-2xl" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[#bce8db]">
                    Wednesday, 23 September
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                    Good morning, Anand
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                    Let’s get your business ready to reply, follow up, and grow
                    on WhatsApp.
                  </p>
                </div>
                <button className="flex h-12 items-center gap-2 rounded-2xl bg-[#e9fbf4] px-5 text-sm font-semibold text-[#123d32]">
                  Connect WhatsApp <CheckCircle2 className="size-4" />
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-[#b8dfd1] bg-[#f3fbf7] p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#126b56] text-white">
                    <MessageCircleMore className="size-6" />
                  </span>
                  <div>
                    <p className="text-lg font-semibold text-[#17382e]">
                      Your WhatsApp is not connected yet
                    </p>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-[#4a665d]">
                      Connect your business number once, then manage chats,
                      customers, and offers from Saathi. No GitHub or server
                      settings are needed.
                    </p>
                  </div>
                </div>
                <button className="flex h-11 items-center gap-2 rounded-xl bg-[#126b56] px-4 text-sm font-semibold text-white">
                  Start setup <ArrowRight className="size-4" />
                </button>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight">
                What would you like to do?
              </h2>
              <p className="mt-1 text-sm text-[#52635b]">
                The most useful actions for your business, all in one place.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {actions.map(({ label, detail, icon: Icon, tone }) => (
                  <article
                    key={label}
                    className="rounded-3xl border bg-white p-4 shadow-[0_12px_30px_-25px_rgba(22,55,45,0.45)]"
                  >
                    <span
                      className={`grid size-11 place-items-center rounded-2xl ${tone === 'green' ? 'bg-[#e4f5ee] text-[#126b56]' : tone === 'blue' ? 'bg-[#e8f0ff] text-[#255dc1]' : tone === 'amber' ? 'bg-[#fff3d8] text-[#a76500]' : 'bg-[#f1ebff] text-[#6b43b5]'}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <p className="mt-4 font-semibold">{label}</p>
                    <p className="mt-1 text-sm leading-5 text-[#52635b]">
                      {detail}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
              <Metric
                label="Waiting for reply"
                value="6"
                hint="Unread customer conversations"
                icon={MessageCircleMore}
                tone="green"
              />
              <Metric
                label="Follow-ups due"
                value="4"
                hint="Internal reminders now overdue"
                icon={Clock3}
                tone="amber"
              />
              <Metric
                label="Jobs confirmed"
                value="3"
                hint="Marked won by your team today"
                icon={CheckCircle2}
                tone="blue"
              />
            </section>

            <section className="rounded-3xl border bg-white p-4 shadow-[0_12px_30px_-25px_rgba(22,55,45,0.45)] sm:p-6">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    Needs attention
                  </h2>
                  <p className="mt-1 text-sm text-[#52635b]">
                    3 items · 1 overdue
                  </p>
                </div>
                <button className="text-sm font-semibold text-[#126b56]">
                  View all <ArrowRight className="ml-1 inline size-3.5" />
                </button>
              </div>
              <div className="mt-5 divide-y divide-[#d6dfd9]">
                {attention.map((row) => (
                  <article
                    key={row.name}
                    className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"
                  >
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-xl ${row.kind === 'message' ? 'bg-[#e4f5ee] text-[#126b56]' : 'bg-[#fff3d8] text-[#a76500]'}`}
                    >
                      {row.kind === 'message' ? (
                        <MessageCircleMore className="size-4" />
                      ) : (
                        <Clock3 className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {row.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#52635b]">
                        {row.detail}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold ${row.kind === 'message' ? 'rounded-full bg-[#126b56] px-2 py-0.5 text-white' : 'text-[#a76500]'}`}
                    >
                      {row.time}
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-[#52635b]" />
                  </article>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Clock3;
  tone: 'green' | 'blue' | 'amber';
}) {
  const colors = {
    green: 'bg-[#e4f5ee] text-[#126b56]',
    blue: 'bg-[#e8f0ff] text-[#255dc1]',
    amber: 'bg-[#fff3d8] text-[#a76500]',
  };
  return (
    <article className="rounded-3xl border bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#52635b]">{label}</p>
        <span
          className={`grid size-9 place-items-center rounded-xl ${colors[tone]}`}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-[#52635b]">{hint}</p>
    </article>
  );
}
