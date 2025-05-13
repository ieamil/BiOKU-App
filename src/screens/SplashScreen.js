import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const SplashScreen = ({ navigation }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }
  }, [loading, user, navigation]);

  // Eğer yükleme devam ediyorsa veya kullanıcı varsa splash ekranını göster
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.slogan}>kitapların her zaman yanında</Text>
        </View>

        {!loading && !user && (
          <>
            <Text style={styles.quote}>
              "Yedi eski kitap kafa kafaya verirse,{'\n'}
              mutlaka bir yenisi doğar."
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.loginButtonText}>Giriş Yap</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.registerButton}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={styles.registerButtonText}>Kayıt Ol</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1E2D',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 100,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
  slogan: {
    fontSize: 16,
    color: '#888',
    marginTop: 10,
  },
  quote: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginVertical: 40,
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 16,
  },
  loginButton: {
    backgroundColor: '#6B5DE0',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6B5DE0',
  },
  registerButtonText: {
    color: '#6B5DE0',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SplashScreen; 