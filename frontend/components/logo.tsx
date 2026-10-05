import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const PRODUCT_NAME = "Nexora";

export function Logo({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", dark ? "text-white" : "text-ink")} aria-label="Nexora home">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:rotate-[-6deg]", dark ? "bg-lime text-ink shadow-lime/10" : "bg-primary text-white shadow-primary/20")}>
        <MessageCircle className="h-[19px] w-[19px] fill-current" />
      </span>
      {!compact && <span className="font-display text-[17px] font-extrabold tracking-[-0.03em]">nex<span className={dark ? "text-lime" : "text-primary"}>ora</span></span>}
    </Link>
  );
}
