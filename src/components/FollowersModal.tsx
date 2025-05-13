import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface User {
  id: string;
  username: string;
  name: string | null;
  avatar_url: string | null;
}

interface FollowerData {
  follower: {
    id: string;
    username: string;
    name: string | null;
    avatar_url: string | null;
  };
}

interface FollowingData {
  following: {
    id: string;
    username: string;
    name: string | null;
    avatar_url: string | null;
  };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  initialTab: 'followers' | 'following';
}

const FollowersModal: React.FC<Props> = ({
  visible,
  onClose,
  userId,
  initialTab,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadUsers();
    }
  }, [visible, activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      if (activeTab === 'followers') {
        const { data, error } = await supabase
          .from('follows')
          .select(`
            follower:follower_id(
              id,
              username,
              name,
              avatar_url
            )
          `)
          .eq('following_id', userId);

        if (error) throw error;

        const followers = data?.reduce<User[]>((acc, item: any) => {
          if (item?.follower && typeof item.follower === 'object') {
            const follower = {
              id: String(item.follower.id),
              username: String(item.follower.username),
              name: item.follower.name ? String(item.follower.name) : null,
              avatar_url: item.follower.avatar_url ? String(item.follower.avatar_url) : null
            };
            acc.push(follower);
          }
          return acc;
        }, []) || [];

        setUsers(followers);
      } else {
        const { data, error } = await supabase
          .from('follows')
          .select(`
            following:following_id(
              id,
              username,
              name,
              avatar_url
            )
          `)
          .eq('follower_id', userId);

        if (error) throw error;

        const following = data?.reduce<User[]>((acc, item: any) => {
          if (item?.following && typeof item.following === 'object') {
            const followingUser = {
              id: String(item.following.id),
              username: String(item.following.username),
              name: item.following.name ? String(item.following.name) : null,
              avatar_url: item.following.avatar_url ? String(item.following.avatar_url) : null
            };
            acc.push(followingUser);
          }
          return acc;
        }, []) || [];

        setUsers(following);
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (userId: string) => {
    onClose();
    navigation.navigate('OtherProfile', { userId });
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => handleUserPress(item.id)}
    >
      <Image
        source={{
          uri: item.avatar_url || 'https://sqpyzzzwgzclppdqedjn.supabase.co/storage/v1/object/public/defaults/default-avatar.png'
        }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.username}>@{item.username}</Text>
        <Text style={styles.name}>{item.name || 'İsimsiz Kullanıcı'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
                onPress={() => setActiveTab('followers')}
              >
                <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
                  Takipçiler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'following' && styles.activeTab]}
                onPress={() => setActiveTab('following')}
              >
                <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
                  Takip Edilenler
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator style={styles.loading} color="#6B4EFF" />
          ) : (
            <FlatList
              data={users}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {activeTab === 'followers' ? 'Henüz takipçi yok' : 'Henüz takip edilen yok'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#1C1E2D',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2C3A',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 10,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#6B4EFF',
  },
  tabText: {
    color: '#888',
    fontSize: 16,
  },
  activeTabText: {
    color: '#FFF',
  },
  listContent: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2C3A',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    marginLeft: 12,
  },
  username: {
    color: '#9586FF',
    fontSize: 16,
  },
  name: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 4,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
});

export default FollowersModal; 