/**
 * HTTP / REST implementation of ApiAdapter — STUB.
 *
 * Activated when VITE_API_MODE=http. Talks to a backend exposed at
 * VITE_API_BASE_URL. Designed to map 1:1 onto the endpoints listed below
 * so you can implement them on your own Node.js + Postgres server.
 *
 * ─── Endpoint contract ──────────────────────────────────────────────────
 *
 * GET    /voyages?includeUnpublished=0|1      → Voyage[]
 * GET    /voyages/:slug                       → Voyage | 404
 * POST   /voyages                             → 201   body: VoyageUpsertPayload
 * PUT    /voyages/:id                         → 204   body: VoyageUpsertPayload
 * PATCH  /voyages/:id/published               → 204   body: { published: boolean }
 * DELETE /voyages/:id                         → 204
 *
 * GET    /voyages/:id/photos                  → VoyagePhoto[]
 * GET    /voyages/by-slug/:slug/photos        → VoyagePhoto[]
 * POST   /voyages/:id/photos                  → 201   body: { image_url, caption? }
 * DELETE /voyage-photos/:id                   → 204
 * PATCH  /voyage-photos/reorder               → 204   body: { ids: string[] }
 *
 * GET    /testimonials?published=0|1          → Testimonial[]
 * POST   /testimonials                        → 201   body: TestimonialUpsertPayload
 * PUT    /testimonials/:id                    → 204   body: TestimonialUpsertPayload
 * PATCH  /testimonials/:id/published          → 204   body: { published }
 * DELETE /testimonials/:id                    → 204
 * GET    /bookings                            → Booking[]              (admin)
 * POST   /bookings                            → 201   body: NewBookingInput
 * GET    /bookings/by-code/:trackingCode      → Booking | 404
 * PATCH  /bookings/:id/status                 → 204   body: { status }
 * PATCH  /bookings/:id/check-in               → 204
 * POST   /bookings/:trackingCode/receipt      → 204   body: { receipt_url }
 * DELETE /bookings/:id                        → 204
 *
 * GET    /blacklist                           → Blacklist[]
 * POST   /blacklist/check                     → { blacklisted: boolean }   body: { phones: string[] }
 * POST   /blacklist                           → 201   body: { phone, reason }
 * DELETE /blacklist/:id                       → 204
 *
 * GET    /site-settings/:key                  → { value: T } | 404
 * PUT    /site-settings/:key                  → 204   body: { value: T }
 *
 * POST   /storage/:bucket                     → { url: string }   multipart "file" + form "path"
 *
 * POST   /auth/sign-in                        → { token, session } body: { email, password }
 * POST   /auth/sign-out                       → 204
 * GET    /auth/session                        → AuthSession | 401
 * GET    /auth/is-admin                       → { admin: boolean }
 * POST   /auth/admin-emails                   → Record<userId, email>      body: { userIds: string[] }
 *
 * Auth:  Bearer token sent as `Authorization: Bearer <token>` header.
 *        Token is persisted under localStorage["alfarouk.token"].
 *
 * NOTE:  This adapter is not yet wired against a live server. The methods
 *        below throw a clear error so any accidental use is obvious. Once
 *        your server is ready, fill in the bodies (most are 5-line fetch
 *        wrappers) and remove the throw at the top of each method.
 * ────────────────────────────────────────────────────────────────────────
 */

import type { ApiAdapter } from "../api";
import type {
  Voyage,
  Booking,
  Blacklist,
  AuthSession,
  StorageBucket,
  VoyagePhoto,
  Testimonial,
} from "../api.types";

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";
const TOKEN_KEY = "alfarouk.token";

const getToken = (): string | null =>
  typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);

const setToken = (t: string | null) => {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

interface RequestInitWithBody extends Omit<RequestInit, "body"> {
  body?: unknown;
}

const request = async <T = unknown>(path: string, init: RequestInitWithBody = {}): Promise<T> => {
  if (!BASE) {
    throw new Error(
      "VITE_API_BASE_URL is not set. Configure your backend URL or switch VITE_API_MODE back to 'local'.",
    );
  }
  const headers = new Headers(init.headers as HeadersInit);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body: BodyInit | undefined;
  if (init.body instanceof FormData) {
    body = init.body;
  } else if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.body);
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers, body });
  if (res.status === 204) return undefined as T;
  if (res.status === 404) return null as T;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
  }
  return (await res.json()) as T;
};

const notImplemented = (name: string): never => {
  throw new Error(`api.${name} is not yet implemented in the HTTP adapter. See src/services/impl/http.ts`);
};

export const httpAdapter: ApiAdapter = {
  voyages: {
    list: ({ includeUnpublished = false } = {}) =>
      request<Voyage[]>(`/voyages?includeUnpublished=${includeUnpublished ? 1 : 0}`),
    bySlug: (slug) => request<Voyage | null>(`/voyages/${encodeURIComponent(slug)}`),
    upsert: async (payload) => {
      if (payload.id) {
        await request(`/voyages/${payload.id}`, { method: "PUT", body: payload });
      } else {
        await request(`/voyages`, { method: "POST", body: payload });
      }
    },
    setPublished: async (id, published) => {
      await request(`/voyages/${id}/published`, { method: "PATCH", body: { published } });
    },
    remove: async (id) => {
      await request(`/voyages/${id}`, { method: "DELETE" });
    },
  },

  voyagePhotos: {
    listByVoyage: (voyageId) => request<VoyagePhoto[]>(`/voyages/${voyageId}/photos`),
    listBySlug: (slug) => request<VoyagePhoto[]>(`/voyages/by-slug/${encodeURIComponent(slug)}/photos`),
    add: (voyageId, imageUrl, caption = null) =>
      request<VoyagePhoto>(`/voyages/${voyageId}/photos`, {
        method: "POST", body: { image_url: imageUrl, caption },
      }),
    remove: async (id) => { await request(`/voyage-photos/${id}`, { method: "DELETE" }); },
    reorder: async (ids) => { await request(`/voyage-photos/reorder`, { method: "PATCH", body: { ids } }); },
  },

  testimonials: {
    listPublished: () => request<Testimonial[]>(`/testimonials?published=1`),
    listAll: () => request<Testimonial[]>(`/testimonials`),
    upsert: async (payload) => {
      if (payload.id) {
        await request(`/testimonials/${payload.id}`, { method: "PUT", body: payload });
      } else {
        await request(`/testimonials`, { method: "POST", body: payload });
      }
    },
    setPublished: async (id, published) => {
      await request(`/testimonials/${id}/published`, { method: "PATCH", body: { published } });
    },
    remove: async (id) => { await request(`/testimonials/${id}`, { method: "DELETE" }); },
  },

  bookings: {
    create: async (input) => {
      await request(`/bookings`, { method: "POST", body: input });
    },
    byTrackingCode: (code) =>
      request<Booking | null>(`/bookings/by-code/${encodeURIComponent(code)}`),
    list: () => request<Booking[]>(`/bookings`),
    setStatus: async (id, status) => {
      await request(`/bookings/${id}/status`, { method: "PATCH", body: { status } });
    },
    remove: async (id) => {
      await request(`/bookings/${id}`, { method: "DELETE" });
    },
    attachReceipt: async (trackingCode, receiptUrl) => {
      await request(`/bookings/${encodeURIComponent(trackingCode)}/receipt`, {
        method: "POST",
        body: { receipt_url: receiptUrl },
      });
    },
    checkIn: async (id) => {
      await request(`/bookings/${id}/check-in`, { method: "PATCH" });
    },
  },

  blacklist: {
    list: () => request<Blacklist[]>(`/blacklist`),
    isBlacklisted: async (phones) => {
      if (phones.length === 0) return false;
      const res = await request<{ blacklisted: boolean }>(`/blacklist/check`, {
        method: "POST",
        body: { phones },
      });
      return !!res.blacklisted;
    },
    add: (phone, reason) =>
      request<Blacklist>(`/blacklist`, { method: "POST", body: { phone, reason } }),
    remove: async (id) => {
      await request(`/blacklist/${id}`, { method: "DELETE" });
    },
  },

  siteSettings: {
    get: async <T = unknown>(key: string): Promise<T | null> => {
      const r = await request<{ value: T } | null>(`/site-settings/${encodeURIComponent(key)}`);
      return r?.value ?? null;
    },
    set: async <T = unknown>(key: string, value: T) => {
      await request(`/site-settings/${encodeURIComponent(key)}`, {
        method: "PUT",
        body: { value },
      });
    },
  },

  storage: {
    upload: async (bucket: StorageBucket, path, file) => {
      const fd = new FormData();
      fd.append("path", path);
      fd.append("file", file);
      const res = await request<{ url: string }>(`/storage/${bucket}`, { method: "POST", body: fd });
      return res.url;
    },
  },

  auth: {
    getSession: async () => {
      try {
        return await request<AuthSession | null>(`/auth/session`);
      } catch {
        return null;
      }
    },
    onChange: (_cb) => {
      // Server-side sessions don't push events. UI re-checks on mount.
      return () => {};
    },
    signInWithPassword: async (email, password) => {
      const res = await request<{ token: string; session: AuthSession }>(`/auth/sign-in`, {
        method: "POST",
        body: { email, password },
      });
      setToken(res.token);
    },
    signOut: async () => {
      try {
        await request(`/auth/sign-out`, { method: "POST" });
      } finally {
        setToken(null);
      }
    },
    isAdmin: async () => {
      try {
        const r = await request<{ admin: boolean }>(`/auth/is-admin`);
        return !!r.admin;
      } catch {
        return false;
      }
    },
    getAdminEmails: async (userIds) => {
      if (userIds.length === 0) return {};
      return await request<Record<string, string>>(`/auth/admin-emails`, {
        method: "POST",
        body: { userIds },
      });
    },
  },
};

// Silence unused-symbol warnings until you wire the adapter up
void notImplemented;
