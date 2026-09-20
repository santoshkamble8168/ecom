import type { ReactNode } from "react";

import { CmsPageView } from "@/components/cms/cms-page-view";
import { getPublishedCmsPage } from "@/lib/cms";

export async function CmsRoutedPage({
  slug,
  fallback,
  extra,
}: {
  slug: string;
  fallback: ReactNode;
  extra?: ReactNode;
}) {
  const page = await getPublishedCmsPage(slug);
  if (!page) {
    return (
      <>
        {fallback}
        {extra}
      </>
    );
  }
  return (
    <>
      <CmsPageView page={page} />
      {extra}
    </>
  );
}
