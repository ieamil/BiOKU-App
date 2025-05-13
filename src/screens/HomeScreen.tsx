import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

type Props = BottomTabScreenProps<any>;

type CategoryType = 
  | 'romantik'
  | 'bilim_kurgu'
  | 'fantastik'
  | 'gerilim_korku'
  | 'macera'
  | 'aksiyon'
  | 'dram'
  | 'komedi'
  | 'gizem_polisiye'
  | 'tarihi_kurgu'
  | 'distopya'
  | 'genc_yetiskin'
  | 'kisa_hikaye'
  | 'siir'
  | 'askeri_kurgu';

interface BookCategory {
  id: string;
  name: string;
  icon: string;
}

interface Book {
  id: string;
  title: string;
  cover_url: string;
  type: string;
  updated_at: string;
  likes: number;
  views: number;
  user_id: string;
}

interface Category {
  id: number;
  name: string;
  type: CategoryType;
  icon?: any;
  isMoreButton?: boolean;
}

const mainCategories: Category[] = [
  {
    id: 1,
    name: 'Romantik',
    type: 'romantik',
    icon: require('../../assets/categories/romantic-icon.png'),
  },
  {
    id: 2,
    name: 'Bilim Kurgu',
    type: 'bilim_kurgu',
    icon: require('../../assets/categories/scifi-icon.png'),
  },
  {
    id: 3,
    name: 'Fantastik',
    type: 'fantastik',
    icon: require('../../assets/categories/fantasy-icon.png'),
  },
  {
    id: 4,
    name: 'Gerilim / Korku',
    type: 'gerilim_korku',
    icon: require('../../assets/categories/horror-icon.png'),
  },
  {
    id: 5,
    name: 'Macera',
    type: 'macera',
    icon: require('../../assets/categories/adventure-icon.png'),
  },
  {
    id: 6,
    name: 'Aksiyon',
    type: 'aksiyon',
    icon: require('../../assets/categories/action-icon.png'),
  },
  {
    id: 7,
    name: 'Dram',
    type: 'dram',
    icon: require('../../assets/categories/drama-icon.png'),
  },
  {
    id: 8,
    name: 'Hepsini Gör...',
    type: 'romantik',
    isMoreButton: true,
  }
];

export const allCategories = [
  ...mainCategories.slice(0, -1),
  { 
    id: '8', 
    name: 'Komedi', 
    icon: require('../../assets/categories/comedy-icon.png'),
    color: '#6B4EFF'
  },
  { 
    id: '9', 
    name: 'Gizem / Polisiye', 
    icon: require('../../assets/categories/mystery-icon.png'),
    color: '#6B4EFF'
  },
  { 
    id: '10', 
    name: 'Tarihi Kurgu', 
    icon: require('../../assets/categories/historical-icon.png'),
    color: '#6B4EFF'
  },
  { 
    id: '11', 
    name: 'Distopya', 
    icon: require('../../assets/categories/dystopia-icon.png'),
    color: '#6B4EFF'
  },
  { 
    id: '12', 
    name: 'Genç Yetişkin', 
    icon: require('../../assets/categories/ya-icon.png'),
    color: '#6B4EFF'
  },
  { 
    id: '13', 
    name: 'Kısa Hikaye', 
    icon: require('../../assets/categories/shortstory-icon.png'),
    color: '#6B4EFF'
  },
  { 
    id: '14', 
    name: 'Şiir', 
    icon: require('../../assets/categories/poetry-icon.png'),
    color: '#6B4EFF'
  },
  { 
    id: '15', 
    name: 'Askeri Kurgu', 
    icon: require('../../assets/categories/military-icon.png'),
    color: '#6B4EFF'
  }
];

const categoryTypeMap: Record<string, string> = {
  'Romantik': 'romantik',
  'Bilim Kurgu': 'bilim_kurgu',
  'Fantastik': 'fantastik',
  'Gerilim / Korku': 'gerilim_korku',
  'Macera': 'macera',
  'Aksiyon': 'aksiyon',
  'Dram': 'dram',
  'Komedi': 'komedi',
  'Gizem / Polisiye': 'gizem_polisiye',
  'Tarihi Kurgu': 'tarihi_kurgu',
  'Distopya': 'distopya',
  'Genç Yetişkin': 'genc_yetiskin',
  'Kısa Hikaye': 'kisa_hikaye',
  'Şiir': 'siir',
  'Askeri Kurgu': 'askeri_kurgu'
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [frequentlyUpdated, setFrequentlyUpdated] = useState<Book[]>([]);
  const [mostLiked, setMostLiked] = useState<Book[]>([]);
  const [mostViewed, setMostViewed] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      // Son güncellenen kitapları getir
      const { data: frequentData, error: frequentError } = await supabase
        .from('books')
        .select('*')
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (frequentError) throw frequentError;
      setFrequentlyUpdated(frequentData || []);

      // En çok beğenilen kitapları getir
      const { data: likedData, error: likedError } = await supabase
        .from('books')
        .select('*')
        .eq('status', 'published')
        .order('likes', { ascending: false })
        .limit(10);

      if (likedError) throw likedError;
      setMostLiked(likedData || []);

      // En çok görüntülenen kitapları getir
      const { data: viewedData, error: viewedError } = await supabase
        .from('books')
        .select('*, total_views:views')
        .eq('status', 'published')
        .order('views', { ascending: false })
        .limit(10);

      if (viewedError) throw viewedError;
      
      // Görüntülenme sayısına göre sırala
      const sortedByViews = viewedData?.sort((a, b) => (b.views || 0) - (a.views || 0)) || [];
      setMostViewed(sortedByViews);

    } catch (error) {
      console.error('Kitaplar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (category: BookCategory) => {
    if (category.id === '8') {
      navigation.navigate('Categories');
    } else {
      navigation.navigate('Category', { 
        category: category.name 
      });
    }
  };

  const handleBookPress = (book: Book) => {
    navigation.navigate('BookDetail', { bookId: book.id });
  };

  const renderCategoryItem = ({ item }: { item: Category }) => {
    const handlePress = () => {
      if (item.isMoreButton) {
        navigation.navigate('Categories');
      } else {
        navigation.navigate('Category', { type: item.type });
      }
    };

    return (
      <TouchableOpacity
        style={styles.categoryItem}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.categoryIconContainer}>
          {item.isMoreButton ? (
            <Ionicons name="grid-outline" size={24} color="#FFFFFF" />
          ) : (
            <Image source={item.icon} style={styles.categoryIcon} />
          )}
        </View>
        <Text style={styles.categoryName}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  const renderBookItem = ({ item }: { item: Book }) => (
    <TouchableOpacity 
      style={styles.bookItem}
      onPress={() => handleBookPress(item)}
    >
      <Image
        source={{ uri: item.cover_url }}
        style={styles.bookCover}
        defaultSource={require('../../assets/default-book-cover.png')}
      />
      <Text style={styles.bookTitle} numberOfLines={2}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B5DE0" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}> Daha fazla kitap türü keşfet!</Text>
        <View style={styles.categoriesContainer}>
          <FlatList
            data={mainCategories}
            renderItem={renderCategoryItem}
            keyExtractor={item => item.id.toString()}
            numColumns={4}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            contentContainerStyle={styles.categoryList}
          />
        </View>

        <Text style={styles.sectionTitle}>Son Güncellenenler!</Text>
        <FlatList
          horizontal
          data={frequentlyUpdated}
          renderItem={renderBookItem}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalList}
        />

        <Text style={styles.sectionTitle}>En Çok Beğenilen Hikayeler</Text>
        <FlatList
          horizontal
          data={mostLiked}
          renderItem={renderBookItem}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalList}
        />

        <Text style={styles.sectionTitle}>En Çok Okunanlar</Text>
        <FlatList
          horizontal
          data={mostViewed}
          renderItem={renderBookItem}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          style={[styles.horizontalList, styles.lastList]}
        />
      </ScrollView>
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
  header: {
    height: 80,
    backgroundColor: '#1C1E2D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B3C',
    paddingTop: 20,
  },
  logo: {
    width: 140,
    height: 50,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flex: 1,
    height: 40,
    backgroundColor: '#2A2B3C',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2B3C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 16,
    marginLeft: 16,
  },
  categoriesContainer: {
    paddingLeft: 16,
    marginBottom: 16,
  },
  categoryList: {
    paddingVertical: 4,
  },
  categoryItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 8,
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6B4EFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    tintColor: '#FFFFFF',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 2,
  },
  horizontalList: {
    paddingLeft: 16,
  },
  lastList: {
    marginBottom: 24,
  },
  bookItem: {
    width: 120,
    marginRight: 16,
  },
  bookCover: {
    width: 120,
    height: 180,
    borderRadius: 8,
    backgroundColor: '#2A2C3A',
  },
  bookTitle: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});

export default HomeScreen; 