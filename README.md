# Utsav AI (उत्सव AI) - GenAI Celebration & Event Planner

> Client-only GenAI celebration & event planner for Indian weddings, milestone birthdays, and community festivals. Features reverse scheduling, deterministic integer-rupee budget rebalancing, vendor negotiation kits, multilingual invitations, and Copilot proposals with keyboard-accessible Accept/Undo.

---

## 🏛️ Architecture Overview

```mermaid
flowchart TD
    subgraph UI ["User Interface (React 18 + TypeScript + Tailwind)"]
        Pages["Lazy Feature Pages\n(Landing, Blueprint, Dashboard, Budget,\nTimeline, Vendors, RSVP, Content, Runsheet)"]
        Drawer["Copilot Drawer\n(Inert Diff Cards, Accept/Undo, aria-live)"]
        Store["Zustand Store\n(eventStore: get/set without circularity)"]
    end

    subgraph Domain ["Pure Domain Layer (Zero Framework/Network Imports)"]
        Schedule["reverseSchedule(eventDate, tasks, now)"]
        Panic["compressTimeline(tasks, eventDate, now)"]
        Rebalance["rebalanceBudget(items, newTotal, {lockedIds})"]
        DiffEng["applyDiff() & revertDiff()"]
        Catering["cateringQuantities(guests, dietary, type)"]
        Export["toIcs() (RFC 5545) & toCsv() (RFC 4180 Formula Protected)"]
    end

    subgraph AI ["AI Subsystem (AiProvider Interface)"]
        Provider["AiProvider Interface"]
        FirebaseSDK["FirebaseAiProvider (firebase/ai)"]
        MockSDK["MockAiProvider (Pune Hero Scenario)"]
        Validation["withValidationRetry() & Zod Schemas"]
        Security["Versioned Prompts (User Text Treated as Inert Data)"]
    end

    subgraph Repositories ["Data Persistence Layer"]
        Repo["EventRepository Interface"]
        FirestoreRepo["FirestoreEventRepository (Multi-tab Cache, writeBatch)"]
        MemoryRepo["InMemoryEventRepository (Zero-credential Demo/Tests)"]
    end

    Pages --> Store
    Drawer --> Store
    Store --> Domain
    Store --> AI
    Store --> Repositories
    FirebaseSDK -.-> Provider
    MockSDK -.-> Provider
    FirestoreRepo -.-> Repo
    MemoryRepo -.-> Repo
```

---

## ⚖️ Judging Criteria to Code Map

| Judging Dimension | Weight | Primary Implementation Files | Key Technical Highlights |
|---|:---:|---|---|
| **1. Code Quality** | **HIGH** | `src/domain/*.ts`<br>`src/ai/providers/*.ts`<br>`src/stores/eventStore.ts` | Strict TypeScript (`noImplicitAny`, zero `any`), feature-sliced structure, pure domain functions with `now: Date` required param, zero external framework imports in domain. |
| **2. Problem Alignment** | **HIGH** | `src/features/blueprint/`<br>`src/features/budget/`<br>`src/features/timeline/`<br>`src/features/copilot/` | Indian celebration presets (weddings, birthdays, community gatherings), reverse-scheduled milestones, Panic Mode triage, What-If simulator, runsheet coordination, multilingual celebration copy. |
| **3. Security** | **MEDIUM** | `firestore.rules`<br>`firebase.json`<br>`src/services/firebase.ts`<br>`src/domain/exporters.ts` | Zero raw client API keys, client-only Firebase AI Logic SDK, App Check (reCAPTCHA v3) only when site key is present, `getAfter` owner checks, keys allow-listing, string/size caps, RSVP `createdAt == request.time`, RFC 4180 CSV formula-injection defense (`='+-@`). |
| **4. Efficiency** | **MEDIUM** | `src/App.tsx`<br>`vite.config.ts`<br>`src/ai/rateLimiter.ts`<br>`src/ai/cache.ts` | Route-level lazy loading (`React.lazy`), initial gzipped JS bundle **~20.37 KB** (well within 500 KB target), multi-tab persistent Firestore local cache, in-memory AI request caching and debouncing. |
| **5. Testability / Maintainability** | **MED** | `src/domain/__tests__/`<br>`src/features/**/__tests__/`<br>`src/test/rules/` | **>96% statement test coverage**, fast-check property tests for budget sum invariant and diff round-trip mathematical inversion, isolated unit test suites for UI and security rules. |
| **6. Accessibility** | **LOW** | `src/features/copilot/`<br>`src/components/common/`<br>`src/features/budget/` | Semantic landmarks (`main`, `header`, `aside`), single `<h1>` hierarchy per view, screen-reader `aria-live="polite"` status announcer for Copilot, labeled inputs, `aria-hidden` decorative icons. |

---

## 🚀 Setup & Local Execution

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### Installation
```bash
git clone <repo-url>
cd "Utsav AI"
npm install
```

### Environment Configuration
```bash
cp .env.example .env
```
*Note: Demo mode runs 100% locally out-of-the-box using `InMemoryEventRepository` and `MockAiProvider` with zero Firebase credentials needed.*

---

## 🛠️ Verification & Quality Commands

```bash
# Full quality gate (lint + typecheck + unit tests + production build)
npm run verify

# Vitest unit test suite (15 suites, 69 tests)
npm test

# Vitest test coverage report (>96% coverage)
npm run test:coverage

# Firestore security rules testing (requires Firebase emulator)
npm run test:rules

# Production bundle compilation
npm run build
```

---

## ⚠️ Known Limitations
- **Backend-Free Architecture**: No backend server or Google Cloud Functions are used. AI structured outputs run directly client-side via Firebase AI Logic SDK with Google Developer backend.
- **Client Rate Limiting**: In-memory debouncing limits consecutive AI prompts to prevent accidental quota exhaustion on free tiers.
- **Rules Tests**: Rules unit tests run in a dedicated test suite (`npm run test:rules`) requiring the local Firebase Firestore emulator port `8080`.

---
