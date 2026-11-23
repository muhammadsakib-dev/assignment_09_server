# WedPlan — Server Engine & Backend API

> **Assignment 9 — Category: 004**  
> High-performance Express 5 REST API powering the **WedPlan** wedding planning platform. Features native TypeScript execution, MongoDB native driver integration, Better Auth session/JWT verification, cryptographic Stripe webhooks, and multi-tier role-based access control.

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Important Features](#important-features)
3. [Technology Stack](#technology-stack)
4. [Architecture & Database Collections](#architecture--database-collections)
5. [Environment Variables](#environment-variables)
6. [Installation & Setup](#installation--setup)
7. [Database Seeding](#database-seeding)
8. [How to Run the Project Locally](#how-to-run-the-project-locally)
9. [Evaluation & Testing Credentials](#evaluation--testing-credentials)
10. [Repository & Live Deployment Links](#repository--live-deployment-links)

---

## 🌟 Project Overview
**WedPlan Server** is the authoritative backend for the WedPlan wedding planning ecosystem. It coordinates customer booking workflows, enforces vendor quotas (free vs. premium tier limits), secures multi-role dashboard APIs, and executes automated vendor plan promotions via cryptographically signed Stripe webhooks.

---

## ⚡ Important Features
- **Strict Role-Based Access Control (RBAC)**: Fine-grained middleware enforcing access for `customer`, `vendor`, and `admin` roles, with revocation checks for blocked users.
- **Dual Authentication Verification**:
  - Express 5 HS256 JWT Bearer verification with signature validation, expiration checking, and constant-time comparison (`crypto.timingSafeEqual`).
  - Better Auth HMAC-SHA256 signed session cookie verification against live MongoDB session records.
- **Advanced Service Search & Sorting (Challenge 1 & 2)**:
  - Multi-field keyword search across service name, category, location, and vendor name.
  - Category and location filtering.
  - Price sorting: Ascending (`price-asc`) and Descending (`price-desc`).
- **Vendor Quota Enforcement**: Strict server-side cap restricting Free tier vendors to 3 active services (`HTTP 403 Forbidden` on excess).
- **Cryptographic Stripe Webhooks (Zero-Client-Trust)**:
  - Listens for `checkout.session.completed`, `customer.subscription.deleted`, and async events.
  - Verifies signatures using raw buffer (`req.rawBody`).
  - Automatically activates premium subscription, sets expiration dates, and updates the `transactions` ledger.
- **Booking Lifecycle State Machine**:
  - Immutability guards preventing changes once a booking is accepted or rejected.
  - Duplicate booking protection (prevents identical customer inquiries for the same service and date).
  - Self-booking prevention (vendors cannot book their own services, admins cannot book).

---

## 🛠 Technology Stack
- **Runtime**: Node.js v20+ / v22+
- **Framework**: Express 5.3.0 (Native ESM, TypeScript 7.0.2)
- **Database**: MongoDB Native Driver 7.9.0 (No heavy Mongoose overhead)
- **Authentication**: Better Auth session tokens + Custom HS256 JWT Middleware
- **Monetization**: Stripe Node SDK v23.1.0 (Checkout Sessions & Webhooks)
- **Execution**: `tsx` (TypeScript Execute & Watch)

---

## 🗄 Architecture & Database Collections
The database uses MongoDB with the following collections:

1. **`user` (Better Auth)**:
   - Fields: `name`, `email`, `image`, `role` (`customer` / `vendor` / `admin`), `isBlocked`, `businessName`, `phone`, `location`, `subscriptionPlan` (`free` / `premium`), `subscriptionExpiresAt`, `createdAt`, `updatedAt`.
2. **`services`**:
   - Fields: `vendorId`, `vendorName`, `vendorEmail`, `vendorPhone`, `vendorIsPremium`, `serviceName`, `category`, `description`, `price`, `location`, `images` (array), `highlights` (array), `status` (`pending` / `approved` / `rejected`), `isActive` (boolean), `createdAt`, `updatedAt`.
3. **`bookings`**:
   - Fields: `serviceId`, `serviceName`, `serviceCategory`, `serviceImage`, `price`, `location`, `customerId`, `userName`, `userEmail`, `vendorId`, `vendorName`, `vendorEmail`, `eventDate`, `eventLocation`, `guestCount`, `message`, `status` (`pending` / `booked` / `rejected` / `cancelled`), `createdAt`, `updatedAt`.
4. **`transactions`**:
   - Fields: `vendorId`, `vendorName`, `vendorEmail`, `plan`, `amount`, `currency`, `stripeSessionId`, `status` (`succeeded` / `failed`), `createdAt`.
5. **`savedServices`**:
   - Fields: `userId`, `userEmail`, `serviceId`, `serviceName`, `serviceCategory`, `serviceImage`, `price`, `location`, `vendorName`, `createdAt`.

---

## 🔐 Environment Variables
Create a `.env` file in the `assignment_09_server/` directory:

```env
# Server Port & Database Name
PORT=8000
DB_NAME=WedPlan

# MongoDB Atlas or Local Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority

# Better Auth Secret (Must match client BETTER_AUTH_SECRET for JWT/session verification)
BETTER_AUTH_SECRET=your_better_auth_secret_here

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000

# Stripe Secret Key & Webhook Signing Secret (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
```

---

## 🚀 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <SERVER_REPO_URL>
   cd assignment_09_server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Update variables in .env with your credentials
   ```

---

## 🌱 Database Seeding
To populate your database with verified demo wedding services, an initial admin user, and sample accounts for evaluation:

```bash
npm run seed
```

This will automatically create:
- **Admin**: `admin@wedplan.com` (Role: `admin`)
- **Vendor**: `vendor@wedplan.com` (Role: `vendor`, Premium)
- **Customer**: `customer@wedplan.com` (Role: `customer`)
- **6+ Approved Services**: Complete wedding offerings across all 6 categories with images and details.

---

## 💻 How to Run the Project Locally

### Development Mode (with hot-reload):
```bash
npm run dev
```
The server will start at `http://localhost:8000`.

### Production Build & Run:
```bash
npm run build
npm start
```

---

## 🔑 Evaluation & Testing Credentials

| Role | Email | Password | Access / Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@wedplan.com` | `WedPlan@2026` | Full Admin Dashboard (`/admin`), Manage Users (Block/Unblock), Moderate Services, View Transactions |
| **Vendor** | `vendor@wedplan.com` | `WedPlan@2026` | Vendor Dashboard (`/vendor/dashboard`), Add Service, Manage Services, Accept/Reject Bookings, Subscription |
| **Customer** | `customer@wedplan.com` | `WedPlan@2026` | Customer Dashboard (`/dashboard`), Browse & Filter Services, Submit Bookings, Cancel Pending Bookings |

---

## 🔗 Repository & Live Deployment Links
- **Client Repository**: `https://github.com/muhammadsakib-dev/assignment_09_client`
- **Server Repository**: `https://github.com/muhammadsakib-dev/assignment_09_server`
- **Live Server API**: `https://wedplan-server.onrender.com` (or your deployment URL)
- **Live Client Web App**: `https://wedplan-client.vercel.app` (or your deployment URL )
