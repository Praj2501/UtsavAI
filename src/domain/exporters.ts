import { RunSheetItem } from '../types/event.types';

export interface CalendarEventParams {
  title: string;
  description: string;
  location: string;
  startIso: string; // YYYYMMDDTHHmmssZ
  endIso: string;   // YYYYMMDDTHHmmssZ
}

/**
 * Escapes text according to RFC 5545 section 3.3.11.
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Folds lines at 75 octets according to RFC 5545 section 3.1.
 */
function foldIcsLine(line: string): string {
  const MAX_OCTETS = 75;
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= MAX_OCTETS) {
    return line;
  }

  const parts: string[] = [];
  let current = '';

  for (const char of line) {
    const candidate = current + char;
    // Continuation lines start with space, so limit is 75 octets
    if (encoder.encode(candidate).length > MAX_OCTETS) {
      parts.push(current);
      current = ' ' + char;
    } else {
      current = candidate;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts.join('\r\n');
}

/**
 * Converts a 12-hour or 24-hour time string (e.g. "09:30 AM", "14:00") into HHMMSS.
 */
function parseTimeToTimeString(timeStr: string): string {
  const cleaned = timeStr.trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
  if (!match) {
    return '090000';
  }
  let hours = parseInt(match[1] ?? '9', 10);
  const minutes = match[2] ?? '00';
  const ampm = match[3];

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}${minutes}00`;
}

/**
 * Generates an RFC 5545 compliant iCalendar string for runsheet items.
 */
export function toIcs(
  eventTitle: string,
  eventDateStr: string,
  items: RunSheetItem[],
  timezone = 'Asia/Kolkata'
): string {
  const dateCompact = eventDateStr.replace(/-/g, '');
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Utsav AI//Event Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const item of items) {
    const startTimeStr = parseTimeToTimeString(item.startTime);
    const endTimeStr = parseTimeToTimeString(item.endTime);
    const uid = `utsav-${eventDateStr}-${item.id}@utsav.ai`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dateCompact}T000000Z`);
    lines.push(`DTSTART;TZID=${timezone}:${dateCompact}T${startTimeStr}`);
    lines.push(`DTEND;TZID=${timezone}:${dateCompact}T${endTimeStr}`);
    lines.push(`SUMMARY:${escapeIcsText(`${eventTitle}: ${item.activity}`)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(`Activity: ${item.activity}\\nIn Charge: ${item.personInCharge}\\nNotes: ${item.notes}`)}`);
    if (item.location) {
      lines.push(`LOCATION:${escapeIcsText(item.location)}`);
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

/**
 * Escapes cell content according to RFC 4180 and protects against CSV formula injection.
 */
function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  let str = String(value);

  // CSV Formula Injection mitigation: prefix '=', '+', '-', '@', '\t', '\r' with single apostrophe
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape quotes
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return `"${str}"`;
}

/**
 * Exports tabular data to an RFC 4180 CSV string with formula injection protection.
 */
export function toCsv<T>(
  headers: Array<{ key: keyof T; label: string }>,
  rows: T[]
): string {
  const headerLine = headers.map(h => sanitizeCsvCell(h.label)).join(',');
  const rowLines = rows.map(row =>
    headers.map(h => sanitizeCsvCell((row as Record<string, unknown>)[h.key as string])).join(',')
  );

  return [headerLine, ...rowLines].join('\r\n') + '\r\n';
}

/**
 * Builds Google Calendar web event URL with encoded params.
 */
export function buildCalendarUrl(params: CalendarEventParams): string {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const query = [
    `text=${encodeURIComponent(params.title)}`,
    `details=${encodeURIComponent(params.description)}`,
    `location=${encodeURIComponent(params.location)}`,
    `dates=${params.startIso}/${params.endIso}`,
  ].join('&');

  return `${baseUrl}&${query}`;
}

/**
 * Builds Google Maps search link with encoded query and city.
 */
export function buildMapsSearchUrl(query: string, city: string): string {
  const fullSearch = city ? `${query}, ${city}` : query;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullSearch)}`;
}

/**
 * Builds direct WhatsApp click-to-chat URL with encoded message.
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleanedPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Builds standard mailto URL with encoded subject and body.
 */
export function buildMailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
