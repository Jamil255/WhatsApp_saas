import { Button } from "@/components/ui/button";

export function PageHeader({ eyebrow, title, description, action, children }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode; children?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div>{eyebrow && <div className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-primary">{eyebrow}</div>}<h1 className="font-display text-2xl font-extrabold tracking-[-.045em] text-ink sm:text-3xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}{children}</div>{action}</div>;
}

export function PageAction({ children, href }: { children: React.ReactNode; href?: string }) {
  return <Button asChild={Boolean(href)}><a href={href || "#"}>{children}</a></Button>;
}
