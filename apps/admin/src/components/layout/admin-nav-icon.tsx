import type { ReactNode } from "react";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function AdminNavIcon({ href }: { href: string }) {
  switch (href) {
    case "/":
      return (
        <Icon>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </Icon>
      );
    case "/products":
      return (
        <Icon>
          <path d="M6 6h12v12H6z" />
          <path d="M6 10h12" />
        </Icon>
      );
    case "/categories":
      return (
        <Icon>
          <path d="M4 6h16M4 12h10M4 18h7" />
        </Icon>
      );
    case "/collections":
      return (
        <Icon>
          <rect x="4" y="4" width="7" height="7" rx="1" />
          <rect x="13" y="4" width="7" height="7" rx="1" />
          <rect x="4" y="13" width="7" height="7" rx="1" />
          <rect x="13" y="13" width="7" height="7" rx="1" />
        </Icon>
      );
    case "/orders":
      return (
        <Icon>
          <path d="M6 7h12l-1 12H7L6 7z" />
          <path d="M9 7V5a3 3 0 0 1 6 0v2" />
        </Icon>
      );
    case "/customers":
      return (
        <Icon>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </Icon>
      );
    case "/inventory":
      return (
        <Icon>
          <path d="M3 7h18v12H3z" />
          <path d="M3 11h18" />
        </Icon>
      );
    case "/inventory/movements":
      return (
        <Icon>
          <path d="M7 7h10v10H7z" />
          <path d="M12 7v10M7 12h10" />
        </Icon>
      );
    case "/inventory/warehouses":
      return (
        <Icon>
          <path d="M3 10 12 4l9 6v10H3V10z" />
        </Icon>
      );
    case "/inventory/suppliers":
      return (
        <Icon>
          <path d="M3 17h18M5 17V8l7-4 7 4v9" />
        </Icon>
      );
    case "/inventory/purchase-orders":
      return (
        <Icon>
          <path d="M8 6h8v14H8z" />
          <path d="M10 10h4M10 14h4" />
        </Icon>
      );
    case "/pricing":
    case "/pricing/price-lists":
    case "/pricing/tax-rules":
      return (
        <Icon>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8M9.5 10.5c.6-1 3.4-1 4 0s-.4 2.5-2 3-2.6 2-2 3 3.4 1 4 0" />
        </Icon>
      );
    case "/coupons":
    case "/campaigns":
    case "/marketing":
      return (
        <Icon>
          <path d="M4 12h16M8 8l8 8M8 16l8-8" />
        </Icon>
      );
    case "/pages":
    case "/banners":
    case "/menus":
    case "/blog":
      return (
        <Icon>
          <path d="M7 4h7l5 5v11H7z" />
          <path d="M14 4v5h5" />
        </Icon>
      );
    case "/analytics":
    case "/reports":
    case "/recommendations":
      return (
        <Icon>
          <path d="M4 19V5M4 19h16" />
          <path d="M8 16v-5M12 16V8M16 16v-3" />
        </Icon>
      );
    default:
      return (
        <Icon>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 5v2M12 17v2M5 12h2M17 12h2" />
        </Icon>
      );
  }
}
