// EditProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_AVATAR_URL =
  'https://sqpyzzzwgzclppdqedjn.supabase.co/storage/v1/object/public/defaults/default-avatar.png';

const EditProfileScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [localCoverUri, setLocalCoverUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) {
      Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, username, avatar_url, cover_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setName(data.name || '');
      setUsername(data.username || '');
      setAvatarUrl(data.avatar_url || null);
      setCoverUrl(data.cover_url || null);
    } catch (error: any) {
      Alert.alert('Hata', 'Profil verisi alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (type: 'avatar' | 'cover') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'cover' ? [3, 1] : [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (type === 'avatar') {
          setLocalAvatarUri(uri);
        } else {
          setLocalCoverUri(uri);
        }
      }
    } catch (error) {
      Alert.alert('Hata', 'Görsel seçilirken bir hata oluştu.');
    }
  };

  const handleRemoveAvatar = async () => {
    Alert.alert(
      'Profil Fotoğrafını Kaldır',
      'Profil fotoğrafınızı kaldırmak istediğinize emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;

            try {
              const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: DEFAULT_AVATAR_URL, updated_at: new Date().toISOString() })
                .eq('id', user.id);

              if (error) throw error;

              Alert.alert('Başarılı', 'Profil fotoğrafı kaldırıldı.');
              setAvatarUrl(DEFAULT_AVATAR_URL);
              setLocalAvatarUri(null);
            } catch (error) {
              Alert.alert('Hata', 'Profil fotoğrafı kaldırılamadı.');
            }
          },
        },
      ]
    );
  };

  const uploadImage = async (uri: string, path: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.substring(uri.lastIndexOf('.') + 1);
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      console.log('Dosya yükleniyor:', filePath);

      const { data, error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, blob, {
          cacheControl: '0',
          upsert: true
        });

      if (uploadError) {
        console.error('Yükleme hatası:', uploadError);
        throw uploadError;
      }

      if (!data?.Key) {
        throw new Error('Dosya yolu alınamadı');
      }

      console.log('Yükleme başarılı:', data.Key);

      const { data: urlData } = await supabase.storage
        .from('profiles')
        .createSignedUrl(data.Key, 60 * 60 * 24 * 365); // 1 yıllık imzalı URL

      if (!urlData?.signedURL) {
        throw new Error('İmzalı URL alınamadı');
      }

      console.log('İmzalı URL:', urlData.signedURL);
      return urlData.signedURL;
    } catch (error) {
      console.error('Görsel yükleme hatası:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı.');
      return;
    }

    if (!name || !username) {
      Alert.alert('Hata', 'İsim ve kullanıcı adı boş bırakılamaz.');
      return;
    }

    setSaving(true);

    try {
      let uploadedAvatarUrl = avatarUrl;
      let uploadedCoverUrl = coverUrl;

      // Avatar seçildiyse önce Storage'a yükle
      if (localAvatarUri) {
        uploadedAvatarUrl = await uploadImage(localAvatarUri, `avatars/${user.id}`);
      }
      // Kapak seçildiyse önce Storage'a yükle
      if (localCoverUri) {
        uploadedCoverUrl = await uploadImage(localCoverUri, `covers/${user.id}`);
      }

      // Profili güncelle
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          username,
          avatar_url: uploadedAvatarUrl || DEFAULT_AVATAR_URL,
          cover_url: uploadedCoverUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Başarılı', 'Profil başarıyla güncellendi');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Hata', 'Güncelleme başarısız: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B4EFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Profili Düzenle</Text>
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={() => pickImage('cover')} 
            style={styles.coverContainer}
          >
            {(localCoverUri || coverUrl) ? (
              <Image 
                source={{ uri: localCoverUri || coverUrl! }} 
                style={styles.cover} 
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="image-outline" size={32} color="#888" />
                <Text style={styles.placeholderText}>Kapak Fotoğrafı Seç</Text>
              </View>
            )}
            <View style={styles.coverOverlay}>
              <Ionicons name="camera" size={24} color="#FFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.avatarSection}>
            <TouchableOpacity 
              onPress={() => pickImage('avatar')} 
              style={styles.avatarContainer}
            >
              <Image
                source={{
                  uri: localAvatarUri || avatarUrl || DEFAULT_AVATAR_URL,
                }}
                style={styles.avatar}
              />
              <View style={styles.avatarOverlay}>
                <Ionicons name="camera" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>
            {(avatarUrl || localAvatarUri) && avatarUrl !== DEFAULT_AVATAR_URL && (
              <TouchableOpacity 
                onPress={handleRemoveAvatar} 
                style={styles.removeButton}
              >
                <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                <Text style={styles.removeButtonText}>Profil Fotoğrafını Kaldır</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>İsim</Text>
              <TextInput
                style={styles.input}
                placeholder="İsminizi girin"
                placeholderTextColor="#888"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Kullanıcı Adı</Text>
              <TextInput
                style={styles.input}
                placeholder="Kullanıcı adınızı girin"
                placeholderTextColor="#888"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  saveButton: {
    backgroundColor: '#6B4EFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  coverContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#2A2B3C',
    marginBottom: 60,
    position: 'relative',
  },
  cover: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#888',
    marginTop: 8,
  },
  coverOverlay: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: -50,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#1C1E2D',
  },
  avatarOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#6B4EFF',
    padding: 8,
    borderRadius: 16,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
  },
  removeButtonText: {
    color: '#FF3B30',
    marginLeft: 4,
    fontSize: 14,
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2A2B3C',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    fontSize: 16,
  },
});

export default EditProfileScreen;
