import React, { useState } from 'react';
import { useEventStore } from '../../stores/eventStore';
import { getAiProvider } from '../../ai/providers';
import { contentPromptV1, ContentPromptInput } from '../../ai/prompts/content.v1';
import { ContentOutput, ContentOutputSchema } from '../../ai/schemas/content.schema';
import { buildWhatsAppUrl, buildMailtoUrl } from '../../domain/exporters';
import { EmptyState } from '../../components/common/States';

export const ContentPage: React.FC = () => {
  const { currentEvent, setActiveView } = useEventStore();

  const [contentType, setContentType] = useState<'invitation' | 'toast' | 'thank_you'>('invitation');
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('mr');
  const [tone, setTone] = useState<'traditional' | 'poetic' | 'witty' | 'concise' | 'heartfelt'>('traditional');
  const [venue, setVenue] = useState<string>('Grand Heritage Lawn');
  const [honorees, setHonorees] = useState<string>('Pooja & Rahul');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<ContentOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  if (!currentEvent) {
    return (
      <EmptyState
        title="No Celebration Selected"
        description="Select or create a celebration to draft multilingual invites and toasts."
        actionLabel="Create Blueprint"
        onAction={() => setActiveView('blueprint')}
        icon="edit_note"
      />
    );
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setCopySuccess(false);

    try {
      const provider = getAiProvider();
      const input: ContentPromptInput = {
        contentType,
        eventType: currentEvent.eventType,
        honorees,
        date: currentEvent.date,
        venue,
        city: currentEvent.city,
        language,
        tone,
      };

      const promptText = contentPromptV1.build(input);
      const res = await provider.generateStructured<ContentOutput>(promptText, ContentOutputSchema);

      if (res.ok) {
        setGeneratedContent(res.value);
      } else {
        setError(res.error.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate copy';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = async () => {
    if (!generatedContent) return;
    const fullText = `${generatedContent.title}\n\n${generatedContent.body}\n\n${generatedContent.suggestedHashtags.join(' ')}`;
    await navigator.clipboard.writeText(fullText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const whatsAppShareUrl = generatedContent
    ? buildWhatsAppUrl(
        '',
        `*${generatedContent.title}*\n\n${generatedContent.body}\n\n${generatedContent.suggestedHashtags.join(' ')}`
      )
    : null;

  const mailtoShareUrl = generatedContent
    ? buildMailtoUrl('', generatedContent.title, `${generatedContent.body}\n\n${generatedContent.suggestedHashtags.join(' ')}`)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-stone-900">
          Celebration Copy & Content Generator
        </h1>
        <p className="text-sm text-stone-600 mt-1">
          Draft culturally authentic WhatsApp invitations, traditional Sangeet toasts, and heartfelt thank-you notes in English, Hindi, or Marathi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Settings Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-utsav-200 p-6 shadow-xs h-fit">
          <h2 className="font-serif text-lg font-bold text-stone-900 mb-4">
            Copywriting Parameters
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Message Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['invitation', 'toast', 'thank_you'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setContentType(t)}
                    className={`py-2 px-2.5 rounded-lg font-semibold capitalize transition-all border ${
                      contentType === t
                        ? 'bg-festive-marigold text-white border-festive-marigold'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Language</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'en', label: 'English' },
                  { id: 'hi', label: 'हिंदी (Hindi)' },
                  { id: 'mr', label: 'मराठी (Marathi)' },
                ].map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLanguage(l.id as 'en' | 'hi' | 'mr')}
                    className={`py-2 px-2.5 rounded-lg font-semibold transition-all border ${
                      language === l.id
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Tone & Aesthetic</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as typeof tone)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
              >
                <option value="traditional">Traditional & Respectful (पारंपरिक / संस्कारमय)</option>
                <option value="poetic">Poetic & Lyrical (काव्यात्मक / भावुक)</option>
                <option value="heartfelt">Heartfelt & Warm (हार्दिक / जिव्हाळ्याचे)</option>
                <option value="witty">Witty & Modern (उत्साही / खेळकर)</option>
                <option value="concise">Concise & Direct (थोडक्यात व स्पष्ट)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Honoree(s) / Couple</label>
              <input
                type="text"
                required
                value={honorees}
                onChange={(e) => setHonorees(e.target.value)}
                placeholder="e.g. Pooja & Rahul"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Venue / Specific Hall</label>
              <input
                type="text"
                required
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Grand Heritage Lawns"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-festive-marigold"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-gradient-to-r from-festive-marigold to-festive-gold hover:opacity-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {isLoading ? 'Composing Celebration Copy...' : 'Generate Copy with AI'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Preview Card */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-utsav-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h2 className="font-serif text-lg font-bold text-stone-900">
                Generated Draft
              </h2>
              {generatedContent && (
                <span className="text-[11px] font-semibold uppercase tracking-wider text-festive-marigold px-2 py-0.5 rounded-full bg-festive-cream border border-festive-marigold/20">
                  {generatedContent.language} &bull; {generatedContent.tone}
                </span>
              )}
            </div>

            {generatedContent ? (
              <div className="space-y-4">
                <h3 className="font-serif text-xl font-bold text-stone-900 leading-snug">
                  {generatedContent.title}
                </h3>

                <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-200/60 font-serif text-sm leading-relaxed text-stone-800 whitespace-pre-line">
                  {generatedContent.body}
                </div>

                {generatedContent.suggestedHashtags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {generatedContent.suggestedHashtags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-stone-400 text-xs">
                <span className="text-3xl block mb-2">📜</span>
                Configure your celebration parameters on the left and click &quot;Generate Copy with AI&quot;.
              </div>
            )}
          </div>

          {/* Export / Share Toolbar */}
          {generatedContent && (
            <div className="mt-8 pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <button
                onClick={handleCopyText}
                className="px-4 py-2 border border-stone-300 hover:bg-stone-50 rounded-xl text-stone-700 font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>{copySuccess ? '✓ Copied!' : '📋 Copy to Clipboard'}</span>
              </button>

              <div className="flex items-center gap-2">
                {whatsAppShareUrl && (
                  <a
                    href={whatsAppShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors shadow-xs"
                  >
                    Open in WhatsApp
                  </a>
                )}
                {mailtoShareUrl && (
                  <a
                    href={mailtoShareUrl}
                    className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl transition-colors shadow-xs"
                  >
                    Email Draft
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentPage;
