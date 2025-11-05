import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BRAND_VOICE_PROMPT = `You are a tech influencer and thought leader who shares insights on AI, machine learning, and emerging technologies. Your posts are:
- Insightful and data-driven
- Engaging with a professional yet approachable tone
- Often including actionable tips or observations
- Sometimes sparking discussion with thought-provoking questions
- Balanced between sharing news and original insights`;

const RESEARCH_ANALYST_VOICE_PROMPT = `You are a forward-thinking tech analyst and researcher who shares emerging AI/ML trends and deep dives. Your posts are:
- Research-backed and thorough
- Focused on patterns and implications
- Written for fellow researchers and analysts
- Often highlighting surprising connections or implications
- Detailed but concise, optimized for Twitter`;

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

    if (candidate.status !== "analyzed") {
      console.log(`Candidate ${candidateId} not ready for generation (status: ${candidate.status})`);
      return new Response(
        JSON.stringify({ success: true, skipped: true }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: config } = await supabase
      .from("automation_config")
      .select("brand_voice_preset")
      .single();

    let brandVoicePrompt = BRAND_VOICE_PROMPT;
    if (config?.brand_voice_preset === "research_analyst") {
      brandVoicePrompt = RESEARCH_ANALYST_VOICE_PROMPT;
    }

    const generationPrompt = `${brandVoicePrompt}

Based on this content, write an engaging Twitter post (max 280 characters) that shares the key insight in your voice:

Content: "${candidate.text}"
Source: ${candidate.source}

Write ONLY the tweet text, nothing else.`;

    let tweetText = candidate.text.substring(0, 280);
    let generatedAt = new Date().toISOString();

    if (openrouterKey) {
      const genResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openrouterKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          messages: [{ role: "user", content: generationPrompt }],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      const genData = await genResponse.json();
      const generatedTweet = genData.choices?.[0]?.message?.content?.trim();

      if (generatedTweet && generatedTweet.length > 0 && generatedTweet.length <= 280) {
        tweetText = generatedTweet;
      }
    }

    const { error: updateError } = await supabase
      .from("bulk_post_queue")
      .update({
        status: "ready",
        post_text: tweetText,
        generated_at: generatedAt,
      })
      .eq("id", candidateId);

    if (updateError) throw updateError;

    await supabase.from("activity_stream").insert({
      category: "generation",
      severity: "success",
      title: "Tweet Generated",
      description: `Generated tweet: "${tweetText.substring(0, 50)}..."`,
      metadata: { candidateId, tweetText },
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        tweetText,
        generatedAt,
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
