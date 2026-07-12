import { Button } from "@ecom/ui";

export default function HomePage() {
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-24">
      <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
        Sprint 0 · Project Foundation
      </span>
      <h1 className="max-w-2xl text-4xl font-display font-bold sm:text-5xl">
        The storefront foundation is live.
      </h1>
      <p className="max-w-xl text-neutral-600 dark:text-neutral-400">
        Homepage, header, footer, navigation, and the shared design system are wired up. Product
        discovery, PDP, cart, and checkout land in later sprints.
      </p>
      <Button size="lg">Shop Now</Button>
    </section>
  );
}
