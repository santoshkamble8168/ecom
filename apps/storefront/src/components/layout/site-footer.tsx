export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 py-10 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto max-w-7xl px-4 text-sm text-neutral-600 dark:text-neutral-400">
        <p>&copy; {new Date().getFullYear()} Ecom. All rights reserved.</p>
      </div>
    </footer>
  );
}
