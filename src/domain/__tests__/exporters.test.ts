import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  toIcs,
  toCsv,
  buildCalendarUrl,
  buildMapsSearchUrl,
  buildWhatsAppUrl,
  buildMailtoUrl,
} from '../exporters';
import { RunSheetItem } from '../../types/event.types';

describe('exporters (iCalendar, CSV, URLs)', () => {
  const sampleItems: RunSheetItem[] = [
    {
      id: 'rs-1',
      startTime: '09:00 AM',
      endTime: '10:30 AM',
      activity: 'Baraat Arrival & Welcome; Dhol & Tasha',
      personInCharge: 'Nilesh Uncle, Coordinator',
      location: 'Grand Ballroom, Pune',
      notes: 'Ensure rose petals & Aarti thali are ready\nSpecial welcome for groom family',
      order: 1,
    },
  ];

  it('generates valid RFC 5545 iCalendar with CRLF, TZID, and escaping', () => {
    const ics = toIcs("Sister's Wedding", '2026-11-20', sampleItems, 'Asia/Kolkata');

    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('DTSTART;TZID=Asia/Kolkata:20261120T090000');
    expect(ics).toContain('DTEND;TZID=Asia/Kolkata:20261120T103000');
    expect(ics).toContain('Welcome\\; Dhol & Tasha');
    expect(ics).toContain('Nilesh Uncle\\, Coordinator');
    expect(ics).toContain('Grand Ballroom\\, Pune');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('handles invalid time string and empty location gracefully with fallbacks', () => {
    const items: RunSheetItem[] = [
      {
        id: 'rs-fallback',
        startTime: 'unparseable',
        endTime: 'bad-time',
        activity: 'Photo Session',
        personInCharge: 'Photographer',
        location: '', // empty location
        notes: '',
        order: 2,
      },
    ];

    const ics = toIcs('Celebration', '2026-11-20', items);
    expect(ics).toContain('DTSTART;TZID=Asia/Kolkata:20261120T090000');
    expect(ics).not.toContain('LOCATION:');
  });

  it('property: no line in toIcs exceeds 75 octets (RFC 5545 line folding)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 300 }),
        fc.string({ minLength: 1, maxLength: 300 }),
        (activity, notes) => {
          const items: RunSheetItem[] = [
            {
              id: 'test-item',
              startTime: '10:00 AM',
              endTime: '11:00 AM',
              activity,
              personInCharge: 'Coordinator',
              location: 'Venue',
              notes,
              order: 1,
            },
          ];

          const ics = toIcs('Celebration', '2026-11-20', items);
          const lines = ics.split('\r\n');
          const encoder = new TextEncoder();

          for (const line of lines) {
            // Note: split can leave empty trailing line
            if (line.length > 0) {
              expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('escapes CSV cells and neutralizes formula injection attacks', () => {
    const maliciousRows = [
      { name: '=cmd|/C calc!A0', notes: '+12345', amount: 500 },
      { name: '@SUM(1,2)', notes: '-danger', amount: 100 },
      { name: 'Normal "Quoted", Name', notes: 'Simple', amount: 200 },
    ];

    const csv = toCsv(
      [
        { key: 'name', label: 'Name' },
        { key: 'notes', label: 'Notes' },
        { key: 'amount', label: 'Amount' },
      ],
      maliciousRows
    );

    // Should be prefixed with single quote to prevent execution in spreadsheet software
    expect(csv).toContain("\"'=cmd|/C calc!A0\"");
    expect(csv).toContain("\"'+12345\"");
    expect(csv).toContain("\"'@SUM(1,2)\"");
    expect(csv).toContain("\"'-danger\"");
    // Internal quotes escaped as double quotes
    expect(csv).toContain('""Quoted""');
  });

  it('builds safely encoded external URLs', () => {
    const calUrl = buildCalendarUrl({
      title: 'Pooja & Rahul Wedding',
      description: 'Grand Celebration!',
      location: 'Pune, Maharashtra',
      startIso: '20261120T090000Z',
      endIso: '20261120T120000Z',
    });
    expect(calUrl).toContain('text=Pooja%20%26%20Rahul%20Wedding');

    const mapsUrl = buildMapsSearchUrl('JW Marriott Lawn', 'Pune');
    expect(mapsUrl).toContain('query=JW%20Marriott%20Lawn%2C%20Pune');

    const waUrl = buildWhatsAppUrl('+91 98765 43210', 'Namaste! Inquiring about wedding dates.');
    expect(waUrl).toBe('https://wa.me/919876543210?text=Namaste!%20Inquiring%20about%20wedding%20dates.');

    const mailto = buildMailtoUrl('catering@pune.com', 'Wedding Inquiry: 250 Guests', 'Hello team,');
    expect(mailto).toBe('mailto:catering%40pune.com?subject=Wedding%20Inquiry%3A%20250%20Guests&body=Hello%20team%2C');
  });
});
