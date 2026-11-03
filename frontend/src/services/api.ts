import axios, { AxiosError } from "axios";

/** Same-origin API client. The session is an httpOnly cookie, so no token handling here. */
const api = axios.create({ baseURL: "/api", withCredentials: true, timeout: 15_000 });

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
    }
    return Promise.reject(error);
  },
);

/** Human-readable message for any API error (server sends {detail}). */
export function errorMessage(e: unknown, fallback = "Terjadi kesalahan. Coba lagi."): string {
  const err = e as AxiosError<{ detail?: string }>;
  if (err?.code === "ECONNABORTED") return "Koneksi lambat. Periksa internet lalu coba lagi.";
  if (err?.message === "Network Error") return "Tidak ada koneksi internet.";
  return err?.response?.data?.detail ?? fallback;
}

export default api;
