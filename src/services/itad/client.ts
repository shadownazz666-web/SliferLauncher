import { getItadConfig } from "@/services/itad/config";

export const ITAD_API_BASE = "https://api.isthereanydeal.com";

export class ItadHttpError extends Error {
  readonly status: number;
  readonly retryAfter: number | null;

  constructor(status: number, message: string, retryAfter: number | null = null) {
    super(message);
    this.name = "ItadHttpError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) {
    return null;
  }
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds;
  }
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, Math.ceil((dateMs - Date.now()) / 1000));
  }
  return null;
}

export interface ItadRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Bearer access token for user endpoints */
  accessToken?: string | null;
  /** Skip API key (OAuth-only endpoints) */
  skipApiKey?: boolean;
  retryOn429?: boolean;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function itadFetch<T>(
  path: string,
  options: ItadRequestOptions = {},
): Promise<T> {
  const config = getItadConfig();
  const method = options.method ?? "GET";
  const retryOn429 = options.retryOn429 !== false;

  const url = new URL(path.startsWith("http") ? path : `${ITAD_API_BASE}${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (!options.skipApiKey) {
    const apiKey = config.apiKey.trim();
    if (!apiKey) {
      throw new ItadHttpError(0, "Add your IsThereAnyDeal API key in Settings.");
    }
    headers["ITAD-API-Key"] = apiKey;
  }
  if (options.accessToken?.trim()) {
    headers.Authorization = `Bearer ${options.accessToken.trim()}`;
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  async function once(): Promise<Response> {
    return fetch(url.toString(), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  }

  let response = await once();
  if (response.status === 429 && retryOn429) {
    const wait = parseRetryAfter(response.headers.get("Retry-After")) ?? 5;
    await sleep(wait * 1000);
    response = await once();
  }

  if (!response.ok) {
    let detail = response.statusText || "Request failed";
    try {
      const payload = (await response.json()) as { message?: string; title?: string };
      detail = payload.message || payload.title || detail;
    } catch {
      // ignore
    }
    throw new ItadHttpError(
      response.status,
      detail,
      parseRetryAfter(response.headers.get("Retry-After")),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function formatItadPrice(price: { amount: number; currency: string } | null | undefined): string {
  if (!price) {
    return "—";
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: price.currency || "USD",
    }).format(price.amount);
  } catch {
    return `${price.amount.toFixed(2)} ${price.currency}`;
  }
}
