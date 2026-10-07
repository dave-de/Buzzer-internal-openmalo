import {Alert, Linking, Platform, NativeModules} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BATTERY_PROMPT_KEY = '@openmalo_battery_prompted';

export const promptBatteryOptimization = async () => {
  if (Platform.OS !== 'android') return;

  const prompted = await AsyncStorage.getItem(BATTERY_PROMPT_KEY);
  if (prompted) return;

  Alert.alert(
    'Allow buzzes when app is closed',
    'Tap "Allow" so you never miss a buzz — even when your phone is on silent or the app is closed.',
    [
      {
        text: 'Allow',
        onPress: async () => {
          try {
            await Linking.openSettings();
          } catch {
            Alert.alert(
              'One more step',
              'Go to Settings → Apps → OpenMalo Buzzer → Battery → Unrestricted',
            );
          }
          await AsyncStorage.setItem(BATTERY_PROMPT_KEY, 'true');
        },
      },
      {
        text: 'Skip',
        style: 'cancel',
        onPress: async () => {
          await AsyncStorage.setItem(BATTERY_PROMPT_KEY, 'true');
        },
      },
    ],
  );
};
