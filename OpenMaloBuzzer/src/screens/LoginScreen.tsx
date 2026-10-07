import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import {User} from '../types';

interface Props {
  onLogin: (phone: string, pin: string) => Promise<User | null>;
}

const LoginScreen: React.FC<Props> = ({onLogin}) => {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const pinRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (phone.length < 10) {
      Alert.alert('Error', 'Enter a valid phone number');
      return;
    }
    if (pin.length !== 4) {
      Alert.alert('Error', 'Enter your 4-digit PIN');
      return;
    }

    setLoading(true);
    try {
      const user = await onLogin(phone, pin);
      if (!user) {
        Alert.alert('Login Failed', 'Invalid phone number or PIN');
      }
    } catch (e: any) {
      console.error('Login error:', e);
      Alert.alert('Error', e?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Image source={require('../assets/logo.png')} style={styles.logoImage} />
        <Text style={styles.logo}>Buzzer</Text>
        <Text style={styles.subtitle}>Internal Communication</Text>

        <TextInput
          style={styles.input}
          placeholder="Phone number"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          maxLength={15}
          returnKeyType="next"
          onSubmitEditing={() => pinRef.current?.focus()}
        />

        <TextInput
          ref={pinRef}
          style={styles.input}
          placeholder="4-digit PIN"
          placeholderTextColor="#999"
          keyboardType="number-pad"
          secureTextEntry
          value={pin}
          onChangeText={setPin}
          maxLength={4}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>LOGIN</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoImage: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FF4D4D',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 48,
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    fontSize: 18,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#FF4D4D',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default LoginScreen;
