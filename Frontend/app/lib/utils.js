/**
 * Formats image or media file URLs.
 * Converts relative upload paths (e.g. "/uploads/photos/...") into full Backend URLs
 * so images render cleanly on the frontend web app.
 */
export function getMediaUrl(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== "string") return "";
  const trimmed = pathOrUrl.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  const backendServer = process.env.NEXT_PUBLIC_BACKEND_SERVER || "http://localhost:5001";
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${backendServer}${cleanPath}`;
}
