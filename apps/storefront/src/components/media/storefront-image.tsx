import Image from "next/image";

export function StorefrontImage({
  src,
  alt,
  className,
  sizes = "100vw",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const resolvedAlt = alt.trim() || "Storefront image";
  return (
    <Image
      src={src}
      alt={resolvedAlt}
      fill
      sizes={sizes}
      quality={75}
      className={className}
      priority={priority}
    />
  );
}
