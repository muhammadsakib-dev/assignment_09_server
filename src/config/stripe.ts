import Stripe from "stripe";
import config from "./index.js";

// Initialize Stripe client with configured secret key
export const stripe: Stripe | null = config.stripeSecretKey
  ? new Stripe(config.stripeSecretKey)
  : null;

export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error(
      "Stripe secret key is not configured. Please set STRIPE_SECRET_KEY in server environment.",
    );
  }
  return stripe;
}

export default stripe;
