import type { ObjectId } from "mongodb";

export type VendorServiceStatus = "pending" | "approved" | "rejected";

export interface VendorServiceDocument {
  _id?: ObjectId;
  serviceName: string;
  category: string;
  description: string;
  price: number;
  location: string;
  images: string[];
  highlights: string[];
  status: VendorServiceStatus;
  isActive: boolean;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  vendorPhone: string;
  vendorIsPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorServiceResponseItem {
  id: string;
  serviceName: string;
  category: string;
  description: string;
  price: number;
  location: string;
  images: string[];
  highlights: string[];
  status: VendorServiceStatus;
  isActive: boolean;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  vendorPhone: string;
  vendorIsPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

export const ALLOWED_CATEGORIES = new Set([
  "Photography & Videography",
  "Wedding Venues",
  "Decoration & Florist",
  "Catering Services",
  "Makeup & Styling",
  "Wedding Fashion",
]);

export function serializeVendorService(
  doc: VendorServiceDocument,
): VendorServiceResponseItem {
  return {
    id: doc._id ? doc._id.toHexString() : "",
    serviceName: doc.serviceName,
    category: doc.category,
    description: doc.description,
    price: doc.price,
    location: doc.location,
    images: Array.isArray(doc.images) ? doc.images : [],
    highlights: Array.isArray(doc.highlights) ? doc.highlights : [],
    status: doc.status,
    isActive: doc.isActive,
    vendorId: doc.vendorId,
    vendorName: doc.vendorName,
    vendorEmail: doc.vendorEmail,
    vendorPhone: doc.vendorPhone || "",
    vendorIsPremium: Boolean(doc.vendorIsPremium),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
