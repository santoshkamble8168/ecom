"use client";

import { useParams } from "next/navigation";

import { PageForm } from "@/components/cms/page-form";

export default function EditPagePage() {
  const params = useParams<{ id: string }>();
  return <PageForm pageId={params.id} />;
}
