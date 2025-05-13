import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  ScrollView,
  Alert,
  Pressable,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';

import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { TabParamList, RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DatabaseBook {
  id: number;
  book_id: string;
  last_read_at: string;
  is_favorite: boolean;
  books: {
    id: string;
    title: string;
    cover_url: string;
    type: string;
    description?: string;
    status?: string;
    views?: number;
    likes?: number;
  };
}

interface BookDetails {
  id: string;
  title: string;
  cover_url: string;
  type: string;
  description: string;
  status: string;
  views: number;
  likes: number;
}

interface Book {
  id: number;
  book_id: string;
  last_read_at: string;
  is_favorite: boolean;
  books: BookDetails;
}

type Props = BottomTabScreenProps<TabParamList, 'Kütüphane'>;

interface ReadingStats {
  totalBooks: number;
  favoriteBooks: number;
  categories: { [key: string]: number };
}

interface ReadingGoal {
  id: number;
  goal_type: 'monthly' | 'yearly';
  target_books: number;
  completed_books: number;
  start_date: string;
  end_date: string;
  is_completed: boolean;
}

interface Achievement {
  badge_type: string;
  earned_at: string;
}

interface CompletedBook {
  id: number;
  book_id: string;
  completed_at: string;
  books: {
    title: string;
    cover_url: string;
  };
}

interface DatabaseCompletedBook {
  id: number;
  book_id: string;
  completed_at: string;
  books: {
    title: string;
    cover_url: string;
  };
}

const BADGES = {
  FIRST_BOOK: {
    title: 'İlk Kitap',
    description: 'İlk kitabını kütüphanene ekledin!',
    icon: 'book-outline'
  },
  BOOKWORM: {
    title: 'Kitap Kurdu',
    description: '10 kitap okudun!',
    icon: 'library-outline'
  },
  GOAL_ACHIEVER: {
    title: 'Hedef Avcısı',
    description: 'İlk okuma hedefini tamamladın!',
    icon: 'trophy-outline'
  },
  // Daha fazla rozet eklenebilir
};

const LibraryScreen: React.FC<Props> = ({ navigation, route }) => {
  const stackNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [books, setBooks] = useState<Book[]>([]);
  const [favoriteBooks, setFavoriteBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const [showStats, setShowStats] = useState(false);
  const [readingStats, setReadingStats] = useState<ReadingStats>({
    totalBooks: 0,
    favoriteBooks: 0,
    categories: {}
  });
  const [currentGoal, setCurrentGoal] = useState<ReadingGoal | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoalType, setNewGoalType] = useState<'monthly' | 'yearly'>('monthly');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationOpacity = new Animated.Value(0);
  const [showCompletedBooksModal, setShowCompletedBooksModal] = useState(false);
  const [completedBooks, setCompletedBooks] = useState<CompletedBook[]>([]);
  const [editingGoal, setEditingGoal] = useState(false);

  const calculateStats = useCallback((books: Book[]) => {
    const stats: ReadingStats = {
      totalBooks: books.length,
      favoriteBooks: books.filter(book => book.is_favorite).length,
      categories: {}
    };

    books.forEach(book => {
      const type = book.books.type;
      stats.categories[type] = (stats.categories[type] || 0) + 1;
    });

    setReadingStats(stats);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        Promise.all([
          loadLibraryBooks(),
          loadReadingGoal(),
          loadAchievements()
        ]);
      }
    }, [user])
  );

  useEffect(() => {
    calculateStats(books);
  }, [books, calculateStats]);

  useEffect(() => {
    console.log('Kütüphanedeki kitaplar:', books);
  }, [books]);

  useEffect(() => {
    console.log('Aktif kullanıcı:', user);
  }, [user]);

  useEffect(() => {
    const session = supabase.auth.session();
    console.log('Aktif Supabase session:', session);
  }, [user]);

  const loadLibraryBooks = async () => {
    try {
      if (!user) {
        console.error('Kullanıcı bulunamadı');
        return;
      }

      const { data, error } = await supabase
        .from('library_books')
        .select(`
          *,
          books (
            id,
            title,
            cover_url,
            type,
            description,
            status,
            views,
            likes
          )
        `)
        .eq('user_id', user.id);

      console.log('Kütüphanedeki kitaplar:', data);

      if (error) {
        console.error('Kitaplar yüklenirken hata oluştu:', error.message);
        return;
      }

      if (data) {
        const libraryBooks = ((data as unknown) as DatabaseBook[]).map(item => ({
          id: item.id,
          book_id: item.book_id,
          last_read_at: item.last_read_at,
          is_favorite: item.is_favorite,
          books: {
            id: item.books?.id ?? '',
            title: item.books?.title ?? '',
            cover_url: item.books?.cover_url ?? '',
            type: item.books?.type ?? '',
            description: item.books?.description ?? '',
            status: item.books?.status ?? 'published',
            views: item.books?.views ?? 0,
            likes: item.books?.likes ?? 0,
          }
        }));
        
        setBooks(libraryBooks);
        // Favori kitapları ayarla
        setFavoriteBooks(libraryBooks.filter(book => book.is_favorite));
      }
    } catch (error) {
      console.error('Beklenmeyen bir hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLastReadTime = async (bookId: string) => {
    try {
      const { error } = await supabase
        .from('library_books')
        .update({ last_read_at: new Date().toISOString() })
        .eq('book_id', bookId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Son okuma tarihi güncellenirken hata:', error.message);
      } else {
        // Kitap listesini yeniden yükle
        loadLibraryBooks();
      }
    } catch (error) {
      console.error('Son okuma tarihi güncellenirken beklenmeyen hata:', error);
    }
  };

  const toggleFavorite = async (bookId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('library_books')
        .update({ is_favorite: !currentStatus })
        .eq('book_id', bookId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Favori durumu güncellenirken hata:', error.message);
      } else {
        loadLibraryBooks();
      }
    } catch (error) {
      console.error('Favori durumu güncellenirken beklenmeyen hata:', error);
    }
  };

  const removeFromLibrary = async (bookId: string) => {
    try {
      const { error } = await supabase
        .from('library_books')
        .delete()
        .eq('book_id', bookId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Kitap kütüphaneden kaldırılırken hata:', error.message);
      } else {
        loadLibraryBooks();
      }
    } catch (error) {
      console.error('Kitap kaldırılırken beklenmeyen hata:', error);
    }
  };

  const markBookAsCompleted = async (bookId: string) => {
    try {
      // Önce kitabın daha önce tamamlanıp tamamlanmadığını kontrol et
      const { data: existingBook, error: checkError } = await supabase
        .from('completed_books')
        .select('id')
        .eq('book_id', bookId)
        .eq('user_id', user?.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingBook) {
        Alert.alert('Bilgi', 'Bu kitap zaten tamamlanmış olarak işaretlenmiş.');
        return;
      }

      // Kitabı tamamlandı olarak işaretle
      const { error: insertError } = await supabase
        .from('completed_books')
        .insert([
          {
            user_id: user?.id,
            book_id: bookId,
            completed_at: new Date().toISOString()
          }
        ]);

      if (insertError) throw insertError;

      // Aktif hedefi bul ve güncelle
      const { data: goal, error: goalError } = await supabase
        .from('reading_goals')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_completed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (goalError && goalError.code !== 'PGRST116') throw goalError;

      if (goal) {
        const newCompletedBooks = goal.completed_books + 1;
        const isGoalCompleted = newCompletedBooks >= goal.target_books;

        const { error: updateError } = await supabase
          .from('reading_goals')
          .update({
            completed_books: newCompletedBooks,
            is_completed: isGoalCompleted
          })
          .eq('id', goal.id);

        if (updateError) throw updateError;

        // Hedef ve kütüphane listesini yenile
        await Promise.all([
          loadReadingGoal(),
          loadLibraryBooks()
        ]);

        if (isGoalCompleted) {
          Alert.alert(
            'Tebrikler! 🎉',
            'Okuma hedefinizi tamamladınız!',
            [
              {
                text: 'Harika!',
                onPress: () => {
                  Alert.alert(
                    'Yeni Hedef',
                    'Yeni bir okuma hedefi belirlemek ister misiniz?',
                    [
                      { text: 'Hayır, Şimdilik Değil', style: 'cancel' },
                      {
                        text: 'Evet',
                        onPress: () => setShowGoalModal(true)
                      }
                    ]
                  );
                }
              }
            ]
          );
        } else {
          Alert.alert(
            'Tebrikler! 📚',
            `Kitap tamamlandı olarak işaretlendi! Hedefinize ${goal.target_books - newCompletedBooks} kitap kaldı.`
          );
        }
      } else {
        Alert.alert(
          'Bilgi',
          'Kitap tamamlandı olarak işaretlendi!'
        );
        
        // Kütüphane listesini yenile
        await loadLibraryBooks();
      }

    } catch (error) {
      console.error('Kitap tamamlanırken hata:', error);
      Alert.alert('Hata', 'Kitap tamamlanırken bir hata oluştu.');
    }
  };

  const handleLongPress = (item: Book) => {
    Alert.alert(
      item.books.title,
      'Ne yapmak istersiniz?',
      [
        {
          text: item.is_favorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle',
          onPress: () => toggleFavorite(item.book_id, item.is_favorite)
        },
        {
          text: 'Kitabı Tamamlandı İşaretle',
          onPress: () => {
            Alert.alert(
              'Onay',
              'Bu kitabı tamamlandı olarak işaretlemek istediğinize emin misiniz?',
              [
                { text: 'İptal', style: 'cancel' },
                { 
                  text: 'Evet', 
                  onPress: () => markBookAsCompleted(item.book_id)
                }
              ]
            );
          }
        },
        {
          text: 'Kütüphaneden Çıkar',
          onPress: () => {
            Alert.alert(
              'Emin misiniz?',
              'Bu kitap kütüphanenizden kaldırılacak.',
              [
                { text: 'İptal', style: 'cancel' },
                {
                  text: 'Kaldır',
                  style: 'destructive',
                  onPress: () => removeFromLibrary(item.book_id)
                }
              ]
            );
          },
          style: 'destructive'
        },
        {
          text: 'İptal',
          style: 'cancel'
        }
      ]
    );
  };

  const renderBookItem = ({ item }: { item: Book }) => (
    <Pressable
      style={styles.bookItem}
      onPress={() => {
        updateLastReadTime(item.book_id);
        stackNavigation.navigate('BookDetail', { bookId: item.book_id.toString() });
      }}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={500}
    >
      <View style={styles.bookCoverContainer}>
        <Image
          source={{ uri: item.books.cover_url }}
          style={styles.bookCover}
        />
        {item.is_favorite && (
          <View style={styles.favoriteIcon}>
            <Ionicons name="heart" size={16} color="#FF3B30" />
          </View>
        )}
      </View>
      <Text style={styles.bookTitle} numberOfLines={2}>{item.books.title}</Text>
    </Pressable>
  );

  const filteredBooks = books.filter(book => 
    book.books.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFavorites = favoriteBooks.filter(book => 
    book.books.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsHeader}>
        <Text style={styles.statsTitle}>Okuma İstatistiklerim</Text>
        <TouchableOpacity onPress={() => setShowStats(false)}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{readingStats.totalBooks}</Text>
          <Text style={styles.statLabel}>Toplam Kitap</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{readingStats.favoriteBooks}</Text>
          <Text style={styles.statLabel}>Favori</Text>
        </View>
      </View>

      <View style={styles.categoryStats}>
        <Text style={styles.categoryTitle}>Kategori Dağılımı</Text>
        {Object.entries(readingStats.categories).map(([category, count]) => (
          <View key={category} style={styles.categoryRow}>
            <Text style={styles.categoryName}>{category}</Text>
            <View style={styles.categoryBarContainer}>
              <View 
                style={[
                  styles.categoryBar, 
                  { 
                    width: `${(count / readingStats.totalBooks) * 100}%`,
                    backgroundColor: '#6B4EFF'
                  }
                ]} 
              />
            </View>
            <Text style={styles.categoryCount}>{count}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const loadReadingGoal = async () => {
    try {
      const { data, error } = await supabase
        .from('reading_goals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentGoal(data);
    } catch (error) {
      console.error('Okuma hedefi yüklenirken hata:', error);
    }
  };

  const loadAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error('Rozetler yüklenirken hata:', error);
    }
  };

  const createReadingGoal = async () => {
    if (!newGoalTarget || parseInt(newGoalTarget) <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir hedef sayısı girin.');
      return;
    }

    const target = parseInt(newGoalTarget);
    const startDate = new Date();
    const endDate = new Date();
    
    if (newGoalType === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    try {
      const { error } = await supabase
        .from('reading_goals')
        .insert([
          {
            user_id: user?.id,
            goal_type: newGoalType,
            target_books: target,
            completed_books: 0,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
          }
        ]);

      if (error) throw error;

      setShowGoalModal(false);
      loadReadingGoal();
    } catch (error) {
      console.error('Hedef oluşturulurken hata:', error);
      Alert.alert('Hata', 'Hedef oluşturulurken bir hata oluştu.');
    }
  };

  const checkAndUpdateAchievements = async () => {
    if (!user) return;

    try {
      // İlk kitap rozeti
      if (books.length === 1) {
        await addAchievement('FIRST_BOOK');
      }
      
      // Kitap kurdu rozeti
      if (books.length === 10) {
        await addAchievement('BOOKWORM');
      }

      // Hedef tamamlama rozeti
      if (currentGoal?.is_completed) {
        await addAchievement('GOAL_ACHIEVER');
      }
    } catch (error) {
      console.error('Rozetler kontrol edilirken hata:', error);
    }
  };

  const addAchievement = async (badgeType: string) => {
    try {
      const { error } = await supabase
        .from('achievements')
        .insert([
          {
            user_id: user?.id,
            badge_type: badgeType
          }
        ]);

      if (error) throw error;
      
      // Rozet kazanıldığında kutlama
      showCelebrationAnimation();
      Alert.alert(
        'Yeni Rozet Kazandın!',
        `"${BADGES[badgeType as keyof typeof BADGES].title}" rozetini kazandın!`
      );
      
      loadAchievements();
    } catch (error) {
      console.error('Rozet eklenirken hata:', error);
    }
  };

  const showCelebrationAnimation = () => {
    setShowCelebration(true);
    Animated.sequence([
      Animated.timing(celebrationOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(celebrationOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => setShowCelebration(false));
  };

  const renderGoalProgress = () => {
    if (!currentGoal) return null;

    const progress = (currentGoal.completed_books / currentGoal.target_books) * 100;
    const timeLeft = new Date(currentGoal.end_date).getTime() - new Date().getTime();
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

    return (
      <View style={styles.goalContainer}>
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleContainer}>
            <Text style={styles.goalTitle}>
              {currentGoal.goal_type === 'monthly' ? 'Aylık' : 'Yıllık'} Hedef
            </Text>
            <TouchableOpacity
              onPress={() => {
                setNewGoalType(currentGoal.goal_type);
                setNewGoalTarget(currentGoal.target_books.toString());
                setEditingGoal(true);
              }}
              style={styles.editButton}
            >
              <Ionicons name="pencil" size={16} color="#6B4EFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.goalDaysLeft}>{daysLeft} gün kaldı</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.progressContainer}
          onPress={() => {
            loadCompletedBooks();
            setShowCompletedBooksModal(true);
          }}
        >
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${Math.min(progress, 100)}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {currentGoal.completed_books} / {currentGoal.target_books} kitap
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderGoalModal = () => (
    <Modal
      visible={showGoalModal || editingGoal}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {editingGoal ? 'Hedefi Düzenle' : 'Yeni Okuma Hedefi'}
          </Text>
          
          <View style={styles.goalTypeContainer}>
            <TouchableOpacity
              style={[
                styles.goalTypeButton,
                newGoalType === 'monthly' && styles.goalTypeButtonActive
              ]}
              onPress={() => setNewGoalType('monthly')}
            >
              <Text style={[
                styles.goalTypeText,
                newGoalType === 'monthly' && styles.goalTypeTextActive
              ]}>Aylık</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.goalTypeButton,
                newGoalType === 'yearly' && styles.goalTypeButtonActive
              ]}
              onPress={() => setNewGoalType('yearly')}
            >
              <Text style={[
                styles.goalTypeText,
                newGoalType === 'yearly' && styles.goalTypeTextActive
              ]}>Yıllık</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.goalInput}
            placeholder="Hedef kitap sayısı"
            placeholderTextColor="#8E8E93"
            keyboardType="number-pad"
            value={newGoalTarget}
            onChangeText={setNewGoalTarget}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowGoalModal(false);
                setEditingGoal(false);
              }}
            >
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => editingGoal ? updateGoal() : createReadingGoal()}
            >
              <Text style={styles.createButtonText}>
                {editingGoal ? 'Güncelle' : 'Oluştur'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const loadCompletedBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('completed_books')
        .select(`
          id,
          book_id,
          completed_at,
          books (
            title,
            cover_url
          )
        `)
        .eq('user_id', user?.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const typedData: CompletedBook[] = data.map(item => ({
          id: Number(item.id),
          book_id: String(item.book_id),
          completed_at: String(item.completed_at),
          books: {
            title: String(item.books?.[0]?.title || ''),
            cover_url: String(item.books?.[0]?.cover_url || '')
          }
        }));
        setCompletedBooks(typedData);
      } else {
        setCompletedBooks([]);
      }
    } catch (error) {
      console.error('Tamamlanan kitaplar yüklenirken hata:', error);
    }
  };

  const removeCompletedMark = async (completedBookId: number) => {
    try {
      const { error } = await supabase
        .from('completed_books')
        .delete()
        .eq('id', completedBookId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Aktif hedefi güncelle
      if (currentGoal) {
        const { error: updateError } = await supabase
          .from('reading_goals')
          .update({
            completed_books: Math.max(0, currentGoal.completed_books - 1),
            is_completed: false
          })
          .eq('id', currentGoal.id);

        if (updateError) throw updateError;
      }

      // Verileri yenile
      await Promise.all([
        loadCompletedBooks(),
        loadReadingGoal()
      ]);

      Alert.alert('Başarılı', 'Kitap tamamlanmış listesinden çıkarıldı.');
    } catch (error) {
      console.error('Tamamlanmış işareti kaldırılırken hata:', error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu.');
    }
  };

  const updateGoal = async () => {
    if (!currentGoal) return;
    
    try {
      const { error } = await supabase
        .from('reading_goals')
        .update({
          goal_type: newGoalType,
          target_books: parseInt(newGoalTarget),
          is_completed: currentGoal.completed_books >= parseInt(newGoalTarget)
        })
        .eq('id', currentGoal.id);

      if (error) throw error;

      setEditingGoal(false);
      loadReadingGoal();
      Alert.alert('Başarılı', 'Okuma hedefiniz güncellendi.');
    } catch (error) {
      console.error('Hedef güncellenirken hata:', error);
      Alert.alert('Hata', 'Hedef güncellenirken bir hata oluştu.');
    }
  };

  const renderCompletedBooksModal = () => (
    <Modal
      visible={showCompletedBooksModal}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tamamlanan Kitaplar</Text>
            <TouchableOpacity 
              onPress={() => setShowCompletedBooksModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={completedBooks}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.completedBookItem}>
                <Image
                  source={{ uri: item.books.cover_url }}
                  style={styles.completedBookCover}
                />
                <View style={styles.completedBookInfo}>
                  <Text style={styles.completedBookTitle}>{item.books.title}</Text>
                  <Text style={styles.completedBookDate}>
                    {new Date(item.completed_at).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Onay',
                      'Bu kitabı tamamlanmış listesinden çıkarmak istediğinize emin misiniz?',
                      [
                        { text: 'İptal', style: 'cancel' },
                        { 
                          text: 'Evet',
                          style: 'destructive',
                          onPress: () => removeCompletedMark(item.id)
                        }
                      ]
                    );
                  }}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyCompletedBooks}>
                <Text style={styles.emptyText}>Henüz tamamlanan kitap yok</Text>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B4EFF" />
      </View>
    );
  }

  const showEmptySearchResults = searchQuery && filteredBooks.length === 0;
  const showFavoritesSection = !searchQuery || (searchQuery && filteredFavorites.length > 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Kütüphanem</Text>
        </View>
        <TouchableOpacity 
          style={styles.statsButton}
          onPress={() => setShowStats(!showStats)}
        >
          <Ionicons name="stats-chart" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {showStats ? (
        renderStats()
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Kitaplığında ara..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#8E8E93" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Okuma Hedefi */}
          <View style={styles.section}>
            {currentGoal ? (
              renderGoalProgress()
            ) : (
              <TouchableOpacity
                style={styles.createGoalButton}
                onPress={() => setShowGoalModal(true)}
              >
                <Ionicons name="add-circle-outline" size={24} color="#6B4EFF" />
                <Text style={styles.createGoalText}>Okuma Hedefi Belirle</Text>
              </TouchableOpacity>
            )}
          </View>

          {showEmptySearchResults ? (
            <View style={styles.emptySearch}>
              <Text style={styles.emptyText}>"{searchQuery}" ile eşleşen kitap bulunamadı</Text>
            </View>
          ) : (
            <>
              {/* Favoriler */}
              {showFavoritesSection && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Favoriler</Text>
                  <FlatList
                    data={filteredFavorites}
                    renderItem={renderBookItem}
                    keyExtractor={(item) => item.id.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recentBooksContainer}
                    ListEmptyComponent={() => (
                      <View style={styles.emptyFavorites}>
                        <Text style={styles.emptyText}>Henüz favori kitabınız yok</Text>
                        <Text style={styles.emptySubText}>Kitapların üzerine uzun basarak favorilere ekleyebilirsiniz</Text>
                      </View>
                    )}
                  />
                </View>
              )}

              {/* Tüm Kitaplar */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {searchQuery ? `Arama Sonuçları (${filteredBooks.length})` : 'Tüm Kitaplar'}
                </Text>
                <View style={styles.booksGrid}>
                  {filteredBooks.map((item) => (
                    <View key={item.id} style={styles.gridItem}>
                      {renderBookItem({ item })}
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}

      {renderGoalModal()}
      {renderCompletedBooksModal()}

      {/* Kutlama Animasyonu */}
      {showCelebration && (
        <Animated.View style={[styles.celebration, { opacity: celebrationOpacity }]}>
          <Ionicons name="trophy" size={64} color="#FFD700" />
          <Text style={styles.celebrationText}>Tebrikler!</Text>
        </Animated.View>
      )}
    </SafeAreaView>
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
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B3C',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2B3C',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    height: '100%',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 16,
    marginBottom: 16,
  },
  recentBooksContainer: {
    paddingHorizontal: 12,
  },
  bookItem: {
    marginHorizontal: 4,
    width: 120,
  },
  bookCoverContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 8,
  },
  bookCover: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  bookTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  gridItem: {
    width: '33.33%',
    padding: 4,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1E2D',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  emptyFavorites: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptySubText: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
  },
  clearButton: {
    padding: 4,
  },
  emptySearch: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  statsButton: {
    padding: 8,
    marginLeft: 'auto',
  },
  statsContainer: {
    flex: 1,
    padding: 16,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: '#2A2B3C',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '45%',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6B4EFF',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#FFF',
  },
  categoryStats: {
    backgroundColor: '#2A2B3C',
    borderRadius: 12,
    padding: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    width: 100,
    color: '#FFF',
    fontSize: 14,
  },
  categoryBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#1C1E2D',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  categoryBar: {
    height: '100%',
    borderRadius: 4,
  },
  categoryCount: {
    width: 30,
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'right',
  },
  goalContainer: {
    backgroundColor: '#2A2B3C',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  goalDaysLeft: {
    fontSize: 14,
    color: '#8E8E93',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1C1E2D',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6B4EFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 8,
    textAlign: 'center',
  },
  createGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2B3C',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
  },
  createGoalText: {
    color: '#6B4EFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1C1E2D',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  goalTypeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  goalTypeButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#2A2B3C',
    marginHorizontal: 4,
  },
  goalTypeButtonActive: {
    backgroundColor: '#6B4EFF',
  },
  goalTypeText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  goalTypeTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  goalInput: {
    backgroundColor: '#2A2B3C',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2A2B3C',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
  },
  createButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#6B4EFF',
    marginLeft: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  celebration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  completedBookItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B3C',
    alignItems: 'center',
  },
  completedBookCover: {
    width: 50,
    height: 75,
    borderRadius: 4,
  },
  completedBookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  completedBookTitle: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 4,
  },
  completedBookDate: {
    color: '#8E8E93',
    fontSize: 14,
  },
  removeButton: {
    padding: 8,
  },
  emptyCompletedBooks: {
    padding: 20,
    alignItems: 'center',
  },
  editButton: {
    marginLeft: 8,
    padding: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeButton: {
    padding: 8,
  },
});

export default LibraryScreen; 