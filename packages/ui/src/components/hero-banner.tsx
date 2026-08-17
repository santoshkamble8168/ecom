import { cn } from "../lib/cn";

export interface HeroBannerProps {
  title: string;
  imageUrl: string;
  altText?: string | null;
  linkUrl?: string | null;
  className?: string;
}

export function HeroBanner({ title, imageUrl, altText, linkUrl, className }: HeroBannerProps) {
  const image = (
    <div
      className={cn(
        "relative aspect-[21/9] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 sm:aspect-[3/1]",
        className,
      )}
    >
      <img src={imageUrl} alt={altText ?? title} className="h-full w-full object-cover" />
    </div>
  );

  if (linkUrl) {
    return (
      <a href={linkUrl} aria-label={title}>
        {image}
      </a>
    );
  }

  return image;
}

export interface BannerStripItem {
  id: string;
  title: string;
  imageUrl: string;
  altText?: string | null;
  linkUrl?: string | null;
}

export function BannerStrip({ banners, className }: { banners: BannerStripItem[]; className?: string }) {
  if (banners.length === 0) return null;
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {banners.map((banner) => (
        <HeroBanner
          key={banner.id}
          title={banner.title}
          imageUrl={banner.imageUrl}
          altText={banner.altText}
          linkUrl={banner.linkUrl}
          className="aspect-[16/9] sm:aspect-[16/9]"
        />
      ))}
    </div>
  );
}
