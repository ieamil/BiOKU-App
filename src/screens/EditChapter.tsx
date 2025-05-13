import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal,
  SafeAreaView,
  Dimensions,
  TextInput,
  ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CreateStoryStackParamList } from '../navigation/CreateStoryStack';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<CreateStoryStackParamList, 'EditChapter'>;

interface Chapter {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  book_id: string;
  word_count: number;
}

const EditChapter: React.FC<Props> = ({ navigation, route }) => {
  const { chapterId } = route.params;
  const [loading, setLoading] = useState(false);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [activeStyles, setActiveStyles] = useState({
    isBold: false,
    isItalic: false,
    isUnderline: false,
    textAlign: 'left' as 'left' | 'center' | 'right',
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadChapter();
  }, [chapterId]);

  // İçerik değişikliklerini takip et
  useEffect(() => {
    if (chapter) {
      const contentChanged = content !== chapter.content;
      const titleChanged = title !== chapter.title;
      setHasChanges(contentChanged || titleChanged);
    }
  }, [content, title, chapter]);

  const loadChapter = async () => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', chapterId)
        .single();

      if (error) throw error;

      if (data) {
        setChapter(data);
        setTitle(data.title);
        setContent(data.content);
        updateWordCount(data.content);
      }
    } catch (error) {
      console.error('Bölüm yüklenirken hata:', error);
      Alert.alert('Hata', 'Bölüm yüklenirken bir hata oluştu');
    }
  };

  const updateWordCount = (text: string) => {
    const words = text.trim().split(/\s+/);
    setWordCount(text.trim() ? words.length : 0);
  };

  const handleSave = async (publish: boolean = false) => {
    if (!chapter) return;

    if (!title.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir başlık girin.');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Uyarı', 'Lütfen içerik girin.');
      return;
    }

    try {
      setLoading(true);

      // Yayınlanmış bölümler için sadece içerik güncellemesi yap
      if (chapter.status === 'published') {
        const { error } = await supabase
          .from('chapters')
          .update({
            title,
            content,
            updated_at: new Date().toISOString(),
            word_count: wordCount,
          })
          .eq('id', chapterId);

        if (error) throw error;

        Alert.alert('Başarılı', 'Bölüm güncellendi.', [
          { text: 'Tamam', onPress: () => navigation.goBack() }
        ]);
        return;
      }

      // Yayınlanmamış bölümler için normal kaydetme/yayınlama işlemi
      const newStatus = publish ? 'published' : 'draft';

      const { error } = await supabase
        .from('chapters')
        .update({
          title,
          content,
          status: newStatus,
          updated_at: new Date().toISOString(),
          word_count: wordCount,
        })
        .eq('id', chapterId);

      if (error) throw error;

      // Eğer bölüm yayınlanıyorsa veya kitapta yayınlanmış bölüm varsa kitabı yayınla
      if (publish || newStatus === 'published') {
        const { error: bookError } = await supabase
          .from('books')
          .update({
            status: 'published',
            updated_at: new Date().toISOString(),
          })
          .eq('id', chapter.book_id);

        if (bookError) throw bookError;
      } else {
        // Kitabın diğer bölümlerini kontrol et
        const { data: publishedChapters, error: chaptersError } = await supabase
          .from('chapters')
          .select('status')
          .eq('book_id', chapter.book_id)
          .eq('status', 'published');

        if (chaptersError) throw chaptersError;

        // Eğer yayınlanmış bölüm varsa kitabı yayınla
        if (publishedChapters && publishedChapters.length > 0) {
          const { error: bookError } = await supabase
            .from('books')
            .update({
              status: 'published',
              updated_at: new Date().toISOString(),
            })
            .eq('id', chapter.book_id);

          if (bookError) throw bookError;
        }
      }

      if (publish) {
        Alert.alert(
          'Başarılı',
          'Bölüm yayınlandı ve kitap artık herkes tarafından görüntülenebilir.',
          [{ text: 'Tamam', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Başarılı', 'Bölüm kaydedildi.', [
          { text: 'Tamam', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Bölüm kaydedilirken hata:', error);
      Alert.alert('Hata', 'Bölüm kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToDraft = async () => {
    if (!chapter) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('chapters')
        .update({
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', chapterId);

      if (error) throw error;

      // Kitabın diğer bölümlerini kontrol et
      const { data: publishedChapters, error: chaptersError } = await supabase
        .from('chapters')
        .select('status')
        .eq('book_id', chapter.book_id)
        .eq('status', 'published');

      if (chaptersError) throw chaptersError;

      // Eğer başka yayınlanmış bölüm varsa kitap yayında kalsın
      if (publishedChapters && publishedChapters.length > 0) {
        const { error: bookError } = await supabase
          .from('books')
          .update({
            status: 'published',
            updated_at: new Date().toISOString(),
          })
          .eq('id', chapter.book_id);

        if (bookError) throw bookError;
      }

      Alert.alert(
        'Başarılı',
        'Bölüm taslağa alındı.',
        [{ text: 'Tamam', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Bölüm taslağa alınırken hata:', error);
      Alert.alert('Hata', 'Bölüm taslağa alınırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const toggleStyle = (style: 'isBold' | 'isItalic' | 'isUnderline') => {
    setActiveStyles(prev => ({
      ...prev,
      [style]: !prev[style]
    }));
  };

  const setTextAlign = (align: 'left' | 'center' | 'right') => {
    setActiveStyles(prev => ({
      ...prev,
      textAlign: align
    }));
  };

  const handleBackPress = () => {
    if (hasChanges) {
      Alert.alert(
        'Değişiklikleri Kaydet',
        'Yaptığınız değişiklikleri kaydetmek istiyor musunuz?',
        [
          {
            text: 'Kaydetmeden Çık',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
          {
            text: 'Kaydet',
            style: 'default',
            onPress: () => handleSave(false),
          },
          {
            text: 'İptal',
            style: 'cancel',
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, hasChanges]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Bölüm Başlığı"
              placeholderTextColor="#8E8E93"
              maxLength={100}
            />
            <Text style={styles.wordCount}>{wordCount} kelime</Text>
          </View>

          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => setShowMenu(true)}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.toolbar}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.toolbarScroll}
          >
            <TouchableOpacity 
              style={[styles.toolbarButton, activeStyles.isBold && styles.toolbarButtonActive]}
              onPress={() => toggleStyle('isBold')}
            >
              <Text style={[styles.toolbarButtonText, activeStyles.isBold && styles.toolbarButtonTextActive]}>
                K
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.toolbarButton, activeStyles.isItalic && styles.toolbarButtonActive]}
              onPress={() => toggleStyle('isItalic')}
            >
              <Text style={[styles.toolbarButtonText, activeStyles.isItalic && styles.toolbarButtonTextActive, { fontStyle: 'italic' }]}>
                I
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.toolbarButton, activeStyles.isUnderline && styles.toolbarButtonActive]}
              onPress={() => toggleStyle('isUnderline')}
            >
              <Text style={[styles.toolbarButtonText, activeStyles.isUnderline && styles.toolbarButtonTextActive, { textDecorationLine: 'underline' }]}>
                U
              </Text>
            </TouchableOpacity>

            <View style={styles.toolbarDivider} />

            <TouchableOpacity 
              style={[styles.toolbarButton, activeStyles.textAlign === 'left' && styles.toolbarButtonActive]}
              onPress={() => setTextAlign('left')}
            >
              <Ionicons name="menu" size={20} color={activeStyles.textAlign === 'left' ? "#6B4EFF" : "#FFFFFF"} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.toolbarButton, activeStyles.textAlign === 'center' && styles.toolbarButtonActive]}
              onPress={() => setTextAlign('center')}
            >
              <Ionicons name="reorder-three" size={20} color={activeStyles.textAlign === 'center' ? "#6B4EFF" : "#FFFFFF"} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.toolbarButton, activeStyles.textAlign === 'right' && styles.toolbarButtonActive]}
              onPress={() => setTextAlign('right')}
            >
              <Ionicons name="menu-outline" size={20} color={activeStyles.textAlign === 'right' ? "#6B4EFF" : "#FFFFFF"} />
            </TouchableOpacity>

            <View style={styles.toolbarDivider} />

            <View style={styles.wordCountContainer}>
              <Text style={styles.wordCountText}>{wordCount} kelime</Text>
            </View>
          </ScrollView>
        </View>

        <ScrollView style={styles.contentContainer}>
          <TextInput
            style={[
              styles.contentInput,
              { textAlign: activeStyles.textAlign },
              activeStyles.isBold && styles.boldText,
              activeStyles.isItalic && styles.italicText,
              activeStyles.isUnderline && styles.underlineText,
            ]}
            value={content}
            onChangeText={(text) => {
              setContent(text);
              updateWordCount(text);
            }}
            placeholder="Hikayenizi yazmaya başlayın..."
            placeholderTextColor="#8E8E93"
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
            autoCorrect={true}
            scrollEnabled={false}
            spellCheck={true}
          />
        </ScrollView>

        <Modal
          visible={showMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMenu(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMenu(false)}
          >
            <View style={styles.menuContainer}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Bölüm İşlemleri</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowMenu(false)}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.menuDivider} />

              {chapter?.status === 'published' ? (
                <TouchableOpacity
                  style={[styles.menuItem, loading && styles.menuItemDisabled]}
                  onPress={() => {
                    setShowMenu(false);
                    handleMoveToDraft();
                  }}
                  disabled={loading}
                >
                  <View style={styles.menuItemIcon}>
                    <Ionicons name="document-outline" size={24} color="#FF3B30" />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>
                      {loading ? 'İşleniyor...' : 'Taslağa Al'}
                    </Text>
                    <Text style={styles.menuItemSubText}>
                      Bölümü taslak durumuna getir
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.menuItem, loading && styles.menuItemDisabled]}
                  onPress={() => {
                    setShowMenu(false);
                    handleSave(true);
                  }}
                  disabled={loading}
                >
                  <View style={styles.menuItemIcon}>
                    <Ionicons name="cloud-upload-outline" size={24} color="#059669" />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemText}>
                      {loading ? 'Yayınlanıyor...' : 'Bölümü Yayınla'}
                    </Text>
                    <Text style={styles.menuItemSubText}>
                      Bölümü okuyuculara açın
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={[styles.menuItem, loading && styles.menuItemDisabled]}
                onPress={() => {
                  setShowMenu(false);
                  handleSave(false);
                }}
                disabled={loading}
              >
                <View style={styles.menuItemIcon}>
                  <Ionicons name="save-outline" size={24} color="#6B4EFF" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemText}>
                    {loading ? 'Kaydediliyor...' : 'Bölümü Kaydet'}
                  </Text>
                  <Text style={styles.menuItemSubText}>
                    Değişikliklerinizi kaydedin
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1C1E2D',
  },
  container: {
    flex: 1,
    backgroundColor: '#1C1E2D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1C1E2D',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B3C',
  },
  backButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  titleInput: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    padding: 0,
  },
  wordCount: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 4,
  },
  menuButton: {
    padding: 8,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2B3C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3B4C',
  },
  toolbarScroll: {
    flexGrow: 0,
  },
  toolbarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginRight: 8,
  },
  toolbarButtonActive: {
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
  },
  toolbarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  toolbarButtonTextActive: {
    color: '#6B4EFF',
  },
  toolbarDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#3A3B4C',
    marginHorizontal: 8,
  },
  wordCountContainer: {
    marginLeft: 'auto',
  },
  wordCountText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  contentInput: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 200,
    textAlignVertical: 'top',
    padding: 0,
  },
  boldText: {
    fontWeight: 'bold',
  },
  italicText: {
    fontStyle: 'italic',
  },
  underlineText: {
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#2A2B3C',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    padding: 16,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#3A3B4C',
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  menuItemSubText: {
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 2,
  },
});

export default EditChapter;
