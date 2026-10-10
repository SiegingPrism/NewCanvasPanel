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

-- 4. AI USAGE TABLE (Atomic serverless daily quota tracking)
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

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- 6. BOARDS POLICIES (Strict Owner-only writes & reads)
-- General SELECT only returns boards owned by the authenticated user to prevent public scraping.
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

-- 7. NOTES POLICIES (Strict Owner-only)
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

-- 8. STUDY DECKS POLICIES (Strict Owner-only)
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

-- 9. AI USAGE POLICIES (Strict Owner-only)
CREATE POLICY "Allow owner to read ai_usage" ON public.ai_usage
    FOR SELECT
    USING (auth.uid() = user_id);

-- 10. SECURE RPC TO FETCH A SHARED PUBLIC BOARD BY EXACT ID
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

-- 11. ATOMIC AI QUOTA INCREMENT RPC
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

-- 12. USER ACCOUNT & DATA DELETION RPC (Google Play Store compliance)
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

-- 13. AUTOMATIC UPDATED_AT TRIGGER
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
