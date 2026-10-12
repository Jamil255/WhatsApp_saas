import {
  Activity,
  CircleCheck,
  LockKeyhole,
  ShieldCheck,
  Webhook,
} from 'lucide-react';

const securityCards = [
  {
    icon: LockKeyhole,
    iconClass: 'bg-[#e5f5e9] text-[#137a53]',
    title: 'Workspace isolation',
    copy: 'Keep organizations, sessions, messages, and team access separated by design.',
    proof: 'Tenant-aware access',
    proofClass: 'text-primary',
  },
  {
    icon: ShieldCheck,
    iconClass: 'bg-[#e7f0f8] text-[#3675a9]',
    title: 'Scoped credentials',
    copy: 'Give teammates and integrations only the access their workflow needs.',
    proof: 'Least-privilege ready',
    proofClass: 'text-blue-700',
  },
  {
    icon: Webhook,
    iconClass: 'bg-[#eeeafb] text-[#7355aa]',
    title: 'Verified webhooks',
    copy: 'Validate event signatures before your systems accept delivery updates.',
    proof: 'HMAC-ready events',
    proofClass: 'text-violet-700',
  },
  {
    icon: Activity,
    iconClass: 'bg-[#fbf1df] text-[#aa7226]',
    title: 'Audit visibility',
    copy: 'Follow session health, delivery status, retries, and operational activity in one place.',
    proof: 'Observable workflows',
    proofClass: 'text-amber-700',
  },
];

export function SecuritySection() {
  return (
    <section
      id="security"
      className="home-section bg-white px-5 py-20 sm:px-8 lg:py-28"
    >
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.78fr_1.22fr] lg:items-center lg:gap-16">
        <div className="max-w-xl">
          <p className="home-eyebrow text-[#167a54]">
            07 / Security &amp; control
          </p>
          <h2 className="home-heading text-ink">
            Control and visibility,{' '}
            <span className="text-[#17835a]">built in.</span>
          </h2>
          <p className="home-intro">
            Keep access narrow, workspace boundaries clear, and delivery
            activity visible across the platform you operate.
          </p>

          <div className="mt-8 rounded-[24px] bg-[#102a20] p-6 text-white shadow-[0_24px_60px_-36px_rgba(11,31,24,.5)] sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime/15 text-lime">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/40">
                  Security posture
                </p>
                <p className="mt-1 text-sm font-bold">
                  Control stays with your team.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
              <div>
                <p className="font-display text-xl font-extrabold tracking-[-.04em] text-lime">
                  Scoped access
                </p>
                <p className="mt-1 text-xs leading-5 text-white/55">
                  Give each integration the permissions it needs.
                </p>
              </div>
              <div>
                <p className="font-display text-xl font-extrabold tracking-[-.04em] text-white">
                  Self-hostable
                </p>
                <p className="mt-1 text-xs leading-5 text-white/55">
                  Choose where your environment runs.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {securityCards.map(
            ({ icon: Icon, iconClass, title, copy, proof, proofClass }) => (
              <div
                key={title}
                className="group rounded-[24px] border border-[#e2eae4] bg-[#fbfdfb] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#bddac7] hover:shadow-[0_22px_50px_-34px_rgba(20,75,53,.3)]"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-7 font-display text-xl font-bold tracking-[-.04em] text-ink">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {copy}
                </p>
                <div
                  className={`mt-5 flex items-center gap-2 text-xs font-bold ${proofClass}`}
                >
                  <CircleCheck className="h-4 w-4" />
                  {proof}
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
