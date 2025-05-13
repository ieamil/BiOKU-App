import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { useAuth } from '../contexts/AuthContext';

type SearchType = 'books' | 'users';

interface Book {
  id: string;
  title: string;
  cover_url: string;
  type: string;
  user_id: string;
  description?: string;
  status: string;
  views: number;
  likes: number;
  author_name?: string;
  created_at: string;
  updated_at: string;
  user: {
    username: string;
    avatar_url?: string | null;
  };
}

interface User {
  id: string;
  name?: string;
  username: string;
  email?: string;
  avatar_url?: string;
  cover_url?: string;
  followers_count: number;
  following_count: number;
  works_count: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
}

type SearchResult = Book | User;

type SearchScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<TabParamList>
>;

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'books' | 'users'>('books');
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setBooks([]);
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      // Kitapları ara
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .ilike('title', `%${query}%`)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(20);

      if (booksError) throw booksError;

      // Kitapların yazarlarını al
      const userIds = booksData?.map(book => book.user_id) || [];
      const { data: authorsData, error: authorsError } = await supabase
        .from('profiles')
        .select('id, username, name, avatar_url')
        .in('id', userIds);

      if (authorsError) throw authorsError;

      // Her kitap için toplam görüntülenme ve beğeni sayılarını al
      const booksWithStats = await Promise.all((booksData || []).map(async (book) => {
        // Toplam görüntülenme sayısını getir
        const { data: viewsData } = await supabase
          .rpc('get_total_book_views', { book_id: book.id });

        // Toplam beğeni sayısını getir
        const { data: likesData } = await supabase
          .rpc('get_total_book_likes', { book_id: book.id });

        const author = authorsData?.find(a => a.id === book.user_id);
        return {
          id: book.id,
          title: book.title,
          cover_url: book.cover_url,
          type: book.type,
          user_id: book.user_id,
          description: book.description,
          status: book.status,
          views: viewsData || 0,
          likes: likesData || 0,
          author_name: book.author_name || author?.name || author?.username || 'Anonim',
          created_at: book.created_at,
          updated_at: book.updated_at,
          user: {
            username: author?.username || 'Anonim',
            avatar_url: author?.avatar_url
          }
        };
      }));

      // Kullanıcıları ara
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          name,
          avatar_url,
          cover_url,
          followers_count,
          following_count,
          works_count,
          likes_count,
          created_at,
          updated_at
        `)
        .or(`username.ilike.%${query}%, name.ilike.%${query}%`)
        .limit(20);

      if (usersError) throw usersError;

      setBooks(booksWithStats as Book[]);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Arama hatası:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await handleSearch(searchQuery);
    setRefreshing(false);
  }, [searchQuery, handleSearch]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      handleSearch(text);
    }, 500);
  };

  const handleBackPress = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  const handleProfileNavigation = (userId: string) => {
    if (user && userId === user.id) {
      // Kendi profilimize gidiyoruz
      navigation.navigate('Profil');
    } else {
      // Başka bir kullanıcının profiline gidiyoruz
      navigation.navigate('OtherProfile', { userId });
    }
  };

  const renderBookItem = ({ item }: { item: Book }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
    >
      <Image
        source={{ uri: item.cover_url }}
        style={styles.bookCover}
        resizeMode="cover"
      />
      <View style={styles.bookInfo}>
        <View>
          <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.authorName}>Yazar: {item.author_name || item.user.username}</Text>
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={16} color="#FF4B6E" />
            <Text style={styles.statText}>{item.likes}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="eye" size={16} color="#6B4EFF" />
            <Text style={styles.statText}>{item.views}</Text>
          </View>
          <View style={styles.typeContainer}>
            <Text style={styles.typeText}>{item.type}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleProfileNavigation(item.id)}
    >
      <Image
        source={{ uri: item.avatar_url || 'https://sqpyzzzwgzclppdqedjn.supabase.co/storage/v1/object/public/defaults/default-avatar.png' }}
        style={styles.userAvatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.username}>@{item.username}</Text>
        <Text style={styles.name}>{item.name || 'İsimsiz Kullanıcı'}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSearchResults = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B4EFF" />
        </View>
      );
    }

    if (!searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={64} color="#2A2B3C" />
          <Text style={styles.emptyText}>Aramaya başla...</Text>
        </View>
      );
    }

    return (
      <View style={styles.resultsContainer}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'books' && styles.activeTab]}
            onPress={() => {
              setActiveTab('books');
              Keyboard.dismiss();
            }}
          >
            <Text style={[styles.tabText, activeTab === 'books' && styles.activeTabText]}>
              Kitaplar ({books.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.activeTab]}
            onPress={() => {
              setActiveTab('users');
              Keyboard.dismiss();
            }}
          >
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
              Hesaplar ({users.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'books' ? (
          books.length > 0 ? (
            <FlatList
              data={books}
              renderItem={renderBookItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#6B4EFF']}
                  tintColor="#6B4EFF"
                />
              }
              onScroll={() => Keyboard.dismiss()}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Kitap bulunamadı</Text>
            </View>
          )
        ) : (
          users.length > 0 ? (
            <FlatList
              data={users}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#6B4EFF']}
                  tintColor="#6B4EFF"
                />
              }
              onScroll={() => Keyboard.dismiss()}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Hesap bulunamadı</Text>
            </View>
          )
        )}
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Kitap veya kullanıcı ara..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              onSubmitEditing={() => {
                Keyboard.dismiss();
                handleSearch(searchQuery);
              }}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setBooks([]);
                  setUsers([]);
                  Keyboard.dismiss();
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#8E8E93" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {renderSearchResults()}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1E2D',
  },
  header: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2B3C',
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
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  sectionContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  bookItem: {
    flexDirection: 'row',
    backgroundColor: '#2A2B3C',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bookCover: {
    width: 90,
    height: 130,
    borderRadius: 8,
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
  authorName: {
    fontSize: 14,
    color: '#6B4EFF',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  typeContainer: {
    backgroundColor: '#1C1E2D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    color: '#6B4EFF',
    fontWeight: '600',
  },
  userItem: {
    flexDirection: 'row',
    backgroundColor: '#2A2B3C',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    color: '#8E8E93',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#2A2B3C',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#6B4EFF',
  },
  tabText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingVertical: 8,
  },
});

export default SearchScreen; 