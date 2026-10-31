# Utsav AI Project Progress

- [x] Step 1: Tooling, Tailwind, Strict TS, Firebase configs, Security rules, CI gate
- [x] Step 2: Domain pure functions (`dates`, `reverseSchedule`, `compressTimeline`, `rebalanceBudget`, `budgetSummary`, `diffEngine`, `cateringQuantities`, `exporters`), Fast-check property tests
- [x] Step 2b: AI subsystem (`AiProvider`, `MockAiProvider`, `FirebaseAiProvider`, Zod schemas, versioned prompts, rate limiting, in-memory cache)
- [x] Repositories: `EventRepository` interface, `InMemoryEventRepository`, `FirestoreEventRepository` with `writeBatch` including `publicEvents` mirror
- [x] Step 3: Lazy routes (Landing, Blueprint form, Dashboard with countdown/progress ring/burn bar/next tasks/overdue alerts, What-If simulator, Timeline, Copilot drawer)
- [x] Step 4: Vendors page, Guest RSVP & Catering Headcount, WhatsApp/Email content generator, Day-of Runsheet with offline/export support
- [x] Step 5: Final review, bundle size check (<500KB gzipped), production build validation
