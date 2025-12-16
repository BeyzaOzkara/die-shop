// // src/lib/api.ts
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// function buildQuery(params?: Record<string, any>) {
//   if (!params) return "";
//   const esc = encodeURIComponent;
//   const query = Object.entries(params)
//     .filter(([_, v]) => v !== undefined && v !== null)
//     .map(([k, v]) => `${esc(k)}=${esc(v)}`)
//     .join("&");
//   return query ? `?${query}` : "";
// }

// // 👇 Özel hata sınıfı
// export class ApiError extends Error {
//   status: number;
//   data: any;

//   constructor(status: number, data: any) {
//     let message = `API error ${status}`;

//     if (data) {
//       if (typeof data === "string") {
//         message = data;
//       } else if (typeof data === "object") {
//         if (data.detail) message = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
//         else if (data.message) message = data.message;
//       }
//     }

//     super(message);
//     this.status = status;
//     this.data = data;
//   }
// }

// async function request<T>(
//   path: string,
//   options: RequestInit = {},
//   params?: Record<string, any>
// ): Promise<T> {
//   const url = `${API_BASE_URL}${path}${buildQuery(params)}`;

//   const isFormData = options.body instanceof FormData;

//   // headers merge + Content-Type kontrolü
//   const headers: Record<string, string> = {
//     ...(options.headers as Record<string, string> | undefined),
//   };

//   // JSON body ise Content-Type set et, FormData ise ASLA set etme (boundary lazım)
//   if (!isFormData) {
//     headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
//   } else {
//     delete headers["Content-Type"];
//   }

//   const res = await fetch(url, {
//     ...options,
//     headers,
//   });

//   if (!res.ok) {
//     const contentType = res.headers.get("content-type") || "";
//     let data: any = null;

//     try {
//       if (contentType.includes("application/json")) {
//         data = await res.json();
//       } else {
//         const text = await res.text();
//         data = text || null;
//       }
//     } catch {
//       // fallback
//       try {
//         const text = await res.text();
//         data = text || null;
//       } catch {
//         data = null;
//       }
//     }

//     console.error("API error detail:", data);
//     throw new ApiError(res.status, data);
//   }

//   if (res.status === 204) return null as T;

//   const contentType = res.headers.get("content-type") || "";
//   if (contentType.includes("application/json")) {
//     return (await res.json()) as T;
//   }

//   // JSON olmayan response gelirse
//   return (await res.text()) as any;
// }

// export const api = {
//   get: <T>(path: string, params?: Record<string, any>) =>
//     request<T>(path, { method: "GET" }, params),

//   post: <T>(path: string, body?: any, params?: Record<string, any>) => {
//     const isFormData = body instanceof FormData;
//     return request<T>(
//       path,
//       {
//         method: "POST",
//         body: body == null ? undefined : isFormData ? body : JSON.stringify(body),
//       },
//       params
//     );
//   },

//   put: <T>(path: string, body?: any, params?: Record<string, any>) => {
//     const isFormData = body instanceof FormData;
//     return request<T>(
//       path,
//       {
//         method: "PUT",
//         body: body == null ? undefined : isFormData ? body : JSON.stringify(body),
//       },
//       params
//     );
//   },

//   patch: <T>(path: string, body?: any, params?: Record<string, any>) => {
//     const isFormData = body instanceof FormData;
//     return request<T>(
//       path,
//       {
//         method: "PATCH",
//         body: body == null ? undefined : isFormData ? body : JSON.stringify(body),
//       },
//       params
//     );
//   },

//   del: <T>(path: string, params?: Record<string, any>) =>
//     request<T>(path, { method: "DELETE" }, params),
// };
// src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

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
      else if (typeof data === "object") message = data.detail ?? data.message ?? message;
    }
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(path: string, options: RequestInit = {}, params?: Record<string, any>): Promise<T> {
  const url = `${API_BASE_URL}${path}${buildQuery(params)}`;

  const isFormData = options.body instanceof FormData;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      const text = await res.text();
      data = text || null;
    }
    throw new ApiError(res.status, data);
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, params?: Record<string, any>) => request<T>(path, { method: "GET" }, params),

  post: <T>(path: string, body?: any, params?: Record<string, any>) => {
    const isFormData = body instanceof FormData;
    return request<T>(
      path,
      {
        method: "POST",
        body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
      },
      params
    );
  },

  patch: <T>(path: string, body?: any, params?: Record<string, any>) =>
    request<T>(
      path,
      { method: "PATCH", body: body ? JSON.stringify(body) : undefined },
      params
    ),
};
