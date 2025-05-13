import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Categories'>;

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

interface Category {
  id: number;
  name: string;
  type: CategoryType;
  icon: any;
  banner: any;
  description: string;
  color: string;
}

const allCategories: Category[] = [
  {
    id: 1,
    name: 'Kısa Hikaye',
    type: 'kisa_hikaye',
    icon: require('../../assets/categories/shortstory-icon.png'),
    banner: require('../../assets/categories/romantic-banner.jpg'),
    description: 'Kısa ve öz hikayeler.',
    color: '#FF69B4'
  },
  {
    id: 2,
    name: 'Fantastik',
    type: 'fantastik',
    icon: require('../../assets/categories/fantasy-icon.png'),
    banner: require('../../assets/categories/fantasy-banner.jpg'),
    description: 'Büyü, mitoloji ve epik maceraların dünyası.',
    color: '#4169E1'
  },
  {
    id: 3,
    name: 'Romantik',
    type: 'romantik',
    icon: require('../../assets/categories/romantic-icon.png'),
    banner: require('../../assets/categories/romantic-banner.jpg'),
    description: 'Aşk, tutku ve romantizm dolu hikayeler.',
    color: '#9370DB'
  },
  {
    id: 4,
    name: 'Gerilim / Korku',
    type: 'gerilim_korku',
    icon: require('../../assets/categories/horror-icon.png'),
    banner: require('../../assets/categories/horror-banner.jpg'),
    description: 'Gerilim ve korku dolu hikayeler.',
    color: '#8B0000'
  },
  {
    id: 5,
    name: 'Macera',
    type: 'macera',
    icon: require('../../assets/categories/adventure-icon.png'),
    banner: require('../../assets/categories/adventure-banner.jpg'),
    description: 'Heyecan verici macera dolu hikayeler.',
    color: '#FF8C00'
  },
  {
    id: 6,
    name: 'Aksiyon',
    type: 'aksiyon',
    icon: require('../../assets/categories/action-icon.png'),
    banner: require('../../assets/categories/action-banner.jpg'),
    description: 'Aksiyon ve heyecan dolu hikayeler.',
    color: '#FF4500'
  },
  {
    id: 7,
    name: 'Dram',
    type: 'dram',
    icon: require('../../assets/categories/drama-icon.png'),
    banner: require('../../assets/categories/drama-banner.jpg'),
    description: 'Duygusal ve etkileyici hikayeler.',
    color: '#4B0082'
  },
  {
    id: 8,
    name: 'Komedi',
    type: 'komedi',
    icon: require('../../assets/categories/comedy-icon.png'),
    banner: require('../../assets/categories/comedy-banner.jpg'),
    description: 'Eğlenceli ve komik hikayeler.',
    color: '#32CD32'
  },
  {
    id: 9,
    name: 'Gizem / Polisiye',
    type: 'gizem_polisiye',
    icon: require('../../assets/categories/mystery-icon.png'),
    banner: require('../../assets/categories/mystery-banner.jpg'),
    description: 'Gizem ve suç dolu hikayeler.',
    color: '#483D8B'
  },
  {
    id: 10,
    name: 'Tarihi Kurgu',
    type: 'tarihi_kurgu',
    icon: require('../../assets/categories/historical-icon.png'),
    banner: require('../../assets/categories/historical-banner.jpg'),
    description: 'Tarihi olaylar ve dönemler üzerine kurulu hikayeler.',
    color: '#8B4513'
  },
  {
    id: 11,
    name: 'Distopya',
    type: 'distopya',
    icon: require('../../assets/categories/dystopia-icon.png'),
    banner: require('../../assets/categories/dystopia-banner.jpg'),
    description: 'Karanlık gelecek senaryoları ve toplumsal eleştiri.',
    color: '#2F4F4F'
  },
  {
    id: 12,
    name: 'Genç Yetişkin',
    type: 'genc_yetiskin',
    icon: require('../../assets/categories/ya-icon.png'),
    banner: require('../../assets/categories/ya-banner.jpg'),
    description: 'Gençlik, büyüme ve kendini keşfetme hikayeleri.',
    color: '#FF69B4'
  },
  {
    id: 13,
    name: 'Şiir',
    type: 'siir',
    icon: require('../../assets/categories/poetry-icon.png'),
    banner: require('../../assets/categories/poetry-banner.jpg'),
    description: 'Şiirsel anlatım ve duygusal derinlik.',
    color: '#BA55D3'
  },
  {
    id: 14,
    name: 'Askeri Kurgu',
    type: 'askeri_kurgu',
    icon: require('../../assets/categories/military-icon.png'),
    banner: require('../../assets/categories/military-banner.jpg'),
    description: 'Savaş ve askeri temalı hikayeler.',
    color: '#556B2F'
  }
];

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

const CategoriesScreen: React.FC<Props> = ({ navigation }) => {
  const renderCategoryItem = ({ item }: { item: Category }) => {
    console.log('Kategoriye tıklandı:', item);
    return (
      <TouchableOpacity
        style={styles.categoryItem}
        onPress={() => {
          console.log('Navigasyon parametreleri:', { type: item.type });
          navigation.navigate('Category', { type: item.type });
        }}
      >
        <ImageBackground
          source={item.banner}
          style={styles.categoryBanner}
          imageStyle={{ borderRadius: 12 }}
        >
          <View style={[styles.categoryContent, { backgroundColor: `${item.color}80` }]}>
            <View style={styles.categoryHeader}>
              <Image 
                source={item.icon}
                style={styles.categoryIcon}
                resizeMode="contain"
              />
              <Text style={styles.categoryName}>{item.name}</Text>
            </View>
            <Text style={styles.categoryDescription}>{item.description}</Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tüm Kategoriler</Text>
      </View>

      <FlatList
        data={allCategories}
        renderItem={renderCategoryItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.categoryList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1E2D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B3C',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  categoryList: {
    padding: 16,
  },
  categoryItem: {
    width: CARD_WIDTH,
    height: 160,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryBanner: {
    width: '100%',
    height: '100%',
  },
  categoryContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 32,
    height: 32,
    tintColor: '#FFFFFF',
    marginRight: 12,
  },
  categoryName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  categoryDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 8,
    opacity: 0.9,
  },
});

export default CategoriesScreen; 