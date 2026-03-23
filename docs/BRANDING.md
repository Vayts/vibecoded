# Acme — Branding Skeleton

> Camera-first AI flashcard app with offline spaced repetition.

---

## 1. Brand Identity

### Name

**Acme** — evokes "deck" (flashcards) + "-ify" (to make/transform). Short, memorable, verb-like energy.

### Tagline Options

| Tagline                           | Tone                    |
| --------------------------------- | ----------------------- |
| "Snap. Study. Remember."          | Direct, action-oriented |
| "Turn your notes into knowledge." | Benefit-focused         |
| "AI flashcards from your camera." | Feature-forward         |
| "Study smarter, not harder."      | Classic, motivational   |

Recommendation: **"Snap. Study. Remember."** — maps directly to the core loop and works well in App Store listings.

### Brand Voice

- **Warm & encouraging** — like a smart study buddy, not a strict teacher.
- **Concise** — mobile-first writing. No walls of text.
- **Confident but not pushy** — the app does the work; let the product speak.
- **Slightly playful** — emoji-friendly, casual tone. Not corporate.

---

## 2. Color Palette

### Primary Colors

| Name           | Hex                  | Usage                              |
| -------------- | -------------------- | ---------------------------------- |
| **Acme Blue**  | `#2563EB` (blue-600) | Primary CTAs, links, active states |
| **Deep Blue**  | `#1D4ED8` (blue-700) | Pressed/hover states               |
| **Light Blue** | `#DBEAFE` (blue-100) | Subtle backgrounds, badges         |

### Neutral Colors

| Name         | Hex       | Usage                          |
| ------------ | --------- | ------------------------------ |
| **White**    | `#FFFFFF` | Screen backgrounds             |
| **Gray 50**  | `#F9FAFB` | Card backgrounds, grouped rows |
| **Gray 200** | `#E5E7EB` | Borders, dividers              |
| **Gray 500** | `#6B7280` | Secondary text, captions       |
| **Gray 800** | `#1F2937` | Primary text                   |
| **Gray 900** | `#111827` | Headings                       |

### Accent Colors

| Name       | Hex                    | Usage                                       |
| ---------- | ---------------------- | ------------------------------------------- |
| **Green**  | `#16A34A` (green-600)  | Success, correct answers, streaks           |
| **Red**    | `#DC2626` (red-600)    | Errors, destructive actions, "Again" rating |
| **Amber**  | `#D97706` (amber-600)  | Warnings, trial/upgrade prompts             |
| **Purple** | `#7C3AED` (violet-600) | Pro/premium badge accent                    |

### Dark Mode (Future)

Plan for dark mode from day one by using semantic color tokens (e.g. `colors.background`, `colors.textPrimary`) rather than hardcoded values in components. The `COLORS` constant in `shared/constants/colors.ts` should serve as the single source.

---

## 3. Typography

### iOS (Primary Platform)

| Role               | Font           | Weight   | Size |
| ------------------ | -------------- | -------- | ---- |
| **Large Title**    | SF Pro Display | Bold     | 34pt |
| **Title**          | SF Pro Display | Bold     | 28pt |
| **Section Header** | SF Pro Text    | Semibold | 20pt |
| **Body**           | SF Pro Text    | Regular  | 17pt |
| **Caption**        | SF Pro Text    | Regular  | 13pt |
| **Button**         | SF Pro Text    | Semibold | 17pt |

Using system fonts (SF Pro on iOS) ensures native feel and optimal rendering. No custom fonts needed for MVP.

### NativeWind Mapping

| Role           | NativeWind Class          |
| -------------- | ------------------------- |
| Large Title    | `text-3xl font-bold`      |
| Section Header | `text-lg font-semibold`   |
| Body           | `text-base`               |
| Caption        | `text-sm text-gray-500`   |
| Button         | `text-base font-semibold` |

---

## 4. Logo

### Concept Direction

The logo should combine the ideas of:

- **Cards/decks** — stacked cards, card corners, fan layout
- **Camera/snap** — viewfinder, flash, aperture
- **Learning/brain** — lightbulb, graduation, brain sparkle

### Recommended Style

- **App Icon**: Simple, bold, recognizable at 29×29pt. Single shape on a gradient blue background.
- **Wordmark**: "Acme" in a clean geometric sans-serif (e.g. Inter, Outfit, or Manrope).
- **Icon variants**: Full-color, monochrome, and white-on-blue.

### Design Options

| Option                       | Description                                                       |
| ---------------------------- | ----------------------------------------------------------------- |
| **Stacked cards + sparkle**  | 2–3 overlapping card shapes with an AI sparkle/star in the corner |
| **Camera viewfinder + card** | Viewfinder brackets framing a card shape                          |
| **Card fan**                 | 3 cards fanned out like a deck, center card highlighted           |

---

## 5. App Store Presence

### App Icon Specs (iOS)

- 1024×1024px master icon (no transparency, no rounded corners — iOS applies the mask)
- High contrast, simple shape, minimal text (if any)
- Test at small sizes (29pt, 40pt, 60pt) for readability

### Screenshots (6.7" iPhone — 1290×2796px)

Plan 5–6 screenshots showing:

1. Camera capture → card generation (hero shot)
2. AI flashcard preview with math rendering
3. Study session with flip animation
4. Deck library / organization
5. Spaced repetition progress / streak
6. Free vs. Pro comparison (if applicable)

### App Store Description Keywords

`flashcards, AI, camera, study, spaced repetition, FSRS, notes, quiz, exam prep, math, science, college, student`

---

## 6. Recommended Services & Tools

### Logo & Visual Identity

| Service                                             | What It Does                                       | Cost            |
| --------------------------------------------------- | -------------------------------------------------- | --------------- |
| [Looka](https://looka.com)                          | AI logo generator — good starting point            | $20–65 one-time |
| [Hatchful by Shopify](https://hatchful.shopify.com) | Free logo maker                                    | Free            |
| [Figma](https://figma.com)                          | Design tool for refining logos, icons, and mockups | Free tier       |
| [Fiverr](https://fiverr.com)                        | Hire a designer for a polished app icon            | $50–200         |
| [99designs](https://99designs.com)                  | Contest-based design — get many options            | $299+           |

### App Store Assets

| Service                                     | What It Does                                      | Cost      |
| ------------------------------------------- | ------------------------------------------------- | --------- |
| [AppLaunchpad](https://theapplaunchpad.com) | Generate App Store screenshots with device frames | Free tier |
| [Previewed](https://previewed.app)          | Mockup generator for app screenshots              | Free tier |
| [Rotato](https://rotato.app)                | 3D device mockups and animated previews           | $49/year  |

### Marketing & Landing Page

| Service                                  | What It Does                           | Cost      |
| ---------------------------------------- | -------------------------------------- | --------- |
| [Framer](https://framer.com)             | Landing page builder (beautiful, fast) | Free tier |
| [Carrd](https://carrd.co)                | Simple one-page landing sites          | $9/year   |
| [Product Hunt](https://producthunt.com)  | Launch platform for exposure           | Free      |
| [IndieHackers](https://indiehackers.com) | Community for indie app makers         | Free      |

### Brand Color Tools

| Tool                   | URL                                 |
| ---------------------- | ----------------------------------- |
| Coolors                | https://coolors.co                  |
| Realtime Colors        | https://realtimecolors.com          |
| Tailwind Color Palette | https://tailwindcss.com/docs/colors |

---

## 7. Marketing Checklist

### Pre-Launch

- [ ] Finalize app name and verify App Store availability
- [ ] Design app icon (1024×1024 master, test at small sizes)
- [ ] Create wordmark logo variant
- [ ] Build a simple landing page (Framer or Carrd)
- [ ] Set up social media (Twitter/X, Instagram, TikTok)
- [ ] Write App Store listing (title, subtitle, description, keywords)
- [ ] Design 5–6 App Store screenshots
- [ ] Create a short demo video (15–30 seconds)
- [ ] Set up analytics (PostHog, Mixpanel, or Firebase Analytics)

### Launch

- [ ] Submit to App Store Review (allow 1–3 days)
- [ ] Post on Product Hunt
- [ ] Share on Reddit (r/GetStudying, r/FlashCards, r/College, r/ios)
- [ ] Post on Twitter/X with demo video
- [ ] Create TikTok showing camera → cards flow
- [ ] Reach out to study/education YouTubers for reviews
- [ ] Post on IndieHackers

### Post-Launch

- [ ] Monitor App Store reviews and respond to feedback
- [ ] A/B test App Store screenshots
- [ ] Run Apple Search Ads (start with $5–10/day on branded terms)
- [ ] Create content: study tips, "how I study" workflows
- [ ] Collect testimonials for social proof
- [ ] Consider referral program (share deck → get free generations)

---

## 8. Competitive Positioning

| App        | Weakness                                | Acme Advantage                                  |
| ---------- | --------------------------------------- | ----------------------------------------------- |
| Anki       | Complex UI, no AI, desktop-first        | Beautiful iOS UI, AI generation, camera         |
| Quizlet    | Subscription-heavy, SM-2 algorithm      | FSRS (better retention), offline-first, cheaper |
| Brainscape | Manual card creation only               | AI from camera, instant generation              |
| Remnote    | Steep learning curve, note-taking focus | Focused on flashcards, simpler UX               |

**Core positioning**: "The fastest way to turn your study material into effective flashcards — just point your camera."
