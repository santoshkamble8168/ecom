"use client";

import { useParams } from "next/navigation";

import { ContentEditor } from "@/components/cms/content-editor";

export default function EditDynamicPage() {
  const params = useParams<{ id: string }>();
  return <ContentEditor mode="dynamic" pageId={params.id} />;
}
