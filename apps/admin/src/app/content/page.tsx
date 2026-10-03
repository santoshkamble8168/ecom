"use client";

import type { PageSummary } from "@ecom/types";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@ecom/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { ContentStatusBadge } from "@/components/cms/status-badge";
import { AdminPageHeader } from "@/components/layout/page-header";
import { listPages } from "@/lib/cms-api";
import { formatDateTime } from "@/lib/format";

export default function ContentHomePage() {
  const pages = useQuery({
    queryKey: ["cms-home"],
    queryFn: () => listPages({ pageSize: 50 }),
  });
  const items = pages.data?.items ?? [];
  const drafts = items.filter((item) => item.status === "draft").slice(0, 5);
  const scheduled = items.filter((item) => item.status === "scheduled").slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Content"
        description="Create, preview, and publish the pages on this website."
        actions={
          <div className="flex gap-2">
            <Link href="/pages/new"><Button type="button">New page</Button></Link>
            <Link href="/dynamic-pages/new"><Button type="button" variant="outline">New dynamic page</Button></Link>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <QuickLink href="/pages" title="Pages" text="About, contact, policies, and other fixed pages." />
        <QuickLink href="/dynamic-pages" title="Dynamic Pages" text="Collections, categories, campaigns, landing pages, and blog pages." />
        <QuickLink href="/media" title="Media" text="Images and videos reused across the site." />
        <QuickLink href="/menus" title="Menus" text="Header and footer links." />
        <QuickLink href="/sections" title="Reusable Sections" text="Shared blocks you can place on more than one page." />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentList title="Drafts" items={drafts} empty="No drafts." />
        <RecentList title="Scheduled" items={scheduled} empty="Nothing is scheduled." />
      </div>
    </div>
  );
}

function QuickLink({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:border-neutral-400">
        <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent className="text-sm text-neutral-500">{text}</CardContent>
      </Card>
    </Link>
  );
}

function RecentList({ title, items, empty }: { title: string; items: PageSummary[]; empty: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length === 0 ? <p className="text-sm text-neutral-500">{empty}</p> : null}
        {items.map((item) => (
          <Link key={item.id} href={`${item.templateKey ? "/dynamic-pages" : "/pages"}/${item.id}`} className="flex items-center justify-between gap-3 text-sm hover:underline">
            <span>{item.title}</span>
            <span className="flex items-center gap-2 text-neutral-500">
              <ContentStatusBadge status={item.status} />
              {formatDateTime(item.updatedAt)}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
