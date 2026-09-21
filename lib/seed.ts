'use client';

import { supabase } from '@/lib/supabase/client';
import { SEMESTER_1_SUBJECTS } from '@/lib/constants';

/**
 * Seeds the default Semester 1 subjects for a newly signed-up user.
 * Safe to call multiple times — only inserts if the user has no subjects yet.
 */
export async function seedDefaultSubjects(userId: string): Promise<void> {
  const { count } = await supabase
    .from('subjects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (count && count > 0) return;

  const inserts = SEMESTER_1_SUBJECTS.map((s) => ({
    user_id: userId,
    name: s.name,
    code: s.code,
    description: s.description,
    icon: s.icon,
    color: s.color,
    semester: 1,
  }));

  await supabase.from('subjects').insert(inserts);
}
