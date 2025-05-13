import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  ImageBackground,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import FollowersModal from '../components/FollowersModal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Book {
  id: string;
  title: string;
  type: string;
  cover_url: string;
  views: number;
  likes: number;
  published_chapters_count: number;
  draft_chapters_count: number;
  updated_at: string;
  total_views: number;
  total_likes: number;
}

const ProfileScreen = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const { profile, loading: profileLoading, error, fetchProfile } = useProfile();
  const navigation = useNavigation<NavigationProp>();
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');

  useEffect(() => {
    if (error) {
      console.error('Profil yükleme hatası:', error);
      Alert.alert('Hata', error);
    }
  }, [error]);

  useFocusEffect(
    useCallback(() => {
      console.log('Ekran odaklandı, profil yenileniyor...');
      fetchProfile();
    }, [])
  );

  useEffect(() => {
    console.log('Profile değişti, kitaplar yükleniyor...', profile?.id);
    loadBooks();
  }, [profile]);

  const loadBooks = async () => {
    if (!profile) return;

    try {
      console.log('Kitaplar yüklenmeye başlıyor...');
      console.log('Profil ID:', profile.id);
      
      // Sadece yayınlanmış kitapları al
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'published')
        .order('updated_at', { ascending: false });

      if (booksError) throw booksError;

      // Her kitap için istatistikleri al
      const booksWithStats = await Promise.all(booksData?.map(async (book) => {
        // Yayınlanmış bölümleri ve istatistikleri al
        const { data: chaptersData, error: chaptersError } = await supabase
          .from('chapters')
          .select('views, likes')
          .eq('book_id', book.id)
          .eq('status', 'published');

        if (chaptersError) throw chaptersError;

        // Toplam görüntülenme ve beğeni sayılarını hesapla
        const totalViews = chaptersData?.reduce((sum, chapter) => sum + (chapter.views || 0), 0) || 0;
        const totalLikes = chaptersData?.reduce((sum, chapter) => sum + (chapter.likes || 0), 0) || 0;

        return {
          ...book,
          published_chapters_count: chaptersData?.length || 0,
          total_views: totalViews,
          total_likes: totalLikes
        };
      }) || []);

      console.log('Kitaplar başarıyla yüklendi:', booksWithStats);
      setBooks(booksWithStats);
    } catch (error) {
      console.error('Kitaplar yüklenirken hata:', error);
    } finally {
      setLoadingBooks(false);
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderBookItem = ({ item }: { item: Book }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
    >
      <Image
        source={{ uri: item.cover_url }}
        style={styles.bookCover}
        defaultSource={require('../../assets/default-book-cover.png')}
      />
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle}>{item.title}</Text>
        <Text style={styles.bookType}>{item.type}</Text>
        
        <View style={styles.chaptersInfo}>
          <Text style={styles.chapterCount}>
            {item.published_chapters_count} yayında bölüm
          </Text>
          <Text style={styles.updateDate}>
            Son güncelleme: {formatDate(item.updated_at)}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statItem, styles.statItemSpaced]}>
            <Ionicons name="eye-outline" size={16} color="#8E8E93" />
            <Text style={styles.statText}>{formatNumber(item.total_views || 0)}</Text>
          </View>
          <View style={[styles.statItem, styles.statItemSpaced]}>
            <Ionicons name="heart-outline" size={16} color="#8E8E93" />
            <Text style={styles.statText}>{formatNumber(item.total_likes || 0)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const handleLogout = async () => {
    try {
      await logout();
      // Ana stack navigator'a erişip navigasyon durumunu sıfırlıyoruz
      const rootNavigation = navigation.getParent()?.getParent();
      if (rootNavigation) {
        rootNavigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      }
    } catch (error) {
      console.error('Çıkış hatası:', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
    }
  };

  const handleFollowersPress = () => {
    setActiveTab('followers');
    setShowFollowersModal(true);
  };

  const handleFollowingPress = () => {
    setActiveTab('following');
    setShowFollowersModal(true);
  };

  if (profileLoading || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B4EFF" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => {
              console.log('✏️ Profili Düzenle butonuna basıldı');
              navigation.navigate('EditProfile');
            }}
          >
            <Ionicons name="create-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowSettingsModal(true)}
          >
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profil Bilgileri ve Kitaplar */}
      <FlatList
        data={books}
        renderItem={renderBookItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => (
          <>
            {/* Profil Bilgileri */}
            <ImageBackground
              source={{ uri: profile?.cover_url || 'https://sqpyzzzwgzclppdqedjn.supabase.co/storage/v1/object/public/defaults/default-cover.jpg' }}
              style={styles.coverImageBg}
            >
              <View style={styles.profileInfo}>
                <Image
                  source={{
                    uri: profile?.avatar_url || 'https://sqpyzzzwgzclppdqedjn.supabase.co/storage/v1/object/public/defaults/default-avatar.png',
                  }}
                  style={styles.profileImage}
                />
                <Text style={styles.username}>@{profile?.username || 'kullanıcı'}</Text>
                <Text style={styles.name}>{profile?.name || 'İsimsiz Kullanıcı'}</Text>
              </View>
            </ImageBackground>

            {/* İstatistikler */}
            <View style={styles.userStats}>
              <TouchableOpacity style={styles.userStatItem} onPress={handleFollowersPress}>
                <Text style={styles.statNumber}>{formatNumber(profile?.followers_count || 0)}</Text>
                <Text style={styles.statLabel}>Takipçi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.userStatItem} onPress={handleFollowingPress}>
                <Text style={styles.statNumber}>{formatNumber(profile?.following_count || 0)}</Text>
                <Text style={styles.statLabel}>Takip Edilen</Text>
              </TouchableOpacity>
              <View style={styles.userStatItem}>
                <Text style={styles.statNumber}>{formatNumber(profile?.works_count || 0)}</Text>
                <Text style={styles.statLabel}>Çalışma</Text>
              </View>
              <View style={styles.userStatItem}>
                <Text style={styles.statNumber}>{formatNumber(profile?.likes_count || 0)}</Text>
                <Text style={styles.statLabel}>Beğeni</Text>
              </View>
            </View>

            {/* Kitaplarım Başlığı */}
            <Text style={styles.sectionTitle}>Kitaplarım</Text>
          </>
        )}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          loadingBooks ? (
            <ActivityIndicator size="large" color="#6B4EFF" style={styles.loading} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Henüz kitap eklenmemiş</Text>
            </View>
          )
        }
      />

      {/* Ayarlar Modalı */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: '#1C1E2D' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ayarlar</Text>
              <TouchableOpacity 
                onPress={() => setShowSettingsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  // Bildirim ayarları sayfasına yönlendir
                }}
              >
                <Ionicons name="notifications-outline" size={24} color="#FFF" />
                <Text style={styles.modalItemText}>Bildirim Ayarları</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalItem, styles.logoutItem]}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={24} color="#FF4444" />
                <Text style={styles.logoutText}>Çıkış Yap</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Takipçiler/Takip Edilenler Modalı */}
      {user && (
        <FollowersModal
          visible={showFollowersModal}
          onClose={() => setShowFollowersModal(false)}
          userId={user.id}
          initialTab={activeTab}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1E2D',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1E2D',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1E2D',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6B5DE0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: '#1C1E2D',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 16,
    padding: 8,
  },
  coverImageBg: {
    width: '100%',
    height: 200,
    justifyContent: 'flex-end',
  },
  profileInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#fff',
  },
  username: {
    fontSize: 16,
    color: '#9586FF',
    marginBottom: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderColor: '#2A2C3A',
    backgroundColor: '#1C1E2D',
  },
  userStatItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  loading: {
    marginTop: 20,
  },
  bookItem: {
    flexDirection: 'row',
    backgroundColor: '#2A2B3C',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 4,
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bookTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bookType: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 8,
  },
  chaptersInfo: {
    borderTopWidth: 1,
    borderTopColor: '#3A3B4C',
    paddingTop: 8,
    marginTop: 8,
  },
  chapterCount: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 4,
  },
  updateDate: {
    color: '#6B4EFF',
    fontSize: 12,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
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
    color: '#FFF',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B3C',
  },
  modalItemText: {
    color: '#FFF',
    fontSize: 16,
    marginLeft: 16,
  },
  logoutItem: {
    borderBottomWidth: 0,
    marginTop: 20,
  },
  logoutText: {
    color: '#FF4444',
    fontSize: 16,
    marginLeft: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItemSpaced: {
    marginRight: 16,
  },
  statText: {
    color: '#8E8E93',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default ProfileScreen; 