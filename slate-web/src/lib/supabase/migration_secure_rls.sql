-- ==============================================================================
-- SLATE MIGRATION: SECURE ROW LEVEL SECURITY, ATOMIC AI QUOTA & PUBLIC BOARDS
-- Run this migration in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/ksjcuwkvxisiaubljbtj/sql)
-- ==============================================================================

-- 1. ADD IS_PUBLIC COLUMN TO BOARDS
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Create indexes for performance and fast lookups
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
DROP POLICY IF EXISTS "Allow users to read own boards" ON public.boards;
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

-- 4. BOARDS POLICIES (STRICT OWNER-ONLY)
-- Prevent public enumeration: SELECT only returns boards owned by the current authenticated user.
-- Shared public boards must be retrieved individually by exact ID using get_public_board(board_id).
CREATE POLICY "Allow users to read own boards" ON public.boards
    FOR SELECT
    USING (auth.uid() = user_id);

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

-- 7. SECURE RPC TO FETCH A SHARED PUBLIC BOARD BY EXACT ID
-- Prevents scraping/listing all public boards while allowing users with the link/QR code to view
CREATE OR REPLACE FUNCTION get_public_board(p_board_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_board JSONB;
BEGIN
    SELECT to_jsonb(b) INTO v_board
    FROM public.boards b
    WHERE b.id = p_board_id AND b.is_public = TRUE;
    
    RETURN v_board;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_public_board(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION get_public_board(TEXT) TO anon, authenticated;

-- 8. ATOMIC SERVER-SIDE AI QUOTA TRACKING (PERSISTENT ACROSS SERVERLESS INSTANCES)
CREATE TABLE IF NOT EXISTS public.ai_usage (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    request_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_usage_date UNIQUE (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON public.ai_usage (user_id, usage_date);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow owner to read ai_usage" ON public.ai_usage;
CREATE POLICY "Allow owner to read ai_usage" ON public.ai_usage
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION increment_ai_usage(p_daily_limit INTEGER DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_today DATE := CURRENT_DATE;
    v_count INTEGER;
    v_allowed BOOLEAN;
    v_remaining INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    INSERT INTO public.ai_usage (user_id, usage_date, request_count, updated_at)
    VALUES (v_user_id, v_today, 1, NOW())
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET 
        request_count = public.ai_usage.request_count + 1,
        updated_at = NOW()
    RETURNING request_count INTO v_count;

    IF v_count <= p_daily_limit THEN
        v_allowed := TRUE;
        v_remaining := p_daily_limit - v_count;
    ELSE
        v_allowed := FALSE;
        v_remaining := 0;
    END IF;

    RETURN jsonb_build_object(
        'allowed', v_allowed,
        'count', v_count,
        'remaining', v_remaining,
        'limit', p_daily_limit
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION increment_ai_usage(INTEGER) FROM public, anon;
GRANT EXECUTE ON FUNCTION increment_ai_usage(INTEGER) TO authenticated;

-- 9. USER ACCOUNT & DATA DELETION RPC (GOOGLE PLAY STORE REQUIREMENT)
-- Hardened with empty search_path and restricted execute permissions
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    DELETE FROM public.boards WHERE user_id = auth.uid();
    DELETE FROM public.notes WHERE user_id = auth.uid();
    DELETE FROM public.study_decks WHERE user_id = auth.uid();
    DELETE FROM public.ai_usage WHERE user_id = auth.uid();
    DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_user_account() FROM public, anon;
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;
