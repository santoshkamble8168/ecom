"use client";

import { useParams } from "next/navigation";

import { PostForm } from "@/components/blog/post-form";

export default function EditBlogPostPage() {
  const params = useParams<{ id: string }>();
  return <PostForm postId={params.id} />;
}
