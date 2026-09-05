import type {
  CampaignPageFields,
  FaqPageFields,
  HomepageFields,
  LandingPageFields,
  PageDetail,
  PolicyPageFields,
} from "@ecom/types";
import { jsonLdFaq } from "@ecom/shared";
import { FaqAccordion } from "@ecom/ui";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CmsPageSections } from "@/components/cms/page-sections";
import { RichHtml } from "@/components/cms/rich-html";
import { StorefrontImage } from "@/components/media/storefront-image";
import { JsonLd } from "@/components/seo/json-ld";

function LandingPageView({ fields }: { fields: LandingPageFields | CampaignPageFields }) {
  return (
    <div>
      <section className="relative overflow-hidden bg-neutral-900 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-display font-bold sm:text-5xl">{fields.heroTitle}</h1>
            {fields.heroSubtitle && <p className="text-lg text-neutral-300">{fields.heroSubtitle}</p>}
            {fields.heroCtaLabel && fields.heroCtaUrl && (
              <div>
                <Link
                  href={fields.heroCtaUrl}
                  className="inline-flex h-12 items-center justify-center rounded-md bg-accent-500 px-6 text-base font-bold uppercase tracking-wide text-neutral-950 hover:bg-accent-600"
                >
                  {fields.heroCtaLabel}
                </Link>
              </div>
            )}
          </div>
          {fields.heroImageUrl && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <StorefrontImage src={fields.heroImageUrl} alt={fields.heroTitle} className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
          )}
        </div>
      </section>
      <CmsPageSections sections={fields.sections} />
    </div>
  );
}

function PolicyPageView({ title, fields }: { title: string; fields: PolicyPageFields }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-display font-bold">{title}</h1>
      <RichHtml html={fields.bodyHtml} />
    </div>
  );
}

function FaqPageView({ title, fields }: { title: string; fields: FaqPageFields }) {
  const items = [...fields.items]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item) => ({ question: item.question, answer: item.answer }));
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd data={jsonLdFaq(items)} />
      <h1 className="mb-6 text-3xl font-display font-bold">{title}</h1>
      <FaqAccordion items={items} />
    </div>
  );
}

export function CmsPageView({ page }: { page: PageDetail }) {
  switch (page.type) {
    case "landing":
    case "campaign":
      return <LandingPageView fields={page.fields as LandingPageFields | CampaignPageFields} />;
    case "policy":
      return <PolicyPageView title={page.title} fields={page.fields as PolicyPageFields} />;
    case "faq":
      return <FaqPageView title={page.title} fields={page.fields as FaqPageFields} />;
    case "homepage":
      return <CmsPageSections sections={(page.fields as HomepageFields).sections} />;
    default:
      notFound();
  }
}
