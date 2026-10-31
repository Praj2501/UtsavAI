import React, { useState } from 'react';
import { useEventStore } from '../../stores/eventStore';
import { Vendor, VendorStatus } from '../../types/event.types';
import { buildMapsSearchUrl, buildWhatsAppUrl, buildMailtoUrl } from '../../domain/exporters';
import { EmptyState } from '../../components/common/States';

export const VendorsPage: React.FC = () => {
  const { currentEvent, vendors, updateVendorStatus, addVendor, toggleVendorChecklistItem, setActiveView } = useEventStore();
  const [activeTab, setActiveTab] = useState<'vendors' | 'checklist'>('vendors');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [newVendorData, setNewVendorData] = useState({
    name: '',
    category: 'Catering',
    contactName: '',
    phone: '',
    email: '',
    quotedAmount: '',
    notes: '',
  });

  if (!currentEvent) {
    return (
      <EmptyState
        title="No Celebration Selected"
        description="Select or create a celebration to manage vendor contacts and deliverables."
        actionLabel="Create Blueprint"
        onAction={() => setActiveView('blueprint')}
        icon="storefront"
      />
    );
  }

  const categories = ['all', ...Array.from(new Set(vendors.map((v) => v.category)))];

  const filteredVendors = selectedCategory === 'all'
    ? vendors
    : vendors.filter((v) => v.category === selectedCategory);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorData.name.trim()) return;

    const newV: Vendor = {
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newVendorData.name.trim(),
      category: newVendorData.category,
      contactName: newVendorData.contactName.trim(),
      phone: newVendorData.phone.trim(),
      email: newVendorData.email.trim(),
      quotedAmount: parseInt(newVendorData.quotedAmount, 10) || 0,
      status: 'researching',
      notes: newVendorData.notes.trim(),
    };

    await addVendor(newV);
    setIsAddModalOpen(false);
    setNewVendorData({
      name: '',
      category: 'Catering',
      contactName: '',
      phone: '',
      email: '',
      quotedAmount: '',
      notes: '',
    });
  };

  const getStatusBadge = (status: VendorStatus) => {
    switch (status) {
      case 'booked':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'shortlisted':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'contacted':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'rejected':
        return 'bg-stone-200 text-stone-600 border-stone-300';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            Vendors & Operational Checklist
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Track inquiries, compare quotations, launch contact links, and verify critical deliverables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-stone-100 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setActiveTab('vendors')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'vendors' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
              }`}
            >
              Directory ({vendors.length})
            </button>
            <button
              onClick={() => setActiveTab('checklist')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'checklist' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
              }`}
            >
              Verification Checklist
            </button>
          </div>

          {activeTab === 'vendors' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              + Add Vendor
            </button>
          )}
        </div>
      </div>

      {/* Directory Tab */}
      {activeTab === 'vendors' && (
        <>
          {/* Category filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full capitalize font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-festive-marigold text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Vendors grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVendors.map((vendor) => {
              const mapsUrl = buildMapsSearchUrl(vendor.name, currentEvent.city);
              const whatsappUrl = vendor.phone
                ? buildWhatsAppUrl(
                    vendor.phone,
                    `Namaste! Contacting regarding ${currentEvent.title} in ${currentEvent.city} on ${currentEvent.date}.`
                  )
                : null;
              const mailtoUrl = vendor.email
                ? buildMailtoUrl(
                    vendor.email,
                    `Inquiry: ${currentEvent.title}`,
                    `Hello ${vendor.contactName || vendor.name},\n\nWe would like to discuss arrangements for ${currentEvent.title} on ${currentEvent.date}.`
                  )
                : null;

              return (
                <div
                  key={vendor.id}
                  className="bg-white rounded-2xl border border-utsav-200 p-5 shadow-xs flex flex-col justify-between hover:border-utsav-300 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-festive-marigold">
                        {vendor.category}
                      </span>
                      <select
                        value={vendor.status}
                        onChange={(e) => void updateVendorStatus(vendor.id, e.target.value as VendorStatus)}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadge(
                          vendor.status
                        )} cursor-pointer`}
                      >
                        <option value="researching">Researching</option>
                        <option value="contacted">Contacted</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="booked">Booked</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-stone-900 leading-snug">
                      {vendor.name}
                    </h3>
                    {vendor.contactName && (
                      <p className="text-xs text-stone-500 mt-0.5">Contact: {vendor.contactName}</p>
                    )}

                    <div className="mt-3 py-2 px-3 bg-stone-50 rounded-xl text-xs flex justify-between items-center">
                      <span className="text-stone-500">Quoted Price:</span>
                      <span className="font-mono font-bold text-stone-900 text-sm">
                        ₹{vendor.quotedAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {vendor.notes && (
                      <p className="text-xs text-stone-600 mt-3 leading-relaxed line-clamp-3">
                        {vendor.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions / Links */}
                  <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold gap-2">
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-600 hover:text-stone-900 flex items-center gap-1"
                      title="Search vendor location on Google Maps"
                    >
                      <span>📍 Maps</span>
                    </a>

                    <div className="flex items-center gap-2">
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                        >
                          WhatsApp
                        </a>
                      )}
                      {mailtoUrl && (
                        <a
                          href={mailtoUrl}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                        >
                          Email
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Verification Checklist Tab */}
      {activeTab === 'checklist' && (
        <div className="bg-white rounded-2xl border border-utsav-200 p-6 shadow-xs max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="font-serif text-xl font-bold text-stone-900">
              Deliverables & Verification Criteria
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Pre-populated traditional deliverables checklist ensuring zero day-of oversights.
            </p>
          </div>

          <div className="space-y-6">
            {currentEvent.vendorChecklist && currentEvent.vendorChecklist.length > 0 ? (
              currentEvent.vendorChecklist.map((category, catIdx) => (
                <div key={category.category} className="border-b border-stone-100 pb-5 last:border-b-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                    {category.category}
                  </h3>
                  <div className="space-y-2.5">
                    {category.items.map((item, itemIdx) => (
                      <label
                        key={itemIdx}
                        className="flex items-start gap-3 cursor-pointer group text-xs text-stone-800"
                      >
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => void toggleVendorChecklistItem(catIdx, itemIdx)}
                          className="mt-0.5 w-4 h-4 rounded text-festive-marigold focus:ring-festive-marigold cursor-pointer"
                        />
                        <span className={item.done ? 'line-through text-stone-400' : 'group-hover:text-stone-900'}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-stone-500">No checklist items defined in event blueprint.</p>
            )}
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-stone-200 z-10">
            <h2 className="font-serif text-xl font-bold text-stone-900 mb-4">Add Vendor</h2>
            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Vendor / Firm Name *</label>
                <input
                  type="text"
                  required
                  value={newVendorData.name}
                  onChange={(e) => setNewVendorData({ ...newVendorData, name: e.target.value })}
                  placeholder="e.g. Royal Decorators"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Category</label>
                  <select
                    value={newVendorData.category}
                    onChange={(e) => setNewVendorData({ ...newVendorData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
                  >
                    <option value="Venue">Venue</option>
                    <option value="Catering">Catering</option>
                    <option value="Decor">Decor</option>
                    <option value="Photography">Photography</option>
                    <option value="Music">Music / DJ</option>
                    <option value="Attire">Attire</option>
                    <option value="Rituals">Rituals / Pandit</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Quoted Price (₹)</label>
                  <input
                    type="number"
                    value={newVendorData.quotedAmount}
                    onChange={(e) => setNewVendorData({ ...newVendorData, quotedAmount: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={newVendorData.contactName}
                    onChange={(e) => setNewVendorData({ ...newVendorData, contactName: e.target.value })}
                    placeholder="Manager name"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newVendorData.phone}
                    onChange={(e) => setNewVendorData({ ...newVendorData, phone: e.target.value })}
                    placeholder="+91..."
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newVendorData.email}
                  onChange={(e) => setNewVendorData({ ...newVendorData, email: e.target.value })}
                  placeholder="contact@domain.com"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Notes / Deliverables</label>
                <textarea
                  rows={2}
                  value={newVendorData.notes}
                  onChange={(e) => setNewVendorData({ ...newVendorData, notes: e.target.value })}
                  placeholder="Specific items included in quote..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-festive-marigold hover:bg-orange-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorsPage;
