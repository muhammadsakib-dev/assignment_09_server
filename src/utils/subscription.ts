import { ObjectId } from "mongodb";

export type BillingCycle = "monthly" | "yearly";

export interface PremiumPlanConfig {
  cycle: BillingCycle;
  name: string;
  description: string;
  unitAmountCents: number;
  amountUsd: number;
  durationDays: number;
}

// Server-authoritative pricing catalog — never trust prices sent by the client
export const PREMIUM_PLANS: Record<BillingCycle, PremiumPlanConfig> = {
  monthly: {
    cycle: "monthly",
    name: "WedPlan Premium Vendor Plan (Monthly)",
    description:
      "Unlimited active wedding services, Premium Vendor Badge, and priority search placement for 30 days.",
    unitAmountCents: 2900, // $29.00 USD
    amountUsd: 29,
    durationDays: 30,
  },
  yearly: {
    cycle: "yearly",
    name: "WedPlan Premium Vendor Plan (Yearly)",
    description:
      "Unlimited active wedding services, Premium Vendor Badge, and priority search placement for 365 days (Save 20%).",
    unitAmountCents: 27600, // $276.00 USD ($23/mo billed annually)
    amountUsd: 276,
    durationDays: 365,
  },
};

export function resolveBillingCycle(input: unknown): BillingCycle {
  return input === "yearly" ? "yearly" : "monthly";
}

export function buildUserFilter(
  userId?: string | null,
  email?: string | null,
): Record<string, unknown> {
  const orList: Record<string, unknown>[] = [];

  if (userId && typeof userId === "string") {
    const trimmedId = userId.trim();
    if (ObjectId.isValid(trimmedId)) {
      orList.push({ _id: new ObjectId(trimmedId) });
    }
    orList.push({ _id: trimmedId });
    orList.push({ id: trimmedId });
  }

  if (email && typeof email === "string" && email.trim()) {
    orList.push({ email: email.trim().toLowerCase() });
  }

  return orList.length > 0 ? { $or: orList } : { id: userId || "" };
}

export function isActivePremiumSubscription(
  userDoc: Record<string, unknown> | null | undefined,
): boolean {
  if (!userDoc || userDoc.subscriptionPlan !== "premium") {
    return false;
  }
  if (!userDoc.subscriptionExpiresAt) {
    return true;
  }
  const expiresAt = new Date(userDoc.subscriptionExpiresAt as string | Date);
  if (Number.isNaN(expiresAt.getTime())) {
    return true;
  }
  return expiresAt.getTime() > Date.now();
}
