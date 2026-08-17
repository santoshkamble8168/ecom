import { cn } from "../lib/cn";

/**
 * Renders CMS/blog HTML that the API sanitizes on write
 * (`sanitizeRichHtml` in the API). This component does not re-sanitize.
 * Styling comes from `.rich-text-content` in the consuming app's global CSS.
 */
export function RichHtml({ html, className }: { html: string; className?: string }) {
  return <div className={cn("rich-text-content", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
