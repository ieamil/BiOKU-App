import { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user?.id) {
      setError('Kullanıcı oturumu bulunamadı.');
      setLoading(false);
      return;
    }

    console.log('useProfile - Profil verisi çekiliyor...', user.id);
    try {
      // Profil verilerini çek
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('useProfile - Supabase profil çekme hatası:', profileError);
        setError('Profil yüklenirken bir hata oluştu');
        setLoading(false);
        return;
      }

      if (!profileData) {
        console.warn('useProfile - Profil bulunamadı, oluşturuluyor...');
        const insertResult = await supabase.from('profiles').insert([
          {
            id: user.id,
            name: 'İsimsiz',
            username: `user_${Date.now()}`,
            email: user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

        if (insertResult.error) {
          console.error('useProfile - Yeni profil oluşturma hatası:', insertResult.error);
          setError('Profil oluşturulamadı');
          setLoading(false);
          return;
        }

        return await fetchProfile();
      }

      // Yayınlanmış kitap sayısını al
      const { data: publishedBooks, error: booksError } = await supabase
        .from('books')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'published');

      if (booksError) throw booksError;

      // Tüm yayınlanmış bölümlerin beğeni sayılarını topla
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('likes')
        .eq('status', 'published')
        .in('book_id', publishedBooks?.map(book => book.id) || []);

      if (chaptersError) throw chaptersError;

      const totalLikes = chaptersData?.reduce((sum, chapter) => sum + (chapter.likes || 0), 0) || 0;

      setProfile({
        ...profileData,
        works_count: publishedBooks?.length || 0,
        likes_count: totalLikes
      });
      setError(null);
    } catch (err: any) {
      console.error('useProfile - Genel hata:', err);
      setError('Profil yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return {
    profile,
    loading,
    error,
    fetchProfile,
  };
};
