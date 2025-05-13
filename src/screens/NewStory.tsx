import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode as base64Decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CreateStoryStackParamList } from '../navigation/CreateStoryStack';
import { useAuth } from '../contexts/AuthContext';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<CreateStoryStackParamList, 'NewStory'>;

type BookType =
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

interface BookData {
  title: string;
  type: BookType;
  description: string;
  views?: number;
  likes?: number;
  chapters_count?: number;
  published_chapters_count?: number;
  draft_chapters_count?: number;
  status?: 'draft' | 'published';
  user_id?: string;
  cover_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface Chapter {
  id: string;
  title: string;
  status: 'draft' | 'published';
  views: number;
  likes: number;
  comments: number;
  created_at: string;
}

const BOOK_TYPES: { label: string; value: BookType }[] = [
  { label: 'Romantik', value: 'romantik' },
  { label: 'Bilim Kurgu', value: 'bilim_kurgu' },
  { label: 'Fantastik', value: 'fantastik' },
  { label: 'Gerilim / Korku', value: 'gerilim_korku' },
  { label: 'Macera', value: 'macera' },
  { label: 'Aksiyon', value: 'aksiyon' },
  { label: 'Dram', value: 'dram' },
  { label: 'Komedi', value: 'komedi' },
  { label: 'Gizem / Polisiye', value: 'gizem_polisiye' },
  { label: 'Tarihi Kurgu', value: 'tarihi_kurgu' },
  { label: 'Distopya', value: 'distopya' },
  { label: 'Genç Yetişkin', value: 'genc_yetiskin' },
  { label: 'Kısa Hikaye', value: 'kisa_hikaye' },
  { label: 'Şiir', value: 'siir' },
  { label: 'Askeri Kurgu', value: 'askeri_kurgu' }
];

type TabType = 'general' | 'chapters';
const TABS: TabType[] = ['general', 'chapters'];

const isTabType = (value: string): value is TabType => {
  return value === 'general' || value === 'chapters';
};

type AspectOption = {
  label: string;
  value: [number, number];
};

const NewStory: React.FC<Props> = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>(TABS[0]);
  const [bookId, setBookId] = useState<string | null>(route.params?.bookId || null);
  const [bookData, setBookData] = useState<BookData>({
    title: '',
    type: 'aksiyon',
    description: '',
  });
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [aspectRatio, setAspectRatio] = useState<[number, number]>([2, 3]);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerBackButtonMenuEnabled: false,
    });
  }, [navigation]);

  const handleChapterReorder = async (newData: Chapter[]) => {
    try {
      if (!user) return;
      
      // Önce state'i güncelle
      setChapters(newData);
      
      // Her bölümü tek tek güncelle
      for (const [index, chapter] of newData.entries()) {
        const { error } = await supabase
          .from('chapters')
          .update({ 
            order: index + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', chapter.id);

        if (error) {
          console.error('Güncelleme hatası:', error);
          throw error;
        }
      }

      // Bölümleri yeniden yükle
      loadChapters();
    } catch (error) {
      console.error('Bölümleri yeniden sıralarken hata:', error);
      Alert.alert('Hata', 'Bölümleri yeniden sıralarken bir hata oluştu');
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    try {
      Alert.alert(
        'Bölümü Sil',
        'Bu bölümü silmek istediğinizden emin misiniz?',
        [
          {
            text: 'İptal',
            style: 'cancel'
          },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: async () => {
              const { error } = await supabase
                .from('chapters')
                .delete()
                .eq('id', chapterId);

              if (error) throw error;

              // Bölümleri yeniden yükle
              loadChapters();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Bölüm silinirken hata:', error);
      Alert.alert('Hata', 'Bölüm silinirken bir hata oluştu');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 3],
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      try {
        const processedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [],
          { 
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
            compress: 1
          }
        );

        setImage(processedImage.uri);
      } catch (error) {
        console.error('Resim işleme hatası:', error);
        Alert.alert('Hata', 'Görsel işlenirken bir hata oluştu');
      }
    }
  };

  const handleImagePick = async (selectedAspect: [number, number]) => {
    setAspectRatio(selectedAspect);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: selectedAspect,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      try {
        let width = 512;
        let height = Math.round(width * (selectedAspect[1] / selectedAspect[0]));

        const resizedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width, height } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        setImage(resizedImage.uri);
      } catch (error) {
        console.error('Resim işleme hatası:', error);
        Alert.alert('Hata', 'Görsel boyutlandırılırken bir hata oluştu');
      }
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Oturum açmanız gerekiyor');
      return;
    }

    if (!bookData.title.trim()) {
      Alert.alert('Lütfen kitap adını giriniz');
      return;
    }

    if (!bookId && !image) {
      Alert.alert('Lütfen bir kapak fotoğrafı seçiniz');
      return;
    }

    try {
      setLoading(true);
      let coverUrl = image;

      if (image && !image.startsWith('https')) {
        const response = await fetch(image);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(blob);
        const base64Data = await base64Promise;
        const base64String = base64Data.split(',')[1];

        const fileExt = 'jpg';
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('book_covers')
          .upload(filePath, base64Decode(base64String), {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Kapak fotoğrafı yüklenemedi: ' + uploadError.message);
        }

        const { data } = supabase.storage
          .from('book_covers')
          .getPublicUrl(filePath);

          if (!data?.publicURL) {
            throw new Error('Public URL alınamadı');
          }
          
          coverUrl = data.publicURL;
          
      }

      // Önce kitabın mevcut durumunu kontrol et
      let currentBookStatus = 'draft';
      if (bookId) {
        const { data: publishedChapters, error: chaptersError } = await supabase
          .from('chapters')
          .select('status')
          .eq('book_id', bookId)
          .eq('status', 'published');

        if (chaptersError) throw chaptersError;

        if (publishedChapters && publishedChapters.length > 0) {
          currentBookStatus = 'published';
        }
      }

      const bookDataToSave = {
        title: bookData.title.trim(),
        type: bookData.type,
        description: bookData.description.trim(),
        status: currentBookStatus,
        user_id: user.id,
        cover_url: coverUrl,
      };

      let savedBook;
      
      if (bookId) {
        const { data, error: updateError } = await supabase
          .from('books')
          .update(bookDataToSave)
          .eq('id', bookId)
          .select()
          .single();

        if (updateError) throw updateError;
        savedBook = data;
      } else {
        const { data, error: insertError } = await supabase
          .from('books')
          .insert([{
            ...bookDataToSave,
            created_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        savedBook = data;
      }

      setBookId(savedBook.id);
      
      Alert.alert(
        'Başarılı',
        'Değişiklikler kaydedildi.',
        [
          {
            text: 'Tamam',
            onPress: () => navigation.navigate('CreateStoryMain')
          }
        ]
      );
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Hata', error instanceof Error ? error.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadBookData = async () => {
      if (bookId) {
        try {
          // Kitap detaylarını yükle
          const { data, error } = await supabase
            .from('books')
            .select(`
              *,
              chapters:chapters(count),
              published_chapters:chapters(count)
            `)
            .eq('id', bookId)
            .eq('chapters.status', 'published')
            .single();

          if (error) throw error;

          if (data) {
            setBookData({
              title: data.title,
              type: data.type,
              description: data.description || '',
              views: data.views,
              likes: data.likes,
              chapters_count: data.chapters?.count || 0,
              published_chapters_count: data.published_chapters?.count || 0,
              status: data.status,
              user_id: data.user_id,
              cover_url: data.cover_url,
              created_at: data.created_at,
              updated_at: data.updated_at
            });
            setImage(data.cover_url);
            navigation.setOptions({
              title: data.title || 'Yeni Çalışma',
              headerBackTitle: 'Geri',
            });
          }
        } catch (error) {
          console.error('Kitap bilgileri yüklenirken hata:', error);
          Alert.alert('Hata', 'Kitap bilgileri yüklenirken bir hata oluştu');
        }
      } else {
        navigation.setOptions({
          title: 'Yeni Çalışma',
          headerBackTitle: 'Geri',
        });
      }
    };

    loadBookData();
  }, [bookId, navigation]);

  const loadChapters = async () => {
    if (!bookId) return;

    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', bookId)
        .order('order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChapters(data || []);
    } catch (error) {
      console.error('Bölümler yüklenirken hata:', error);
    }
  };

  useEffect(() => {
    if (bookId) {
      loadChapters();

      const unsubscribe = navigation.addListener('focus', () => {
        loadChapters();
      });

      return () => unsubscribe();
    }
  }, [bookId, navigation]);

  const handleDeleteBook = async () => {
    if (!bookId) return;

    try {
      setLoading(true);
      
      console.log('Silinecek kitap ID:', bookId);
      
      // Önce bölümleri sil
      const { error: chaptersError } = await supabase
        .from('chapters')
        .delete()
        .eq('book_id', bookId);

      if (chaptersError) {
        console.error('Bölümler silinirken hata:', chaptersError);
        throw chaptersError;
      }
      console.log('Bölümler başarıyla silindi');

      // Sonra kitabı sil
      const { error: bookError } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);

      if (bookError) {
        console.error('Kitap silinirken hata:', bookError);
        throw bookError;
      }
      console.log('Kitap başarıyla silindi');

      // Başarılı silme mesajını göster
      Alert.alert(
        'Başarılı',
        'Çalışma başarıyla kaldırıldı. İlham perileri seninle olsun.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              navigation.navigate('CreateStoryMain');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Kitap silinirken hata:', error);
      Alert.alert('Hata', 'Kitap silinirken bir hata oluştu');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const renderChapterItem = ({ item, drag, isActive }: RenderItemParams<Chapter>) => {
    const formattedDate = new Date(item.created_at).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <ScaleDecorator>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('EditChapter', { chapterId: item.id });
          }}
          style={[styles.chapterItem, isActive && styles.chapterItemActive]}
        >
          <View style={styles.chapterHeader}>
            <TouchableOpacity 
              onLongPress={drag}
              style={styles.dragHandle}
            >
              <Ionicons name="menu" size={20} color="#8E8E93" />
            </TouchableOpacity>
            
            <Text style={styles.chapterTitle}>{item.title}</Text>
            
            <View style={styles.chapterActions}>
              <View style={styles.chapterStatus}>
                <Text
                  style={[
                    styles.statusText,
                    item.status === 'published'
                      ? styles.publishedStatus
                      : styles.draftStatus,
                  ]}
                >
                  {item.status === 'published' ? 'Yayında' : 'Taslak'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.chapterMenuButton}
                onPress={() => handleDeleteChapter(item.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.chapterStats}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={16} color="#8E8E93" />
              <Text style={styles.statText}>{item.views || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="heart-outline" size={16} color="#8E8E93" />
              <Text style={styles.statText}>{item.likes || 0}</Text>
            </View>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  const renderBookTypeItem = ({ item }: { item: typeof BOOK_TYPES[0] }) => (
    <TouchableOpacity
      style={styles.typeItem}
      onPress={() => {
        setBookData(prev => ({ ...prev, type: item.value }));
        setShowTypeModal(false);
      }}
    >
      <Text style={[
        styles.typeItemText,
        bookData.type === item.value && styles.typeItemTextSelected
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderTypeModal = () => (
    <Modal
      visible={showTypeModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowTypeModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Kitap Türü Seçin</Text>
          <FlatList
            data={BOOK_TYPES}
            renderItem={renderBookTypeItem}
            keyExtractor={(item) => item.value}
            style={styles.typeList}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowTypeModal(false)}
          >
            <Text style={styles.closeButtonText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderDeleteModal = () => (
    <Modal
      visible={showDeleteModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowDeleteModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Kitabı Sil</Text>
          <Text style={styles.deleteWarningText}>
            Yazdıklarının bizim için değerli olduğunu bil! Bu işlemi gerçekleştirirsen tüm bölümler ve çalışma kalıcı olarak silinecektir. Emin misiniz?
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowDeleteModal(false)}
            >
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalDeleteButton]}
              onPress={() => {
                handleDeleteBook();
              }}
              disabled={loading}
            >
              <Text style={styles.modalDeleteButtonText}>
                {loading ? 'Siliniyor...' : 'Evet, Sil'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderGeneralTab = () => (
    <View style={styles.formContainer}>
      <Text style={styles.label}>Kitap Adı:</Text>
      <TextInput
        style={styles.input}
        value={bookData.title}
        onChangeText={(text) => setBookData({ ...bookData, title: text })}
        placeholder="Kitap adını giriniz"
        placeholderTextColor="#8E8E93"
      />
      <Text style={styles.label}>Kitap Türü:</Text>
      <TouchableOpacity
        style={styles.typeSelector}
        onPress={() => setShowTypeModal(true)}
      >
        <View style={styles.typeSelectorContent}>
          <Text style={styles.typeSelectorText}>
            {BOOK_TYPES.find(type => type.value === bookData.type)?.label || 'Tür seçiniz'}
          </Text>
          <Ionicons name="chevron-down" size={24} color="#8E8E93" />
        </View>
      </TouchableOpacity>
      <Text style={styles.label}>Açıklama:</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={bookData.description}
        onChangeText={(text) => setBookData({ ...bookData, description: text })}
        placeholder="Kitap açıklamasını giriniz"
        placeholderTextColor="#8E8E93"
        multiline
        numberOfLines={4}
      />
      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </Text>
      </TouchableOpacity>
      
      {bookId && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => setShowDeleteModal(true)}
        >
          <Text style={styles.deleteButtonText}>Kitabı Sil</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderChaptersTab = () => (
    <View style={[styles.formContainer, { flex: 1 }]}>
      <View style={styles.chaptersContainer}>
        {chapters.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyChaptersText}>Henüz bölüm eklenmemiş</Text>
            <TouchableOpacity
              style={styles.addChapterButton}
              onPress={() => {
                if (bookId) {
                  navigation.navigate('AddNewChapter', { bookId });
                }
              }}
            >
              <Text style={styles.addChapterButtonText}>Yeni Bölüm Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <DraggableFlatList
              data={chapters}
              onDragEnd={({ data }) => handleChapterReorder(data)}
              keyExtractor={(item) => item.id}
              renderItem={renderChapterItem}
              contentContainerStyle={{ paddingBottom: 100 }}
            />
            <View style={styles.floatingButtonContainer}>
              <TouchableOpacity
                style={styles.floatingAddButton}
                onPress={() => {
                  if (bookId) {
                    navigation.navigate('AddNewChapter', { bookId });
                  }
                }}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
                <Text style={styles.floatingAddButtonText}>Yeni Bölüm Ekle</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );

  const renderCoverImage = () => (
    <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
      {image ? (
        <View style={styles.imageWrapper}>
          <Image 
            source={{ uri: image }}
            defaultSource={require('../../assets/default-book-cover.png')}
            style={styles.coverImage}
            resizeMode="cover"
            onLoadStart={() => console.log('Resim yüklenmeye başladı:', image)}
            onLoadEnd={() => console.log('Resim yükleme tamamlandı')}
            onError={(error) => {
              console.error('Resim yükleme hatası detayı:', error.nativeEvent);
              Alert.alert(
                'Uyarı',
                'Kapak fotoğrafı yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.',
                [{ text: 'Tamam' }]
              );
            }}
          />
          <View style={styles.imageOverlay}>
            <Text style={styles.imageStatus}>
              {image.startsWith('https') ? 'Kapak Yüklendi' : 'Kapak Seçildi'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>Kapak Fotoğrafı Ekle</Text>
          <Text style={styles.placeholderSubText}>(2:3 oranında kırpılacak)</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {renderTypeModal()}
      {renderDeleteModal()}
      {activeTab === TABS[0] ? (
        <ScrollView style={styles.container}>
          {renderCoverImage()}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === TABS[0] && styles.tabActive]}
              onPress={() => setActiveTab(TABS[0])}
            >
              <Text style={[styles.tabText, activeTab === TABS[0] && styles.tabTextActive]}>
                Genel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === TABS[1] && styles.tabActive]}
              onPress={() => setActiveTab(TABS[1])}
            >
              <Text style={[styles.tabText, activeTab === TABS[1] && styles.tabTextActive]}>
                Bölümler
              </Text>
            </TouchableOpacity>
          </View>

          {renderGeneralTab()}
        </ScrollView>
      ) : (
        <View style={styles.container}>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === TABS[0] && styles.tabActive]}
              onPress={() => setActiveTab(TABS[0])}
            >
              <Text style={[styles.tabText, activeTab === TABS[0] && styles.tabTextActive]}>
                Genel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === TABS[1] && styles.tabActive]}
              onPress={() => setActiveTab(TABS[1])}
            >
              <Text style={[styles.tabText, activeTab === TABS[1] && styles.tabTextActive]}>
                Bölümler
              </Text>
            </TouchableOpacity>
          </View>

          {renderChaptersTab()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1E2D',
  },
  scrollContent: {
    paddingBottom: 0,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#1C1E2D',
  },
  tabContent: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#2A2B3C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2B3C',
  },
  placeholderText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#1C1E2D',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#2A2B3C',
  },
  tabActive: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#6B4EFF',
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  tabTextActive: {
    color: '#6B4EFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#2A2B3C',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#2A2B3C',
    color: '#fff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#6B4EFF',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#2A2B3C',
    borderRadius: 8,
    backgroundColor: '#2A2B3C',
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    backgroundColor: '#2A2B3C',
  },
  placeholderSubText: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
  },
  addChapterButton: {
    backgroundColor: '#6B4EFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  addChapterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chaptersContainer: {
    flex: 1,
    position: 'relative',
  },
  chaptersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chapterItem: {
    backgroundColor: '#2A2B3C',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  chapterItemActive: {
    backgroundColor: '#3A3B4C',
    transform: [{ scale: 1.05 }],
  },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chapterTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  chapterStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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
  chapterStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  statText: {
    color: '#8E8E93',
    fontSize: 14,
    marginLeft: 4,
  },
  dateText: {
    color: '#8E8E93',
    fontSize: 12,
    marginLeft: 'auto',
  },
  emptyChaptersText: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
  },
  imageStatus: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1C1E2D',
    borderRadius: 12,
    width: '90%',
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  typeList: {
    maxHeight: '80%',
  },
  typeItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B3C',
  },
  typeItemText: {
    color: '#fff',
    fontSize: 16,
  },
  typeItemTextSelected: {
    color: '#6B4EFF',
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#6B4EFF',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  typeSelector: {
    backgroundColor: '#2A2B3C',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  typeSelectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeSelectorText: {
    color: '#fff',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  deleteWarningText: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#2A2B3C',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalDeleteButton: {
    backgroundColor: '#FF3B30',
  },
  modalDeleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dragHandle: {
    padding: 8,
    marginRight: 8,
  },
  chapterActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chapterMenuButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  floatingAddButton: {
    backgroundColor: '#6B4EFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  floatingAddButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default NewStory; 