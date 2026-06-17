import { task } from "@trigger.dev/sdk/v3";

interface TypeformPayload {
  form_response: {
    answers: any[];
    hidden: { phone_number: string; first_name: string };
  };
}

interface VapiWebhookPayload {
  message: {
    type: string;
    call: { id: string; status: string };
    analysis: { summary: string; successEvaluation: string };
    customer: { number: string };
  };
}

// ============================================================================
// TASK 1: INGEST, QUALIFY, INSERT TO SUPABASE, AND CALL
// ============================================================================

export const processSolarLead = task({
  id: "process-solar-lead",
  run: async (payload: TypeformPayload) => {
    console.log("Received new lead from Typeform");

    const { phone_number, first_name } = payload.form_response.hidden;
    const answers = payload.form_response.answers;

    const isHomeowner =
      answers.find((a) => a.field.ref === "homeowner")?.boolean || false;
    const powerBill =
      answers.find((a) => a.field.ref === "power_bill")?.number || 0;

    const isQualified = isHomeowner && powerBill >= 100;

    if (!isQualified) {
      console.log(`Lead ${first_name} disqualified.`);
      return { status: "disqualified" };
    }

    console.log(`Lead ${first_name} qualified! Inserting into Supabase...`);

    // 3. Upsert into Supabase (Inserts new, or updates if phone already exists)
    const supabaseResponse = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/leads`,
      {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates", // Behaves like an UPSERT
        },
        body: JSON.stringify({
          first_name: first_name,
          phone_number: phone_number,
          status: "NEW_QUALIFIED",
          power_bill: powerBill,
        }),
      },
    );

    if (!supabaseResponse.ok) {
      throw new Error(
        `Failed to insert into Supabase: ${await supabaseResponse.text()}`,
      );
    }

    // 4. Initiate Vapi Call
    console.log(`Initiating Vapi call to ${phone_number}...`);
    const vapiResponse = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId: process.env.VAPI_ASSISTANT_ID,
        customer: {
          number: phone_number,
          name: first_name,
        },
        assistantOverrides: {
          variableValues: {
            power_bill: powerBill.toString(),
          },
        },
      }),
    });

    if (!vapiResponse.ok) {
      throw new Error(`Vapi call failed: ${await vapiResponse.text()}`);
    }

    return { status: "success", message: "Lead inserted and call initiated." };
  },
});

// ============================================================================
// TASK 2: EVALUATE CALL, NOTIFY REPS, AND UPDATE SUPABASE
// ============================================================================

export const evaluateSolarCall = task({
  id: "evaluate-solar-call",
  run: async (payload: VapiWebhookPayload) => {
    if (payload.message.type !== "end-of-call-report") {
      return { status: "ignored" };
    }

    const analysis = payload.message.analysis;
    const customerPhone = payload.message.customer.number;

    console.log(`Evaluating call for ${customerPhone}...`);

    // 1. Determine if Hot or Cold
    const isHotLead =
      analysis.successEvaluation === "true" ||
      analysis.summary.toLowerCase().includes("interested");

    const statusEmoji = isHotLead ? "🔥 *HOT LEAD*" : "❄️ *COLD LEAD*";
    const leadStatus = isHotLead ? "HOT_LEAD" : "COLD_LEAD";

    // 2. Notify Reps via Slack
    const slackMessage = {
      text: `${statusEmoji} from AI Voice Agent\n*Phone:* ${customerPhone}\n*Status:* ${isHotLead ? "Ready to close" : "Not interested"}\n*Call Summary:*\n> ${analysis.summary}`,
    };

    await fetch(process.env.SLACK_WEBHOOK_URL as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackMessage),
    });

    // 3. Update Supabase record using a targeted PATCH request
    console.log(`Updating Supabase record for phone: ${customerPhone}`);

    const supabaseUpdate = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/leads?phone_number=eq.${encodeURIComponent(customerPhone)}`,
      {
        method: "PATCH",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: leadStatus,
          ai_call_summary: analysis.summary,
        }),
      },
    );

    if (!supabaseUpdate.ok) {
      throw new Error(
        `Failed to update Supabase record: ${await supabaseUpdate.text()}`,
      );
    }

    console.log(`Supabase successfully updated for ${customerPhone}`);

    return {
      status: "success",
      leadStatus: leadStatus,
    };
  },
});
