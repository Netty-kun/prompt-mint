const API_BASE = "/api/prompt-order";

export async function getPromptOrder(walletAddress: string): Promise<string[]> {
  const params = new URLSearchParams({ walletAddress });
  const response = await fetch(`${API_BASE}?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch prompt order");
  }

  const data = await response.json();
  return data.order ?? [];
}

export async function setPromptOrder(walletAddress: string, order: string[]): Promise<string[]> {
  const response = await fetch(API_BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, order }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save prompt order");
  }

  const data = await response.json();
  return data.order ?? [];
}
