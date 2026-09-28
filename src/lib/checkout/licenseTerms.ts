export interface LicenseTerm {
  _id: string;
  version: number;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export async function fetchActiveLicenseTerms(): Promise<LicenseTerm[]> {
  const res = await fetch(`${API_BASE}/api/license-terms/active`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchListingTerms(promptId: string): Promise<LicenseTerm | null> {
  const res = await fetch(`${API_BASE}/api/license-terms/listing/${promptId}`);
  if (!res.ok) return null;
  return res.json();
}
