import type { BannerSummary } from "@ecom/types";

import { CampaignLink } from "@/components/analytics/campaign-link";
import { StorefrontImage } from "@/components/media/storefront-image";

/**
 * Renders whatever currently-live banners were returned for a single
 * placement (`category_top`, `cart_strip`, ...) — used where the section is
 * implicit from page context rather than referenced by id from `PageSection`.
 */
export function BannerPlacementStrip({ banners }: { banners: BannerSummary[] }) {
  if (banners.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className={banners.length > 1 ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : ""}>
        {banners.map((banner) => {
          const image = (
            <div className="relative aspect-[21/6] overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
              <StorefrontImage
                src={banner.imageUrl}
                alt={banner.altText ?? banner.title}
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          );
          return (
            <div key={banner.id}>
              {banner.linkUrl ? (
                <CampaignLink href={banner.linkUrl} campaignId={banner.id} ariaLabel={banner.title}>
                  {image}
                </CampaignLink>
              ) : (
                image
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
