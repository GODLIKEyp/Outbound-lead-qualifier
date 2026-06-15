import { queue, task, tasks } from "@trigger.dev/sdk/v3";
import { z } from "zod";

const leadPayloadSchema = z.object({
  leadId: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email(),
  companySize: z.number().int().positive(),
  monthlyUsageKwh: z.number().positive(),
  source: z.string().min(1),
});

export type LeadPayload = z.infer<typeof leadPayloadSchema>;

const leadQueue = queue({
  name: "outbound-lead-qualification",
  concurrencyLimit: 5,
});

export const qualifyLeadTask = task({
  id: "qualify-outbound-lead",
  queue: leadQueue,
  run: async (payload: LeadPayload) => {
    const lead = leadPayloadSchema.parse(payload);

    const score =
      (lead.companySize >= 50 ? 40 : 20) +
      (lead.monthlyUsageKwh >= 1200 ? 40 : 20) +
      (lead.source === "referral" ? 20 : 10);

    return {
      leadId: lead.leadId,
      score,
      qualified: score >= 70,
      timestamp: new Date().toISOString(),
    };
  },
});

export const leadPipelineTask = task({
  id: "outbound-lead-pipeline",
  run: async (payload: LeadPayload) => {
    const lead = leadPayloadSchema.parse(payload);

    const qualification = await tasks.triggerAndWait<typeof qualifyLeadTask>(
      "qualify-outbound-lead",
      lead
    );

    if (!qualification.ok) {
      return {
        accepted: false,
        leadId: lead.leadId,
        error: qualification.error,
      };
    }

    return {
      accepted: true,
      leadId: lead.leadId,
      qualification: qualification.output,
    };
  },
});

export async function leadPipeline(payload: LeadPayload) {
  const lead = leadPayloadSchema.parse(payload);
  return tasks.trigger<typeof leadPipelineTask>("outbound-lead-pipeline", lead);
}
