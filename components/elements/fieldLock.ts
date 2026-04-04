export interface FieldLockContext {
  lockedFields: Record<string, string>;
  currentUserName: string;
  onFocusField: (fieldName: string) => void;
  onBlurField: () => void;
}

export function resolveFieldLock(
  context: FieldLockContext | undefined,
  fieldName: string
) {
  const lockedBy =
    context && fieldName ? context.lockedFields[fieldName] ?? "" : "";
  const isLocked = Boolean(
    context &&
      lockedBy &&
      lockedBy.trim().length > 0 &&
      lockedBy !== context.currentUserName
  );

  return { lockedBy, isLocked };
}

export function focusField(
  context: FieldLockContext | undefined,
  fieldName: string
) {
  if (!context || !fieldName) {
    return;
  }
  context.onFocusField(fieldName);
}

export function blurField(context: FieldLockContext | undefined) {
  if (!context) {
    return;
  }
  context.onBlurField();
}
