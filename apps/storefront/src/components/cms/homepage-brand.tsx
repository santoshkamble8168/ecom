import Link from "next/link";
import type { PageSection } from "@ecom/types";

import { CampaignLink } from "@/components/analytics/campaign-link";
import { StorefrontImage } from "@/components/media/storefront-image";
import { RichHtml } from "@/components/cms/rich-html";
import { TrustStrip } from "@/components/cms/trust-strip";

type HeroSection = Extract<PageSection, { kind: "hero" }>;
type FeatureGridSection = Extract<PageSection, { kind: "feature_grid" }>;
type FitGuideSection = Extract<PageSection, { kind: "fit_guide" }>;
type StorySection = Extract<PageSection, { kind: "story" }>;
type CtaBannerSection = Extract<PageSection, { kind: "cta_banner" }>;
type TrustRowSection = Extract<PageSection, { kind: "trust_row" }>;

export function BrandHeroSection({ section }: { section: HeroSection }) {
  return (
    <section className="border-b border-neutral-200 bg-neutral-50">
      <div className="mx-auto grid min-h-[min(80vh,720px)] max-w-7xl lg:grid-cols-2">
        <div className="flex flex-col justify-center px-4 py-14 sm:px-8 lg:px-12 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Everyday cotton tees</p>
          <h1 className="mt-4 max-w-md text-4xl font-display font-semibold leading-[1.1] tracking-tight text-neutral-950 sm:text-5xl lg:text-[3.25rem]">
            {section.headline}
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-neutral-600 sm:text-lg">{section.subheadline}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <CampaignLink
              href={section.ctaHref}
              campaignId="homepage-hero"
              className="inline-flex h-12 items-center justify-center bg-neutral-950 px-7 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-neutral-800"
            >
              {section.ctaLabel}
            </CampaignLink>
            <Link
              href="/collections/best-sellers"
              className="text-sm font-medium text-neutral-700 underline-offset-4 hover:underline"
            >
              View best sellers
            </Link>
          </div>
        </div>
        <div className="relative min-h-[42vh] bg-neutral-200 lg:min-h-full">
          <StorefrontImage
            src={section.imageUrl}
            alt={section.imageAlt}
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </div>
      </div>
    </section>
  );
}

export function FeatureGridSectionView({ section }: { section: FeatureGridSection }) {
  return (
    <section className="border-b border-neutral-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Why these tees</p>
        <h2 className="mt-3 text-3xl font-display font-semibold tracking-tight sm:text-4xl">{section.title}</h2>
        <ul className="mt-10 grid grid-cols-1 gap-px overflow-hidden border border-neutral-200 bg-neutral-200 sm:grid-cols-2 lg:grid-cols-4">
          {section.items.map((item, index) => (
            <li key={item.title} className="bg-white p-6 sm:p-8">
              <p className="text-xs font-semibold tabular-nums tracking-[0.18em] text-neutral-400">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-4 text-base font-semibold text-neutral-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function FitGuideSectionView({ section }: { section: FitGuideSection }) {
  return (
    <section className="border-b border-neutral-200 bg-neutral-50 py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 lg:grid-cols-2 lg:gap-16">
        {section.imageUrl && (
          <div className="relative order-first aspect-[4/5] overflow-hidden bg-neutral-200 sm:aspect-[5/6] lg:order-none">
            <StorefrontImage
              src={section.imageUrl}
              alt="T-shirt fit reference"
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Sizing</p>
          <h2 className="mt-3 text-3xl font-display font-semibold tracking-tight sm:text-4xl">{section.title}</h2>
          <div className="rich-text-content mt-6 max-w-xl [&_li]:text-neutral-700 [&_p]:text-neutral-600">
            <RichHtml html={section.html} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function StorySectionView({ section }: { section: StorySection }) {
  return (
    <section className="bg-neutral-950 py-20 text-white sm:py-24">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Our story</p>
        <h2 className="mt-4 text-3xl font-display font-semibold tracking-tight sm:text-4xl">{section.title}</h2>
        <div className="rich-text-content mt-6 text-neutral-300 [&_p]:text-neutral-300">
          <RichHtml html={section.html} />
        </div>
      </div>
    </section>
  );
}

export function CtaBannerSectionView({ section }: { section: CtaBannerSection }) {
  return (
    <section className="bg-neutral-950 py-20 text-center text-white sm:py-24">
      <div className="mx-auto max-w-2xl px-4">
        <h2 className="text-3xl font-display font-semibold tracking-tight sm:text-4xl">{section.headline}</h2>
        {section.subheadline && (
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-neutral-300">{section.subheadline}</p>
        )}
        <Link
          href={section.ctaHref}
          className="mt-8 inline-flex h-12 items-center bg-white px-7 text-sm font-semibold tracking-wide text-neutral-950 transition-colors hover:bg-neutral-200"
        >
          {section.ctaLabel}
        </Link>
      </div>
    </section>
  );
}

export function TrustRowSectionView({ section }: { section: TrustRowSection }) {
  return (
    <TrustStrip
      title={section.title}
      items={section.items.map((item) => ({ label: item.title, description: item.description }))}
    />
  );
}
