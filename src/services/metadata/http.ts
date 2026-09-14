import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/runtime";

interface RemoteFetchRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export async function fetchRemoteText(request: RemoteFetchRequest): Promise<string> {
  if (!isTauriRuntime()) {
    const response = await fetch(request.url, {
      method: request.method ?? "GET",
      headers: request.headers,
      body: request.body,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  }

  return invoke<string>("fetch_remote_text", { request });
}

export async function fetchRemoteJson<T>(request: RemoteFetchRequest): Promise<T> {
  const text = await fetchRemoteText(request);
  return JSON.parse(text) as T;
}
