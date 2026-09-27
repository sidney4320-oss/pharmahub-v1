'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import type { Subject, Topic, Resource, Note, Exam, Quiz, Flashcard, StudySession } from '@/types/database';

export function useQueries() {
  const { user } = useAuth();

  async function getSubjects(): Promise<Subject[]> {
    if (!user) return [];
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    return data ?? [];
  }

  async function getSubject(id: string): Promise<Subject | null> {
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return data;
  }

  async function getTopics(subjectId: string): Promise<Topic[]> {
    const { data } = await supabase
      .from('topics')
      .select('*')
      .eq('subject_id', subjectId)
      .order('sort_order');
    return data ?? [];
  }

  async function getTopic(id: string): Promise<Topic | null> {
    const { data } = await supabase
      .from('topics')
      .select('*, subject:subjects(*)')
      .eq('id', id)
      .maybeSingle();
    return data as Topic & { subject: Subject } | null;
  }

  async function getResources(subjectId?: string, topicId?: string): Promise<Resource[]> {
    let q = supabase
      .from('resources')
      .select('*, subject:subjects(*), topic:topics(*)')
      .order('created_at', { ascending: false });
    if (subjectId) q = q.eq('subject_id', subjectId);
    if (topicId) q = q.eq('topic_id', topicId);
    const { data } = await q;
    return (data as Resource[]) ?? [];
  }

  async function getResource(id: string): Promise<Resource | null> {
    const { data } = await supabase
      .from('resources')
      .select('*, subject:subjects(*), topic:topics(*)')
      .eq('id', id)
      .maybeSingle();
    return data as Resource | null;
  }

  async function getNotes(subjectId?: string, topicId?: string): Promise<Note[]> {
    let q = supabase
      .from('notes')
      .select('*, subject:subjects(*), topic:topics(*)')
      .order('updated_at', { ascending: false });
    if (subjectId) q = q.eq('subject_id', subjectId);
    if (topicId) q = q.eq('topic_id', topicId);
    const { data } = await q;
    return (data as Note[]) ?? [];
  }

  async function getExams(): Promise<Exam[]> {
    if (!user) return [];
    const { data } = await supabase
      .from('exams')
      .select('*, subject:subjects(*)')
      .eq('user_id', user.id)
      .order('exam_date');
    return (data as Exam[]) ?? [];
  }

  async function getQuizzes(): Promise<Quiz[]> {
    if (!user) return [];
    const { data } = await supabase
      .from('quizzes')
      .select('*, subject:subjects(*), topic:topics(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return (data as Quiz[]) ?? [];
  }

  async function getFlashcards(topicId?: string): Promise<Flashcard[]> {
    let q = supabase
      .from('flashcards')
      .select('*')
      .order('created_at', { ascending: false });
    if (topicId) q = q.eq('topic_id', topicId);
    const { data } = await q;
    return data ?? [];
  }

  async function getStudySessions(): Promise<StudySession[]> {
    if (!user) return [];
    const { data } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });
    return data ?? [];
  }

  return {
    getSubjects,
    getSubject,
    getTopics,
    getTopic,
    getResources,
    getResource,
    getNotes,
    getExams,
    getQuizzes,
    getFlashcards,
    getStudySessions,
  };
}
