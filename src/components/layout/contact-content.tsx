import {
  ExternalLink,
  Facebook,
  Instagram,
  MessageCircle,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { rekAppsContact } from "./rekapps-contact";

type ContactMethod = {
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  href: string;
  external?: boolean;
  id: string;
};

const contactMethods: ContactMethod[] = [
  {
    icon: MessageCircle,
    title: "WhatsApp",
    description: "بۆ پرسیار و ڕێنمایی، ڕاستەوخۆ چاتێک لەگەڵ RekApps دەست پێ بکە.",
    action: "کردنەوەی WhatsApp",
    href: rekAppsContact.whatsappHref,
    external: true,
    id: "contact-whatsapp",
  },
  {
    icon: Instagram,
    title: "Instagram",
    description: "نوێکاری و ناوەڕۆکی RekApps لە Instagram ببینە.",
    action: "کردنەوەی Instagram",
    href: rekAppsContact.instagramHref,
    external: true,
    id: "contact-instagram",
  },
  {
    icon: Facebook,
    title: "Facebook",
    description: "پەیوەندی و زانیارییەکانی RekApps لە Facebook بەدوادا بچۆ.",
    action: "کردنەوەی Facebook",
    href: rekAppsContact.facebookHref,
    external: true,
    id: "contact-facebook",
  },
  {
    icon: Phone,
    title: "ژمارەی تەلەفۆن",
    description: "بۆ پەیوەندییەکی ڕاستەوخۆ و گفتوگۆ دەربارەی پێداویستییەکانت.",
    action: "پەیوەندی کردن",
    href: rekAppsContact.phoneHref,
    id: "contact-phone",
  },
];

const guidance = [
  "بۆ پرسیار و ڕێنمایی، دەتوانن لە ڕێگەی یەکێک لە کەناڵەکانی سەرەوە پەیوەندی بکەن.",
  "بۆ داواکاری سیستەم یان گەشەپێدانی پرۆژە، پێویستییە سەرەکییەکان و جۆری سیستەمەکە ڕوون بکەنەوە.",
  "بۆ کێشەی تەکنیکی، بە کورتی کێشەکە و ئەو بەشەی سیستەم کە کێشەکەی تێدایە باس بکەن.",
  "ئەگەر پێویست بوو، screenshot یان زانیاری زیاتر ئامادە بکەن بۆ ڕوونکردنەوەی کێشەکە.",
];

export function ContactContent() {
  return (
    <div className="space-y-6 text-[var(--brand-navy)]">
      <section aria-labelledby="contact-methods-title">
        <div className="flex items-baseline justify-between gap-3"><h3 id="contact-methods-title" className="text-lg font-extrabold">ڕێگاکانی پەیوەندی</h3><span className="text-xs font-bold">RekApps</span></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {contactMethods.map(({ icon: Icon, title, description, action, href, external, id }) => (
            <article key={id} className="group flex min-h-48 flex-col rounded-2xl border border-[var(--brand-border)] bg-white p-4 transition hover:border-[var(--brand-navy)] hover:shadow-[0_8px_20px_rgb(15_32_83_/_8%)]">
              <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-cream)] text-[var(--brand-navy)]"><Icon size={20} aria-hidden="true" /></span><div className="min-w-0"><h4 className="font-extrabold">{title}</h4><p className="mt-1 text-sm leading-6">{description}</p></div></div>
              {id === "contact-phone" ? <a id={id} href={href} dir="ltr" className="mt-4 w-fit rounded-lg border border-[var(--brand-navy)] bg-[#fffdf5] px-3 py-1.5 text-xl font-extrabold tracking-wide transition hover:bg-[var(--brand-cream)]">{rekAppsContact.phone}</a> : null}
              <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} aria-label={`${action}: ${title}`} className="mt-auto inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-[var(--brand-navy)] px-3.5 py-2 text-sm font-extrabold text-[var(--brand-cream)] transition hover:bg-[var(--brand-navy-hover)] active:translate-y-px">
                {action}{external ? <ExternalLink size={16} aria-hidden="true" /> : <Phone size={16} aria-hidden="true" />}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="contact-guidance" className="border-t border-[var(--brand-border)] pt-5">
        <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-cream)] p-4 sm:p-5"><h3 id="contact-guidance" className="text-lg font-extrabold">ڕێنمایی پەیوەندی</h3><ul className="mt-3 space-y-2.5 text-sm leading-6">{guidance.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--brand-navy)]" aria-hidden="true" /><span>{item}</span></li>)}</ul></div>
      </section>
    </div>
  );
}
