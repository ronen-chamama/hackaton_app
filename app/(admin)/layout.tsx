import Link from "next/link";
import { t } from "@/lib/i18n";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-surface-raised">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <h1 className="text-lg font-semibold text-foreground">
            {t("adminDashboard")}
          </h1>
          <nav className="flex items-center gap-2">
            <Link
              href="/admin"
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface"
            >
              {t("hackathons")}
            </Link>
            <Link
              href="/admin/groups"
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface"
            >
              {t("groups")}
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 md:px-6 md:py-6">
        {children}
      </div>
    </div>
  );
}
