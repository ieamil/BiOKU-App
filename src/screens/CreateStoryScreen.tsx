import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

interface Book {
  id: string;
  title: string;
  cover_url: string;
  type: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  views: number;
  likes: number;
  chapters_count?: number;
  published_chapters_count?: number;
  draft_chapters_count?: number;
  total_views?: number;
  total_likes?: number;
}

const CreateStoryScreen: React.FC<Props> = ({ navigation }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'published' | 'draft'>('published');
  const { user } = useAuth();

  const loadBooks = async () => {
    if (!user) return;

    try {
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', activeTab)
        .order('updated_at', { ascending: false });

      if (booksError) throw booksError;

      // Her kitap için bölüm sayılarını ve istatistikleri al
      const booksWithStats = await Promise.all(booksData?.map(async (book) => {
        // Yayınlanmış bölümleri ve istatistikleri al
        const { data: chaptersData, error: chaptersError } = await supabase
          .from('chapters')
          .select('views, likes, status')
          .eq('book_id', book.id);

        if (chaptersError) throw chaptersError;

        // İstatistikleri hesapla
        const publishedChapters = chaptersData?.filter(c => c.status === 'published') || [];
        const draftChapters = chaptersData?.filter(c => c.status === 'draft') || [];
        const totalViews = chaptersData?.reduce((sum, chapter) => sum + (chapter.views || 0), 0) || 0;
        const totalLikes = chaptersData?.reduce((sum, chapter) => sum + (chapter.likes || 0), 0) || 0;

        return {
          ...book,
          published_chapters_count: publishedChapters.length,
          draft_chapters_count: draftChapters.length,
          chapters_count: chaptersData?.length || 0,
          total_views: totalViews,
          total_likes: totalLikes
        };
      }) || []);

      setBooks(booksWithStats);
    } catch (error) {
      console.error('Kitaplar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, [activeTab]);

  useEffect(() => {
    // Her geri dönüşte kitapları yeniden yükle
    const unsubscribe = navigation.addListener('focus', () => {
      loadBooks();
    });

    return () => unsubscribe();
  }, [navigation, activeTab]);

  const renderBookItem = ({ item }: { item: Book }) => {
    const formattedDate = new Date(item.updated_at || item.created_at).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return (
      <TouchableOpacity 
        style={styles.bookItem}
        onPress={() => navigation.navigate('NewStory', { bookId: item.id })}
      >
        <View style={styles.bookHeader}>
          {item.cover_url ? (
            <Image 
              source={{ uri: item.cover_url }} 
              style={styles.coverImage}
            />
          ) : (
            <View style={[styles.coverImage, styles.placeholderCover]}>
              <Ionicons name="book-outline" size={24} color="#8E8E93" />
            </View>
          )}
          
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle}>{item.title}</Text>
            <Text style={styles.bookType}>{item.type}</Text>
            <Text style={[
              styles.statusText,
              item.status === 'published' ? styles.publishedStatus : styles.draftStatus
            ]}>
              {item.status === 'published' ? 'Yayında' : 'Taslak'}
            </Text>
          </View>
        </View>

        <View style={styles.bookStats}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="document-text-outline" size={16} color="#8E8E93" />
              <Text style={styles.statText}>
                {item.published_chapters_count || 0} yayında, {item.draft_chapters_count || 0} taslak
              </Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={16} color="#8E8E93" />
              <Text style={styles.statText}>{item.total_views || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="heart-outline" size={16} color="#8E8E93" />
              <Text style={styles.statText}>{item.total_likes || 0}</Text>
            </View>
            <Text style={styles.dateText}>Son güncelleme: {formattedDate}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B4EFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hikayelerim</Text>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'published' && styles.activeTab]}
              onPress={() => setActiveTab('published')}
            >
              <Text style={[styles.tabText, activeTab === 'published' && styles.activeTabText]}>
                Yayınlananlar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'draft' && styles.activeTab]}
              onPress={() => setActiveTab('draft')}
            >
              <Text style={[styles.tabText, activeTab === 'draft' && styles.activeTabText]}>
                Taslakta Olanlar
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {books.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {activeTab === 'published' 
                ? 'Henüz yayınlanmış hikayeniz yok.'
                : 'Henüz taslak hikayeniz yok.'}
              {'\n'}Yeni bir hikaye oluşturmak için aşağıdaki butonu kullanın.
            </Text>
          </View>
        ) : (
          <FlatList
            data={books}
            renderItem={renderBookItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => navigation.navigate('NewStory')}
      >
        <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
        <Text style={styles.createButtonText}>Yeni Hikaye Oluştur</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1E2D',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 0,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#2A2B3C',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#6B4EFF',
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1E2D',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B4EFF',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 'auto',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  listContainer: {
    padding: 20,
  },
  bookItem: {
    backgroundColor: '#2A2B3C',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  coverImage: {
    width: 60,
    height: 90,
    borderRadius: 4,
    backgroundColor: '#3A3B4C',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 15,
    marginRight: 15,
  },
  bookTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bookType: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 8,
  },
  bookStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  publishedStatus: {
    color: '#4CAF50',
  },
  draftStatus: {
    color: '#FFC107',
  },
  dateText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookStats: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3A3B4C',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    color: '#8E8E93',
    fontSize: 14,
    marginLeft: 6,
  },
});

export default CreateStoryScreen; 