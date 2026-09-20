/** Returns true when a hidden honeypot field was filled — typical of bots. */
export function shouldDropAsBot(honeypot?: string | null): boolean {
  return typeof honeypot === "string" && honeypot.trim().length > 0;
}
