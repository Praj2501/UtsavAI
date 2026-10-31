import React, { useState, useRef, useEffect } from 'react';
import { useEventStore } from '../../stores/eventStore';
import { getAiProvider } from '../../ai/providers';
import { buildTrimmedPlanSnapshot } from '../../ai/trimmedSnapshot';
import { CopilotToolCall } from '../../ai/schemas/copilot.schema';
import { AnyEntityDiff, DiffProposal } from '../../types/diff.types';
import { Task, Vendor } from '../../types/event.types';
import { DiffCard } from './DiffCard';
import { addDays, formatDate, isBeforeDate } from '../../domain/dates';

interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  proposals?: DiffProposal[];
}

export const CopilotDrawer: React.FC = () => {
  const { currentEvent, budgetItems, tasks, vendors, applyDiffToStore, revertDiffInStore } = useEventStore();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Namaste! I am your Utsav AI Copilot. Ask me to tweak budgets, add milestone tasks, or register vendors. Nothing is applied until you click Accept.',
      timestamp: Date.now(),
    },
  ]);
  const [inputVal, setInputVal] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [ariaLiveStatus, setAriaLiveStatus] = useState<string>('');
  const [isProcessingDiff, setIsProcessingDiff] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!currentEvent) {
    return null;
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isAiLoading) return;

    const userText = inputVal.trim();
    setInputVal('');

    const userMsg: CopilotMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAiLoading(true);
    setAriaLiveStatus('Utsav Copilot is thinking...');

    try {
      const provider = getAiProvider();
      const snapshot = buildTrimmedPlanSnapshot(currentEvent, budgetItems, tasks, vendors);

      const res = await provider.runCopilotTurn(userText, snapshot);

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'assistant',
            text: `Error: ${res.error.message}`,
            timestamp: Date.now(),
          },
        ]);
        setAriaLiveStatus(`Copilot encountered an error: ${res.error.message}`);
        return;
      }

      const { replyText, toolCalls } = res.value;

      // Transform function calls into inert diff proposals
      const proposals: DiffProposal[] = toolCalls.map((tc: CopilotToolCall, idx: number) => {
        const proposalId = `prop-${Date.now()}-${idx}`;
        const diff = toolCallToEntityDiff(tc);
        return {
          id: proposalId,
          timestamp: Date.now(),
          diff,
          status: 'pending',
        };
      });

      const assistantMsg: CopilotMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: Date.now(),
        proposals: proposals.length > 0 ? proposals : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setAriaLiveStatus(
        proposals.length > 0
          ? `Copilot proposed ${proposals.length} plan adjustments. Review and accept below.`
          : 'Copilot responded.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown AI error';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `Unexpected error: ${msg}`,
          timestamp: Date.now(),
        },
      ]);
      setAriaLiveStatus(`Error: ${msg}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const toolCallToEntityDiff = (toolCall: CopilotToolCall): AnyEntityDiff => {
    switch (toolCall.name) {
      case 'update_budget_item': {
        const existing = budgetItems.find((b) => b.id === toolCall.args.itemId);
        return {
          entity: 'budget',
          op: 'update',
          id: toolCall.args.itemId,
          before: existing,
          after: existing
            ? {
                ...existing,
                allocatedAmount: toolCall.args.allocatedAmount ?? existing.allocatedAmount,
                status: toolCall.args.status ?? existing.status,
                rationale: toolCall.args.rationale ?? existing.rationale,
              }
            : undefined,
          summary: `Update budget for ${existing?.name ?? toolCall.args.itemId} to ₹${(toolCall.args.allocatedAmount ?? existing?.allocatedAmount ?? 0).toLocaleString('en-IN')}`,
        };
      }
      case 'add_task': {
        const newTaskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const todayStr = formatDate(new Date());
        const rawTargetDate = addDays(currentEvent.date, -Math.max(0, toolCall.args.leadDays));
        const isOverdue = isBeforeDate(rawTargetDate, todayStr);
        const targetDate = isOverdue ? todayStr : rawTargetDate;

        const newTask: Task = {
          id: newTaskId,
          title: toolCall.args.title,
          category: toolCall.args.category,
          leadDays: toolCall.args.leadDays,
          priority: toolCall.args.priority,
          targetDate,
          status: 'todo',
          panicStatus: 'normal',
          isOverdueAtCreation: isOverdue,
        };

        return {
          entity: 'task',
          op: 'create',
          id: newTaskId,
          after: newTask,
          summary: `Add task: ${newTask.title} (T-${newTask.leadDays}d)`,
        };
      }
      case 'move_task': {
        const existing = tasks.find((t: Task) => t.id === toolCall.args.taskId);
        const todayStr = formatDate(new Date());
        const rawTargetDate = addDays(currentEvent.date, -Math.max(0, toolCall.args.newLeadDays));
        const isOverdue = isBeforeDate(rawTargetDate, todayStr);

        return {
          entity: 'task',
          op: 'update',
          id: toolCall.args.taskId,
          before: existing,
          after: existing
            ? {
                ...existing,
                leadDays: toolCall.args.newLeadDays,
                targetDate: isOverdue ? todayStr : rawTargetDate,
              }
            : undefined,
          summary: `Reschedule task ${existing?.title ?? toolCall.args.taskId} to T-${toolCall.args.newLeadDays} days`,
        };
      }
      case 'update_task_status': {
        const existing = tasks.find((t: Task) => t.id === toolCall.args.taskId);
        return {
          entity: 'task',
          op: 'update',
          id: toolCall.args.taskId,
          before: existing,
          after: existing ? { ...existing, status: toolCall.args.status } : undefined,
          summary: `Update status of ${existing?.title ?? toolCall.args.taskId} to ${toolCall.args.status}`,
        };
      }
      case 'add_vendor': {
        const newVendorId = `vendor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newVendor: Vendor = {
          id: newVendorId,
          category: toolCall.args.category,
          name: toolCall.args.name,
          contactName: toolCall.args.contactName ?? '',
          phone: toolCall.args.phone ?? '',
          email: toolCall.args.email ?? '',
          quotedAmount: toolCall.args.quotedAmount,
          status: 'researching',
          notes: toolCall.args.notes ?? '',
        };

        return {
          entity: 'vendor',
          op: 'create',
          id: newVendorId,
          after: newVendor,
          summary: `Add vendor: ${newVendor.name} (${newVendor.category}) - ₹${newVendor.quotedAmount.toLocaleString('en-IN')}`,
        };
      }
    }
  };

  const handleAcceptProposal = async (proposal: DiffProposal) => {
    setIsProcessingDiff(true);
    setAriaLiveStatus(`Applying change: ${proposal.diff.summary}`);

    const res = await applyDiffToStore(proposal.diff);
    if (res.ok) {
      updateProposalStatus(proposal.id, 'accepted');
      setAriaLiveStatus(`Successfully applied: ${proposal.diff.summary}`);
    } else {
      setAriaLiveStatus(`Failed to apply: ${res.error.message}`);
    }
    setIsProcessingDiff(false);
  };

  const handleUndoProposal = async (proposal: DiffProposal) => {
    setIsProcessingDiff(true);
    setAriaLiveStatus(`Undoing change: ${proposal.diff.summary}`);

    const res = await revertDiffInStore(proposal.diff);
    if (res.ok) {
      updateProposalStatus(proposal.id, 'undone');
      setAriaLiveStatus(`Successfully reverted: ${proposal.diff.summary}`);
    } else {
      setAriaLiveStatus(`Failed to revert: ${res.error.message}`);
    }
    setIsProcessingDiff(false);
  };

  const updateProposalStatus = (proposalId: string, status: DiffProposal['status']) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (!msg.proposals) return msg;
        return {
          ...msg,
          proposals: msg.proposals.map((p) => (p.id === proposalId ? { ...p, status } : p)),
        };
      })
    );
  };

  return (
    <>
      {/* Invisible aria-live status container for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {ariaLiveStatus}
      </div>

      {/* Floating launcher trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open Utsav AI Copilot drawer"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-full shadow-lg hover:shadow-xl transition-all focus:ring-4 focus:ring-festive-marigold"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-festive-gold animate-pulse" />
          <span>Ask Copilot</span>
        </button>
      )}

      {/* Slide-over Drawer Backdrop & Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <aside
            role="dialog"
            aria-label="Utsav AI Copilot"
            className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-l border-utsav-200"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-utsav-200 flex items-center justify-between bg-utsav-50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-festive-marigold flex items-center justify-center text-white font-bold text-xs">
                  AI
                </div>
                <div>
                  <h2 className="text-sm font-bold text-stone-900">Utsav Copilot</h2>
                  <p className="text-[11px] text-stone-500 font-medium">Inert Proposer &bull; Accept/Undo Protected</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close Copilot drawer"
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Conversation Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                      msg.sender === 'user'
                        ? 'bg-festive-marigold text-white rounded-br-xs'
                        : 'bg-utsav-100 text-stone-900 rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Render Diff Proposal Cards */}
                  {msg.proposals && msg.proposals.length > 0 && (
                    <div className="w-full mt-3 space-y-2.5">
                      {msg.proposals.map((proposal) => (
                        <DiffCard
                          key={proposal.id}
                          proposal={proposal}
                          onAccept={handleAcceptProposal}
                          onUndo={handleUndoProposal}
                          isProcessing={isProcessingDiff}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isAiLoading && (
                <div className="flex items-center gap-2 text-stone-500 text-xs py-2 px-3 bg-stone-50 rounded-xl w-fit">
                  <div className="w-2 h-2 rounded-full bg-festive-marigold animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-festive-marigold animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-festive-marigold animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1 text-[11px]">Thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-utsav-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="e.g. increase decor budget, add pandit task..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  disabled={isAiLoading}
                  aria-label="Message Utsav Copilot"
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-festive-marigold bg-stone-50 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim() || isAiLoading}
                  aria-label="Send message to Copilot"
                  className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white font-semibold text-xs shadow-sm transition-all"
                >
                  Send
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </>
  );
};

export default CopilotDrawer;
