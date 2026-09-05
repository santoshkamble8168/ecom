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
  return <Image src={src} alt={alt} fill sizes={sizes} className={className} priority={priority} />;
}
