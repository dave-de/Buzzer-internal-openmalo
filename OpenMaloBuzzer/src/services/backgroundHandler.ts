import notifee, {EventType} from '@notifee/react-native';

export const setupBackgroundHandler = () => {
  // Handle notification actions in background
  notifee.onBackgroundEvent(async ({type, detail}) => {
    if (type === EventType.ACTION_PRESS && detail.pressAction) {
      const buzzId = detail.notification?.data?.buzz_id as string;
      const actionId = detail.pressAction.id;
      if (buzzId && ['ack', 'five_min', 'busy'].includes(actionId)) {
        try {
          const {respondToBuzz} = require('./firebase');
          await respondToBuzz(buzzId, actionId as any);
        } catch {}
        await notifee.cancelNotification(buzzId);
      }
    }
  });
};
