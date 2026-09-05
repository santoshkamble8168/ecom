"use client";

import { Dialog } from "@ecom/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { hasAnyPermission, useAdminPermissions } from "@/components/auth/admin-session";
import {
  ADMIN_NAV_SECTIONS,
  allAdminNavHrefs,
  isAdminNavActive,
  type AdminNavSection,
} from "@/components/layout/admin-nav";
import { AdminNavIcon } from "@/components/layout/admin-nav-icon";
import { logout } from "@/lib/api";

const NAV_COLLAPSED_KEY = "ecom-admin-nav-collapsed";

function useVisibleNav() {
  const granted = useAdminPermissions();
  const ready = granted.size > 0;

  return useMemo(
    () =>
      ADMIN_NAV_SECTIONS.map((section) => ({
        ...section,
        items: ready ? section.items.filter((item) => hasAnyPermission(granted, item.permissions)) : section.items,
      })).filter((section) => section.items.length > 0),
    [granted, ready],
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
      aria-hidden="true"
    >
      <path d="M7 5l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function useCollapsedSections(sections: AdminNavSection[], pathname: string, hrefs: string[]) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(NAV_COLLAPSED_KEY);
      if (!raw) return;
      const titles = JSON.parse(raw) as unknown;
      if (Array.isArray(titles)) setCollapsed(new Set(titles.filter((title) => typeof title === "string")));
    } catch {
      // Ignore invalid stored state.
    }
  }, []);

  useEffect(() => {
    const activeSection = sections.find((section) =>
      section.items.some((item) => isAdminNavActive(item.href, pathname, hrefs)),
    );
    if (!activeSection) return;
    setCollapsed((current) => {
      if (!current.has(activeSection.title)) return current;
      const next = new Set(current);
      next.delete(activeSection.title);
      sessionStorage.setItem(NAV_COLLAPSED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, [hrefs, pathname, sections]);

  function toggle(title: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      sessionStorage.setItem(NAV_COLLAPSED_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  return { collapsed, toggle };
}

function NavSections({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const sections = useVisibleNav();
  const hrefs = useMemo(() => allAdminNavHrefs(), []);
  const { collapsed, toggle } = useCollapsedSections(sections, pathname, hrefs);

  return (
    <>
      {sections.map((section) => {
        const open = !collapsed.has(section.title);
        const panelId = `admin-nav-${section.title.toLowerCase().replace(/\s+/g, "-")}`;
        return (
          <div key={section.title} className="mb-2">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => toggle(section.title)}
              className="mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
            >
              <Chevron open={open} />
              <span className="min-w-0 flex-1 truncate">{section.title}</span>
            </button>
            {open ? (
              <ul id={panelId} className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active = isAdminNavActive(item.href, pathname, hrefs);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={
                          active
                            ? "flex items-center gap-2.5 rounded-md bg-white/10 px-2 py-1.5 pl-7 text-sm font-semibold text-white ring-1 ring-inset ring-white/15"
                            : "flex items-center gap-2.5 rounded-md px-2 py-1.5 pl-7 text-sm font-medium text-neutral-300 hover:bg-white/5 hover:text-white"
                        }
                      >
                        <span className={active ? "text-accent-400" : "text-neutral-400"}>
                          <AdminNavIcon href={item.href} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.badge ? (
                          <span
                            aria-hidden="true"
                            className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400"
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() =>
        void logout().then(() => {
          window.location.href = "/login";
        })
      }
      className="w-full rounded-md border border-white/15 px-3 py-2 text-sm text-neutral-200 hover:bg-white/5"
    >
      Sign out
    </button>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-lg font-bold tracking-tight text-white">ECOM</span>
      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-300">
        Admin
      </span>
    </div>
  );
}

export function AdminSidebar() {
  return (
    <aside className="hidden md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:sticky md:top-0 lg:w-64 bg-neutral-950 text-neutral-100">
      <div className="flex h-14 items-center border-b border-white/10 px-4">
        <Brand />
      </div>
      <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto px-3 py-4">
        <NavSections />
      </nav>
      <div className="border-t border-white/10 p-3">
        <SignOutButton />
      </div>
    </aside>
  );
}

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 md:hidden dark:border-neutral-800 dark:bg-neutral-900">
      <p className="font-display font-bold">ECOM Admin</p>
      <button
        type="button"
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        onClick={() => setOpen(true)}
      >
        Menu
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Admin navigation" className="sm:max-w-sm">
        <nav
          aria-label="Admin navigation"
          className="-mx-2 max-h-[70vh] overflow-y-auto rounded-lg bg-neutral-950 p-3 text-neutral-100"
        >
          <NavSections onNavigate={() => setOpen(false)} />
          <div className="mt-2 border-t border-white/10 pt-3">
            <SignOutButton />
          </div>
        </nav>
      </Dialog>
    </div>
  );
}
