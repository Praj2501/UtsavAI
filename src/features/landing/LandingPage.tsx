import React from 'react';
import { useEventStore } from '../../stores/eventStore';

export const LandingPage: React.FC = () => {
  const { loadDemoScenario, setActiveView, isLoading } = useEventStore();

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-festive-marigold border border-orange-200 mb-6">
          <span className="material-symbols-outlined text-sm" aria-hidden="true">celebration</span>
          GenAI Celebration Planner
        </span>
        <h1 className="font-serif text-4xl sm:text-6xl font-bold text-stone-900 tracking-tight mb-6">
          Plan Unforgettable Celebrations with Precision
        </h1>
        <p className="text-stone-600 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Intelligent reverse scheduling, deterministic rupee budget rebalancing, vendor kits, and an AI co-pilot designed for Indian weddings, milestone birthdays, and community gatherings.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            type="button"
            onClick={() => setActiveView('blueprint')}
            className="w-full sm:w-auto px-8 py-3.5 bg-festive-marigold text-white font-semibold rounded-xl shadow-md hover:bg-orange-700 transition-colors inline-flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
            <span>Create New Event</span>
          </button>
          <button
            type="button"
            onClick={() => void loadDemoScenario()}
            disabled={isLoading}
            className="w-full sm:w-auto px-8 py-3.5 bg-white text-stone-800 font-semibold rounded-xl border border-stone-300 shadow-sm hover:bg-stone-50 transition-colors inline-flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-festive-marigold" aria-hidden="true">play_circle</span>
            <span>{isLoading ? 'Loading Demo...' : 'Try Demo (Pune Wedding)'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white p-6 rounded-2xl border border-utsav-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined" aria-hidden="true">account_balance_wallet</span>
            </div>
            <h3 className="font-serif font-bold text-lg text-stone-900 mb-2">Deterministic Budgeting</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              What-If simulator with largest-remainder rounding guaranteeing exact zero-drift totals down to the rupee.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-utsav-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-festive-marigold flex items-center justify-center mb-4">
              <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
            </div>
            <h3 className="font-serif font-bold text-lg text-stone-900 mb-2">Reverse Schedule & Panic Mode</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              Automatic lead-day calculations from Muhurat date, with instant task triage when lead times fall short.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-utsav-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined" aria-hidden="true">handshake</span>
            </div>
            <h3 className="font-serif font-bold text-lg text-stone-900 mb-2">Vendor Negotiation Kit</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              Category checklists, WhatsApp/email inquiry drafts in English, Hindi, and Marathi, and venue map links.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
