import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { candidateId } = await req.json();

    const { data: candidate, error: fetchError } = await supabase
      .from("bulk_post_queue")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (fetchError || !candidate) {
      throw new Error("Candidate not found");
    }

    if (candidate.analysis_score !== null) {
      console.log(`Candidate ${candidateId} already analyzed`);
      return new Response(
        JSON.stringify({ success: true, skipped: true }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const analysisPrompt = `You are an AI content analyst. Rate this content on a scale of 0-1 for engagement potential and relevance for sharing on Twitter.

Content: "${candidate.text}"
Source: ${candidate.source}

Respond with ONLY a JSON object:
{
  "score": 0.XX,
  "reason": "brief reason"
}`;

    let score = 0.5;
    let reason = "Default score";

    if (openrouterKey) {
      const analysisResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openrouterKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          messages: [{ role: "user", content: analysisPrompt }],
          temperature: 0.5,
          max_tokens: 200,
        }),
      });

      const analysisData = await analysisResponse.json();
      const content = analysisData.choices?.[0]?.message?.content;

      if (content) {
        try {
          const parsed = JSON.parse(content);
          score = Math.min(Math.max(parsed.score, 0), 1);
          reason = parsed.reason || reason;
        } catch (e) {
          console.error("Failed to parse analysis response:", content);
        }
      }
    }

    const { error: updateError } = await supabase
      .from("bulk_post_queue")
      .update({
        analysis_score: score,
        analysis_reason: reason,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", candidateId);

    if (updateError) throw updateError;

    await supabase.from("activity_stream").insert({
      category: "analysis",
      severity: score >= 0.6 ? "success" : "info",
      title: "Content Analyzed",
      description: `Analyzed candidate: score ${(score * 100).toFixed(0)}%`,
      metadata: { candidateId, score, reason },
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        score,
        reason,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
