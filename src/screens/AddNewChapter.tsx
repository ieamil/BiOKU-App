import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CreateStoryStackParamList } from '../navigation/CreateStoryStack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

type Props = NativeStackScreenProps<CreateStoryStackParamList, 'AddNewChapter'>;

const AddNewChapter: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [activeStyles, setActiveStyles] = useState({
    isBold: false,
    isItalic: false,
    isUnderline: false,
    textAlign: 'left' as 'left' | 'center' | 'right',
  });

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

  const updateWordCount = (text: string) => {
    const words = text.trim().split(/\s+/);
    setWordCount(text.trim() ? words.length : 0);
  };

  const handleContentChange = (text: string) => {
    setContent(text);
    updateWordCount(text);
  };

  const handleSave = async (publish: boolean = false) => {
    if (!title.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir başlık girin.');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Uyarı', 'Lütfen içerik girin.');
      return;
    }

    if (!user) {
      Alert.alert('Hata', 'Oturum açmanız gerekiyor.');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('chapters')
        .insert([
          {
            book_id: route.params.bookId,
            user_id: user.id,
            title: title.trim(),
            content,
            status: publish ? 'published' : 'draft',
            word_count: wordCount,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (publish) {
        const { error: bookError } = await supabase
          .from('books')
          .update({
            status: 'published',
            updated_at: new Date().toISOString(),
          })
          .eq('id', route.params.bookId);

        if (bookError) throw bookError;

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
            onPress={() => navigation.goBack()}
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
              <Ionicons name="menu" size={20} color={activeStyles.textAlign === 'center' ? "#6B4EFF" : "#FFFFFF"} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.toolbarButton, activeStyles.textAlign === 'right' && styles.toolbarButtonActive]}
              onPress={() => setTextAlign('right')}
            >
              <Ionicons name="menu" size={20} color={activeStyles.textAlign === 'right' ? "#6B4EFF" : "#FFFFFF"} />
            </TouchableOpacity>
          </ScrollView>
        </View>

        <ScrollView style={styles.contentContainer}>
          <TextInput
            style={[
              styles.contentInput,
              activeStyles.isBold && styles.boldText,
              activeStyles.isItalic && styles.italicText,
              activeStyles.isUnderline && styles.underlineText,
              { textAlign: activeStyles.textAlign }
            ]}
            value={content}
            onChangeText={handleContentChange}
            placeholder="Hikayenizi yazmaya başlayın..."
            placeholderTextColor="#8E8E93"
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
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
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#2A2B3C',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1E2D',
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
    fontWeight: 'bold',
  },
  menuItemSubText: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#1C1E2D',
    marginVertical: 8,
  },
});

export default AddNewChapter; 