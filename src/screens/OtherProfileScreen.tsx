import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ImageBackground,
  Alert,
  FlatList,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import FollowersModal from '../components/FollowersModal';

type Props = NativeStackScreenProps<RootStackParamList, 'OtherProfile'>;

interface Profile {
  id: string;
  username: string;
  name: string;
  avatar_url: string;
  cover_url: string;
  followers_count: number;
  following_count: number;
  works_count: number;
  likes_count: number;
}

interface Book {
  id: string;
  title: string;
  type: string;
  cover_url: string;
  description: string;
  published_chapters_count: number;
  total_views: number;
  total_likes: number;
  updated_at: string;
}

const OtherProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { userId } = route.params;
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');

  useEffect(() => {
    loadProfileData();
    checkFollowStatus();
  }, [userId]);

  const loadProfileData = async () => {
    try {
      // Profil bilgilerini yükle
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          followers:follows_count_followers(count),
          following:follows_count_following(count)
        `)
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Takipçi ve takip edilen sayılarını ayarla
      const followers = profileData.followers?.[0]?.count || 0;
      const following = profileData.following?.[0]?.count || 0;

      setProfile({
        ...profileData,
        followers_count: followers,
        following_count: following
      });

      // Kullanıcının kitaplarını yükle
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'published')
        .order('updated_at', { ascending: false });

      if (booksError) throw booksError;

      // Her kitap için istatistikleri al
      const booksWithStats = await Promise.all(booksData?.map(async (book) => {
        const { data: chaptersData, error: chaptersError } = await supabase
          .from('chapters')
          .select('views, likes')
          .eq('book_id', book.id)
          .eq('status', 'published');

        if (chaptersError) throw chaptersError;

        const totalViews = chaptersData?.reduce((sum, chapter) => sum + (chapter.views || 0), 0) || 0;
        const totalLikes = chaptersData?.reduce((sum, chapter) => sum + (chapter.likes || 0), 0) || 0;

        return {
          ...book,
          published_chapters_count: chaptersData?.length || 0,
          total_views: totalViews,
          total_likes: totalLikes
        };
      }) || []);

      setBooks(booksWithStats);
    } catch (error) {
      console.error('Profil bilgileri yüklenirken hata:', error);
    } finally {
      setLoading(false);
      setLoadingBooks(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Takip durumu kontrol edilirken hata:', error);
    }
  };

  const handleFollow = async () => {
    if (!user || !profile) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Takibi bırak
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;

        setIsFollowing(false);
        setProfile(prev => prev ? {
          ...prev,
          followers_count: Math.max(0, prev.followers_count - 1)
        } : null);

      } else {
        // Takip et
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: userId
          });

        if (error) throw error;

        setIsFollowing(true);
        setProfile(prev => prev ? {
          ...prev,
          followers_count: prev.followers_count + 1
        } : null);
      }
    } catch (error) {
      console.error('Takip işlemi sırasında hata:', error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu');
    } finally {
      setFollowLoading(false);
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

  const handleFollowersPress = () => {
    setActiveTab('followers');
    setShowFollowersModal(true);
  };

  const handleFollowingPress = () => {
    setActiveTab('following');
    setShowFollowersModal(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B4EFF" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Profil bulunamadı</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.coverContainer}>
          <Image
            source={{ 
              uri: profile.cover_url || 'https://sqpyzzzwgzclppdqedjn.supabase.co/storage/v1/object/public/defaults/default-cover.jpg'
            }}
            style={styles.coverImage}
          />
          <View style={styles.profileInfoContainer}>
            <Image
              source={{
                uri: profile.avatar_url || 'https://sqpyzzzwgzclppdqedjn.supabase.co/storage/v1/object/public/defaults/default-avatar.png'
              }}
              style={styles.profileImage}
            />
            <Text style={styles.username}>@{profile.username}</Text>
            <Text style={styles.name}>{profile.name || 'İsimsiz Kullanıcı'}</Text>
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing && styles.followingButton,
                followLoading && styles.loadingButton
              ]}
              onPress={handleFollow}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.followButtonText}>
                  {isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.userStats}>
          <TouchableOpacity style={styles.userStatItem} onPress={handleFollowersPress}>
            <Text style={styles.statNumber}>{formatNumber(profile.followers_count || 0)}</Text>
            <Text style={styles.statLabel}>Takipçi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.userStatItem} onPress={handleFollowingPress}>
            <Text style={styles.statNumber}>{formatNumber(profile.following_count || 0)}</Text>
            <Text style={styles.statLabel}>Takip Edilen</Text>
          </TouchableOpacity>
          <View style={styles.userStatItem}>
            <Text style={styles.statNumber}>{formatNumber(profile.works_count || 0)}</Text>
            <Text style={styles.statLabel}>Çalışma</Text>
          </View>
          <View style={styles.userStatItem}>
            <Text style={styles.statNumber}>{formatNumber(profile.likes_count || 0)}</Text>
            <Text style={styles.statLabel}>Beğeni</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Kitaplar</Text>

        {loadingBooks ? (
          <ActivityIndicator size="large" color="#6B4EFF" style={styles.loading} />
        ) : books.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Henüz kitap eklenmemiş</Text>
          </View>
        ) : (
          <View style={styles.booksList}>
            {books.map((book) => (
              <TouchableOpacity
                key={book.id}
                style={styles.bookItem}
                onPress={() => navigation.navigate('BookDetail', { bookId: book.id })}
              >
                <Image
                  source={{ uri: book.cover_url }}
                  style={styles.bookCover}
                  defaultSource={require('../../assets/default-book-cover.png')}
                />
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  <Text style={styles.bookType}>{book.type}</Text>
                  
                  <View style={styles.chaptersInfo}>
                    <Text style={styles.chapterCount}>
                      {book.published_chapters_count} yayında bölüm
                    </Text>
                    <Text style={styles.updateDate}>
                      Son güncelleme: {formatDate(book.updated_at)}
                    </Text>
                  </View>

                  <View style={styles.statsContainer}>
                    <View style={[styles.statItem, styles.statItemSpaced]}>
                      <Ionicons name="eye-outline" size={16} color="#8E8E93" />
                      <Text style={styles.statText}>{formatNumber(book.total_views || 0)}</Text>
                    </View>
                    <View style={[styles.statItem, styles.statItemSpaced]}>
                      <Ionicons name="heart-outline" size={16} color="#8E8E93" />
                      <Text style={styles.statText}>{formatNumber(book.total_likes || 0)}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Takipçiler/Takip Edilenler Modalı */}
      {profile && (
        <FollowersModal
          visible={showFollowersModal}
          onClose={() => setShowFollowersModal(false)}
          userId={profile.id}
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
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(42, 43, 60, 0.8)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  coverContainer: {
    width: '100%',
    height: 280,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2A2B3C',
  },
  profileInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 24,
    backgroundColor: 'rgba(28, 30, 45, 0.9)',
    alignItems: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#1C1E2D',
    backgroundColor: '#2A2B3C',
  },
  username: {
    fontSize: 16,
    color: '#9586FF',
    marginBottom: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  followButton: {
    backgroundColor: '#6B4EFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 140,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  followingButton: {
    backgroundColor: '#2A2B3C',
    borderWidth: 1,
    borderColor: '#6B4EFF',
  },
  followButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingButton: {
    opacity: 0.7,
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
    fontSize: 14,
    color: '#8E8E93',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  loading: {
    marginTop: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
  },
  booksList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  bookItem: {
    flexDirection: 'row',
    backgroundColor: '#2A2B3C',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#1C1E2D',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bookType: {
    fontSize: 14,
    color: '#6B4EFF',
    marginBottom: 8,
  },
  chaptersInfo: {
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#3A3B4C',
  },
  chapterCount: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  updateDate: {
    fontSize: 12,
    color: '#6B4EFF',
  },
  statsContainer: {
    flexDirection: 'row',
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
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
});

export default OtherProfileScreen; 