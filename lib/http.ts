// A wrapper around the Electron IPC network request to handle response decoding.
// This centralizes the logic for calling from the renderer to the main process for network access.

interface HttpResponse<T = any> {
  ok: boolean;
  status: number;
  text?: string;
  json?: T;
  error?: string;
}

// FIX: Implement the httpGet function to bridge the renderer and main processes for network requests, bypassing CORS.
// This function utilizes the 'electronNet' API exposed by the preload script.
export async function httpGet<T = any>(url: string, headers?: Record<string, string>): Promise<HttpResponse<T>> {
  if (!window.electronNet) {
    console.error('Electron Net API is not available on the window object.');
    return {
      ok: false,
      status: 0,
      error: 'Electron networking bridge is not available.',
    };
  }

  try {
    const res = await window.electronNet.request({ url, headers });

    if (!res.ok) {
      return { ok: false, status: res.status, error: res.error || `HTTP error! status: ${res.status}` };
    }

    if (!res.bodyBase64) {
      return { ok: true, status: res.status };
    }

    // Decode the Base64 body received from the main process.
    const decodedText = atob(res.bodyBase64);

    try {
      const jsonData = JSON.parse(decodedText) as T;
      return { ok: true, status: res.status, text: decodedText, json: jsonData };
    } catch (e) {
      // If JSON parsing fails, return the raw text. This is common for M3U files.
      return { ok: true, status: res.status, text: decodedText };
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[httpGet] Request failed for ${url}:`, error);
    return { ok: false, status: 0, error };
  }
}
