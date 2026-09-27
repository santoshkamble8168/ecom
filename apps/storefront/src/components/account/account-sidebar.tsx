import Link from "next/link";
import type { ReactNode } from "react";

export type AccountTab = "orders" | "profile" | "addresses" | "preferences" | "wishlist";

export function AccountSidebar({
  tab,
  onSelect,
  onSignOut,
}: {
  tab: AccountTab;
  onSelect: (tab: AccountTab) => void;
  onSignOut: () => void;
}) {
  return (
    <div>
      <nav className="overflow-hidden rounded-xl border border-neutral-200 bg-white" aria-label="Account">
        <SidebarRow
          icon={<OrdersIcon />}
          label="My orders"
          active={tab === "orders"}
          trailing={<ChevronIcon />}
          onClick={() => onSelect("orders")}
        />

        <Section title="Account settings" icon={<UserIcon />}>
          <SidebarLink active={tab === "profile"} onClick={() => onSelect("profile")}>
            Profile information
          </SidebarLink>
          <SidebarLink active={tab === "addresses"} onClick={() => onSelect("addresses")}>
            Manage addresses
          </SidebarLink>
        </Section>

        <Section title="My stuff" icon={<FolderIcon />}>
          <SidebarLink active={tab === "preferences"} onClick={() => onSelect("preferences")}>
            Notifications
          </SidebarLink>
          <SidebarLink active={tab === "wishlist"} onClick={() => onSelect("wishlist")}>
            Wishlist
          </SidebarLink>
        </Section>

        <button
          type="button"
          className="flex w-full items-center gap-3 border-t border-neutral-200 px-4 py-3.5 text-left text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          onClick={onSignOut}
        >
          <PowerIcon />
          Sign out
        </button>
      </nav>

      <p className="mt-3 px-1 text-xs text-neutral-500">
        Frequently visited:{" "}
        <Link href="/track" className="font-medium text-neutral-800 hover:underline">
          Track order
        </Link>
        <span aria-hidden="true"> · </span>
        <Link href="/contact" className="font-medium text-neutral-800 hover:underline">
          Help center
        </Link>
      </p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="border-t border-neutral-200">
      <p className="flex items-center gap-3 px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {icon}
        {title}
      </p>
      <div className="pb-2">{children}</div>
    </div>
  );
}

function SidebarRow({
  icon,
  label,
  active,
  trailing,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  trailing?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold uppercase tracking-wide ${
        active ? "bg-neutral-100 text-neutral-950" : "text-neutral-800 hover:bg-neutral-50"
      }`}
      onClick={onClick}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {trailing}
    </button>
  );
}

function SidebarLink({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      className={`block w-full py-2.5 pl-11 pr-4 text-left text-sm ${
        active ? "bg-neutral-100 font-semibold text-neutral-950" : "text-neutral-700 hover:bg-neutral-50"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10v12H7V7Z" />
      <path strokeLinecap="round" d="M9 7V5h6v2M9 11h6M9 15h4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path strokeLinecap="round" d="M5.5 19c1.2-2.8 3.4-4 6.5-4s5.3 1.2 6.5 4" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h6l2 2h8v8H4V8Z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 text-neutral-400" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8 5 5 5-5 5" />
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" d="M12 3v8" />
      <path strokeLinecap="round" d="M7 6.5a7 7 0 1 0 10 0" />
    </svg>
  );
}
