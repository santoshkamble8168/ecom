import Link from "next/link";

const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [{ href: "/", label: "Dashboard" }],
  },
  {
    title: "Catalog",
    items: [
      { href: "/products", label: "Products" },
      { href: "/categories", label: "Categories" },
      { href: "/collections", label: "Collections" },
      { href: "/inventory", label: "Inventory" },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/orders", label: "Orders" },
      { href: "/customers", label: "Customers" },
    ],
  },
];

export function AdminSidebar() {
  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 md:block">
      <div className="mb-6 text-lg font-display font-bold">ECOM Admin</div>
      <nav aria-label="Admin navigation">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-6">
            {/* neutral-500, not neutral-400, so this clears the WCAG AA 4.5:1 contrast threshold on a white background */}
            <p className="mb-2 px-2 text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
              {section.title}
            </p>
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-md px-2 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
