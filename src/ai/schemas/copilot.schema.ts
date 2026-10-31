import { z } from 'zod';

export const UpdateBudgetItemArgsSchema = z.object({
  itemId: z.string().min(1),
  allocatedAmount: z.number().int().nonnegative().optional(),
  status: z.enum(['pending', 'partial', 'paid']).optional(),
  rationale: z.string().max(300).optional(),
});

export const AddTaskArgsSchema = z.object({
  title: z.string().min(2).max(120),
  category: z.string().min(2).max(60),
  leadDays: z.number().int().nonnegative(),
  priority: z.enum(['high', 'medium', 'low']),
});

export const MoveTaskArgsSchema = z.object({
  taskId: z.string().min(1),
  newLeadDays: z.number().int().nonnegative(),
});

export const UpdateTaskStatusArgsSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(['todo', 'in_progress', 'done']),
});

export const AddVendorArgsSchema = z.object({
  category: z.string().min(2).max(60),
  name: z.string().min(2).max(100),
  contactName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  quotedAmount: z.number().int().nonnegative(),
  notes: z.string().max(500).optional(),
});

export const CopilotToolCallSchema = z.discriminatedUnion('name', [
  z.object({ name: z.literal('update_budget_item'), args: UpdateBudgetItemArgsSchema }),
  z.object({ name: z.literal('add_task'), args: AddTaskArgsSchema }),
  z.object({ name: z.literal('move_task'), args: MoveTaskArgsSchema }),
  z.object({ name: z.literal('update_task_status'), args: UpdateTaskStatusArgsSchema }),
  z.object({ name: z.literal('add_vendor'), args: AddVendorArgsSchema }),
]);

export const CopilotTurnOutputSchema = z.object({
  replyText: z.string().min(1),
  toolCalls: z.array(CopilotToolCallSchema),
});

export type CopilotToolCall = z.infer<typeof CopilotToolCallSchema>;
export type CopilotTurnOutput = z.infer<typeof CopilotTurnOutputSchema>;
export type UpdateBudgetItemArgs = z.infer<typeof UpdateBudgetItemArgsSchema>;
export type AddTaskArgs = z.infer<typeof AddTaskArgsSchema>;
export type MoveTaskArgs = z.infer<typeof MoveTaskArgsSchema>;
export type UpdateTaskStatusArgs = z.infer<typeof UpdateTaskStatusArgsSchema>;
export type AddVendorArgs = z.infer<typeof AddVendorArgsSchema>;
