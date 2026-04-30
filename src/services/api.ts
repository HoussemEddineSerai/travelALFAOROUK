/**
 * Single public data-access surface for the entire app.
 *
 * Every component / page that needs data MUST import from this file.
 * The concrete implementation is selected at runtime via VITE_API_MODE:
 *   - "local" (default): Dexie.js based local storage adapter
 *   - "http": talks to your own REST API (set VITE_API_BASE_URL)
 */

import type {
  Voyage,
  Booking,
  NewBookingInput,
  Blacklist,
  VoyageUpsertPayload,
  StorageBucket,
  AuthSession,
  AuthUnsubscribe,
  VoyagePhoto,
  Testimonial,
  TestimonialUpsertPayload,
} from "./api.types";

export interface ApiAdapter {
  voyages: {
    list: (opts?: { includeUnpublished?: boolean }) => Promise<Voyage[]>;
    bySlug: (slug: string) => Promise<Voyage | null>;
    upsert: (payload: VoyageUpsertPayload) => Promise<void>;
    setPublished: (id: string, published: boolean) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };
  voyagePhotos: {
    listByVoyage: (voyageId: string) => Promise<VoyagePhoto[]>;
    listBySlug: (slug: string) => Promise<VoyagePhoto[]>;
    add: (voyageId: string, imageUrl: string, caption?: string | null) => Promise<VoyagePhoto>;
    remove: (id: string) => Promise<void>;
    reorder: (ids: string[]) => Promise<void>;
  };
  testimonials: {
    listPublished: () => Promise<Testimonial[]>;
    listAll: () => Promise<Testimonial[]>;
    upsert: (payload: TestimonialUpsertPayload) => Promise<void>;
    setPublished: (id: string, published: boolean) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };
  bookings: {
    create: (input: NewBookingInput) => Promise<void>;
    byTrackingCode: (code: string) => Promise<Booking | null>;
    list: () => Promise<Booking[]>;
    setStatus: (id: string, status: Booking["status"]) => Promise<void>;
    remove: (id: string) => Promise<void>;
    attachReceipt: (trackingCode: string, receiptUrl: string) => Promise<void>;
    checkIn: (id: string, adminId: string | null) => Promise<void>;
  };
  blacklist: {
    list: () => Promise<Blacklist[]>;
    isBlacklisted: (phones: string[]) => Promise<boolean>;
    add: (phone: string, reason: string | null) => Promise<Blacklist>;
    remove: (id: string) => Promise<void>;
  };
  siteSettings: {
    get: <T = unknown>(key: string) => Promise<T | null>;
    set: <T = unknown>(key: string, value: T, updatedBy: string | null) => Promise<void>;
  };
  storage: {
    /** Uploads a file and returns its publicly readable URL. */
    upload: (bucket: StorageBucket, path: string, file: Blob, contentType?: string) => Promise<string>;
  };
  auth: {
    getSession: () => Promise<AuthSession | null>;
    onChange: (cb: (s: AuthSession | null) => void) => AuthUnsubscribe;
    signInWithPassword: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    isAdmin: (userId: string) => Promise<boolean>;
    /** Resolve a list of admin user IDs to their email addresses (admin-only). */
    getAdminEmails: (userIds: string[]) => Promise<Record<string, string>>;
  };
}

import { httpAdapter } from "./impl/http";
import { localAdapter } from "./impl/local";

const MODE = (import.meta.env.VITE_API_MODE as string | undefined) ?? "local";

export const api: ApiAdapter = MODE === "http" ? httpAdapter : localAdapter;

export type {
  Voyage, Booking, NewBookingInput, Blacklist, VoyageUpsertPayload, AuthSession,
  VoyagePhoto, Testimonial, TestimonialUpsertPayload,
};
