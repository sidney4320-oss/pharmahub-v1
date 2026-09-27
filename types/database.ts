export type ResourceType =
  | 'lecture_notes'
  | 'slides'
  | 'textbook'
  | 'past_paper'
  | 'assignment'
  | 'practical'
  | 'lab_manual'
  | 'handwritten_notes'
  | 'image'
  | 'reference'
  | 'other';

export type TopicStatus =
  | 'not_started'
  | 'learning'
  | 'understood'
  | 'needs_revision'
  | 'mastered';

export type FlashcardStatus = 'new' | 'almost_know' | 'dont_know' | 'know';

export type QuizDifficulty = 'basic' | 'intermediate' | 'advanced';
export type QuizQuestionType = 'mcq' | 'true_false' | 'short_answer' | 'mixed';

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  description: string | null;
  lecturer: string | null;
  color: string | null;
  icon: string | null;
  semester: number | null;
  exam_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  user_id: string;
  subject_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  status: TopicStatus;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string | null;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  file_path: string | null;
  file_url: string | null;
  mime_type: string | null;
  file_size: number | null;
  extracted_text: string | null;
  extraction_status: 'pending' | 'extracted' | 'failed' | 'not_applicable';
  tags: string[];
  semester: number | null;
  created_at: string;
  updated_at: string;
  subject?: Subject;
  topic?: Topic | null;
}

export interface Note {
  id: string;
  user_id: string;
  subject_id: string | null;
  topic_id: string | null;
  resource_id: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  subject?: Subject;
  topic?: Topic | null;
}

export interface Exam {
  id: string;
  user_id: string;
  subject_id: string | null;
  exam_name: string;
  exam_date: string;
  exam_time: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  subject?: Subject;
}

export interface StudySession {
  id: string;
  user_id: string;
  subject_id: string | null;
  topic_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  created_at: string;
}

export interface Flashcard {
  id: string;
  user_id: string;
  topic_id: string | null;
  subject_id: string | null;
  front: string;
  back: string;
  status: FlashcardStatus;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: string;
  user_id: string;
  subject_id: string | null;
  topic_id: string | null;
  title: string;
  difficulty: QuizDifficulty;
  question_type: QuizQuestionType;
  question_count: number;
  score: number | null;
  completed_at: string | null;
  created_at: string;
  subject?: Subject;
  topic?: Topic | null;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'short_answer';
  options: string[] | null;
  correct_answer: string;
  user_answer: string | null;
  explanation: string | null;
  is_correct: boolean | null;
  created_at: string;
}

export interface Concept {
  id: string;
  user_id: string;
  topic_id: string;
  name: string;
  description: string | null;
  status: TopicStatus;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      subjects: { Row: Subject; Insert: Partial<Subject>; Update: Partial<Subject> };
      topics: { Row: Topic; Insert: Partial<Topic>; Update: Partial<Topic> };
      resources: { Row: Resource; Insert: Partial<Resource>; Update: Partial<Resource> };
      notes: { Row: Note; Insert: Partial<Note>; Update: Partial<Note> };
      exams: { Row: Exam; Insert: Partial<Exam>; Update: Partial<Exam> };
      study_sessions: { Row: StudySession; Insert: Partial<StudySession>; Update: Partial<StudySession> };
      flashcards: { Row: Flashcard; Insert: Partial<Flashcard>; Update: Partial<Flashcard> };
      quizzes: { Row: Quiz; Insert: Partial<Quiz>; Update: Partial<Quiz> };
      questions: { Row: Question; Insert: Partial<Question>; Update: Partial<Question> };
      concepts: { Row: Concept; Insert: Partial<Concept>; Update: Partial<Concept> };
    };
  };
}
