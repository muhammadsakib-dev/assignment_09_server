import type { ObjectId } from "mongodb";

export type BookingStatus = "pending" | "booked" | "cancelled" | "rejected";

export type BookingAction = "cancel" | "approve" | "reject";

export interface BookingDocument {
  _id?: ObjectId;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  serviceImage: string;
  price: number;
  location: string;
  customerId: string;
  userId: string;
  userName: string;
  userEmail: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  eventDate: string;
  eventLocation: string;
  guestCount: number;
  message: string;
  notes?: string;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingResponseItem {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  serviceImage: string;
  price: number;
  location: string;
  customerId: string;
  userId: string;
  userName: string;
  userEmail: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  eventDate: string;
  eventLocation: string;
  guestCount: number;
  message: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export function serializeBooking(doc: BookingDocument): BookingResponseItem {
  return {
    id: doc._id ? doc._id.toHexString() : "",
    serviceId: doc.serviceId,
    serviceName: doc.serviceName,
    serviceCategory: doc.serviceCategory,
    serviceImage: doc.serviceImage,
    price: doc.price,
    location: doc.location,
    customerId: doc.customerId || doc.userId,
    userId: doc.userId,
    userName: doc.userName,
    userEmail: doc.userEmail,
    vendorId: doc.vendorId,
    vendorName: doc.vendorName,
    vendorEmail: doc.vendorEmail,
    eventDate: doc.eventDate,
    eventLocation: doc.eventLocation || doc.location || "",
    guestCount: doc.guestCount,
    message: doc.message ?? doc.notes ?? "",
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
