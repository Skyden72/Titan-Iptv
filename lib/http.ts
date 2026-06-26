interface HttpResponse<T = unknown> {
  ok: boolean;
  status: number;
  text?: string;
  json?: T;
  error?: string;
}

export async function httpGet<T = unknown>(url: string, headers?: Record<string, string>): Promise<HttpResponse<T>> {
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, text, json: JSON.parse(text) as T };
    } catch {
      return { ok: res.ok, status: res.status, text };
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, error };
  }
}
