# Acme — Subscription Model & RevenueCat Integration

---

## 1. Subscription Tiers

### Free Tier

| Feature                | Limit                                                   |
| ---------------------- | ------------------------------------------------------- |
| AI card generations    | 5 on sign-up + 3 added each calendar month (accumulate) |
| Manual card creation   | Unlimited                                               |
| Study / review         | Unlimited, always free                                  |
| Decks                  | Unlimited                                               |
| Offline access         | Full                                                    |
| FSRS spaced repetition | Full                                                    |
| Export                 | Not available                                           |

### Pro Tier — $3.99/month or $29.99/year

| Feature                | Limit                                    |
| ---------------------- | ---------------------------------------- |
| AI card generations    | Unlimited                                |
| All Free features      | Included                                 |
| Priority AI processing | Yes (future)                             |
| Export decks           | CSV/Anki format (future)                 |
| Advanced analytics     | Study streaks, retention graphs (future) |

**Why these prices?**

- $3.99/month is below the psychological $5 barrier.
- $29.99/year (~$2.50/month) gives a clear 37% discount — strong annual conversion incentive.
- Target audience (students) is price-sensitive. Keep it affordable.

---

## 2. RevenueCat Integration Plan

### Why RevenueCat?

- Handles Apple/Google subscription logic, receipt validation, and webhook events.
- Provides entitlements system (check "pro" access without caring about platform).
- Analytics dashboard for MRR, churn, trial conversions.
- Free up to $2,500 MTR (monthly tracked revenue) — perfect for launch.

### Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Mobile App  │────▶│  RevenueCat  │────▶│  App Store  │
│  (Expo/RN)   │◀────│   SDK        │◀────│  (Apple)    │
└──────┬───────┘     └──────┬───────┘     └─────────────┘
       │                    │
       │                    │ Webhooks
       ▼                    ▼
┌─────────────┐     ┌──────────────┐
│  BetterAuth  │────│  Hono Server │
│  (user ID)   │    │  (webhook)   │
└─────────────┘     └──────────────┘
```

### Implementation Steps

#### Step 1: RevenueCat Project Setup

- Create a RevenueCat project at https://app.revenuecat.com
- Add iOS app with Apple App Store Connect credentials
- Configure the "pro" entitlement
- Create products: `pro_monthly` ($3.99) and `pro_annual` ($29.99)
- Create an offering: "default" with both products

#### Step 2: Mobile SDK Integration

```
pnpm --filter @acme/mobile add react-native-purchases
```

Initialize in app startup:

```typescript
// shared/lib/purchases.ts
import Purchases from 'react-native-purchases';

export async function initPurchases(userId: string) {
  Purchases.configure({
    apiKey: REVENUECAT_API_KEY, // iOS public key
  });
  await Purchases.logIn(userId); // Link to BetterAuth user
}
```

#### Step 3: Entitlement Check

```typescript
// shared/hooks/useProStatus.ts
export function useProStatus() {
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    const checkEntitlement = async () => {
      const info = await Purchases.getCustomerInfo();
      setIsPro(info.entitlements.active['pro'] !== undefined);
    };
    checkEntitlement();
    // Listen for changes
    Purchases.addCustomerInfoUpdateListener(checkEntitlement);
  }, []);

  return isPro;
}
```

#### Step 4: Paywall Screen

- Display when `generationsRemaining === 0` and user taps "Generate"
- Show both monthly and annual options with savings highlighted
- Use RevenueCat's `getOfferings()` to fetch current prices dynamically
- Apple requires restoring purchases — add "Restore Purchases" button

#### Step 5: Server-Side Validation (Webhook)

```typescript
// routes/webhook.ts — RevenueCat webhook endpoint
app.post('/api/webhooks/revenuecat', async (c) => {
  const event = await c.req.json();
  // Verify webhook signature
  // Update user's subscription status in DB
  // Events: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION
});
```

Add to Prisma schema:

```prisma
model User {
  // ... existing fields
  subscriptionStatus  String?   // 'active', 'expired', 'cancelled'
  subscriptionPlan    String?   // 'pro_monthly', 'pro_annual'
  subscriptionExpiry  DateTime?
}
```

### RevenueCat vs. Alternatives

| Feature          | RevenueCat               | Superwall      | Adapty         |
| ---------------- | ------------------------ | -------------- | -------------- |
| Free tier        | Up to $2.5K MTR          | Up to $250 MTR | Up to $10K MTR |
| Paywall builder  | No (BYO)                 | Yes (visual)   | Yes (visual)   |
| A/B testing      | Yes                      | Yes            | Yes            |
| React Native SDK | Yes                      | Yes            | Yes            |
| Expo support     | Yes (with config plugin) | Limited        | Yes            |
| Webhooks         | Yes                      | Yes            | Yes            |

**Recommendation**: Start with **RevenueCat** for its maturity, documentation, and Expo compatibility. Consider adding **Superwall** later for paywall A/B testing if conversion rates need optimization.

---

## 3. Paywall Strategy

### When to Show Paywall

| Trigger                                   | Screen                            |
| ----------------------------------------- | --------------------------------- |
| Generation limit reached (0 remaining)    | Modal overlay on generate screen  |
| Taps "Generate" with 0 generations left   | Full-screen paywall               |
| Profile/Settings                          | "Upgrade to Pro" row              |
| After successful generation (soft upsell) | Banner: "X generations remaining" |

### Paywall UX Best Practices

1. **Never block studying** — reviewing cards is always free. Only AI generation is gated.
2. **Show value first** — let users generate cards before asking for money. The first-month trial boost (15 generations) ensures they experience the value.
3. **Be transparent** — show remaining generations count prominently, not hidden.
4. **Annual discount** — highlight savings: "Save 37% with annual plan".
5. **Social proof** — show rating or review count on paywall (after launch).
6. **Restore purchases** — Apple requires this; put it on the paywall screen.

### Paywall Screen Layout

```
┌─────────────────────────────────┐
│         ✨ Go Pro ✨              │
│                                 │
│  Unlimited AI card generations  │
│  Priority processing            │
│  Export your decks              │
│  Support indie development 💙   │
│                                 │
│  ┌───────────────────────────┐  │
│  │  $3.99/month              │  │
│  │  Cancel anytime           │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  $29.99/year   BEST VALUE │  │
│  │  Save 37% · $2.50/month  │  │
│  └───────────────────────────┘  │
│                                 │
│  [  Continue  ]                 │
│                                 │
│  Restore Purchases  ·  Terms   │
└─────────────────────────────────┘
```

---

## 4. Generation Limit Enforcement

### Current Implementation (Server-Side)

```
User.freeGenerationsBalance → balance-based system
- Initial: 5 credits on sign-up (User.freeGenerationsBalance default = 5)
- Monthly: +3 credits added lazily on first API check each calendar month
- Pro: unlimited (bypass balance check when User.subscriptionStatus = 'active')
```

- Monthly top-up is lazy: applied when the user first checks their balance each month
- Balance accumulates — unused credits carry over
- GenerationLog table still records each generation for analytics

### Enhanced Flow with RevenueCat

```
1. User taps "Generate"
2. Client checks generationsRemaining from last API response
3. If 0 → show paywall (client-side gate for fast UX)
4. If > 0 → proceed with generation
5. Server double-checks:
   a. Is user Pro? (check subscriptionStatus in DB)
   b. If not Pro, count GenerationLog entries this month
   c. If at limit → return 403 with error
   d. If OK → generate, create GenerationLog entry, return generationsRemaining
```

### Why Double-Check Server-Side?

- Client-side check is for UX speed (no wasted API calls).
- Server-side check is the source of truth (prevents tampering).
- RevenueCat webhooks keep `subscriptionStatus` up-to-date in the DB.

---

## 5. Revenue Projections

### Assumptions

- 1,000 downloads in first month (organic + Product Hunt)
- 5% free-to-paid conversion (industry average for education apps: 2–7%)
- 70% monthly, 30% annual split
- Apple takes 30% (15% after first year with Small Business Program)

### Monthly Revenue (Month 1)

| Metric                    | Value                   |
| ------------------------- | ----------------------- |
| Downloads                 | 1,000                   |
| Paid users (5%)           | 50                      |
| Monthly subscribers (70%) | 35 × $3.99 = $139.65    |
| Annual subscribers (30%)  | 15 × $29.99/12 = $37.49 |
| Gross MRR                 | ~$177                   |
| Net MRR (after Apple 30%) | ~$124                   |

### Break-Even Analysis

| Cost                                | Monthly          |
| ----------------------------------- | ---------------- |
| OpenAI API (est. 5,000 generations) | ~$15             |
| Cloud Run (min 1 instance)          | ~$25             |
| Cloud SQL (small)                   | ~$10             |
| Apple Developer Program             | $8.33 ($99/year) |
| **Total**                           | **~$58/month**   |

Break-even: ~30 paid users → achievable at ~600 total users with 5% conversion.

---

## 6. Apple App Store Checklist for Subscriptions

- [ ] Create subscription group in App Store Connect
- [ ] Add `pro_monthly` ($3.99) and `pro_annual` ($29.99) products
- [ ] Write subscription description for App Store review
- [ ] Add subscription terms URL (required)
- [ ] Add privacy policy URL (required)
- [ ] Implement `StoreKit` restore purchases
- [ ] Test in Sandbox environment before submission
- [ ] Submit for App Store review (subscriptions may take longer)

---

## 7. Future Monetization Opportunities

| Feature            | Tier       | Description                         |
| ------------------ | ---------- | ----------------------------------- |
| Deck marketplace   | Pro        | Share/sell curated decks            |
| Group study        | Pro        | Share decks with classmates         |
| AI tutor chat      | Pro+       | Socratic tutoring from card content |
| Classroom licenses | B2B        | Bulk pricing for teachers/schools   |
| White-label        | Enterprise | Custom branding for institutions    |
