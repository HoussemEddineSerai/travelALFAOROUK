import express from "express";
import cors from "cors";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();
const app = express();
const port = 3000;

// Construct DATABASE_URL from individual pieces if they exist (Zenith-style)
if (!process.env.DATABASE_URL && process.env.DB_HOST) {
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
  // Properly encode password for the connection string
  const encodedPassword = encodeURIComponent(DB_PASSWORD || "");
  process.env.DATABASE_URL = `postgresql://${DB_USER}:${encodedPassword}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

app.use(cors());
app.use(express.json());

// Set up file uploads
const uploadDir = path.resolve(process.cwd(), "public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files statically (Traefik Host: yourdomain.com | Path: /uploads)
app.use("/uploads", express.static(uploadDir));

const distDir = path.resolve(process.cwd(), "dist");

// --- Auto-Purge Script (Cleanup Ghost Records) ---
const autoPurge = async () => {
  console.log("Running Auto-Purge script...");
  try {
    // 1. Clean up VoyagePhotos with non-existent voyage_id
    const orphanedPhotos = await prisma.voyagePhoto.deleteMany({
      where: {
        voyage: { is: null }
      }
    });
    if (orphanedPhotos.count > 0) console.log(`Purged ${orphanedPhotos.count} orphaned photos.`);

    // 2. Clean up Bookings with non-existent voyage_slug
    const orphanedBookings = await prisma.booking.deleteMany({
      where: {
        voyage: { is: null }
      }
    });
    if (orphanedBookings.count > 0) console.log(`Purged ${orphanedBookings.count} orphaned bookings.`);

    // 3. Clean up Testimonials with a non-null but non-existent voyage_slug
    const orphanedTestimonials = await prisma.testimonial.deleteMany({
      where: {
        voyage_slug: { not: null },
        voyage: { is: null }
      }
    });
    if (orphanedTestimonials.count > 0) console.log(`Purged ${orphanedTestimonials.count} orphaned testimonials.`);

    console.log("Auto-Purge completed.");
  } catch (error) {
    console.error("Auto-Purge failed:", error);
  }
};

// API Router (Traefik Host: yourdomain.com | Path: /api)
const api = express.Router();

const mapVoyage = (r: any) => ({
  id: r.id,
  slug: r.slug,
  kind: r.kind || "excursion",
  image: r.image_url || "/placeholder.svg",
  region: { fr: r.region_fr, ar: r.region_ar, en: r.region_en },
  name: { fr: r.name_fr, ar: r.name_ar || r.name_fr, en: r.name_en || r.name_fr },
  tagline: { fr: r.tagline_fr, ar: r.tagline_ar, en: r.tagline_en },
  description: { fr: r.description_fr, ar: r.description_ar, en: r.description_en },
  country: { fr: r.country_fr || "", ar: r.country_ar || "" },
  wilaya: r.wilaya || "",
  daira: r.daira || "",
  commune: r.commune || "",
  days: r.days,
  priceDzd: r.price_dzd,
  itinerary: JSON.parse(r.itinerary || "[]"),
  included: JSON.parse(r.included || "[]"),
  published: r.published,
  sortOrder: r.sort_order,
});

// Storage route
api.post("/storage/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// Auth mock endpoints
api.post("/auth/sign-in", (req, res) => {
  const { email, password } = req.body;
  if (email === "info@alfaroukdz.com" && password === "alfaroukDZ1919") {
    return res.json({ session: { userId: "admin-id-1", email } });
  }
  res.status(401).json({ error: "Identifiants incorrects" });
});

api.post("/auth/sign-out", (req, res) => {
  res.status(204).send();
});

api.get("/auth/me", (req, res) => {
  res.json({ user: null });
});

api.post("/auth/admins", (req, res) => {
  const { userIds } = req.body;
  const map: Record<string, string> = {};
  if (Array.isArray(userIds)) {
    userIds.forEach((id: string) => {
      if (id === "admin-id-1") map[id] = "info@alfaroukdz.com";
    });
  }
  res.json({ admins: map });
});

api.get("/auth/is-admin/:id", (req, res) => {
  res.json({ isAdmin: req.params.id === "admin-id-1" });
});

// Voyages endpoints
api.get("/voyages", async (req, res) => {
  const includeUnpublished = req.query.includeUnpublished === "1";
  const voyages = await prisma.voyage.findMany({
    where: includeUnpublished ? undefined : { published: true },
    orderBy: { sort_order: "asc" }
  });
  res.json(voyages.map(mapVoyage));
});

api.get("/voyages/:slug", async (req, res) => {
  const voyage = await prisma.voyage.findUnique({
    where: { slug: req.params.slug }
  });
  if (!voyage) return res.status(404).json({ error: "Not found" });
  res.json(mapVoyage(voyage));
});

api.post("/voyages", async (req, res) => {
  try {
    const { itinerary, included, ...rest } = req.body;
    const voyage = await prisma.voyage.create({
      data: {
        ...rest,
        itinerary: JSON.stringify(itinerary || []),
        included: JSON.stringify(included || [])
      }
    });
    return res.json(voyage);
  } catch (error: any) {
    if (error.code === "P2002") {
      try {
        const randomSuffix = Math.random().toString(36).slice(2, 7);
        const { itinerary, included, ...rest } = req.body;
        const voyage = await prisma.voyage.create({
          data: {
            ...rest,
            slug: `${rest.slug}-${randomSuffix}`,
            itinerary: JSON.stringify(itinerary || []),
            included: JSON.stringify(included || [])
          }
        });
        return res.json(voyage);
      } catch (retryError) {
        return res.status(400).json({ error: "Un voyage avec ce nom existe déjà." });
      }
    }
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
});

api.put("/voyages/:id", async (req, res) => {
  try {
    const { itinerary, included, ...rest } = req.body;
    const voyage = await prisma.voyage.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        itinerary: itinerary ? JSON.stringify(itinerary) : undefined,
        included: included ? JSON.stringify(included) : undefined
      }
    });
    res.json(voyage);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Un voyage avec ce nom/slug existe déjà." });
    }
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
});

api.patch("/voyages/:id/published", async (req, res) => {
  const voyage = await prisma.voyage.update({
    where: { id: req.params.id },
    data: { published: req.body.published }
  });
  res.json(voyage);
});

api.delete("/voyages/:id", async (req, res) => {
  await prisma.voyage.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Voyage Photos
api.get("/voyages/:id/photos", async (req, res) => {
  const photos = await prisma.voyagePhoto.findMany({
    where: { voyage_id: req.params.id },
    orderBy: { sort_order: "asc" }
  });
  res.json(photos);
});

api.get("/voyages/by-slug/:slug/photos", async (req, res) => {
  const voyage = await prisma.voyage.findUnique({ where: { slug: req.params.slug }});
  if (!voyage) return res.json([]);
  const photos = await prisma.voyagePhoto.findMany({
    where: { voyage_id: voyage.id },
    orderBy: { sort_order: "asc" }
  });
  res.json(photos);
});

api.post("/voyages/:id/photos", async (req, res) => {
  const count = await prisma.voyagePhoto.count({ where: { voyage_id: req.params.id } });
  const photo = await prisma.voyagePhoto.create({
    data: {
      voyage_id: req.params.id,
      image_url: req.body.image_url,
      caption: req.body.caption,
      sort_order: count
    }
  });
  res.json(photo);
});

api.delete("/voyage-photos/:id", async (req, res) => {
  await prisma.voyagePhoto.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

api.patch("/voyage-photos/reorder", async (req, res) => {
  const ids: string[] = req.body.ids;
  for (let i = 0; i < ids.length; i++) {
    await prisma.voyagePhoto.update({
      where: { id: ids[i] },
      data: { sort_order: i }
    });
  }
  res.status(204).send();
});

// Testimonials
api.get("/testimonials", async (req, res) => {
  const onlyPublished = req.query.published === "1";
  const t = await prisma.testimonial.findMany({
    where: onlyPublished ? { published: true } : undefined,
    orderBy: [{ sort_order: "asc" }, { created_at: "desc" }]
  });
  res.json(t);
});

api.post("/testimonials", async (req, res) => {
  const t = await prisma.testimonial.create({ data: req.body });
  res.json(t);
});

api.put("/testimonials/:id", async (req, res) => {
  const t = await prisma.testimonial.update({ where: { id: req.params.id }, data: req.body });
  res.json(t);
});

api.patch("/testimonials/:id/published", async (req, res) => {
  const t = await prisma.testimonial.update({
    where: { id: req.params.id },
    data: { published: req.body.published }
  });
  res.json(t);
});

api.delete("/testimonials/:id", async (req, res) => {
  await prisma.testimonial.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Bookings
api.get("/bookings", async (req, res) => {
  const b = await prisma.booking.findMany({ orderBy: { created_at: "desc" } });
  res.json(b);
});

api.get("/bookings/by-code/:code", async (req, res) => {
  const b = await prisma.booking.findUnique({ where: { tracking_code: req.params.code } });
  if (!b) return res.status(404).json({ error: "Not found" });
  res.json(b);
});

api.post("/bookings", async (req, res) => {
  const b = await prisma.booking.create({ data: req.body });
  res.json(b);
});

api.patch("/bookings/:id/status", async (req, res) => {
  const b = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status: req.body.status }
  });
  res.json(b);
});

api.delete("/bookings/:id", async (req, res) => {
  await prisma.booking.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

api.post("/bookings/:code/receipt", async (req, res) => {
  await prisma.booking.update({
    where: { tracking_code: req.params.code },
    data: { receipt_url: req.body.receipt_url }
  });
  res.json({ success: true });
});

api.patch("/bookings/:id/check-in", async (req, res) => {
  await prisma.booking.update({
    where: { id: req.params.id },
    data: { checked_in_at: new Date(), checked_in_by: "admin-id-1" }
  });
  res.json({ success: true });
});

// Blacklist
api.get("/blacklist", async (req, res) => {
  const b = await prisma.blacklistedPhone.findMany({ orderBy: { created_at: "desc" } });
  res.json(b);
});

api.post("/blacklist/check", async (req, res) => {
  const { phones } = req.body;
  const count = await prisma.blacklistedPhone.count({
    where: { phone: { in: phones } }
  });
  res.json({ blacklisted: count > 0 });
});

api.post("/blacklist", async (req, res) => {
  const b = await prisma.blacklistedPhone.create({ data: req.body });
  res.json(b);
});

api.delete("/blacklist/:id", async (req, res) => {
  await prisma.blacklistedPhone.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Site Settings
api.get("/site-settings/:key", async (req, res) => {
  const s = await prisma.siteSetting.findUnique({ where: { key: req.params.key } });
  if (!s) return res.status(404).json({ error: "Not found" });
  res.json(JSON.parse(s.value));
});

api.put("/site-settings/:key", async (req, res) => {
  const s = await prisma.siteSetting.upsert({
    where: { key: req.params.key },
    update: { value: JSON.stringify(req.body.value), updated_by: req.body.updatedBy },
    create: { key: req.params.key, value: JSON.stringify(req.body.value), updated_by: req.body.updatedBy }
  });
  res.json(s);
});

// Mount the API router
app.use("/api", api);

// Serve frontend in production (Traefik Host: yourdomain.com | Path: /)
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  
  // Fallback for SPA routing (must be LAST)
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

// Initialization and Startup
const start = async () => {
  await autoPurge();
  app.listen(port, () => {
    console.log(`Server running on Port ${port}`);
    console.log(`- API: http://localhost:${port}/api`);
    console.log(`- Uploads: http://localhost:${port}/uploads`);
  });
};

start();
