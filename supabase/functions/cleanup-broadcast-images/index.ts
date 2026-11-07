// Follows standard Supabase Edge Function Deno runtime
// Prunes broadcast pictures older than maxAgeHours using the Supabase Storage API (.remove()).
// Deleting via the Storage API with the service role key guarantees that the physical files
// are removed from underlying object storage (S3), avoiding orphaned storage quota usage.

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
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const BUCKET = "broadcast-images";
    const maxAgeHours = 24;
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;

    // 1. List files in broadcast-images bucket
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET)
      .list("", {
        limit: 100,
        sortBy: { column: "created_at", order: "asc" },
      });

    if (listError) {
      throw listError;
    }

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ deleted: 0, message: "No broadcast images found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const filesToDelete = files
      .filter((f) => f.created_at && new Date(f.created_at).getTime() < cutoff)
      .map((f) => f.name);

    if (filesToDelete.length === 0) {
      return new Response(JSON.stringify({ deleted: 0, message: "No expired broadcast images to remove" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Delete files using the Storage API .remove()
    // This removes the physical files from the storage backend (S3) and cleans up storage.objects
    const { data: removedData, error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove(filesToDelete);

    if (removeError) {
      throw removeError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted: filesToDelete.length,
        removedFiles: filesToDelete,
        details: removedData,
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
