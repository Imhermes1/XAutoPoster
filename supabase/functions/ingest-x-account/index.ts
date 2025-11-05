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

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { accountId, handle, tweets, media } = await req.json();

    console.log(`Processing ${tweets.length} tweets from @${handle}`);

    const mediaUrlByKey: Record<string, string | undefined> = {};
    for (const m of media) {
      if (m.media_key) {
        mediaUrlByKey[m.media_key] = m.url || m.preview_image_url;
      }
    }

    let inserted = 0;
    let duplicates = 0;

    for (const tweet of tweets) {
      const imageUrl = (tweet.attachments?.media_keys || [])
        .map((key: string) => mediaUrlByKey[key])
        .find(Boolean);

      const { data: existing } = await supabase
        .from("bulk_post_queue")
        .select("id")
        .eq("external_id", tweet.id)
        .single();

      if (existing) {
        duplicates++;
        continue;
      }

      const { error: insertError } = await supabase.from("bulk_post_queue").insert({
        type: "tweet",
        source: handle,
        external_id: tweet.id,
        url: `https://x.com/${handle.replace(/^@/, "")}/status/${tweet.id}`,
        text: tweet.text,
        image_url: imageUrl,
        likes_count: tweet.public_metrics?.like_count || 0,
        retweets_count: tweet.public_metrics?.retweet_count || 0,
        replies_count: tweet.public_metrics?.reply_count || 0,
        status: "pending",
        created_at: new Date().toISOString(),
      });

      if (!insertError) {
        inserted++;
      }
    }

    await supabase
      .from("sources_accounts")
      .update({ last_fetched_at: new Date().toISOString() })
      .eq("id", accountId);

    await supabase.from("activity_stream").insert({
      category: "ingestion",
      severity: inserted > 0 ? "success" : "info",
      title: "X Account Ingestion",
      description: `Fetched from @${handle}: ${inserted} new, ${duplicates} duplicates`,
      metadata: { accountId, inserted, duplicates, total: tweets.length },
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        duplicates,
        total: tweets.length,
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
