const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Trigger: when a new buzz is created, send FCM to receiver
exports.onBuzzCreated = functions.firestore
  .document('buzzes/{buzzId}')
  .onCreate(async (snap, context) => {
    const buzz = snap.data();
    const buzzId = context.params.buzzId;

    // Get sender and receiver
    const [senderDoc, receiverDoc] = await Promise.all([
      db.collection('users').doc(buzz.from_user_id).get(),
      db.collection('users').doc(buzz.to_user_id).get(),
    ]);

    if (!receiverDoc.exists) return;
    const receiver = receiverDoc.data();
    const sender = senderDoc.data();

    if (!receiver.fcm_token) return;

    // Send FCM data-only message (high priority, alarm behavior)
    const message = {
      token: receiver.fcm_token,
      data: {
        type: 'buzz',
        buzz_id: buzzId,
        from_user_id: buzz.from_user_id,
        from_user_name: sender.name,
        reason: buzz.reason,
        note: buzz.note || '',
      },
      android: {
        priority: 'high',
        ttl: 0,
      },
    };

    try {
      await admin.messaging().send(message);
    } catch (err) {
      console.error('FCM send failed:', err);
    }
  });

// Trigger: when a buzz is marked escalated, re-send FCM
exports.onBuzzEscalated = functions.firestore
  .document('buzzes/{buzzId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const buzzId = context.params.buzzId;

    // Only trigger on escalation
    if (before.escalated || !after.escalated) return;
    // Don't re-buzz if already responded
    if (after.response !== 'none') return;

    const [senderDoc, receiverDoc] = await Promise.all([
      db.collection('users').doc(after.from_user_id).get(),
      db.collection('users').doc(after.to_user_id).get(),
    ]);

    if (!receiverDoc.exists) return;
    const receiver = receiverDoc.data();
    const sender = senderDoc.data();

    if (!receiver.fcm_token) return;

    const message = {
      token: receiver.fcm_token,
      data: {
        type: 'buzz',
        buzz_id: buzzId,
        from_user_id: after.from_user_id,
        from_user_name: sender.name,
        reason: `⚠️ RE-BUZZ: ${after.reason}`,
        note: after.note || '',
      },
      android: {
        priority: 'high',
        ttl: 0,
      },
    };

    try {
      await admin.messaging().send(message);
    } catch (err) {
      console.error('FCM re-buzz send failed:', err);
    }
  });
