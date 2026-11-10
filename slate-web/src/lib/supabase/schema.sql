-- ==============================================================================
-- SLATE WHITEBOARD & EDUCATIONAL CANVAS - SUPABASE DATABASE SCHEMA
-- ==============================================================================

-- 1. BOARDS TABLE (Canvas drawings, strokes, shapes, and widgets)
CREATE TABLE IF NOT EXISTS public.boards (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Board',
    thumbnail TEXT,
    folder_id TEXT,
    is_starred BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    background TEXT DEFAULT 'white',
    pages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance and lookup
CREATE INDEX IF NOT EXISTS idx_boards_is_public ON public.boards (is_public);
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON public.boards (user_id);

-- 2. NOTES TABLE (Block-based document notes with AI summaries)
CREATE TABLE IF NOT EXISTS public.notes (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Note',
    content TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    blocks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes (user_id);

-- 3. STUDY DECKS TABLE (AI-generated flashcards, mind maps, quizzes)
CREATE TABLE IF NOT EXISTS public.study_decks (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    cards JSONB DEFAULT '[]'::jsonb,
    quizzes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_decks_user_id ON public.study_decks (user_id);

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_decks ENABLE ROW LEVEL SECURITY;

-- 5. BOARDS POLICIES (Strict Owner-only writes, Owner or is_public reads)
CREATE POLICY "Allow users to read own or public boards" ON public.boards
    FOR SELECT
    USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Allow owner to insert boards" ON public.boards
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owner to update boards" ON public.boards
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owner to delete boards" ON public.boards
    FOR DELETE
    USING (auth.uid() = user_id);

-- 6. NOTES POLICIES (Strict Owner-only)
CREATE POLICY "Allow owner to read notes" ON public.notes
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Allow owner to insert notes" ON public.notes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owner to update notes" ON public.notes
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owner to delete notes" ON public.notes
    FOR DELETE
    USING (auth.uid() = user_id);

-- 7. STUDY DECKS POLICIES (Strict Owner-only)
CREATE POLICY "Allow owner to read study decks" ON public.study_decks
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Allow owner to insert study decks" ON public.study_decks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owner to update study decks" ON public.study_decks
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow owner to delete study decks" ON public.study_decks
    FOR DELETE
    USING (auth.uid() = user_id);

-- 8. USER ACCOUNT & DATA DELETION RPC (Google Play Store compliance)
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.boards WHERE user_id = auth.uid();
    DELETE FROM public.notes WHERE user_id = auth.uid();
    DELETE FROM public.study_decks WHERE user_id = auth.uid();
    DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- 9. AUTOMATIC UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_boards_updated_at ON public.boards;
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON public.boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notes_updated_at ON public.notes;
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_study_decks_updated_at ON public.study_decks;
CREATE TRIGGER update_study_decks_updated_at BEFORE UPDATE ON public.study_decks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 10. SHARED NOTES STORAGE BUCKET (Public lecture notes download)
-- ==============================================================================

-- 1. Create the public shared-notes storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'shared-notes',
    'shared-notes',
    true,
    52428800, -- 50 MB maximum per PDF file
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

-- 2. Rule allowing signed-in users to upload shared notes
DROP POLICY IF EXISTS "Signed-in users can upload shared notes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload shared notes" ON storage.objects;
DROP POLICY IF EXISTS "Allow Board Uploads to Shared Notes" ON storage.objects;
CREATE POLICY "Signed-in users can upload shared notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'shared-notes');

-- 3. Rule allowing anyone to read shared notes
DROP POLICY IF EXISTS "Anyone can read shared notes" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access for Shared Notes" ON storage.objects;
CREATE POLICY "Anyone can read shared notes"
ON storage.objects FOR SELECT
USING (bucket_id = 'shared-notes');

-- Rule allowing signed-in users to update/overwrite shared notes
DROP POLICY IF EXISTS "Signed-in users can update shared notes" ON storage.objects;
DROP POLICY IF EXISTS "Allow Board Updates to Shared Notes" ON storage.objects;
CREATE POLICY "Signed-in users can update shared notes"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'shared-notes');

-- ==============================================================================
-- 11. BROADCAST IMAGES STORAGE BUCKET (Multi-Room Mirroring & Slide Streaming)
-- ==============================================================================

-- 1. Create the dedicated broadcast-images storage bucket (10 MB max per image)
-- SVG is strictly disallowed ('image/svg+xml' excluded) to eliminate stored XSS risks.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'broadcast-images',
    'broadcast-images',
    true,
    10485760, -- 10 MB maximum per slide/photo
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- 2. Rule allowing authenticated board devices to upload broadcast images
-- Restricted strictly TO authenticated (anonymous direct uploads rejected to prevent free public hosting abuse)
DROP POLICY IF EXISTS "Anyone can upload broadcast images" ON storage.objects;
DROP POLICY IF EXISTS "Signed-in users can upload broadcast images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Board Uploads to Broadcast Images" ON storage.objects;
CREATE POLICY "Allow Board Uploads to Broadcast Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'broadcast-images');

-- 3. Rule allowing public read access for viewing boards across rooms
DROP POLICY IF EXISTS "Anyone can read broadcast images" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access for Broadcast Images" ON storage.objects;
CREATE POLICY "Public Read Access for Broadcast Images"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'broadcast-images');

-- 4. Disallow client-side overwrite / update entirely
-- Eliminates tampering with images currently displayed on classroom boards
DROP POLICY IF EXISTS "Allow Board Updates to Broadcast Images" ON storage.objects;
DROP POLICY IF EXISTS "Signed-in users can update broadcast images" ON storage.objects;

-- 5. Disallow client-side deletion entirely
-- Prevents malicious or accidental wiping of lesson pictures during live classes
DROP POLICY IF EXISTS "Allow Cleanup of Broadcast Images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete broadcast images" ON storage.objects;

-- 6. Revoke and drop insecure SQL-based cleanup function if previously created.
-- Direct SQL deletion from storage.objects bypasses physical file deletion on underlying S3 storage,
-- leaving orphaned files that permanently consume project storage quotas.
-- Automated file cleanup must be executed via the scheduled Edge Function using the Storage API (.remove()).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'clear_old_broadcast_images'
    ) THEN
        REVOKE EXECUTE ON FUNCTION public.clear_old_broadcast_images(INT) FROM PUBLIC, anon, authenticated;
        DROP FUNCTION IF EXISTS public.clear_old_broadcast_images(INT);
    END IF;
END $$;

-- ==============================================================================
-- 12. APP CONFIGURATION & REMOTE FEATURE FLAGS (Company-controlled feature gates)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Public read access for clients, but strictly NO client-side inserts/updates/deletes.
-- Only company administrators with Supabase Service Role can toggle features.
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read app config" ON public.app_config;
CREATE POLICY "Public can read app config" ON public.app_config
    FOR SELECT USING (true);

-- Default configuration: NCERT digital textbooks switch is locked OFF (false)
-- until official institutional licensing / publisher agreement is formalized.
INSERT INTO public.app_config (key, value, description)
VALUES (
    'textbooks_enabled',
    'false'::jsonb,
    'Institutional & Publisher permission for NCERT textbook integration'
)
ON CONFLICT (key) DO NOTHING;





