import type { ResourceType, TopicStatus, FlashcardStatus, QuizDifficulty, QuizQuestionType } from '@/types/database';

export const SUBJECT_COLORS = [
  { name: 'teal', value: '#0d9488' },
  { name: 'blue', value: '#2563eb' },
  { name: 'emerald', value: '#059669' },
  { name: 'amber', value: '#d97706' },
  { name: 'rose', value: '#e11d48' },
  { name: 'cyan', value: '#0891b2' },
  { name: 'violet', value: '#7c3aed' },
  { name: 'orange', value: '#ea580c' },
  { name: 'slate', value: '#475569' },
];

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  lecture_notes: 'Lecture Notes',
  slides: 'Slides',
  textbook: 'Textbook',
  past_paper: 'Past Paper',
  assignment: 'Assignment',
  practical: 'Practical',
  lab_manual: 'Lab Manual',
  handwritten_notes: 'Handwritten Notes',
  image: 'Image',
  reference: 'Reference',
  other: 'Other',
};

export const RESOURCE_TYPES = Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[];

export const TOPIC_STATUS_LABELS: Record<TopicStatus, string> = {
  not_started: 'Not Started',
  learning: 'Learning',
  understood: 'Understood',
  needs_revision: 'Needs Revision',
  mastered: 'Mastered',
};

export const TOPIC_STATUS_COLORS: Record<TopicStatus, string> = {
  not_started: 'bg-slate-400',
  learning: 'bg-blue-500',
  understood: 'bg-emerald-500',
  needs_revision: 'bg-amber-500',
  mastered: 'bg-teal-600',
};

export const FLASHCARD_STATUS_LABELS: Record<FlashcardStatus, string> = {
  new: 'New',
  almost_know: 'Almost Know',
  dont_know: "Don't Know",
  know: 'Know',
};

export const QUIZ_DIFFICULTY_LABELS: Record<QuizDifficulty, string> = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const QUIZ_QUESTION_TYPE_LABELS: Record<QuizQuestionType, string> = {
  mcq: 'Multiple Choice',
  true_false: 'True / False',
  short_answer: 'Short Answer',
  mixed: 'Mixed',
};

export const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const ACCEPTED_FILE_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx';

export const SEMESTER_1_SUBJECTS = [
  {
    name: 'Introduction to Computers / ICT',
    code: 'ICT 101',
    description: 'Fundamentals of computer systems, applications, and information technology as used in pharmacy practice.',
    icon: 'Computer',
    color: '#2563eb',
  },
  {
    name: 'Communication Skills & Creative Writing',
    code: 'COM 101',
    description: 'Principles of effective communication, academic writing, and creative expression for healthcare professionals.',
    icon: 'MessageSquare',
    color: '#0891b2',
  },
  {
    name: 'Introduction to Pharmacy',
    code: 'PHARM 101',
    description: 'Foundations of pharmacy as a profession, history, ethics, and the role of pharmacists in healthcare.',
    icon: 'Pill',
    color: '#0d9488',
  },
  {
    name: 'Mathematics for Pharmacy',
    code: 'MATH 101',
    description: 'Mathematical methods essential for pharmacy: calculations, algebra, statistics, and dosage computations.',
    icon: 'Calculator',
    color: '#7c3aed',
  },
  {
    name: 'Physical Chemistry',
    code: 'PCHM 101',
    description: 'Thermodynamics, chemical kinetics, solutions, and physical principles relevant to pharmaceutical systems.',
    icon: 'Atom',
    color: '#ea580c',
  },
  {
    name: 'Inorganic Chemistry',
    code: 'ICHM 101',
    description: 'Chemistry of inorganic elements and compounds with pharmaceutical significance and therapeutic applications.',
    icon: 'FlaskConical',
    color: '#d97706',
  },
  {
    name: 'Introduction to Biochemistry & Cell Biology',
    code: 'BIOCH 101',
    description: 'Structure and function of cells, biomolecules, metabolism, and biochemical foundations of life processes.',
    icon: 'Dna',
    color: '#059669',
  },
  {
    name: 'Introduction to Medical Physiology & Muscle Physiology',
    code: 'PHYS 101',
    description: 'Body systems physiology with emphasis on muscle physiology, membrane potentials, and neuromuscular function.',
    icon: 'HeartPulse',
    color: '#e11d48',
  },
  {
    name: 'Gross Anatomy, Histology & Embryology',
    code: 'ANAT 101',
    description: 'Human body structure: gross anatomy, microscopic histology, and developmental embryology.',
    icon: 'Bone',
    color: '#475569',
  },
];
