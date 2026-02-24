const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;

export function getApiBaseUrl(): string {
  if (!rawApiUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_URL. Set it in apps/frontend/.env.");
  }

  return rawApiUrl.replace(/\/$/, "");
}
