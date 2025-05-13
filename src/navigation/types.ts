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

export type RootStackParamList = {
  Home: undefined;
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  EditProfile: undefined;
  BookDetail: { bookId: string };
  ChapterDetail: { chapterId: string };
  Category: { type: CategoryType };
  Categories: undefined;
  Profile: { userId: string };
  Settings: undefined;
  CreateBook: undefined;
  EditBook: { bookId: string };
  Library: undefined;
  OtherProfile: {
    userId: string;
  };
};

export type TabParamList = {
  'Ana Sayfa': undefined;
  'Arama': undefined;
  'Kütüphane': undefined;
  'Hikaye Oluştur': undefined;
  'Profil': undefined;
};