import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import DraggableFlatList, { 
  RenderItemParams,
  ScaleDecorator
} from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: {
    params: {
      bookId: string;
    };
  };
};

interface Chapter {
  id: string;
  title: string;
  status: 'draft' | 'published';
  views: number;
  likes: number;
  created_at: string;
}

const EditStory: React.FC<Props> = ({ navigation, route }) => {
  const { bookId } = route.params;
  const [loading, setLoading] = useState(true);
  const [bookTitle, setBookTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const { user } = useAuth();

  // Kitap bilgilerini yükle
  const loadBookData = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('title, cover_url')
        .eq('id', bookId)
        .single();

      if (error) throw error;

      if (data) {
        setBookTitle(data.title);
        setCoverUrl(data.cover_url);
        navigation.setOptions({ title: data.title });
      }
    } catch (error) {
      console.error('Kitap bilgileri yüklenirken hata:', error);
      Alert.alert('Hata', 'Kitap bilgileri yüklenirken bir hata oluştu');
    }
  };

  // Bölümleri yükle
  const loadChapters = async () => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', bookId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChapters(data || []);
    } catch (error) {
      console.error('Bölümler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookData();
    loadChapters();

    const unsubscribe = navigation.addListener('focus', () => {
      loadChapters();
    });

    return () => unsubscribe();
  }, [bookId]);

  const handleChapterReorder = (newChapters: Chapter[]) => {
    setChapters(newChapters);
  };

  const renderChapterItem = ({ item, drag, isActive }: RenderItemParams<Chapter>) => {
    const formattedDate = new Date(item.created_at).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return (
      <ScaleDecorator>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('EditChapter', { chapterId: item.id });
          }}
          onLongPress={drag}
          disabled={isActive}
          style={[
            styles.chapterItem,
            isActive && styles.chapterItemActive
          ]}
        >
          <View style={styles.chapterHeader}>
            <Text style={styles.chapterTitle}>{item.title}</Text>
            <View style={styles.chapterStatus}>
              <Text style={[
                styles.statusText,
                item.status === 'published' ? styles.publishedStatus : styles.draftStatus
              ]}>
                {item.status === 'published' ? 'Yayında' : 'Taslak'}
              </Text>
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={{ uri: coverUrl || undefined }} 
          style={styles.coverImage}
        />
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => navigation.navigate('NewStory', { bookId })}
        >
          <Ionicons name="pencil" size={20} color="#FFFFFF" />
          <Text style={styles.editButtonText}>Düzenle</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.chaptersHeader}>
          <Text style={styles.sectionTitle}>Bölümler</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddNewChapter', { bookId })}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Yeni Bölüm</Text>
          </TouchableOpacity>
        </View>

        {chapters.length === 0 ? (
          <Text style={styles.emptyText}>
            Henüz bölüm eklenmemiş
          </Text>
        ) : (
          <DraggableFlatList
            data={chapters}
            onDragEnd={({ data }) => handleChapterReorder(data)}
            keyExtractor={(item) => item.id}
            renderItem={renderChapterItem}
          />
        )}
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
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  header: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  editButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#6B4EFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#FFFFFF',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  chaptersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B4EFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
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
    color: '#FFFFFF',
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
});

export default EditStory; 