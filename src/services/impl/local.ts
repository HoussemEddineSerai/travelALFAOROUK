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

const BASE = "/api";
const TOKEN_KEY = "alfarouk_local_session";

const getSession = (): AuthSession | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(TOKEN_KEY);
  return stored ? JSON.parse(stored) : null;
};

const setSession = (s: AuthSession | null) => {
  if (typeof window === "undefined") return;
  if (s) localStorage.setItem(TOKEN_KEY, JSON.stringify(s));
  else localStorage.removeItem(TOKEN_KEY);
  notifyAuth();
};

const authListeners: Set<(s: AuthSession | null) => void> = new Set();
const notifyAuth = () => {
  const s = getSession();
  authListeners.forEach(cb => cb(s));
};

interface RequestInitWithBody extends Omit<RequestInit, "body"> {
  body?: unknown;
}

const request = async <T = unknown>(path: string, init: RequestInitWithBody = {}): Promise<T> => {
  const headers = new Headers(init.headers as HeadersInit);
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

export const localAdapter: ApiAdapter = {
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
      const r = await request<any>(`/site-settings/${encodeURIComponent(key)}`);
      return r ?? null;
    },
    set: async <T = unknown>(key: string, value: T, updatedBy: string | null) => {
      await request(`/site-settings/${encodeURIComponent(key)}`, {
        method: "PUT",
        body: { value, updatedBy },
      });
    },
  },

  storage: {
    upload: async (bucket: StorageBucket, path, file) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await request<{ url: string }>(`/storage/upload`, { method: "POST", body: fd });
      return res.url; // Returns /uploads/... which the frontend will serve locally
    },
  },

  auth: {
    getSession: async () => getSession(),
    onChange: (cb) => {
      authListeners.add(cb);
      return () => authListeners.delete(cb);
    },
    signInWithPassword: async (email, password) => {
      const res = await request<{ session: AuthSession }>(`/auth/sign-in`, {
        method: "POST",
        body: { email, password },
      });
      setSession(res.session);
    },
    signOut: async () => {
      try {
        await request(`/auth/sign-out`, { method: "POST" });
      } finally {
        setSession(null);
      }
    },
    isAdmin: async (userId) => {
      try {
        const r = await request<{ isAdmin: boolean }>(`/auth/is-admin/${encodeURIComponent(userId)}`);
        return !!r.isAdmin;
      } catch {
        return false;
      }
    },
    getAdminEmails: async (userIds) => {
      if (userIds.length === 0) return {};
      const res = await request<{ admins: Record<string, string> }>(`/auth/admins`, {
        method: "POST",
        body: { userIds },
      });
      return res.admins || {};
    },
  },
};
