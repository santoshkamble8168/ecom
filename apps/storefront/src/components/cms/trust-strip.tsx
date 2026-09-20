const TRUST_DETAILS: Record<string, string> = {
  "fast shipping": "Free delivery on orders above ₹999, with express options at checkout.",
  "easy returns": "Request a return within 7 days of delivery for unused items.",
  "secure payments": "UPI, cards, and net banking with encrypted, PCI-aware checkout.",
};

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function parseTrustItems(html: string): Array<{ label: string; description: string }> | null {
  const plain = stripTags(html);
  if (!plain) return null;

  const parts = plain
    .split(/,|•|&amp;|&/)
    .map((part) => part.replace(/\.$/, "").trim())
    .filter((part) => part.length > 0 && part.length < 48);

  if (parts.length < 2 || parts.length > 6) return null;

  return parts.map((label) => {
    const key = label.toLowerCase();
    return {
      label: titleCase(label),
      description: TRUST_DETAILS[key] ?? `Shop with confidence — ${label.toLowerCase()}.`,
    };
  });
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v10H3zM14 11h4l3 3v3h-7V11Z" />
      <circle cx="7" cy="18.5" r="1.5" />
      <circle cx="18" cy="18.5" r="1.5" />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8H5V4M5 8l4.5-3.5A7 7 0 1 1 7 17" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path strokeLinecap="round" d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 6h14v10H8l-3 3V6Z" />
    </svg>
  );
}

function iconFor(label: string, index: number) {
  const key = label.toLowerCase();
  if (key.includes("ship") || key.includes("deliver")) return <TruckIcon />;
  if (key.includes("return") || key.includes("exchange")) return <ReturnIcon />;
  if (key.includes("pay") || key.includes("secure") || key.includes("safe")) return <LockIcon />;
  if (key.includes("support") || key.includes("help") || key.includes("contact")) return <ChatIcon />;
  const fallback = [<ShieldIcon />, <TruckIcon />, <ReturnIcon />, <ChatIcon />] as const;
  return fallback[index % fallback.length];
}

export function TrustStrip({
  title,
  items,
}: {
  title?: string;
  items: Array<{ label: string; description: string }>;
}) {
  return (
    <section className="border-b border-neutral-200 bg-white py-14 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4">
        {title && (
          <h2 className="mb-10 text-center text-2xl font-display font-semibold tracking-tight sm:text-3xl">{title}</h2>
        )}
        <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => (
            <li key={item.label} className="flex gap-4 sm:flex-col sm:gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                {iconFor(item.label, index)}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-neutral-950 dark:text-white">{item.label}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
