import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Category'>;

interface Book {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  views: number;
  likes: number;
  chapters_count: number;
  created_at: string;
}

type SortType = 'views' | 'created_at';

const categoryDescriptions = {
  romantik: {
    title: 'Romantik\nHikayeler',
    description: 'Aşk, tutku ve romantizmin en güzel örnekleri... Kalpleri ısıtan, duyguları harekete geçiren hikayeler burada.',
    banner: require('../../assets/categories/romantic-banner.jpg')
  },
  bilim_kurgu: {
    title: 'Bilim Kurgu\nMaceraları',
    description: 'Uzay, teknoloji ve bilimin sınırlarını zorlayan, geleceğe ışık tutan, hayal gücünüzü genişleten hikayeler.',
    banner: require('../../assets/categories/scifi-banner.jpg')
  },
  fantastik: {
    title: 'Fantastik\nHikayeler',
    description: 'Büyülü dünyaların kapılarını aralayan, hayal gücünüzü zorlayan hikayeler...',
    banner: require('../../assets/categories/fantasy-banner.jpg')
  },
  gerilim_korku: {
    title: 'Gerilim ve Korku\nHikayeleri',
    description: 'Kalbinizi hızlandıracak, nefesinizi tutturacak, geceleri uykularınızı kaçıracak hikayeler...',
    banner: require('../../assets/categories/horror-banner.jpg')
  },
  macera: {
    title: 'Macera Dolu\nHikayeler',
    description: 'Heyecan verici yolculuklar, beklenmedik keşifler ve unutulmaz maceralar sizi bekliyor.',
    banner: require('../../assets/categories/adventure-banner.jpg')
  },
  aksiyon: {
    title: 'Aksiyon\nHikayeleri',
    description: 'Hızlı tempolu, nefes kesen, adrenalin dolu hikayeler... Her sayfada yeni bir heyecan!',
    banner: require('../../assets/categories/action-banner.jpg')
  },
  dram: {
    title: 'Dram\nHikayeleri',
    description: 'İnsan ruhunun derinliklerine inen, duygu yüklü, etkileyici hikayeler...',
    banner: require('../../assets/categories/drama-banner.jpg')
  },
  komedi: {
    title: 'Komedi\nHikayeleri',
    description: 'Gülümseten, eğlendiren, neşelendiren hikayeler... Kahkahanız eksik olmasın!',
    banner: require('../../assets/categories/comedy-banner.jpg')
  },
  gizem_polisiye: {
    title: 'Gizem ve Polisiye\nHikayeleri',
    description: 'Sırlar, ipuçları, beklenmedik sonlar... Dedektiflik yeteneklerinizi konuşturun!',
    banner: require('../../assets/categories/mystery-banner.jpg')
  },
  tarihi_kurgu: {
    title: 'Tarihi Kurgu\nHikayeleri',
    description: 'Geçmişin derinliklerinde yolculuğa çıkın, tarihin önemli anlarına tanık olun.',
    banner: require('../../assets/categories/historical-banner.jpg')
  },
  distopya: {
    title: 'Distopya\nHikayeleri',
    description: 'Karanlık gelecek senaryoları, toplumsal eleştiriler ve düşündürücü hikayeler...',
    banner: require('../../assets/categories/dystopia-banner.jpg')
  },
  genc_yetiskin: {
    title: 'Genç Yetişkin\nHikayeleri',
    description: 'Büyüme, kendini keşfetme ve hayatı anlama yolculuğunda size eşlik edecek hikayeler.',
    banner: require('../../assets/categories/ya-banner.jpg')
  },
  kisa_hikaye: {
    title: 'Kısa Hikayeler',
    description: 'Her biri kendi başına bir dünya olan, sizi farklı yaşamlara götüren, düşündüren ve hissettiren özenle seçilmiş kısa hikayeler...',
    banner: require('../../assets/categories/shortstory-banner.jpg')
  },
  siir: {
    title: 'Şiir\nKöşesi',
    description: 'Duyguların en güzel ifadesi, kelimelerin dansı, ruhun şarkısı...',
    banner: require('../../assets/categories/poetry-banner.jpg')
  },
  askeri_kurgu: {
    title: 'Askeri Kurgu\nHikayeleri',
    description: 'Savaş, strateji, kahramanlık ve fedakarlık hikayeleri...',
    banner: require('../../assets/categories/military-banner.jpg')
  }
};

type CategoryType = keyof typeof categoryDescriptions;

const CategoryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { type } = route.params;
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSort, setSelectedSort] = useState<SortType>('views');

  useEffect(() => {
    loadCategoryBooks();
  }, [selectedSort]);

  const loadCategoryBooks = async () => {
    try {
      setLoading(true);
      
      // Kitapları getir
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('type', type)
        .eq('status', 'published')
        .order(selectedSort, { ascending: false })
        .limit(20);

      if (booksError) throw booksError;

      // Her kitap için bölüm sayısını ve istatistikleri getir
      const booksWithStats = await Promise.all((booksData || []).map(async (book) => {
        // Bölüm sayısını getir
        const { count: chaptersCount } = await supabase
          .from('chapters')
          .select('*', { count: 'exact', head: true })
          .eq('book_id', book.id)
          .eq('status', 'published');

        // Toplam görüntülenme sayısını getir
        const { data: viewsData } = await supabase
          .rpc('get_total_book_views', { book_id: book.id });

        // Toplam beğeni sayısını getir
        const { data: likesData } = await supabase
          .rpc('get_total_book_likes', { book_id: book.id });

        return {
          ...book,
          chapters_count: chaptersCount || 0,
          views: viewsData || 0,
          likes: likesData || 0
        };
      }));

      setBooks(booksWithStats);
    } catch (error) {
      console.error('Kitaplar yüklenirken hata:', error);
    } finally {
      setLoading(false);
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

  const renderBookItem = ({ item, index }: { item: Book; index: number }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
    >
      <View style={styles.indexContainer}>
        <Text style={styles.indexNumber}>{index + 1}</Text>
      </View>
      <Image
        source={{ uri: item.cover_url }}
        style={styles.bookCover}
        defaultSource={require('../../assets/default-book-cover.png')}
      />
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.bookDescription} numberOfLines={2}>{item.description}</Text>
        <View style={styles.bookStats}>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={16} color="#8E8E93" />
            <Text style={styles.statText}>{formatNumber(item.views || 0)}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="heart-outline" size={16} color="#8E8E93" />
            <Text style={styles.statText}>{formatNumber(item.likes || 0)}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="document-text-outline" size={16} color="#8E8E93" />
            <Text style={styles.statText}>{item.chapters_count || 0} Bölüm</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B4EFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={categoryDescriptions[type].banner}
        style={styles.banner}
        imageStyle={styles.bannerImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(89, 86, 233, 0.95)', 'rgba(89, 86, 233, 0.7)']}
          style={styles.overlay}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.categoryTitle}>{categoryDescriptions[type].title}</Text>
            <Text style={styles.categoryDescription}>{categoryDescriptions[type].description}</Text>
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.content}>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[
              styles.sortButton,
              selectedSort === 'views' && styles.selectedSortButton
            ]}
            onPress={() => setSelectedSort('views')}
          >
            <Text style={[
              styles.sortButtonText,
              selectedSort === 'views' && styles.selectedSortButtonText
            ]}>En Çok Okunanlar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              selectedSort === 'created_at' && styles.selectedSortButton
            ]}
            onPress={() => setSelectedSort('created_at')}
          >
            <Text style={[
              styles.sortButtonText,
              selectedSort === 'created_at' && styles.selectedSortButtonText
            ]}>Yeni Çıkanlar</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={books}
          renderItem={renderBookItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.booksList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={64} color="#6B4EFF" />
              <Text style={styles.emptyTitle}>Henüz Kitap Yok</Text>
              <Text style={styles.emptyDescription}>
                Bu kategoride henüz yayınlanmış bir kitap bulunmuyor.{'\n'}
                Daha sonra tekrar kontrol edebilirsiniz.
              </Text>
            </View>
          )}
        />
      </View>
    </View>
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
  banner: {
    height: 220,
    width: '100%',
  },
  bannerImage: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  overlay: {
    flex: 1,
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 40,
  },
  categoryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'left',
  },
  categoryDescription: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 22,
    textAlign: 'left',
    maxWidth: '90%',
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  sortButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#2A2B3C',
    alignItems: 'center',
  },
  selectedSortButton: {
    backgroundColor: '#6B4EFF',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  selectedSortButtonText: {
    color: '#FFFFFF',
  },
  booksList: {
    padding: 16,
  },
  bookItem: {
    flexDirection: 'row',
    backgroundColor: '#2A2B3C',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  indexContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#6B4EFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -10,
    left: -10,
    zIndex: 1,
  },
  indexNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bookCover: {
    width: 100,
    height: 150,
  },
  bookInfo: {
    flex: 1,
    padding: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  bookDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
    lineHeight: 20,
  },
  bookStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default CategoryScreen; 