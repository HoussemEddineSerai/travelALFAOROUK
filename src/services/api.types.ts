/**
 * Public DTOs shared by every data-access call.
 * These types are storage-agnostic: they describe the shape consumed by the UI,
 * not how the local database or your future REST API encodes them on the wire.
 */

import type { Voyage, VoyageKind, ItineraryDay, IncludedItem } from "@/data/voyages";

export type { Voyage, VoyageKind, ItineraryDay, IncludedItem };

export type BookingStatus = "awaiting_payment" | "confirmed" | "cancelled";

export interface Booking {
  id: string;
  tracking_code: string;
  voyage_slug: string;
  voyage_name: string;
  full_name: string;
  phone_primary: string;
  phone_secondary: string | null;
  travelers: number;
  wilaya: string;
  daira: string;
  baladya: string;
  pickup_point: string;
  total_dzd: number;
  status: BookingStatus;
  receipt_url: string | null;
  voice_note_url: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
}

export interface NewBookingInput {
  tracking_code: string;
  voyage_slug: string;
  voyage_name: string;
  full_name: string;
  phone_primary: string;
  phone_secondary: string | null;
  travelers: number;
  wilaya: string;
  daira: string;
  baladya: string;
  pickup_point: string;
  total_dzd: number;
  voice_note_url?: string | null;
}

export interface Blacklist {
  id: string;
  phone: string;
  reason: string | null;
  created_at: string;
}

/** Payload accepted by upsertVoyage(). Mirrors the columns of the voyages table. */
export interface VoyageUpsertPayload {
  id?: string;
  slug: string;
  kind: VoyageKind;
  region_fr: string; region_ar: string; region_en: string;
  name_fr: string; name_ar: string; name_en: string;
  tagline_fr: string; tagline_ar: string; tagline_en: string;
  description_fr: string; description_ar: string; description_en: string;
  country_fr: string; country_ar: string;
  wilaya: string; daira: string; commune: string;
  image_url: string;
  days: number;
  price_dzd: number;
  itinerary: unknown;
  included: unknown;
  published: boolean;
  sort_order: number;
}

export type StorageBucket = "voice-notes" | "receipts" | "voyage-images" | "site-assets";

export interface VoyagePhoto {
  id: string;
  voyage_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface Testimonial {
  id: string;
  author_name: string;
  author_photo_url: string | null;
  rating: number;
  message_fr: string;
  message_ar: string;
  message_en: string;
  voyage_slug: string | null;
  published: boolean;
  sort_order: number;
  created_at: string;
}

export interface TestimonialUpsertPayload {
  id?: string;
  author_name: string;
  author_photo_url: string | null;
  rating: number;
  message_fr: string;
  message_ar: string;
  message_en: string;
  voyage_slug: string | null;
  published: boolean;
  sort_order: number;
}

export interface AuthSession {
  userId: string;
  email: string | null;
}

export interface AuthChangePayload {
  session: AuthSession | null;
}

export type AuthUnsubscribe = () => void;
