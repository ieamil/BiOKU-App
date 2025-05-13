export interface Chapter {
  id: string;
  title: string;
  content: string;
  book_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'published' | 'archived';
  views: number;
  likes: number;
}

export interface Book {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  type: 'fantastik' | 'kisa_hikaye';
  user_id: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'published' | 'archived';
  chapters: Chapter[];
  chapters_count: number;
  views: number;
  likes: number;
} 