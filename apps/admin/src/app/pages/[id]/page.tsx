"use client";

import { useParams } from "next/navigation";

import { ContentEditor } from "@/components/cms/content-editor";

export default function EditPagePage() {
  const params = useParams<{ id: string }>();
  return <ContentEditor mode="static" pageId={params.id} />;
}
