import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>;
type BottomTabNavigationProp = { navigate: (screen: string, params?: any) => void };

interface Chapter {
  id: string;
  title: string;
  status: 'published' | 'draft';
  views: number;
  likes: number;
  created_at: string;
}

interface Book {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  type: string;
  views: number;
  likes: number;
  chapters_count: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  total_views: number;
  total_likes: number;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

const BookDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookId } = route.params;
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'chapters'>('summary');
  const [isInLibrary, setIsInLibrary] = useState(false);
  const { user } = useAuth();
  const bottomTabNavigation = useNavigation<BottomTabNavigationProp>();

  useEffect(() => {
    loadInitialData();
  }, [bookId]);

  useFocusEffect(
    React.useCallback(() => {
      loadBookDetails();
    }, [bookId])
  );

  const loadInitialData = async () => {
    await Promise.all([
      loadBookDetails(),
      checkLibraryStatus()
    ]);
  };

  const loadBookDetails = async () => {
    try {
      // Kitap ve yazar detaylarını ayrı ayrı yükle
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();

      if (bookError) throw bookError;

      // Yazar bilgilerini yükle
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', bookData.user_id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      // Kitabın tüm bölümlerinin toplam istatistiklerini hesapla
      const { data: statsData, error: statsError } = await supabase
        .from('chapters')
        .select('views, likes')
        .eq('book_id', bookId)
        .eq('status', 'published');

      if (statsError) throw statsError;

      const totalViews = statsData?.reduce((sum, chapter) => sum + (chapter.views || 0), 0) || 0;
      const totalLikes = statsData?.reduce((sum, chapter) => sum + (chapter.likes || 0), 0) || 0;

      setBook({
        ...bookData,
        total_views: totalViews,
        total_likes: totalLikes,
        profiles: profileData || { username: 'Anonim', avatar_url: 'https://via.placeholder.com/40' }
      });

      // Yayınlanmış bölümleri yükle
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', bookId)
        .eq('status', 'published')
        .order('order', { ascending: true });

      if (chaptersError) throw chaptersError;
      setChapters(chaptersData || []);
    } catch (error) {
      console.error('Kitap detayları yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkLibraryStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('library_books')
        .select('id')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setIsInLibrary(!!data);
    } catch (error) {
      console.error('Kütüphane durumu kontrol edilirken hata:', error);
    }
  };

  console.log('user.id:', user?.id);
  console.log('bookId:', bookId);
  const handleLibraryToggle = async () => {
    if (!user) {
      Alert.alert('Uyarı', 'Bu özelliği kullanmak için giriş yapmalısınız.');
      return;
    }

    try {
      if (isInLibrary) {
        // Kütüphaneden çıkar
        const { error } = await supabase
          .from('library_books')
          .delete()
          .eq('book_id', bookId)
          .eq('user_id', user.id);

        if (error) throw error;
        setIsInLibrary(false);
      } else {
        // Kütüphaneye ekle
        const { error } = await supabase
          .from('library_books')
          .insert([
            {
              book_id: bookId,
              user_id: user.id
            }
          ]);

        if (error) {
          if (error.code === '23505') {
            Alert.alert('Uyarı', 'Bu kitap zaten kütüphanende mevcut.');
            setIsInLibrary(true);
            return;
          } else {
            throw error;
          }
        }
        setIsInLibrary(true);
      }
    } catch (error) {
      console.error('Kütüphane işlemi sırasında hata:', error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleAuthorPress = () => {
    if (!book) return;
    
    if (user && book.user_id === user.id) {
      bottomTabNavigation.navigate('Home', {
        screen: 'Profil'
      });
    } else {
      navigation.navigate('Profile', { userId: book.user_id });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B4EFF" />
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Kitap bulunamadı</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.bookInfoContainer}>
          <Image 
            source={{ uri: book.cover_url }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.bookDetails}>
            <Text style={styles.title}>{book.title}</Text>
            <Text style={styles.type}>{book.type}</Text>
            
            <TouchableOpacity 
              style={styles.authorContainer}
              onPress={handleAuthorPress}
            >
              <Image 
                source={{ 
                  uri: book.profiles?.avatar_url || 'https://via.placeholder.com/40'
                }}
                style={styles.authorAvatar}
              />
              <Text style={styles.authorName}>
                {book.profiles?.username || 'Anonim'}
              </Text>
            </TouchableOpacity>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="eye-outline" size={16} color="#8E8E93" />
                <Text style={styles.statText}>{book.total_views || 0}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="heart-outline" size={16} color="#8E8E93" />
                <Text style={styles.statText}>{book.total_likes || 0}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.libraryButton,
                isInLibrary && styles.libraryButtonActive
              ]}
              onPress={handleLibraryToggle}
            >
              <Ionicons
                name={isInLibrary ? "bookmark" : "bookmark-outline"}
                size={20}
                color={isInLibrary ? "#FFF" : "#6B4EFF"}
              />
              <Text style={[
                styles.libraryButtonText,
                isInLibrary && styles.libraryButtonTextActive
              ]}>
                {isInLibrary ? 'Kütüphanede' : 'Kütüphaneye Ekle'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'summary' && styles.activeTab]}
            onPress={() => setActiveTab('summary')}
          >
            <Text style={[styles.tabText, activeTab === 'summary' && styles.activeTabText]}>
              Arka Kapak
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'chapters' && styles.activeTab]}
            onPress={() => setActiveTab('chapters')}
          >
            <Text style={[styles.tabText, activeTab === 'chapters' && styles.activeTabText]}>
              Bölümler ({chapters.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'summary' ? (
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>{book.description}</Text>
          </View>
        ) : (
          <View style={styles.chaptersContainer}>
            {chapters.map((chapter) => (
              <TouchableOpacity
                key={chapter.id}
                style={styles.chapterItem}
                onPress={() => navigation.navigate('ChapterDetail', { chapterId: chapter.id })}
              >
                <View style={styles.chapterHeader}>
                  <Text style={styles.chapterTitle}>{chapter.title}</Text>
                </View>
                <View style={styles.chapterStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="eye-outline" size={16} color="#8E8E93" />
                    <Text style={styles.statText}>{chapter.views || 0}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="heart-outline" size={16} color="#8E8E93" />
                    <Text style={styles.statText}>{chapter.likes || 0}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1E2D',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1E2D',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1E2D',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  header: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  bookInfoContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  coverImage: {
    width: 140,
    height: 200,
    borderRadius: 8,
  },
  bookDetails: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  type: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 12,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  authorName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    color: '#8E8E93',
    fontSize: 14,
    marginLeft: 4,
  },
  libraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6B4EFF',
    borderRadius: 8,
    padding: 8,
  },
  libraryButtonActive: {
    backgroundColor: '#6B4EFF',
    borderColor: '#6B4EFF',
  },
  libraryButtonText: {
    color: '#6B4EFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  libraryButtonTextActive: {
    color: '#FFF',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B3C',
    marginTop: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6B4EFF',
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  activeTabText: {
    color: '#6B4EFF',
    fontWeight: 'bold',
  },
  descriptionContainer: {
    padding: 20,
  },
  description: {
    color: '#8E8E93',
    fontSize: 16,
    lineHeight: 24,
  },
  chaptersContainer: {
    padding: 20,
  },
  chapterItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B3C',
  },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chapterTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  chapterStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default BookDetailScreen; 