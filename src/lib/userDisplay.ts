export function sanitizeDisplayName(name: string) {
  return name.replace(/\s*-\s*\[[^\]]+\]\s*$/, "").trim();
}

export function deriveDisplayName(rawName?: string | null, email?: string | null) {
  const fallbackName = rawName?.trim() || email?.split("@")[0] || "Student";
  return sanitizeDisplayName(fallbackName);
}

export function getAvatarInitial(displayName: string) {
  return displayName.charAt(0).toUpperCase() || "U";
}