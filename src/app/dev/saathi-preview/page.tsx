import { notFound } from 'next/navigation';
import {
  BellRing,
  BriefcaseBusiness,
  Clock3,
  Inbox,
  LayoutDashboard,
  Menu,
  MessageSquareReply,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';

const nav = [
  { label: 'Today', icon: LayoutDashboard, active: true },
  { label: 'Inbox', icon: Inbox, badge: '6' },
  { label: 'Customers', icon: Users },
  { label: 'Follow-ups', icon: BellRing, badge: '4' },
];

const rows = [
  {
    name: 'Meera Sharma',
    phone: '+91 98765 43210',
    detail: 'Confirm the installation slot and access notes',
    meta: 'Follow-up · 9:30 AM',
    danger: true,
    action: 'Edit follow-up',
  },
  {
    name: 'Rohan Iyer',
    phone: '+91 98204 11882',
    detail: 'Can you share the revised estimate today?',
    meta: '2 unread · 10:18 AM',
    action: 'Open conversation',
  },
  {
    name: 'Kavya Foods',
    phone: '+91 99870 06342',
    detail: 'Send the final menu confirmation',
    meta: 'Follow-up · 11:00 AM',
    action: 'Edit follow-up',
  },
];

export default function SaathiPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <div className="bg-background text-foreground flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col bg-[#102a23] p-4 text-white lg:flex">
        <div className="flex h-12 items-center gap-3 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-[#e5f3ec] font-bold text-[#126b56]">
            S
          </span>
          <div>
            <p className="font-bold">Saathi</p>
            <p className="text-[11px] text-white/60">WhatsApp CRM</p>
          </div>
        </div>
        <p className="mt-8 px-3 text-[10px] font-bold tracking-[0.18em] text-white/45 uppercase">
          Workspace
        </p>
        <nav className="mt-2 space-y-1">
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
        <p className="mt-7 px-3 text-[10px] font-bold tracking-[0.18em] text-white/45 uppercase">
          Growth
        </p>
        <div className="mt-2 flex h-11 items-center gap-3 px-3 text-sm text-white/75">
          <Sparkles className="size-4" />
          Automations
        </div>
        <div className="mt-auto flex h-11 items-center gap-3 px-3 text-sm text-white/75">
          <Settings className="size-4" />
          Settings
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="bg-card flex h-14 items-center justify-between border-b px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Menu className="size-5 lg:hidden" />
            <p className="font-semibold">Today</p>
          </div>
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <span>English · EN</span>
            <span className="bg-primary-soft text-primary grid size-8 place-items-center rounded-full font-bold">
              AS
            </span>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1200px] space-y-5">
            <div className="rounded-[14px] border border-[#255dc1]/30 bg-[#e8f0ff] px-4 py-3 text-xs text-[#255dc1]">
              Preview data · isolated development fixture · no customer messages
              can be sent
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Today</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Wednesday, 23 September 2026 · 11:30 AM IST
                </p>
              </div>
              <p className="text-muted-foreground max-w-sm text-xs leading-5 sm:text-right">
                Jobs confirmed are deals your team explicitly marked as won
                today.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Summary
                label="Waiting for reply"
                value="6"
                hint="Unread customer conversations"
                icon={MessageSquareReply}
              />
              <Summary
                label="Follow-ups due"
                value="4"
                hint="Internal reminders now overdue"
                icon={Clock3}
                warning
              />
              <Summary
                label="Jobs confirmed"
                value="3"
                hint="Marked won by your team today"
                icon={BriefcaseBusiness}
              />
            </div>

            <section className="space-y-2">
              <div>
                <h2 className="text-xl font-bold">Needs attention</h2>
                <p className="text-muted-foreground text-xs">
                  3 items · 1 overdue
                </p>
              </div>
              {rows.map((row) => (
                <article
                  key={row.name}
                  className={`bg-card grid gap-3 rounded-[14px] border p-4 sm:grid-cols-[170px_1fr_150px_auto] sm:items-center ${row.danger ? 'border-l-destructive border-l-4' : 'border-border'}`}
                >
                  <div>
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-muted-foreground text-xs">{row.phone}</p>
                  </div>
                  <p className="text-sm">{row.detail}</p>
                  <p
                    className={`text-xs font-semibold ${row.danger ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    {row.meta}
                  </p>
                  <button className="bg-primary text-primary-foreground h-11 rounded-[10px] px-4 text-sm font-semibold">
                    {row.action}
                  </button>
                </article>
              ))}
            </section>

            <section className="space-y-2">
              <div>
                <h2 className="text-xl font-bold">Later today</h2>
                <p className="text-muted-foreground text-xs">
                  Upcoming internal reminders
                </p>
              </div>
              <article className="bg-card grid gap-3 rounded-[14px] border p-4 sm:grid-cols-[170px_1fr_150px_auto] sm:items-center">
                <div>
                  <p className="font-semibold">Arjun Electricals</p>
                  <p className="text-muted-foreground text-xs">
                    +91 98711 02654
                  </p>
                </div>
                <p className="text-sm">Call after site inspection</p>
                <p className="text-muted-foreground text-xs font-semibold">
                  Follow-up · 4:00 PM
                </p>
                <button className="border-border bg-card h-11 rounded-[10px] border px-4 text-sm font-semibold">
                  Edit follow-up
                </button>
              </article>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  hint,
  icon: Icon,
  warning = false,
}: {
  label: string;
  value: string;
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
          {label}
        </p>
        <Icon
          className={`size-4 ${warning ? 'text-[#8a4b08]' : 'text-primary'}`}
        />
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
    </div>
  );
}
