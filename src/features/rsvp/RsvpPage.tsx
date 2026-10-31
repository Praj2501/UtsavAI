import React, { useState } from 'react';
import { useEventStore } from '../../stores/eventStore';
import { cateringQuantities } from '../../domain/cateringQuantities';
import { DietaryPreference, AttendanceStatus } from '../../types/event.types';
import { toCsv } from '../../domain/exporters';
import { EmptyState } from '../../components/common/States';

export const RsvpPage: React.FC = () => {
  const { currentEvent, rsvps, addRsvp, setActiveView } = useEventStore();

  const [formData, setFormData] = useState({
    guestName: '',
    guestCount: 1,
    attendance: 'attending' as AttendanceStatus,
    dietaryPreference: 'veg' as DietaryPreference,
    note: '',
  });

  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  if (!currentEvent) {
    return (
      <EmptyState
        title="No Celebration Selected"
        description="Select or create a celebration to record RSVPs and calculate catering."
        actionLabel="Create Blueprint"
        onAction={() => setActiveView('blueprint')}
        icon="groups"
      />
    );
  }

  // Dietary counts aggregation
  const dietaryCounts: Record<DietaryPreference, number> = {
    veg: 0,
    jain_veg: 0,
    non_veg: 0,
    vegan: 0,
  };

  let attendingGuests = 0;
  let declinedCount = 0;
  let tentativeCount = 0;

  for (const r of rsvps) {
    if (r.attendance === 'attending') {
      attendingGuests += r.guestCount;
      dietaryCounts[r.dietaryPreference] = (dietaryCounts[r.dietaryPreference] || 0) + r.guestCount;
    } else if (r.attendance === 'declined') {
      declinedCount += 1;
    } else {
      tentativeCount += 1;
    }
  }

  const catering = cateringQuantities(
    currentEvent.guestCount,
    dietaryCounts,
    currentEvent.eventType,
    attendingGuests
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guestName.trim()) return;

    await addRsvp({
      guestName: formData.guestName.trim(),
      guestCount: Number(formData.guestCount),
      attendance: formData.attendance,
      dietaryPreference: formData.dietaryPreference,
      note: formData.note.trim() || undefined,
    });

    setSubmittedMessage(`Thank you, ${formData.guestName.trim()}! Your RSVP has been recorded.`);
    setFormData({
      guestName: '',
      guestCount: 1,
      attendance: 'attending',
      dietaryPreference: 'veg',
      note: '',
    });

    setTimeout(() => setSubmittedMessage(null), 5000);
  };

  const handleExportCsv = () => {
    const csvData = toCsv(
      [
        { key: 'guestName', label: 'Guest Name' },
        { key: 'guestCount', label: 'Party Size' },
        { key: 'attendance', label: 'Status' },
        { key: 'dietaryPreference', label: 'Dietary Preference' },
        { key: 'note', label: 'Special Requests' },
      ],
      rsvps.map((r) => ({
        guestName: r.guestName,
        guestCount: r.guestCount,
        attendance: r.attendance,
        dietaryPreference: r.dietaryPreference,
        note: r.note || '',
      }))
    );

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentEvent.title.replace(/\s+/g, '_')}_RSVPs.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            Guest RSVPs & Catering Headcount
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Real-time attendance tracking with automatic Indian celebratory catering quantity estimations.
          </p>
        </div>

        {rsvps.length > 0 && (
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs rounded-xl shadow-xs transition-colors"
          >
            📥 Export CSV (RFC 4180)
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-utsav-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Attending Headcount</span>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">{attendingGuests}</div>
          <span className="text-[11px] text-stone-400">Target: {currentEvent.guestCount} guests</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-utsav-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Responses Logged</span>
          <div className="text-2xl font-bold font-mono text-stone-900 mt-1">{rsvps.length}</div>
          <span className="text-[11px] text-stone-400">Households / Parties</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-utsav-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Declined</span>
          <div className="text-2xl font-bold font-mono text-stone-500 mt-1">{declinedCount}</div>
          <span className="text-[11px] text-stone-400">Unable to attend</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-utsav-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Tentative</span>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">{tentativeCount}</div>
          <span className="text-[11px] text-stone-400">Follow-up needed</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Catering Math */}
        <div className="bg-white rounded-2xl border border-utsav-200 p-6 shadow-xs h-fit">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900">Catering Headcount Math</h2>
              <span className="text-[11px] text-stone-500">Pure domain calculation (7% contingency buffer)</span>
            </div>
            <span className="text-xl">🍲</span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-stone-50">
              <span className="text-stone-600">Effective Dining Guests:</span>
              <span className="font-mono font-bold text-stone-900">{catering.effectiveGuests}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-stone-50">
              <span className="text-stone-600">Appetizers (pieces):</span>
              <span className="font-mono font-bold text-stone-900">{catering.appetizerPieces.toLocaleString('en-IN')} pcs</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-stone-50">
              <span className="text-stone-600">Main Rice / Pulao:</span>
              <span className="font-mono font-bold text-stone-900">{catering.mainCourseRiceKg} kg</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-stone-50">
              <span className="text-stone-600">Rotis / Naans / Puris:</span>
              <span className="font-mono font-bold text-stone-900">{catering.breadPieces.toLocaleString('en-IN')} pcs</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-stone-50">
              <span className="text-stone-600">Dal / Curries:</span>
              <span className="font-mono font-bold text-stone-900">{catering.dalCurryLiters} liters</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-stone-50">
              <span className="text-stone-600">Desserts (Modak/Gulab Jamun):</span>
              <span className="font-mono font-bold text-stone-900">{catering.dessertPieces.toLocaleString('en-IN')} pcs</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-stone-600">Beverages / Chaas / Solkadhi:</span>
              <span className="font-mono font-bold text-stone-900">{catering.beverageLiters} liters</span>
            </div>
          </div>

          {/* Dietary Breakdown */}
          <div className="mt-6 pt-4 border-t border-stone-100">
            <h3 className="font-semibold text-stone-800 text-xs mb-3">Dietary Distribution:</h3>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-green-50 text-green-800">
                <span className="font-bold">Veg:</span> {dietaryCounts.veg}
              </div>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-800">
                <span className="font-bold">Jain Veg:</span> {dietaryCounts.jain_veg}
              </div>
              <div className="p-2 rounded-lg bg-red-50 text-red-800">
                <span className="font-bold">Non-Veg:</span> {dietaryCounts.non_veg}
              </div>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-800">
                <span className="font-bold">Vegan:</span> {dietaryCounts.vegan}
              </div>
            </div>
          </div>
        </div>

        {/* Center/Right Col: RSVP Form & Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest RSVP Submission Card */}
          <div className="bg-white rounded-2xl border border-utsav-200 p-6 shadow-xs">
            <h2 className="font-serif text-lg font-bold text-stone-900 mb-1">
              Record Guest Response
            </h2>
            <p className="text-xs text-stone-500 mb-4">
              Enter incoming RSVP details received via WhatsApp, phone, or in person.
            </p>

            {submittedMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
                {submittedMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Family / Guest Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.guestName}
                    onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                    placeholder="e.g. Deshmukh Family"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Total Attending in Party</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.guestCount}
                    onChange={(e) => setFormData({ ...formData, guestCount: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Attendance Status</label>
                  <select
                    value={formData.attendance}
                    onChange={(e) => setFormData({ ...formData, attendance: e.target.value as AttendanceStatus })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
                  >
                    <option value="attending">Attending (Confirming)</option>
                    <option value="tentative">Tentative / Undecided</option>
                    <option value="declined">Declined with regrets</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Dietary Preference</label>
                  <select
                    value={formData.dietaryPreference}
                    onChange={(e) => setFormData({ ...formData, dietaryPreference: e.target.value as DietaryPreference })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
                  >
                    <option value="veg">Traditional Vegetarian</option>
                    <option value="jain_veg">Jain Vegetarian (No onion/garlic/roots)</option>
                    <option value="non_veg">Non-Vegetarian</option>
                    <option value="vegan">Vegan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Special Notes / Dietary Allergies</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="e.g. Nut allergy, elderly guest seating requested"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-festive-marigold hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  Record RSVP
                </button>
              </div>
            </form>
          </div>

          {/* Guest Responses Table */}
          <div className="bg-white rounded-2xl border border-utsav-200 p-5 shadow-xs overflow-hidden">
            <h3 className="font-serif text-base font-bold text-stone-900 mb-3">
              Recorded Guest List ({rsvps.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Guest / Party</th>
                    <th scope="col" className="px-3 py-2.5 text-center">Count</th>
                    <th scope="col" className="px-3 py-2.5">Status</th>
                    <th scope="col" className="px-3 py-2.5">Diet</th>
                    <th scope="col" className="px-4 py-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rsvps.map((rsvp) => (
                    <tr key={rsvp.id} className="hover:bg-utsav-50/50">
                      <td className="px-4 py-3 font-semibold text-stone-900">{rsvp.guestName}</td>
                      <td className="px-3 py-3 text-center font-mono font-bold text-stone-700">{rsvp.guestCount}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            rsvp.attendance === 'attending'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rsvp.attendance === 'declined'
                              ? 'bg-stone-200 text-stone-600'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rsvp.attendance}
                        </span>
                      </td>
                      <td className="px-3 py-3 capitalize text-stone-600">{rsvp.dietaryPreference.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-stone-500 italic">{rsvp.note || '-'}</td>
                    </tr>
                  ))}
                  {rsvps.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-stone-400">
                        No RSVPs recorded yet. Use the form above to add responses.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RsvpPage;
