import { t } from "@/lib/i18n";

interface FieldLockBadgeProps {
  lockedBy: string;
  currentUserName: string;
}

export function FieldLockBadge({
  lockedBy,
  currentUserName,
}: FieldLockBadgeProps) {
  if (!lockedBy || lockedBy === currentUserName) {
    return null;
  }

  return (
    <span className="pointer-events-none absolute -top-2 left-2 z-10 inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs text-warning shadow-sm">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />
      {lockedBy} {t("isEditing")}
    </span>
  );
}
