import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  StatusBar,
  Animated,
  useColorScheme,
  PanResponder,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'ChapterDetail'>;

interface Chapter {
  id: string;
  title: string;
  content: string;
  book_id: string;
  views: number;
  likes: number;
  created_at: string;
  updated_at: string;
  order: number;
  books: {
    title: string;
    id: string;
  };
}

interface ChapterWithCount extends Chapter {
  total_chapters: number;
}

interface ChapterListItem {
  id: string;
  title: string;
}

interface ReaderSettings {
  theme: 'light' | 'dark' | 'sepia';
  fontSize: number;
}

const defaultSettings: ReaderSettings = {
  theme: 'dark',
  fontSize: 18,
};

const themes = {
  light: {
    background: '#FFFFFF',
    text: '#000000',
    secondary: '#8E8E93',
  },
  dark: {
    background: '#1C1E2D',
    text: '#E5E5EA',
    secondary: '#8E8E93',
  },
  sepia: {
    background: '#F5E6D3',
    text: '#5C4B37',
    secondary: '#8E8E93',
  },
};

const ChapterDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { chapterId } = route.params;
  const [chapter, setChapter] = useState<ChapterWithCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [showChaptersModal, setShowChaptersModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [chaptersList, setChaptersList] = useState<ChapterListItem[]>([]);
  const [settings, setSettings] = useState<ReaderSettings>(defaultSettings);
  const { user } = useAuth();
  const fadeAnim = useState(new Animated.Value(1))[0];
  const systemColorScheme = useColorScheme();
  const [currentProgress, setCurrentProgress] = useState(0);
  const [nextChapter, setNextChapter] = useState<ChapterListItem | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -50 && nextChapter) {
          // Sola kaydırma - sonraki bölüme geç
          navigation.replace('ChapterDetail', { chapterId: nextChapter.id });
        }
      },
    })
  ).current;

  useEffect(() => {
    loadSettings();
    loadChapterDetails();
    checkIfLiked();
    incrementViews();
  }, [chapterId]);

  useEffect(() => {
    if (chaptersList.length > 0) {
      const currentIndex = chaptersList.findIndex(c => c.id === chapterId);
      if (currentIndex < chaptersList.length - 1) {
        setNextChapter(chaptersList[currentIndex + 1]);
      }
    }
  }, [chaptersList, chapterId]);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('readerSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      } else {
        // Sistem temasına göre varsayılan temayı ayarla
        setSettings({
          ...defaultSettings,
          theme: systemColorScheme || 'dark',
        });
      }
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error);
    }
  };

  const saveSettings = async (newSettings: ReaderSettings) => {
    try {
      await AsyncStorage.setItem('readerSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error);
    }
  };

  const loadChapterDetails = async () => {
    try {
      // Önce bölüm detaylarını al
      const { data: chapterData, error: chapterError } = await supabase
        .from('chapters')
        .select(`
          *,
          books (
            title,
            id
          )
        `)
        .eq('id', chapterId)
        .single();

      if (chapterError) throw chapterError;

      // Sonra toplam bölüm sayısını al
      const { count: totalChapters, error: countError } = await supabase
        .from('chapters')
        .select('*', { count: 'exact' })
        .eq('book_id', chapterData.book_id);

      if (countError) throw countError;

      const chapterWithCount: ChapterWithCount = {
        ...chapterData,
        total_chapters: totalChapters || 0
      };

      setChapter(chapterWithCount);
      
      // Başlığı ayarla
      navigation.setOptions({
        title: chapterData.books.title,
        headerRight: () => (
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              onPress={() => setShowSettingsModal(true)}
              style={styles.headerButton}
            >
              <Ionicons name="settings-outline" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowChaptersModal(true)}
              style={styles.headerButton}
            >
              <Ionicons name="list" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        )
      });

      // Bölüm detayları yüklendikten sonra hedefi kontrol et
      checkAndUpdateReadingGoal();

      // Bölüm listesini yükle
      loadChaptersList(chapterData.book_id);
    } catch (error) {
      console.error('Bölüm detayları yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChaptersList = async (bookId: string) => {
    try {
      console.log('Bölüm listesi yükleniyor, book_id:', bookId);
      const { data, error } = await supabase
        .from('chapters')
        .select('id, title')
        .eq('book_id', bookId)
        .eq('status', 'published')
        .order('order', { ascending: true });

      if (error) throw error;
      
      const chapterItems: ChapterListItem[] = (data || []).map(item => ({
        id: item.id,
        title: item.title
      }));
      
      console.log('Yüklenen bölümler:', chapterItems);
      setChaptersList(chapterItems);
    } catch (error) {
      console.error('Bölüm listesi yüklenirken hata:', error);
    }
  };

  const checkIfLiked = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chapter_likes')
        .select('id')
        .eq('chapter_id', chapterId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setIsLiked(!!data);
    } catch (error) {
      console.error('Beğeni durumu kontrol edilirken hata:', error);
    }
  };

  const incrementViews = async () => {
    try {
      const { error } = await supabase.rpc('increment_chapter_views', {
        chapter_id: chapterId
      });

      if (error) throw error;
    } catch (error) {
      console.error('Görüntülenme sayısı artırılırken hata:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      Alert.alert('Uyarı', 'Beğenmek için giriş yapmalısınız.');
      return;
    }

    try {
      if (isLiked) {
        // Beğeniyi kaldır
        const { error: likeError } = await supabase
          .from('chapter_likes')
          .delete()
          .eq('chapter_id', chapterId)
          .eq('user_id', user.id);

        if (likeError) throw likeError;

        // Beğeni sayısını azalt
        const { error: updateError } = await supabase.rpc('decrement_chapter_likes', {
          chapter_id: chapterId
        });

        if (updateError) throw updateError;

        setIsLiked(false);
      } else {
        // Beğeni ekle
        const { error: likeError } = await supabase
          .from('chapter_likes')
          .insert([
            {
              chapter_id: chapterId,
              user_id: user.id
            }
          ]);

        if (likeError) throw likeError;

        // Beğeni sayısını artır
        const { error: updateError } = await supabase.rpc('increment_chapter_likes', {
          chapter_id: chapterId
        });

        if (updateError) throw updateError;

        setIsLiked(true);
      }

      // Bölüm detaylarını güncelle
      loadChapterDetails();
      // Bölümler listesini güncelle
      loadChaptersList(chapter?.book_id || '');
    } catch (error) {
      console.error('Beğeni işlemi sırasında hata:', error);
      Alert.alert('Hata', 'Beğeni işlemi sırasında bir hata oluştu');
    }
  };

  const toggleUI = () => {
    if (showUI) {
      // UI'ı gizle
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      StatusBar.setHidden(true);
    } else {
      // UI'ı göster
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      StatusBar.setHidden(false);
    }
    setShowUI(!showUI);
  };

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.y;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
    const contentHeight = event.nativeEvent.contentSize.height;
    
    const progress = scrollPosition / (contentHeight - scrollViewHeight);
    setCurrentProgress(Math.min(Math.max(progress, 0), 1));
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const checkAndUpdateReadingGoal = async () => {
    if (!user || !chapter) {
      console.log('Kullanıcı veya bölüm bilgisi eksik:', { userId: user?.id, chapterId });
      return;
    }

    try {
      console.log('Bölüm kontrolü:', {
        currentOrder: chapter.order,
        totalChapters: chapter.total_chapters,
        bookId: chapter.book_id
      });

      // Son bölüm mü kontrol et
      const isLastChapter = chapter.order === chapter.total_chapters;
      console.log('Son bölüm mü?', isLastChapter);
      
      if (!isLastChapter) {
        console.log('Son bölüm değil, hedef güncellenmeyecek');
        return;
      }

      // Kitap daha önce tamamlanmış mı kontrol et
      const { data: completedBook, error: completedError } = await supabase
        .from('completed_books')
        .select('id')
        .eq('book_id', chapter.book_id)
        .eq('user_id', user.id)
        .single();

      if (completedError && completedError.code !== 'PGRST116') {
        console.error('Tamamlanan kitap kontrolünde hata:', completedError);
        throw completedError;
      }

      console.log('Kitap daha önce tamamlanmış mı?', !!completedBook);
      
      // Eğer kitap daha önce tamamlanmamışsa
      if (!completedBook) {
        console.log('Kitap ilk kez tamamlanıyor');
        
        // Tamamlanan kitaplar tablosuna ekle
        const { error: insertError } = await supabase
          .from('completed_books')
          .insert([
            {
              user_id: user.id,
              book_id: chapter.book_id,
              completed_at: new Date().toISOString()
            }
          ]);

        if (insertError) {
          console.error('Tamamlanan kitap eklenirken hata:', insertError);
          throw insertError;
        }

        // Aktif okuma hedefini bul ve güncelle
        const { data: goal, error: goalError } = await supabase
          .from('reading_goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_completed', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (goalError && goalError.code !== 'PGRST116') {
          console.error('Hedef bulunurken hata:', goalError);
          throw goalError;
        }

        console.log('Bulunan aktif hedef:', goal);

        if (goal) {
          const newCompletedBooks = goal.completed_books + 1;
          const isGoalCompleted = newCompletedBooks >= goal.target_books;

          console.log('Hedef güncelleniyor:', {
            öncekiTamamlanan: goal.completed_books,
            yeniTamamlanan: newCompletedBooks,
            hedefTamamlandıMı: isGoalCompleted
          });

          const { error: updateError } = await supabase
            .from('reading_goals')
            .update({ 
              completed_books: newCompletedBooks,
              is_completed: isGoalCompleted
            })
            .eq('id', goal.id);

          if (updateError) {
            console.error('Hedef güncellenirken hata:', updateError);
            throw updateError;
          }

          console.log('Hedef başarıyla güncellendi');

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
                          onPress: () => {
                            navigation.navigate('Library');
                          }
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
              `Bir kitap daha tamamladınız! Hedefinize ${goal.target_books - newCompletedBooks} kitap kaldı.`
            );
          }
        } else {
          console.log('Aktif hedef bulunamadı');
        }
      } else {
        console.log('Bu kitap daha önce tamamlanmış');
      }
    } catch (error) {
      console.error('Okuma hedefi güncellenirken hata:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themes[settings.theme].background }]}>
        <ActivityIndicator size="large" color="#6B4EFF" />
      </View>
    );
  }

  if (!chapter) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: themes[settings.theme].background }]}>
        <Text style={[styles.errorText, { color: themes[settings.theme].text }]}>Bölüm bulunamadı</Text>
      </View>
    );
  }

  const currentTheme = themes[settings.theme];

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar 
        barStyle={showUI ? (settings.theme === 'light' ? 'dark-content' : 'light-content') : 'dark-content'} 
        hidden={!showUI}
      />
      
      <Animated.View style={[
        styles.header,
        { 
          opacity: fadeAnim,
          backgroundColor: showUI ? currentTheme.background : 'transparent',
        }
      ]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]} numberOfLines={1}>
          {chapter.books.title}
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={() => setShowSettingsModal(true)}
            style={styles.headerButton}
          >
            <Ionicons name="settings-outline" size={24} color={currentTheme.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setShowChaptersModal(true)}
            style={styles.headerButton}
          >
            <Ionicons name="list" size={24} color={currentTheme.text} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView 
        ref={scrollViewRef}
        style={[styles.contentContainer, { backgroundColor: currentTheme.background }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        {...panResponder.panHandlers}
        onTouchEnd={toggleUI}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={toggleUI}
          style={{ flex: 1 }}
        >
          <Text style={[styles.chapterTitle, { 
            color: currentTheme.text,
            fontSize: settings.fontSize + 6,
          }]}>{chapter.title}</Text>
          <Text style={[styles.content, { 
            color: currentTheme.text,
            fontSize: settings.fontSize,
          }]}>{chapter.content}</Text>
          
          {nextChapter && (
            <TouchableOpacity 
              style={styles.nextChapterButton}
              onPress={() => navigation.replace('ChapterDetail', { chapterId: nextChapter.id })}
            >
              <Text style={styles.nextChapterText}>Sonraki Bölüm: {nextChapter.title}</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Animated.View style={[
        styles.footer,
        { 
          opacity: fadeAnim,
          backgroundColor: showUI ? currentTheme.background : 'transparent',
        }
      ]}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${currentProgress * 100}%` }]} />
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={20} color={currentTheme.secondary} />
            <Text style={[styles.statText, { color: currentTheme.secondary }]}>{formatNumber(chapter.views || 0)}</Text>
          </View>
          <TouchableOpacity 
            style={styles.statItem} 
            onPress={handleLike}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={20} 
              color={isLiked ? "#FF3B30" : currentTheme.secondary} 
            />
            <Text style={[styles.statText, { color: currentTheme.secondary }]}>{formatNumber(chapter.likes || 0)}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Bölümler Modalı */}
      <Modal
        visible={showChaptersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChaptersModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Bölümler</Text>
              <TouchableOpacity 
                onPress={() => setShowChaptersModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={currentTheme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={chaptersList}
              keyExtractor={(item) => item.id}
              style={styles.chaptersList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.chapterItem,
                    item.id === chapterId && styles.activeChapter
                  ]}
                  onPress={() => {
                    navigation.replace('ChapterDetail', { chapterId: item.id });
                    setShowChaptersModal(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.chapterItemTitle,
                      { color: currentTheme.text },
                      item.id === chapterId && styles.activeChapterTitle
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Ayarlar Modalı */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Okuma Ayarları</Text>
              <TouchableOpacity 
                onPress={() => setShowSettingsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={currentTheme.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.settingsContent}>
              <Text style={[styles.settingsLabel, { color: currentTheme.text }]}>Tema</Text>
              <View style={styles.themeButtons}>
                <TouchableOpacity
                  style={[
                    styles.themeButton,
                    { backgroundColor: themes.light.background },
                    settings.theme === 'light' && styles.selectedTheme
                  ]}
                  onPress={() => saveSettings({ ...settings, theme: 'light' })}
                >
                  <Text style={[styles.themeButtonText, { color: themes.light.text }]}>A</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.themeButton,
                    { backgroundColor: themes.dark.background },
                    settings.theme === 'dark' && styles.selectedTheme
                  ]}
                  onPress={() => saveSettings({ ...settings, theme: 'dark' })}
                >
                  <Text style={[styles.themeButtonText, { color: themes.dark.text }]}>A</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.themeButton,
                    { backgroundColor: themes.sepia.background },
                    settings.theme === 'sepia' && styles.selectedTheme
                  ]}
                  onPress={() => saveSettings({ ...settings, theme: 'sepia' })}
                >
                  <Text style={[styles.themeButtonText, { color: themes.sepia.text }]}>A</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.settingsLabel, { color: currentTheme.text }]}>Yazı Boyutu</Text>
              <View style={styles.fontSizeButtons}>
                <TouchableOpacity
                  style={styles.fontSizeButton}
                  onPress={() => saveSettings({ ...settings, fontSize: Math.max(14, settings.fontSize - 2) })}
                >
                  <Text style={[styles.fontSizeButtonText, { color: currentTheme.text }]}>A-</Text>
                </TouchableOpacity>
                <Text style={[styles.fontSize, { color: currentTheme.text }]}>{settings.fontSize}</Text>
                <TouchableOpacity
                  style={styles.fontSizeButton}
                  onPress={() => saveSettings({ ...settings, fontSize: Math.min(24, settings.fontSize + 2) })}
                >
                  <Text style={[styles.fontSizeButtonText, { color: currentTheme.text }]}>A+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  backButton: {
    padding: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  contentContainer: {
    flex: 1,
  },
  chapterTitle: {
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  content: {
    lineHeight: 28,
    marginHorizontal: 20,
    marginBottom: 40,
  },
  footer: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 16,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get('window').height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B3C',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  chaptersList: {
    padding: 16,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B3C',
  },
  activeChapter: {
    backgroundColor: '#2A2B3C',
  },
  chapterItemTitle: {
    flex: 1,
    fontSize: 16,
  },
  activeChapterTitle: {
    color: '#6B4EFF',
    fontWeight: 'bold',
  },
  settingsContent: {
    padding: 20,
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  themeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  themeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTheme: {
    borderColor: '#6B4EFF',
  },
  themeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  fontSizeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  fontSizeButton: {
    padding: 10,
  },
  fontSizeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  fontSize: {
    fontSize: 18,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#2A2B3C',
    width: '100%',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6B4EFF',
  },
  nextChapterButton: {
    backgroundColor: '#6B4EFF',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  nextChapterText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChapterDetailScreen; 