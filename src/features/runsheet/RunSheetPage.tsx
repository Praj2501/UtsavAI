import React, { useState } from 'react';
import { useEventStore } from '../../stores/eventStore';
import { RunSheetItem } from '../../types/event.types';
import { toIcs, toCsv, buildCalendarUrl } from '../../domain/exporters';
import { EmptyState } from '../../components/common/States';

const INITIAL_RUNSHEET_ITEMS: RunSheetItem[] = [
  {
    id: 'rs-1',
    startTime: '07:30 AM',
    endTime: '09:00 AM',
    activity: 'Bridal Nauvari Drape & Groom Safa Tying',
    personInCharge: 'Sunita (Makeup Artist) & Nilesh',
    location: 'Bridal Suite A',
    notes: 'Keep Paithani saree pressed & jewelry ready',
    order: 1,
  },
  {
    id: 'rs-2',
    startTime: '09:00 AM',
    endTime: '09:45 AM',
    activity: 'Varat Arrival & Traditional Sanai Choughada Welcome',
    personInCharge: 'Ramesh Kulkarni (Uncle)',
    location: 'Main Lawn Entrance',
    notes: 'Aarti thali and rose petals prepared by entrance team',
    order: 2,
  },
  {
    id: 'rs-3',
    startTime: '10:00 AM',
    endTime: '11:15 AM',
    activity: 'Lagna Muhurat & Antarpat Ceremony',
    personInCharge: 'Guruji Joshi & Rahul',
    location: 'Central Mandap',
    notes: 'Akshata distribution 10 mins prior to Mangalashtak',
    order: 3,
  },
  {
    id: 'rs-4',
    startTime: '11:30 AM',
    endTime: '01:30 PM',
    activity: 'Traditional Maharashtrian Lunch Feast',
    personInCharge: 'Ganesh Caterers (Suresh)',
    location: 'Dining Hall',
    notes: 'Ensure separate pure Jain service section & hot Modak counter',
    order: 4,
  },
  {
    id: 'rs-5',
    startTime: '01:30 PM',
    endTime: '02:30 PM',
    activity: 'Photo Sessions & Return Gift Distribution',
    personInCharge: 'Ananya (Sister)',
    location: 'Decor Stage Area',
    notes: 'Hand over brass diyas & seed paper favors to departing families',
    order: 5,
  },
];

export const RunSheetPage: React.FC = () => {
  const { currentEvent, setActiveView } = useEventStore();
  const [items, setItems] = useState<RunSheetItem[]>(INITIAL_RUNSHEET_ITEMS);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [newItem, setNewItem] = useState({
    startTime: '03:00 PM',
    endTime: '04:00 PM',
    activity: '',
    personInCharge: '',
    location: 'Main Lawn',
    notes: '',
  });

  if (!currentEvent) {
    return (
      <EmptyState
        title="No Runsheet Available"
        description="Select or create a celebration to orchestrate day-of milestone schedules."
        actionLabel="Create Blueprint"
        onAction={() => setActiveView('blueprint')}
        icon="schedule"
      />
    );
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.activity.trim()) return;

    const created: RunSheetItem = {
      id: `rs-${Date.now()}`,
      startTime: newItem.startTime,
      endTime: newItem.endTime,
      activity: newItem.activity.trim(),
      personInCharge: newItem.personInCharge.trim() || 'Coordinator',
      location: newItem.location.trim(),
      notes: newItem.notes.trim(),
      order: items.length + 1,
    };

    setItems([...items, created]);
    setIsAddOpen(false);
    setNewItem({
      startTime: '03:00 PM',
      endTime: '04:00 PM',
      activity: '',
      personInCharge: '',
      location: 'Main Lawn',
      notes: '',
    });
  };

  const handleExportIcs = () => {
    const icsContent = toIcs(
      currentEvent.title,
      currentEvent.date,
      items,
      'Asia/Kolkata'
    );

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentEvent.title.replace(/\s+/g, '_')}_Schedule.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const csvContent = toCsv(
      [
        { key: 'startTime', label: 'Start Time' },
        { key: 'endTime', label: 'End Time' },
        { key: 'activity', label: 'Milestone / Activity' },
        { key: 'personInCharge', label: 'Person in Charge' },
        { key: 'location', label: 'Location' },
        { key: 'notes', label: 'Operational Notes' },
      ],
      items
    );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentEvent.title.replace(/\s+/g, '_')}_RunSheet.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            Day-of Runsheet & Minute-by-Minute Schedule
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Exact timeline orchestration for coordinators, family leads, and catering captains. Offline-ready and printable.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportIcs}
            className="px-3.5 py-2 border border-stone-300 hover:bg-stone-50 rounded-xl text-stone-700 font-semibold text-xs shadow-xs transition-colors"
          >
            📅 Export iCal (.ics)
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 border border-stone-300 hover:bg-stone-50 rounded-xl text-stone-700 font-semibold text-xs shadow-xs transition-colors"
          >
            📊 Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors"
          >
            🖨️ Print Master Sheet
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-2 bg-festive-marigold hover:bg-orange-700 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors"
          >
            + Add Milestone
          </button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block mb-6 border-b border-stone-300 pb-4">
        <div className="text-2xl font-bold text-stone-900">{currentEvent.title} - Master Runsheet</div>
        <p className="text-xs text-stone-600">Date: {currentEvent.date} | Location: {currentEvent.city} | Target Guests: {currentEvent.guestCount}</p>
      </div>

      {/* Runsheet Timeline Table */}
      <div className="bg-white rounded-2xl border border-utsav-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold print:bg-white print:border-b-2 print:border-stone-800">
              <tr>
                <th scope="col" className="px-5 py-3 w-32">Time Window</th>
                <th scope="col" className="px-5 py-3">Milestone Activity</th>
                <th scope="col" className="px-5 py-3">Person In Charge</th>
                <th scope="col" className="px-5 py-3">Location</th>
                <th scope="col" className="px-5 py-3">Operational Notes</th>
                <th scope="col" className="px-4 py-3 print:hidden text-center">Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 print:divide-stone-300">
              {items.map((item) => {
                // Generate Google Calendar Link for individual slot
                const [startHourStr, startRest] = item.startTime.split(':');
                const [startMinStr, startPeriod] = (startRest || '00 AM').split(' ');
                let hour = parseInt(startHourStr || '9', 10);
                if (startPeriod === 'PM' && hour < 12) hour += 12;
                if (startPeriod === 'AM' && hour === 12) hour = 0;
                const dateClean = currentEvent.date.replace(/-/g, '');
                const startIso = `${dateClean}T${String(hour).padStart(2, '0')}${startMinStr || '00'}00Z`;
                const endIso = `${dateClean}T${String((hour + 1) % 24).padStart(2, '0')}${startMinStr || '00'}00Z`;

                const calUrl = buildCalendarUrl({
                  title: `${currentEvent.title}: ${item.activity}`,
                  description: `PIC: ${item.personInCharge}\nNotes: ${item.notes}`,
                  location: `${item.location}, ${currentEvent.city}`,
                  startIso,
                  endIso,
                });

                return (
                  <tr key={item.id} className="hover:bg-utsav-50/50 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-stone-900 whitespace-nowrap">
                      {item.startTime} - {item.endTime}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-stone-900 text-sm">{item.activity}</div>
                    </td>
                    <td className="px-5 py-4 font-medium text-festive-marigold whitespace-nowrap">
                      {item.personInCharge}
                    </td>
                    <td className="px-5 py-4 text-stone-600 whitespace-nowrap">
                      {item.location}
                    </td>
                    <td className="px-5 py-4 text-stone-600 leading-relaxed">
                      {item.notes}
                    </td>
                    <td className="px-4 py-4 print:hidden text-center whitespace-nowrap">
                      <a
                        href={calUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-[11px] transition-colors"
                        title="Add to Google Calendar"
                      >
                        + Cal
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Milestone Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs" onClick={() => setIsAddOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-stone-200 z-10 text-xs">
            <h2 className="font-serif text-xl font-bold text-stone-900 mb-4">Add Runsheet Milestone</h2>
            <form onSubmit={handleAddItem} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    required
                    value={newItem.startTime}
                    onChange={(e) => setNewItem({ ...newItem, startTime: e.target.value })}
                    placeholder="09:00 AM"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">End Time</label>
                  <input
                    type="text"
                    required
                    value={newItem.endTime}
                    onChange={(e) => setNewItem({ ...newItem, endTime: e.target.value })}
                    placeholder="10:30 AM"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Activity Description *</label>
                <input
                  type="text"
                  required
                  value={newItem.activity}
                  onChange={(e) => setNewItem({ ...newItem, activity: e.target.value })}
                  placeholder="e.g. Sangeet Performance Kickoff"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Person In Charge</label>
                  <input
                    type="text"
                    value={newItem.personInCharge}
                    onChange={(e) => setNewItem({ ...newItem, personInCharge: e.target.value })}
                    placeholder="e.g. Cousin Rohan"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={newItem.location}
                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                    placeholder="e.g. Main Hall"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Operational Instructions / Notes</label>
                <textarea
                  rows={2}
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  placeholder="Specific cues or props needed..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-festive-marigold hover:bg-orange-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RunSheetPage;
