console.log("FULL ENV DUMP:", JSON.stringify(import.meta.env, null, 2));

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL as string;
const API_KEY = import.meta.env.VITE_API_KEY as string;

if (!API_BASE_URL) {
  console.error("VITE_BACKEND_URL is not set - check your .env file.");
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API request failed (${res.status} ${path}): ${body}`);
  }

  return (await res.json()) as T;
}
