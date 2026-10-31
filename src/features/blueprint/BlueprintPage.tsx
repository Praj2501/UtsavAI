import React, { useState } from 'react';
import { z } from 'zod';
import { useEventStore } from '../../stores/eventStore';
import { getAiProvider } from '../../ai/providers';
import { BlueprintOutputSchema } from '../../ai/schemas/blueprint.schema';
import { blueprintPromptV1 } from '../../ai/prompts/blueprint.v1';
import { reverseSchedule } from '../../domain/reverseSchedule';
import { getEventRepository } from '../../repositories';
import { Event, BudgetItem, Task, Vendor } from '../../types/event.types';

export const BlueprintFormSchema = z.object({
  title: z.string().min(3, 'Event title must be at least 3 characters').max(100),
  eventType: z.enum(['wedding', 'birthday', 'community']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date (YYYY-MM-DD)'),
  city: z.string().min(2, 'City is required').max(60),
  guestCount: z.number().int().min(1, 'At least 1 guest required').max(20000),
  totalBudget: z.number().int().min(5000, 'Minimum budget is ₹5,000').max(100000000),
  tradition: z.string().max(80).optional(),
  vibe: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type BlueprintFormData = z.infer<typeof BlueprintFormSchema>;

export const BlueprintPage: React.FC = () => {
  const { setEventData, setActiveView } = useEventStore();
  const [formData, setFormData] = useState<BlueprintFormData>({
    title: '',
    eventType: 'wedding',
    date: '',
    city: '',
    guestCount: '' as unknown as number,
    totalBudget: '' as unknown as number,
    tradition: '',
    vibe: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGenerationError(null);

    const result = BlueprintFormSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsGenerating(true);

    try {
      const aiProvider = getAiProvider();
      const prompt = blueprintPromptV1.build({
        eventType: formData.eventType,
        date: formData.date,
        city: formData.city,
        guestCount: formData.guestCount,
        totalBudget: formData.totalBudget,
        tradition: formData.tradition || '',
        vibe: formData.vibe || '',
        userNotes: formData.notes,
      });

      const aiRes = await aiProvider.generateStructured(prompt, BlueprintOutputSchema);
      if (!aiRes.ok) {
        setGenerationError(aiRes.error.message);
        setIsGenerating(false);
        return;
      }

      const plan = aiRes.value;
      const eventId = `event-${Date.now()}`;
      const now = new Date();

      const newEvent: Event = {
        id: eventId,
        members: { 'demo-user': 'owner' },
        title: formData.title,
        eventType: formData.eventType,
        date: formData.date,
        city: formData.city,
        guestCount: formData.guestCount,
        totalBudget: formData.totalBudget,
        tradition: formData.tradition || '',
        vibe: formData.vibe || '',
        themes: plan.themes,
        planB: plan.planB,
        vendorChecklist: plan.vendorChecklist.map((c) => ({
          category: c.category,
          items: c.items.map((i) => ({ label: i.label, done: Boolean(i.done) })),
        })),
      };

      const budgetItems: BudgetItem[] = plan.budgetCategories.map((b, idx) => ({
        id: `b-${idx + 1}`,
        category: b.category,
        name: b.name,
        allocatedAmount: b.allocatedAmount,
        actualAmount: 0,
        paidAmount: 0,
        status: 'pending',
        isLocked: false,
        rationale: b.rationale,
      }));

      const tasks: Task[] = reverseSchedule(
        formData.date,
        plan.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          leadDays: t.leadDays,
          priority: t.priority,
        })),
        now
      );

      const vendors: Vendor[] = [];

      const repo = getEventRepository();
      await repo.createEventWithPlan(newEvent, budgetItems, tasks, vendors);

      setEventData({
        event: newEvent,
        budgetItems,
        tasks,
        vendors,
      });
    } catch (err: unknown) {
      setGenerationError(err instanceof Error ? err.message : 'Blueprint generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            type="button"
            onClick={() => setActiveView('landing')}
            className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 mb-2 font-medium"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Home
          </button>
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            Create Event Blueprint
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            Fill in your celebration parameters to generate an authentic budget, reverse schedule, themes, and fallbacks.
          </p>
        </div>
      </div>

      {generationError && (
        <div role="alert" className="p-4 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {generationError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="bg-white p-6 sm:p-8 rounded-2xl border border-utsav-200 shadow-sm space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-stone-800 mb-1">
            Event Title *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-festive-marigold"
            placeholder="e.g. Sister's Wedding"
          />
          {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="eventType" className="block text-sm font-semibold text-stone-800 mb-1">
              Event Type *
            </label>
            <select
              id="eventType"
              name="eventType"
              value={formData.eventType}
              onChange={(e) => setFormData({ ...formData, eventType: e.target.value as BlueprintFormData['eventType'] })}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-festive-marigold bg-white"
            >
              <option value="wedding">Wedding (विवाह)</option>
              <option value="birthday">Milestone Birthday (वाढदिवस)</option>
              <option value="community">Community Event (उत्सव / संमेलन)</option>
            </select>
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-semibold text-stone-800 mb-1">
              Event Date *
            </label>
            <input
              id="date"
              name="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-festive-marigold"
            />
            {errors.date && <p className="text-red-600 text-xs mt-1">{errors.date}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-semibold text-stone-800 mb-1">
              City *
            </label>
            <input
              id="city"
              name="city"
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-festive-marigold"
              placeholder="e.g. Pune"
            />
            {errors.city && <p className="text-red-600 text-xs mt-1">{errors.city}</p>}
          </div>

          <div>
            <label htmlFor="guestCount" className="block text-sm font-semibold text-stone-800 mb-1">
              Guests *
            </label>
            <input
              id="guestCount"
              name="guestCount"
              type="number"
              min="1"
              value={formData.guestCount || ''}
              onChange={(e) => setFormData({ ...formData, guestCount: e.target.value === '' ? ('' as unknown as number) : parseInt(e.target.value, 10) || 0 })}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-festive-marigold"
              placeholder="e.g. 150"
            />
            {errors.guestCount && <p className="text-red-600 text-xs mt-1">{errors.guestCount}</p>}
          </div>

          <div>
            <label htmlFor="totalBudget" className="block text-sm font-semibold text-stone-800 mb-1">
              Budget (₹) *
            </label>
            <input
              id="totalBudget"
              name="totalBudget"
              type="number"
              min="5000"
              step="1000"
              value={formData.totalBudget || ''}
              onChange={(e) => setFormData({ ...formData, totalBudget: e.target.value === '' ? ('' as unknown as number) : parseInt(e.target.value, 10) || 0 })}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-festive-marigold"
              placeholder="e.g. 500000"
            />
            {errors.totalBudget && <p className="text-red-600 text-xs mt-1">{errors.totalBudget}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tradition" className="block text-sm font-semibold text-stone-800 mb-1">
              Cultural Tradition
            </label>
            <input
              id="tradition"
              name="tradition"
              type="text"
              value={formData.tradition}
              onChange={(e) => setFormData({ ...formData, tradition: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-festive-marigold"
              placeholder="e.g. Maharashtrian, South Indian, Punjabi"
            />
          </div>

          <div>
            <label htmlFor="vibe" className="block text-sm font-semibold text-stone-800 mb-1">
              Desired Vibe
            </label>
            <input
              id="vibe"
              name="vibe"
              type="text"
              value={formData.vibe}
              onChange={(e) => setFormData({ ...formData, vibe: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-festive-marigold"
              placeholder="e.g. Traditional Elegance, Royal, Minimalist"
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-semibold text-stone-800 mb-1">
            Optional Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-festive-marigold"
            placeholder="Special dietary preferences, venue preferences, or specific rituals"
          />
        </div>

        <button
          type="submit"
          disabled={isGenerating}
          className="w-full py-3.5 bg-festive-marigold hover:bg-orange-700 text-white font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating GenAI Blueprint...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">auto_awesome</span>
              <span>Generate Celebration Blueprint</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default BlueprintPage;
