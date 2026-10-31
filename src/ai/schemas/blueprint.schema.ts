import { z } from 'zod';

export const BudgetCategoryProposalSchema = z.object({
  category: z.string().min(2).max(50),
  name: z.string().min(2).max(80),
  allocatedAmount: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
  rationale: z.string().min(5).max(300),
});

export const TaskProposalSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2).max(120),
  category: z.string().min(2).max(50),
  leadDays: z.number().int().nonnegative(),
  priority: z.enum(['high', 'medium', 'low']),
});

export const VendorChecklistItemSchema = z.object({
  label: z.string().min(2).max(100),
  done: z.boolean().default(false),
});

export const VendorChecklistCategorySchema = z.object({
  category: z.string().min(2).max(50),
  items: z.array(VendorChecklistItemSchema),
});

export const ThemeIdeaSchema = z.object({
  name: z.string().min(2).max(80),
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).min(3).max(6),
  decorDescription: z.string().min(10).max(500),
  musicSuggestion: z.string().min(5).max(200),
});

export const PlanBItemSchema = z.object({
  risk: z.string().min(5).max(150),
  trigger: z.string().min(5).max(200),
  contingency: z.string().min(10).max(400),
});

export const BlueprintOutputSchema = z.object({
  title: z.string().min(3).max(120),
  budgetCategories: z.array(BudgetCategoryProposalSchema).min(3),
  tasks: z.array(TaskProposalSchema).min(5),
  vendorChecklist: z.array(VendorChecklistCategorySchema).min(2),
  themes: z.array(ThemeIdeaSchema).length(5),
  planB: z.array(PlanBItemSchema).min(3),
});

export type BlueprintOutput = z.infer<typeof BlueprintOutputSchema>;
