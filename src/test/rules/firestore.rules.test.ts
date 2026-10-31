import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;
  const PROJECT_ID = 'utsav-ai-rules-test';

  beforeAll(async () => {
    const rules = fs.readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  it('allows same-batch creation of event and publicEvents document', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const batch = writeBatch(aliceDb);

    const eventRef = doc(aliceDb, 'events', 'event-batch-1');
    const publicRef = doc(aliceDb, 'publicEvents', 'event-batch-1');

    batch.set(eventRef, {
      id: 'event-batch-1',
      title: "Sister's Wedding",
      eventType: 'wedding',
      date: '2026-11-20',
      city: 'Pune',
      guestCount: 250,
      totalBudget: 1200000,
      tradition: 'Maharashtrian',
      vibe: 'Traditional Elegance',
      themes: [],
      planB: [],
      vendorChecklist: [],
      members: { alice: 'owner' },
    });

    batch.set(publicRef, {
      title: "Sister's Wedding",
      date: '2026-11-20',
      city: 'Pune',
    });

    await assertSucceeds(batch.commit());
  });

  it('denies event update that attempts to alter members', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const eventRef = doc(aliceDb, 'events', 'event-immutable');

    await assertSucceeds(
      setDoc(eventRef, {
        id: 'event-immutable',
        title: 'Original Title',
        eventType: 'birthday',
        date: '2026-12-01',
        city: 'Mumbai',
        guestCount: 50,
        totalBudget: 50000,
        tradition: '',
        vibe: 'Fun',
        themes: [],
        planB: [],
        vendorChecklist: [],
        members: { alice: 'owner' },
      })
    );

    // Try to add Bob as owner
    await assertFails(
      updateDoc(eventRef, {
        members: { alice: 'owner', bob: 'owner' },
      })
    );
  });

  it('denies document with unauthorized extra fields (hasOnly check)', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const eventRef = doc(aliceDb, 'events', 'event-extra');

    await assertFails(
      setDoc(eventRef, {
        id: 'event-extra',
        title: 'Test Title',
        eventType: 'wedding',
        date: '2026-11-20',
        city: 'Pune',
        guestCount: 250,
        totalBudget: 1200000,
        tradition: 'Maharashtrian',
        vibe: 'Traditional',
        themes: [],
        planB: [],
        vendorChecklist: [],
        members: { alice: 'owner' },
        maliciousExtraField: 'attack-vector',
      })
    );
  });

  it('requires RSVP createdAt to equal request.time and valid fields', async () => {
    // Seed parent event
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'events', 'event-rsvp-test'), {
        id: 'event-rsvp-test',
        title: 'Wedding',
        eventType: 'wedding',
        date: '2026-11-20',
        city: 'Pune',
        guestCount: 250,
        totalBudget: 1200000,
        tradition: 'Maharashtrian',
        vibe: 'Classic',
        themes: [],
        planB: [],
        vendorChecklist: [],
        members: { alice: 'owner' },
      });
    });

    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const rsvpRef = doc(unauthDb, 'events', 'event-rsvp-test', 'rsvps', 'rsvp-valid');

    // Valid with serverTimestamp
    await assertSucceeds(
      setDoc(rsvpRef, {
        id: 'rsvp-valid',
        guestName: 'Ananya Deshmukh',
        guestCount: 2,
        attendance: 'attending',
        dietaryPreference: 'jain_veg',
        note: 'Allergies: peanuts',
        createdAt: serverTimestamp(),
      })
    );

    // Invalid with fake timestamp
    const rsvpBadTimeRef = doc(unauthDb, 'events', 'event-rsvp-test', 'rsvps', 'rsvp-bad-time');
    await assertFails(
      setDoc(rsvpBadTimeRef, {
        id: 'rsvp-bad-time',
        guestName: 'Ananya Deshmukh',
        guestCount: 2,
        attendance: 'attending',
        dietaryPreference: 'jain_veg',
        createdAt: '2020-01-01T00:00:00Z', // Not server timestamp
      })
    );
  });

  it('fails RSVP create when parent event does not exist', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const rsvpOrphanRef = doc(unauthDb, 'events', 'non-existent-event', 'rsvps', 'rsvp-orphan');
    await assertFails(
      setDoc(rsvpOrphanRef, {
        id: 'rsvp-orphan',
        guestName: 'Sneha Patel',
        guestCount: 1,
        attendance: 'attending',
        dietaryPreference: 'veg',
        createdAt: serverTimestamp(),
      })
    );
  });
});
