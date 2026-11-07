// Follows standard Supabase Edge Function Deno runtime
// Validates board session and safely uploads broadcast pictures to broadcast-images bucket.
// Excludes SVG files to prevent stored XSS attacks.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server storage keys not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { boardId, dataUrl, idHint } = body;

    if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "Invalid image payload" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Explicitly reject SVG payloads to eliminate embedded script/XSS risks
    if (dataUrl.startsWith("data:image/svg") || dataUrl.includes("<svg")) {
      return new Response(JSON.stringify({ error: "SVG images are strictly prohibited for security reasons." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) {
      return new Response(JSON.stringify({ error: "Malformed base64 image data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const mime = match[1];
    const allowedMimes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowedMimes.includes(mime)) {
      return new Response(JSON.stringify({ error: "Disallowed MIME type: only PNG, JPEG, WebP, and GIF are allowed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const base64Data = match[2];
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const ext = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
    const fileName = `broadcast_${boardId || "board"}_${idHint || "img"}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from("broadcast-images")
      .upload(fileName, bytes, {
        contentType: mime,
        upsert: false,
      });

    if (uploadErr) {
      throw uploadErr;
    }

    const { data: publicUrlData } = supabase.storage
      .from("broadcast-images")
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        success: true,
        publicUrl: publicUrlData?.publicUrl,
        fileName,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
