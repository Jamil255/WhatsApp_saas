import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Gauge,
  MessageSquareText,
  Sparkles,
} from 'lucide-react';

type PublicPlan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthlyPriceCents: number;
  currency: string;
  trialDays: number;
  dailyMessageLimit: number;
  rateLimitPerMinute: number;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030/api';

async function getPublicPlans(): Promise<PublicPlan[]> {
  try {
    const response = await fetch(`${apiUrl}/public/plans`, {
      cache: 'no-store',
    });
    if (!response.ok) return [];
    const body = await response.json();
    const plans = body?.data ?? body;
    return Array.isArray(plans) ? plans : [];
  } catch {
    return [];
  }
}

function formatPrice(plan: PublicPlan) {
  if (plan.monthlyPriceCents === 0) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: plan.currency,
    maximumFractionDigits: plan.monthlyPriceCents % 100 === 0 ? 0 : 2,
  }).format(plan.monthlyPriceCents / 100);
}

export async function PublicPricingSection() {
  const plans = await getPublicPlans();

  return (
    <section
      id="pricing"
      className="home-section bg-[#f1f6f1] px-5 py-20 sm:px-8 lg:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div className="max-w-[780px]">
            <p className="home-eyebrow text-[#167a54]">
              04 / Plans &amp; pricing
            </p>
            <h2 className="home-heading">
              Start with a free trial.{' '}
              <span className="text-[#17835a]">Pay when you are ready.</span>
            </h2>
          </div>
          <div className="rounded-[22px] border border-[#cfe0d4] bg-white/75 p-5 text-sm leading-6 text-[#53695b]">
            Nexora plans are paid subscriptions after the trial period. Choose a
            plan, test the complete workspace, then continue on its monthly
            price.
          </div>
        </div>

        {plans.length > 0 ? (
          <div
            className={`mt-11 grid gap-4 ${
              plans.length === 1
                ? 'max-w-xl'
                : plans.length === 2
                  ? 'lg:grid-cols-2'
                  : 'lg:grid-cols-3'
            }`}
          >
            {plans.map((plan, index) => {
              const price = formatPrice(plan);
              const featured =
                plans.length > 1 &&
                (plan.slug.includes('professional') ||
                  plan.slug.includes('growth') ||
                  index === 1);
              const trialLabel =
                plan.trialDays > 0
                  ? `${plan.trialDays}-day free trial`
                  : 'Paid access';

              return (
                <article
                  key={plan.id}
                  className={`relative flex min-h-[470px] flex-col overflow-hidden rounded-[26px] border p-7 transition duration-300 hover:-translate-y-1 sm:p-8 ${
                    featured
                      ? 'border-[#275f46] bg-[#0d2a1e] text-white shadow-[0_30px_75px_-42px_rgba(9,55,34,.6)]'
                      : 'border-[#d9e6dc] bg-white text-ink shadow-[0_18px_50px_-40px_rgba(20,75,53,.3)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] ${
                        featured
                          ? 'bg-lime text-[#0b2419]'
                          : 'bg-[#e5f4e8] text-[#127451]'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {trialLabel}
                    </span>
                    {featured && (
                      <span className="text-[10px] font-bold uppercase tracking-[.14em] text-white/55">
                        Most popular
                      </span>
                    )}
                  </div>

                  <h3 className="mt-8 font-display text-2xl font-extrabold tracking-[-.045em]">
                    {plan.name}
                  </h3>
                  <p
                    className={`mt-3 min-h-[52px] text-sm leading-6 ${
                      featured ? 'text-white/60' : 'text-[#64786a]'
                    }`}
                  >
                    {plan.description ||
                      'A complete Nexora workspace for connected WhatsApp operations.'}
                  </p>

                  <div
                    className={`mt-7 border-y py-6 ${
                      featured ? 'border-white/10' : 'border-[#e6ede8]'
                    }`}
                  >
                    {price ? (
                      <div className="flex items-end gap-2">
                        <span className="font-display text-4xl font-extrabold tracking-[-.06em]">
                          {price}
                        </span>
                        <span
                          className={`pb-1 text-xs ${
                            featured ? 'text-white/50' : 'text-[#708278]'
                          }`}
                        >
                          / month
                        </span>
                      </div>
                    ) : (
                      <div>
                        <p className="font-display text-3xl font-extrabold tracking-[-.05em]">
                          Custom pricing
                        </p>
                        <p
                          className={`mt-1.5 text-xs ${
                            featured ? 'text-white/50' : 'text-[#708278]'
                          }`}
                        >
                          Paid plan after the trial
                        </p>
                      </div>
                    )}
                    {plan.trialDays > 0 && (
                      <p
                        className={`mt-3 text-xs font-semibold ${
                          featured ? 'text-lime' : 'text-[#167a54]'
                        }`}
                      >
                        Try it free for {plan.trialDays} days, then continue on
                        the paid plan.
                      </p>
                    )}
                  </div>

                  <ul className="mt-6 grid gap-3.5 text-sm">
                    <li className="flex items-center gap-3">
                      <MessageSquareText
                        className={`h-4 w-4 ${featured ? 'text-lime' : 'text-[#168058]'}`}
                      />
                      {plan.dailyMessageLimit.toLocaleString()} messages per day
                    </li>
                    <li className="flex items-center gap-3">
                      <Gauge
                        className={`h-4 w-4 ${featured ? 'text-lime' : 'text-[#168058]'}`}
                      />
                      {plan.rateLimitPerMinute.toLocaleString()} API sends per
                      minute
                    </li>
                    {['Team workspace', 'API and signed webhooks'].map(
                      (feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <Check
                            className={`h-4 w-4 ${featured ? 'text-lime' : 'text-[#168058]'}`}
                          />
                          {feature}
                        </li>
                      ),
                    )}
                  </ul>

                  <Link
                    href={`/login?plan=${encodeURIComponent(plan.slug)}`}
                    className={`mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 pt-px text-sm font-bold transition ${
                      featured
                        ? 'bg-lime text-[#0b2419] hover:bg-[#c8f5a8]'
                        : 'bg-[#123e2b] text-white hover:bg-[#0a2f20]'
                    }`}
                  >
                    {plan.trialDays > 0
                      ? `Start ${plan.trialDays}-day trial`
                      : 'Choose this plan'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-11 rounded-[26px] border border-[#d5e3d8] bg-white p-7 sm:p-9">
            <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#167a54]">
                  Plans are being configured
                </p>
                <h3 className="mt-3 font-display text-2xl font-extrabold tracking-[-.045em] text-ink">
                  Start a workspace and ask about trial access.
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#64786a]">
                  Paid plan pricing will appear here as soon as the
                  administrator publishes it.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#123e2b] px-5 text-sm font-bold text-white transition hover:bg-[#0a2f20]"
              >
                Request trial access <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs leading-5 text-[#718278]">
          Trial length, price, and usage limits are set per plan. Your selected
          plan moves to paid access after its free trial ends.
        </p>
      </div>
    </section>
  );
}
