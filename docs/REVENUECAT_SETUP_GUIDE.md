# RevenueCat & Apple Subscription Setup Guide

This document explains every step you need to complete on the **RevenueCat dashboard** and **Apple App Store Connect** to fully activate the subscription system that has been integrated into Acme.

> **Android is not included yet** — it's tracked as V1.3-4 in TASKS.md.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Apple App Store Connect Setup](#2-apple-app-store-connect-setup)
3. [RevenueCat Project Setup](#3-revenuecat-project-setup)
4. [Connect RevenueCat to App Store Connect](#4-connect-revenuecat-to-app-store-connect)
5. [Configure Products & Offerings in RevenueCat](#5-configure-products--offerings-in-revenuecat)
6. [Configure Webhook](#6-configure-webhook)
7. [Set Environment Variables](#7-set-environment-variables)
8. [Testing in Sandbox](#8-testing-in-sandbox)
9. [Pre-Submission Checklist](#9-pre-submission-checklist)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

Before you start, make sure you have:

- [ ] An **Apple Developer Program** membership ($99/year) — [developer.apple.com](https://developer.apple.com)
- [ ] Access to **App Store Connect** — [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
- [ ] Your app created in App Store Connect (even if not yet submitted)
- [ ] A **RevenueCat** account — [app.revenuecat.com](https://app.revenuecat.com) (free up to $2,500 MTR)
- [ ] The server deployed and reachable via HTTPS (for webhook)

---

## 2. Apple App Store Connect Setup

### 2.1 Create a Subscription Group

1. Go to **App Store Connect** → Your App → **Subscriptions** (left sidebar under "In-App Purchases")
2. Click **"+"** next to "Subscription Groups" to create a new group
3. Name it: **`Acme Pro`**
4. Click **Create**

### 2.2 Create Subscription Products

Inside the `Acme Pro` group, create two products:

#### Monthly Subscription

| Field                 | Value                             |
| --------------------- | --------------------------------- |
| Reference Name        | `Pro Monthly`                     |
| Product ID            | `pro_monthly`                     |
| Subscription Duration | 1 Month                           |
| Price                 | $3.99 (Tier 4 in most regions)    |
| Subscription Group    | Acme Pro                          |
| Promotional Text      | Unlimited AI flashcard generation |

#### Annual Subscription

| Field                 | Value                                        |
| --------------------- | -------------------------------------------- |
| Reference Name        | `Pro Annual`                                 |
| Product ID            | `pro_annual`                                 |
| Subscription Duration | 1 Year                                       |
| Price                 | $29.99 (calculate equivalent tier)           |
| Subscription Group    | Acme Pro                                     |
| Promotional Text      | Save 37% — unlimited AI flashcard generation |

### 2.3 Add Localization

For each product:

1. Click the product → **App Store Localization** → **"+"**
2. Add at least **English (U.S.)** with:
   - **Display Name**: "Acme Pro Monthly" / "Acme Pro Annual"
   - **Description**: "Unlimited AI flashcard generation, priority processing, and more."

### 2.4 Add Review Information

[NOT DONE YET, Don't forget to remind me about that!]
For the subscription group:

1. Click **"Review Information"** in the subscription group
2. Add a **screenshot** of the paywall screen
3. Add **review notes** explaining:
   > "This subscription unlocks unlimited AI-powered flashcard generation. Free users receive 5 initial generations plus 3 per month. Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period."

### 2.5 Required Legal URLs

In **App Store Connect → App Information**:

| Field          | URL                                     | Notes                                           |
| -------------- | --------------------------------------- | ----------------------------------------------- |
| Privacy Policy | `https://acme.app/privacy`              | Required for all apps with subscriptions        |
| Terms of Use   | Apple's standard EULA is fine initially | Or provide your own at `https://acme.app/terms` |

> ⚠️ You **must** have a privacy policy URL before submitting. Apple will reject without one.

### 2.6 Create a Shared Secret

1. Go to **App Store Connect** → Your App → **In-App Purchases** → **App-Specific Shared Secret** (or use a shared one at the account level)
2. Click **Generate** if none exists
3. **Copy** the shared secret — you'll need it for RevenueCat

### 2.7 Enable App Store Server Notifications (optional but recommended)

1. Go to **App Store Connect** → Your App → **App Information** → **App Store Server Notifications**
2. Set the **Production URL** to: `https://api.revenuecat.com/v1/subscribers/app_store/notifications`
3. Set the **Sandbox URL** to the same URL
4. Choose **Version 2** for notifications

> This allows RevenueCat to receive real-time updates about subscription changes directly from Apple, rather than relying solely on the SDK.

---

## 3. RevenueCat Project Setup

### 3.1 Create a Project

1. Log in to [app.revenuecat.com](https://app.revenuecat.com)
2. Click **"+ New Project"**
3. Name: **`Acme`**

### 3.2 Add an iOS App

1. Inside the project, click **"+ New App"**
2. Select **Apple App Store**
3. Enter:
   - **App Name**: `Acme`
   - **Apple Bundle ID**: Your app's bundle identifier (e.g., `com.acme.app`)
   - **App-Specific Shared Secret**: Paste the shared secret from step 2.6

### 3.3 Copy Your API Key

1. Go to **Project Settings** → **API Keys**
2. Copy the **iOS public API key** (starts with `appl_...`)
3. This is the value for `EXPO_PUBLIC_REVENUECAT_IOS_KEY`

---

## 4. Connect RevenueCat to App Store Connect

### 4.1 App Store Connect API Key (for server-to-server)

RevenueCat needs an **App Store Connect API key** to validate receipts:

1. Go to **App Store Connect** → **Users and Access** → **Integrations** → **App Store Connect API**
2. Click **"+"** to generate a new key
3. Name: `RevenueCat`
4. Access: **Admin** or **App Manager**
5. Download the `.p8` file — **you can only download this once!**
6. Note the **Key ID** and **Issuer ID**

### 4.2 Add to RevenueCat

1. In RevenueCat → **Project Settings** → **Service Credentials** → **App Store Connect**
2. Upload the `.p8` file
3. Enter the **Key ID** and **Issuer ID**

---

## 5. Configure Products & Offerings in RevenueCat

### 5.1 Create an Entitlement

1. Go to **Project** → **Entitlements** → **"+ New"**
2. Identifier: **`pro`**
3. Description: "Pro subscription access"

### 5.2 Create Products

1. Go to **Project** → **Products** → **"+ New"**
2. Create two products:

| App Store Product ID | Identifier    | Entitlement |
| -------------------- | ------------- | ----------- |
| `pro_monthly`        | `pro_monthly` | `pro`       |
| `pro_annual`         | `pro_annual`  | `pro`       |

### 5.3 Create an Offering

1. Go to **Project** → **Offerings** → **"+ New"**
2. Identifier: **`default`**
3. Description: "Default offering"
4. Add two packages:
   - **Monthly** (`$rc_monthly`) → Product: `pro_monthly`
   - **Annual** (`$rc_annual`) → Product: `pro_annual`
5. **Set as current** (make it the active offering)

---

## 6. Configure Webhook

RevenueCat sends webhook events to your server when subscriptions change.

### 6.1 Add Webhook URL in RevenueCat

1. Go to **Project** → **Integrations** → **Webhooks**
2. Click **"+ New"**
3. Webhook URL: `https://your-server-domain.com/api/webhooks/revenuecat`
4. Authorization Header: `Bearer <your-webhook-secret>`
   - Generate a random secret (e.g., `openssl rand -hex 32`)
   - This becomes `REVENUECAT_WEBHOOK_SECRET` on your server
5. Events to send: **All** (or at minimum: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, `PRODUCT_CHANGE`)

### 6.2 Test the Webhook

RevenueCat has a **"Send Test Event"** button. Use it to verify your server responds with `200 OK`.

---

## 7. Set Environment Variables

### Server (`.env` or Cloud Run env)

```bash
# RevenueCat webhook secret (the Bearer token you configured in step 6.1)
REVENUECAT_WEBHOOK_SECRET=your_random_secret_here
```

### Mobile (`.env` or Expo config)

```bash
# RevenueCat iOS public API key (from step 3.3)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxxxxxx
```

---

## 8. Testing in Sandbox

### 8.1 Create Sandbox Test Accounts

1. Go to **App Store Connect** → **Users and Access** → **Sandbox** → **Test Accounts**
2. Click **"+"** to create a sandbox tester
3. Use a real email you can access (for verification)
4. On your **physical iOS device**: Settings → App Store → Sandbox Account → sign in with the test account

> ⚠️ Sandbox testing does **not** work in the iOS Simulator — you need a real device.

### 8.2 Test the Purchase Flow

1. Build the app on your device (`expo prebuild` → Xcode → run on device)
2. Sign in to Acme
3. Navigate to the Paywall screen
4. Tap a subscription option → the sandbox App Store sheet appears
5. Confirm the purchase with your sandbox account
6. Verify:
   - The paywall dismisses
   - The profile screen shows "Pro"
   - Generation counter shows "Unlimited"
   - RevenueCat dashboard shows the subscription

### 8.3 Sandbox Subscription Timelines

In sandbox, subscription durations are accelerated:

| Real Duration | Sandbox Duration |
| ------------- | ---------------- |
| 1 Week        | 3 minutes        |
| 1 Month       | 5 minutes        |
| 2 Months      | 10 minutes       |
| 3 Months      | 15 minutes       |
| 6 Months      | 30 minutes       |
| 1 Year        | 1 hour           |

Subscriptions auto-renew up to **6 times** in sandbox, then expire.

### 8.4 Test Webhook Events

After a sandbox purchase:

1. Check your server logs for incoming webhook events
2. Verify the user's `subscriptionStatus` is updated to `active` in the database
3. Wait for the sandbox subscription to expire and verify `EXPIRATION` webhook is received

---

## 9. Pre-Submission Checklist

Before submitting to App Store Review:

- [ ] **Privacy Policy URL** is set in App Store Connect
- [ ] **Subscription group** has at least one localized display name and description
- [ ] **Review screenshot** of the paywall is uploaded
- [ ] **Restore Purchases** button is visible and functional on the paywall
- [ ] Sandbox purchase flow works end-to-end on a real device
- [ ] RevenueCat webhook receives events and updates DB correctly
- [ ] App does **not** crash if RevenueCat SDK is unreachable (graceful fallback)
- [ ] Free features (study, manual cards, deck management) work without any subscription
- [ ] Subscription terms are displayed near the purchase button:
  > "Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to Settings > Apple ID > Subscriptions."

> ⚠️ Apple **requires** that subscription terms are visible near the purchase button. Missing this is a common rejection reason.

---

## 10. Troubleshooting

### "No offerings available"

- Ensure the offering is set as **Current** in RevenueCat
- Ensure products in RevenueCat match the product IDs in App Store Connect
- Ensure the app's bundle ID matches in both places
- Check that the App Store Connect API key is correctly configured in RevenueCat
- Wait a few minutes — new products can take time to propagate

### "Purchase failed" in sandbox

- Ensure you're signed into a **Sandbox** account on the device (Settings → App Store → Sandbox Account)
- Try signing out and back in to the sandbox account
- Restart the app
- Check the RevenueCat debug logs in Xcode console (LOG_LEVEL.DEBUG is enabled)

### Webhook not receiving events

- Verify the webhook URL is correct and HTTPS
- Check the Authorization header matches `REVENUECAT_WEBHOOK_SECRET`
- Use RevenueCat's "Send Test Event" to verify connectivity
- Check server logs for any errors

### User shows as free but has an active subscription

- Run `Purchases.restorePurchases()` to sync
- Check the RevenueCat dashboard for the user's subscription status
- Verify the webhook endpoint is processing events correctly
- Check that `app_user_id` in RevenueCat matches the user's ID in your database

---

## Architecture Summary

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  Mobile App     │────▶│  RevenueCat  │────▶│  App Store  │
│  (Expo/RN)      │◀────│  SDK         │◀────│  (Apple)    │
│                 │     └──────┬───────┘     └─────────────┘
│ • purchases.ts  │            │
│ • subscStore.ts │            │ Webhooks
│ • paywall.tsx   │            ▼
└────────┬────────┘     ┌──────────────┐
         │              │  Hono Server │
         │ API calls    │  /api/webhooks/revenuecat │
         └─────────────▶│  /api/user/subscription   │
                        │  /api/generate/remaining  │
                        └──────────────┘
                               │
                        ┌──────────────┐
                        │  PostgreSQL  │
                        │  User table: │
                        │  • subscriptionStatus     │
                        │  • subscriptionPlan       │
                        │  • subscriptionExpiry     │
                        │  • freeGenerationsBalance │
                        │  • lastMonthlyTopUp       │
                        └──────────────┘
```

### Key Files

| Component             | File                                                         |
| --------------------- | ------------------------------------------------------------ |
| Prisma schema         | `apps/server/prisma/schema.prisma`                           |
| Generation service    | `apps/server/src/services/generation.ts`                     |
| Webhook route         | `apps/server/src/routes/webhook.ts`                          |
| Subscription endpoint | `apps/server/src/routes/user.ts`                             |
| RC initialization     | `apps/mobile/shared/lib/purchases.ts`                        |
| Subscription store    | `apps/mobile/shared/stores/subscriptionStore.ts`             |
| Paywall screen        | `apps/mobile/app/paywall.tsx`                                |
| Upgrade modal         | `apps/mobile/modules/home/components/UpgradeModal/index.tsx` |
| Shared constants      | `packages/shared/src/constants.ts`                           |
