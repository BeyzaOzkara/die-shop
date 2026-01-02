// src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

const TOKEN_KEY = "access_token";

function buildQuery(params?: Record<string, any>) {
  if (!params) return "";
  const esc = encodeURIComponent;
  const query = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${esc(k)}=${esc(v)}`)
    .join("&");
  return query ? `?${query}` : "";
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, data: any) {
    let message = `API error ${status}`;

    if (data) {
      if (typeof data === "string") message = data;
      else if (typeof data === "object") {
        if (data.detail) message = data.detail;
        else if (data.message) message = data.message;
      }
    }

    super(message);
    this.status = status;
    this.data = data;
  }
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, any>
): Promise<T> {
  const url = `${API_BASE_URL}${path}${buildQuery(params)}`;

  const body = options.body as any;

  // ✅ FormData ise Content-Type'ı elle set etmiyoruz.
  const headers: Record<string, string> = {
    ...(options.headers as any),
  };

  // ✅ Token varsa ekle (login hariç hepsinde sorun yok, login'de token yok zaten)
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!isFormData(body)) {
    // JSON isteklerde set et
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  } else {
    // FormData'da Content-Type set edilirse boundary bozulur → kaldır
    if ("Content-Type" in headers) delete headers["Content-Type"];
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      const text = await res.text();
      data = text || null;
    }

    // ✅ Token expired / invalid ise otomatik temizle
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
    }

    throw new ApiError(res.status, data);
  }

  // 204 No Content (DELETE gibi)
  if (res.status === 204) {
    return undefined as T;
  }

  // boş body gelebilir (bazı endpointler 200 dönüp body boş dönebilir)
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
  // if (res.status === 204) return null as T;
  // return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, params?: Record<string, any>) =>
    request<T>(path, { method: "GET" }, params),

  post: <T>(path: string, body?: unknown, params?: Record<string, any>) =>
    request<T>(
      path,
      {
        method: "POST",
        body: body
          ? isFormData(body)
            ? (body as any)
            : JSON.stringify(body)
          : undefined,
      },
      params
    ),

  put: <T>(path: string, body?: unknown, params?: Record<string, any>) =>
    request<T>(
      path,
      {
        method: "PUT",
        body: body
          ? isFormData(body)
            ? (body as any)
            : JSON.stringify(body)
          : undefined,
      },
      params
    ),

  patch: <T>(path: string, body?: unknown, params?: Record<string, any>) =>
    request<T>(
      path,
      {
        method: "PATCH",
        body: body
          ? isFormData(body)
            ? (body as any)
            : JSON.stringify(body)
          : undefined,
      },
      params
    ),

  del: <T>(path: string, params?: Record<string, any>) =>
    request<T>(path, { method: "DELETE" }, params),
};

// İstersek dışarıdan da kullanalım diye export edelim:
export const authToken = {
  key: TOKEN_KEY,
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};