import type { ObjectId } from "mongodb";

export interface SavedServiceDocument {
  _id?: ObjectId;
  userId: string;
  userEmail: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  serviceImage: string;
  price: number;
  location: string;
  vendorName: string;
  createdAt: Date;
}

export interface SavedServiceResponseItem {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  serviceImage: string;
  price: number;
  location: string;
  vendorName: string;
  createdAt: string;
}

export function serializeSavedService(
  doc: SavedServiceDocument,
): SavedServiceResponseItem {
  return {
    id: doc._id ? doc._id.toHexString() : "",
    serviceId: doc.serviceId,
    serviceName: doc.serviceName,
    serviceCategory: doc.serviceCategory,
    serviceImage: doc.serviceImage,
    price: doc.price,
    location: doc.location,
    vendorName: doc.vendorName,
    createdAt: doc.createdAt.toISOString(),
  };
}
