import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { CommonActions } from '@react-navigation/native';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signup } = useAuth();

  const handleRegister = async () => {
    console.log('Kullanıcı adı:', username);
    console.log('handleRegister başladı');
    
    if (!name || !username || !email || !password || !confirmPassword) {
      console.log('Eksik alan var:', { name, username, email, password, confirmPassword });
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    if (password !== confirmPassword) {
      console.log('Şifreler eşleşmiyor:', { password, confirmPassword });
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      return;
    }

    if (password.length < 6) {
      console.log('Şifre çok kısa:', password.length);
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      console.log('Kayıt işlemi başlıyor...');
      // Kullanıcı kaydı
      const { data, error: authError } = await signup(email, password);
      console.log('Signup sonucu:', { data, error: authError });
      
      if (authError) {
        console.log('Auth hatası:', authError);
        if (authError.message.includes('rate limit')) {
          Alert.alert(
            'Hata',
            'Çok fazla deneme yaptınız. Lütfen 1 dakika bekleyip tekrar deneyin.'
          );
        } else if (authError.message.includes('already registered')) {
          Alert.alert('Hata', 'Bu e-posta adresi zaten kayıtlı.');
        } else {
          Alert.alert('Hata', 'Kayıt sırasında bir hata oluştu: ' + authError.message);
        }
        return;
      }

      if (!data?.user?.id) {
        console.log('Kullanıcı ID bulunamadı:', data);
        Alert.alert('Hata', 'Kullanıcı kaydı başarısız oldu. Lütfen daha sonra tekrar deneyin.');
        return;
      }

      console.log('Profil kaydı başlıyor...');
      // Kullanıcı profil bilgilerini kaydet
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            name: name,
            username: username,
            email: email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);

      if (profileError) {
        console.log('Profil kayıt hatası:', profileError);
        Alert.alert('Hata', 'Profil bilgileri kaydedilemedi: ' + profileError.message);
        return;
      } else {
        console.log('Profil başarıyla kaydedildi:', {
          id: data.user.id,
          name,
          username,
          email
        });
      }

      console.log('Kayıt başarılı, Login ekranına yönlendiriliyor...');
      
      // Başarılı kayıt sonrası direkt Login'e git
      navigation.replace('Login');
      
      // Sonra alert göster
      setTimeout(() => {
        Alert.alert(
          'Başarılı!',
          'Hesabınız başarıyla oluşturuldu! Lütfen e-posta adresinizi kontrol edin.'
        );
      }, 100);

    } catch (error) {
      console.log('Genel hata:', error);
      Alert.alert('Hata', 'Bir hata oluştu: ' + (error.message || 'Bilinmeyen bir hata oluştu'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Hesap Oluştur</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>İSİM</Text>
          <TextInput
            style={styles.input}
            placeholder="İşıl"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>KULLANICI ADI</Text>
          <TextInput
            style={styles.input}
            placeholder="Limaei"
            placeholderTextColor="#666"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>E-MAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="deneme@gmail.com"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>ŞİFRE</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>ŞİFRE TEKRARI</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            placeholderTextColor="#666"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={styles.registerButton}
          onPress={() => {
            console.log('Kayıt Ol butonuna tıklandı');
            handleRegister();
          }}
        >
          <Text style={styles.registerButtonText}>Kayıt Ol</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.footerText}>Zaten Hesabın Var Mı? Giriş Yap!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1E2D',
  },
  header: {
    padding: 20,
  },
  backButton: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  form: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#888',
    marginBottom: 8,
    fontSize: 12,
  },
  input: {
    backgroundColor: '#2A2C3A',
    borderRadius: 8,
    padding: 15,
    color: '#fff',
    fontSize: 16,
  },
  registerButton: {
    backgroundColor: '#6B5DE0',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#6B5DE0',
    fontSize: 14,
  },
});

export default RegisterScreen; 