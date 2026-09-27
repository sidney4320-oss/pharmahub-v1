/*
# PharmaHub — Phase 1 Core Schema

Creates the complete relational schema for the PharmaHub pharmacy learning platform.

## Overview
Multi-user app with email/password authentication. Each user owns their own
academic data (subjects, topics, resources, notes, exams, etc.). All tables are
owner-scoped via `user_id` with RLS policies that check `auth.uid() = user_id`.

## Tables Created

1. **subjects** — Pharmacy subjects (e.g. Anatomy, Physiology). Owned per user.
   Columns: id, user_id, name, code, description, lecturer, color, icon, semester,
   exam_date, created_at, updated_at.

2. **topics** — Topics within a subject (e.g. "Upper Limb" under Anatomy).
   Columns: id, user_id, subject_id (FK subjects), name, description, sort_order,
   status (not_started/learning/understood/needs_revision/mastered),
   created_at, updated_at.

3. **resources** — Uploaded learning materials (PDFs, images, notes).
   Columns: id, user_id, subject_id (FK), topic_id (FK nullable), title,
   description, resource_type, file_path, file_url, mime_type, file_size,
   extracted_text, extraction_status, tags (text[]), semester,
   created_at, updated_at.

4. **resource_text** — Chunked extracted text for search (future semantic search).
   Columns: id, resource_id (FK), chunk_index, content, created_at.

5. **notes** — Personal notes, optionally linked to subject/topic/resource.
   Columns: id, user_id, subject_id (FK nullable), topic_id (FK nullable),
   resource_id (FK nullable), title, content, created_at, updated_at.

6. **exams** — Exam schedule entries.
   Columns: id, user_id, subject_id (FK nullable), exam_name, exam_date,
   exam_time, location, notes, created_at.

7. **study_sessions** — Records of focused study time.
   Columns: id, user_id, subject_id (FK nullable), topic_id (FK nullable),
   started_at, ended_at, duration_minutes, created_at.

8. **flashcards** — Spaced-repetition flashcards linked to topics.
   Columns: id, user_id, topic_id (FK nullable), subject_id (FK nullable),
   front, back, status (new/almost_know/dont_know/know), created_at, updated_at.

9. **quizzes** — Generated quiz metadata.
   Columns: id, user_id, subject_id (FK nullable), topic_id (FK nullable),
   title, difficulty, question_type, question_count, score, completed_at,
   created_at.

10. **questions** — Individual questions within a quiz.
    Columns: id, quiz_id (FK), question_text, question_type, options (jsonb),
    correct_answer, user_answer, explanation, is_correct, created_at.

11. **topic_progress** — Per-topic progress tracking.
    Columns: id, user_id, topic_id (FK unique), concepts_total, concepts_done,
    mastery_level (0-100), last_studied_at, created_at, updated_at.

12. **concepts** — Concepts within a topic for the concept-learning system.
    Columns: id, user_id, topic_id (FK), name, description, status, created_at.

## Security
- RLS enabled on ALL tables.
- Owner-scoped CRUD policies (select/insert/update/delete) checking auth.uid() = user_id.
- user_id defaults to auth.uid() so client inserts that omit it still satisfy WITH CHECK.
- Child tables (topics, resources, notes, etc.) are owner-scoped directly via user_id
  for simplicity and query efficiency.

## Important Notes
1. Foreign keys use ON DELETE CASCADE so deleting a subject cleans up its topics,
   resources, notes, etc.
2. Indexes added on frequently-queried columns (subject_id, topic_id, user_id).
3. All user_id columns are NOT NULL DEFAULT auth.uid().
*/

-- ============== SUBJECTS ==============
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  lecturer text,
  color text DEFAULT '#0d9488',
  icon text DEFAULT 'BookOpen',
  semester integer DEFAULT 1,
  exam_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);

DROP POLICY IF EXISTS "select_own_subjects" ON subjects;
CREATE POLICY "select_own_subjects" ON subjects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_subjects" ON subjects;
CREATE POLICY "insert_own_subjects" ON subjects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_subjects" ON subjects;
CREATE POLICY "update_own_subjects" ON subjects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_subjects" ON subjects;
CREATE POLICY "delete_own_subjects" ON subjects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============== TOPICS ==============
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  status text DEFAULT 'not_started' CHECK (status IN ('not_started','learning','understood','needs_revision','mastered')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_topics_user_id ON topics(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);

DROP POLICY IF EXISTS "select_own_topics" ON topics;
CREATE POLICY "select_own_topics" ON topics FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_topics" ON topics;
CREATE POLICY "insert_own_topics" ON topics FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_topics" ON topics;
CREATE POLICY "update_own_topics" ON topics FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_topics" ON topics;
CREATE POLICY "delete_own_topics" ON topics FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============== RESOURCES ==============
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  resource_type text DEFAULT 'other' CHECK (resource_type IN ('lecture_notes','slides','textbook','past_paper','assignment','practical','lab_manual','handwritten_notes','image','reference','other')),
  file_path text,
  file_url text,
  mime_type text,
  file_size bigint,
  extracted_text text,
  extraction_status text DEFAULT 'pending' CHECK (extraction_status IN ('pending','extracted','failed','not_applicable')),
  tags text[] DEFAULT '{}',
  semester integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_subject_id ON resources(subject_id);
CREATE INDEX IF NOT EXISTS idx_resources_topic_id ON resources(topic_id);

DROP POLICY IF EXISTS "select_own_resources" ON resources;
CREATE POLICY "select_own_resources" ON resources FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_resources" ON resources;
CREATE POLICY "insert_own_resources" ON resources FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_resources" ON resources;
CREATE POLICY "update_own_resources" ON resources FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_resources" ON resources;
CREATE POLICY "delete_own_resources" ON resources FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============== RESOURCE_TEXT (chunks for search) ==============
CREATE TABLE IF NOT EXISTS resource_text (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  chunk_index integer DEFAULT 0,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE resource_text ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_resource_text_resource_id ON resource_text(resource_id);

DROP POLICY IF EXISTS "select_own_resource_text" ON resource_text;
CREATE POLICY "select_own_resource_text" ON resource_text FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM resources WHERE resources.id = resource_text.resource_id AND resources.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_resource_text" ON resource_text;
CREATE POLICY "insert_own_resource_text" ON resource_text FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM resources WHERE resources.id = resource_text.resource_id AND resources.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_resource_text" ON resource_text;
CREATE POLICY "delete_own_resource_text" ON resource_text FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM resources WHERE resources.id = resource_text.resource_id AND resources.user_id = auth.uid()));

-- ============== NOTES ==============
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  resource_id uuid REFERENCES resources(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_topic_id ON notes(topic_id);

DROP POLICY IF EXISTS "select_own_notes" ON notes;
CREATE POLICY "select_own_notes" ON notes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_notes" ON notes;
CREATE POLICY "insert_own_notes" ON notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_notes" ON notes;
CREATE POLICY "update_own_notes" ON notes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_notes" ON notes;
CREATE POLICY "delete_own_notes" ON notes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============== EXAMS ==============
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  exam_name text NOT NULL,
  exam_date date NOT NULL,
  exam_time time,
  location text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_exams_user_id ON exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(exam_date);

DROP POLICY IF EXISTS "select_own_exams" ON exams;
CREATE POLICY "select_own_exams" ON exams FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_exams" ON exams;
CREATE POLICY "insert_own_exams" ON exams FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_exams" ON exams;
CREATE POLICY "update_own_exams" ON exams FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_exams" ON exams;
CREATE POLICY "delete_own_exams" ON exams FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============== STUDY_SESSIONS ==============
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);

DROP POLICY IF EXISTS "select_own_study_sessions" ON study_sessions;
CREATE POLICY "select_own_study_sessions" ON study_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_study_sessions" ON study_sessions;
CREATE POLICY "insert_own_study_sessions" ON study_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_study_sessions" ON study_sessions;
CREATE POLICY "update_own_study_sessions" ON study_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_study_sessions" ON study_sessions;
CREATE POLICY "delete_own_study_sessions" ON study_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============== FLASHCARDS ==============
CREATE TABLE IF NOT EXISTS flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  front text NOT NULL,
  back text NOT NULL,
  status text DEFAULT 'new' CHECK (status IN ('new','almost_know','dont_know','know')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic_id ON flashcards(topic_id);

DROP POLICY IF EXISTS "select_own_flashcards" ON flashcards;
CREATE POLICY "select_own_flashcards" ON flashcards FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_flashcards" ON flashcards;
CREATE POLICY "insert_own_flashcards" ON flashcards FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_flashcards" ON flashcards;
CREATE POLICY "update_own_flashcards" ON flashcards FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_flashcards" ON flashcards;
CREATE POLICY "delete_own_flashcards" ON flashcards FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============== QUIZZES ==============
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  title text NOT NULL,
  difficulty text DEFAULT 'intermediate' CHECK (difficulty IN ('basic','intermediate','advanced')),
  question_type text DEFAULT 'mcq' CHECK (question_type IN ('mcq','true_false','short_answer','mixed')),
  question_count integer DEFAULT 10,
  score integer,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);

DROP POLICY IF EXISTS "select_own_quizzes" ON quizzes;
CREATE POLICY "select_own_quizzes" ON quizzes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_quizzes" ON quizzes;
CREATE POLICY "insert_own_quizzes" ON quizzes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_quizzes" ON quizzes;
CREATE POLICY "update_own_quizzes" ON quizzes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_quizzes" ON quizzes;
CREATE POLICY "delete_own_quizzes" ON quizzes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============== QUESTIONS ==============
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text DEFAULT 'mcq' CHECK (question_type IN ('mcq','true_false','short_answer')),
  options jsonb,
  correct_answer text NOT NULL,
  user_answer text,
  explanation text,
  is_correct boolean,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);

DROP POLICY IF EXISTS "select_own_questions" ON questions;
CREATE POLICY "select_own_questions" ON questions FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_questions" ON questions;
CREATE POLICY "insert_own_questions" ON questions FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_questions" ON questions;
CREATE POLICY "update_own_questions" ON questions FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_questions" ON questions;
CREATE POLICY "delete_own_questions" ON questions FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()));

-- ============== CONCEPTS ==============
CREATE TABLE IF NOT EXISTS concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text DEFAULT 'not_started' CHECK (status IN ('not_started','learning','understood','needs_revision','mastered')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_concepts_topic_id ON concepts(topic_id);

DROP POLICY IF EXISTS "select_own_concepts" ON concepts;
CREATE POLICY "select_own_concepts" ON concepts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_concepts" ON concepts;
CREATE POLICY "insert_own_concepts" ON concepts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_concepts" ON concepts;
CREATE POLICY "update_own_concepts" ON concepts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_concepts" ON concepts;
CREATE POLICY "delete_own_concepts" ON concepts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============== updated_at trigger ==============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subjects_updated_at ON subjects;
CREATE TRIGGER subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS topics_updated_at ON topics;
CREATE TRIGGER topics_updated_at BEFORE UPDATE ON topics FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS resources_updated_at ON resources;
CREATE TRIGGER resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS flashcards_updated_at ON flashcards;
CREATE TRIGGER flashcards_updated_at BEFORE UPDATE ON flashcards FOR EACH ROW EXECUTE FUNCTION update_updated_at();
