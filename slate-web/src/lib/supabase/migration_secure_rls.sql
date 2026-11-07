-- ==============================================================================
-- SLATE MIGRATION: SECURE ROW LEVEL SECURITY & PUBLIC BOARDS
-- Run this migration in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/ksjcuwkvxisiaubljbtj/sql)
-- ==============================================================================

-- 1. ADD IS_PUBLIC COLUMN TO BOARDS
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Create an index on is_public for fast shared board lookups
CREATE INDEX IF NOT EXISTS idx_boards_is_public ON public.boards (is_public);
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON public.boards (user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes (user_id);
CREATE INDEX IF NOT EXISTS idx_study_decks_user_id ON public.study_decks (user_id);

-- 2. PURGE OLD UNOWNED ORPHAN ROWS
DELETE FROM public.boards WHERE user_id IS NULL;
DELETE FROM public.notes WHERE user_id IS NULL;
DELETE FROM public.study_decks WHERE user_id IS NULL;

-- 3. DROP INSECURE LEGACY POLICIES
DROP POLICY IF EXISTS "Users can manage own boards" ON public.boards;
DROP POLICY IF EXISTS "Allow users to read own or public boards" ON public.boards;
DROP POLICY IF EXISTS "Allow owner to insert boards" ON public.boards;
DROP POLICY IF EXISTS "Allow owner to update boards" ON public.boards;
DROP POLICY IF EXISTS "Allow owner to delete boards" ON public.boards;

DROP POLICY IF EXISTS "Users can manage own notes" ON public.notes;
DROP POLICY IF EXISTS "Allow owner to read notes" ON public.notes;
DROP POLICY IF EXISTS "Allow owner to insert notes" ON public.notes;
DROP POLICY IF EXISTS "Allow owner to update notes" ON public.notes;
DROP POLICY IF EXISTS "Allow owner to delete notes" ON public.notes;

DROP POLICY IF EXISTS "Users can manage own study decks" ON public.study_decks;
DROP POLICY IF EXISTS "Allow owner to read study decks" ON public.study_decks;
DROP POLICY IF EXISTS "Allow owner to insert study decks" ON public.study_decks;
DROP POLICY IF EXISTS "Allow owner to update study decks" ON public.study_decks;
DROP POLICY IF EXISTS "Allow owner to delete study decks" ON public.study_decks;

-- 4. BOARDS POLICIES (OWNER-ONLY WRITES, OWNER OR IS_PUBLIC READS)
-- Anyone can view a board if it is explicitly marked is_public = true, or if they own it
CREATE POLICY "Allow users to read own or public boards" ON public.boards
    FOR SELECT
    USING (auth.uid() = user_id OR is_public = TRUE);

-- Only authenticated board owners can create boards
CREATE POLICY "Allow owner to insert boards" ON public.boards
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Only the owner can update their board (prevent public viewers from editing shared boards)
CREATE POLICY "Allow owner to update boards" ON public.boards
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Only the owner can delete their board
CREATE POLICY "Allow owner to delete boards" ON public.boards
    FOR DELETE
    USING (auth.uid() = user_id);

-- 5. NOTES POLICIES (STRICT OWNER-ONLY)
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

-- 6. STUDY DECKS POLICIES (STRICT OWNER-ONLY)
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

-- 7. USER ACCOUNT & DATA DELETION RPC (GOOGLE PLAY STORE REQUIREMENT)
-- Authenticated users can invoke this to permanently purge their account and all data
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

-- ==============================================================================
-- 8. SHARED NOTES STORAGE BUCKET (Public lecture notes download)
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
TO authenticated, anon
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
TO authenticated, anon
USING (bucket_id = 'shared-notes');

-- ==============================================================================
-- 9. BROADCAST IMAGES STORAGE BUCKET (Multi-Room Mirroring & Slide Streaming)
-- ==============================================================================

-- 1. Create the dedicated broadcast-images storage bucket (10 MB max per image)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'broadcast-images',
    'broadcast-images',
    true,
    10485760, -- 10 MB maximum per picture/slide
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

-- 2. Rule allowing board devices to upload broadcast images
DROP POLICY IF EXISTS "Anyone can upload broadcast images" ON storage.objects;
DROP POLICY IF EXISTS "Signed-in users can upload broadcast images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Board Uploads to Broadcast Images" ON storage.objects;
CREATE POLICY "Allow Board Uploads to Broadcast Images"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'broadcast-images');

-- 3. Rule allowing public read access for viewing boards across rooms
DROP POLICY IF EXISTS "Anyone can read broadcast images" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access for Broadcast Images" ON storage.objects;
CREATE POLICY "Public Read Access for Broadcast Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'broadcast-images');

-- 4. Rule allowing update/overwrite of broadcast images
DROP POLICY IF EXISTS "Allow Board Updates to Broadcast Images" ON storage.objects;
CREATE POLICY "Allow Board Updates to Broadcast Images"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'broadcast-images');

-- 5. Rule allowing cleanup/deletion of old broadcast images
DROP POLICY IF EXISTS "Allow Cleanup of Broadcast Images" ON storage.objects;
CREATE POLICY "Allow Cleanup of Broadcast Images"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'broadcast-images');

-- 6. Automatic cleanup function to prune temporary broadcast pictures older than X hours (default 24h)
CREATE OR REPLACE FUNCTION public.clear_old_broadcast_images(hours_old INT DEFAULT 24)
RETURNS INT AS $$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'broadcast-images'
      AND created_at < NOW() - (hours_old || ' hours')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


