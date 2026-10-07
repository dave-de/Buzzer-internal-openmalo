import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Vibration,
} from 'react-native';
import Sound from 'react-native-sound';
import {User, Buzz, BuzzResponse} from '../types';
import {useReasons} from '../hooks/useReasons';
import {createBuzz, subscribeToBuzz, markEscalated} from '../services/firebase';
import {
  MAX_NOTE_LENGTH,
  REBUZZ_TIMEOUT_MS,
  NO_RESPONSE_TIMEOUT_MS,
} from '../constants';

interface Props {
  sender: User;
  receiver: User;
  onClose: () => void;
}

type BuzzState = 'select' | 'sent' | 'responded' | 'no_response';

const RESPONSE_LABELS: Record<BuzzResponse, string> = {
  ack: 'Acknowledged — coming',
  five_min: 'Will be there in 5 min',
  busy: 'Busy right now',
  none: 'No response',
};

const BuzzSheet: React.FC<Props> = ({sender, receiver, onClose}) => {
  const reasons = useReasons();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [buzzState, setBuzzState] = useState<BuzzState>('select');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [response, setResponse] = useState<BuzzResponse | null>(null);

  const buzzIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const rebuzzSentRef = useRef(false);

  const sendBuzz = async () => {
    if (!selectedReason) return;

    const buzzData: Omit<Buzz, 'id'> = {
      from_user_id: sender.id,
      to_user_id: receiver.id,
      reason: selectedReason,
      note: note.trim() || null,
      created_at: Date.now(),
      responded_at: null,
      response: 'none',
      escalated: false,
    };

    const doc = await createBuzz(buzzData);
    buzzIdRef.current = doc.id;
    setBuzzState('sent');

    // Play sent confirmation sound
    const sound = new Sound('buzz_alarm.wav', Sound.MAIN_BUNDLE, (err) => {
      if (!err) {
        sound.setVolume(0.5);
        sound.play(() => sound.release());
      }
    });
    Vibration.vibrate(200);

    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 1000);

    unsubRef.current = subscribeToBuzz(doc.id, (buzz: Buzz) => {
      if (buzz.response !== 'none') {
        setResponse(buzz.response);
        setBuzzState('responded');
        if (timerRef.current) clearInterval(timerRef.current);
      }
    });
  };

  useEffect(() => {
    if (buzzState !== 'sent') return;

    if (elapsedMs >= NO_RESPONSE_TIMEOUT_MS) {
      setBuzzState('no_response');
      if (timerRef.current) clearInterval(timerRef.current);
    } else if (elapsedMs >= REBUZZ_TIMEOUT_MS && !rebuzzSentRef.current) {
      rebuzzSentRef.current = true;
      if (buzzIdRef.current) {
        markEscalated(buzzIdRef.current);
      }
      Vibration.vibrate([0, 300, 100, 300]);
    }
  }, [elapsedMs, buzzState]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const handleCall = () => {
    Linking.openURL(`tel:${receiver.phone}`);
  };

  if (buzzState === 'select') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Buzz {receiver.name}</Text>
          <View style={{width: 32}} />
        </View>
        <Text style={styles.label}>Select reason</Text>
        <View style={styles.chipsContainer}>
          {reasons.map(r => (
            <TouchableOpacity key={r.id} style={[styles.chip, selectedReason === r.label && styles.chipSelected]} onPress={() => setSelectedReason(r.label)}>
              <Text style={[styles.chipText, selectedReason === r.label && styles.chipTextSelected]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.noteInput} placeholder="Optional note (40 chars)" placeholderTextColor="#666" value={note} onChangeText={setNote} maxLength={MAX_NOTE_LENGTH} />
        <TouchableOpacity style={[styles.buzzButton, !selectedReason && styles.buzzButtonDisabled]} onPress={sendBuzz} disabled={!selectedReason} activeOpacity={0.8}>
          <Text style={styles.buzzButtonText}>BUZZ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (buzzState === 'sent') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Buzzing {receiver.name}</Text>
          <View style={{width: 32}} />
        </View>
        <View style={styles.statusContainer}>
          <View style={styles.pulseOuter}><View style={styles.pulseInner}><Text style={styles.pulseEmoji}>📳</Text></View></View>
          <Text style={styles.waitingText}>Waiting for response...</Text>
          <Text style={styles.elapsedText}>{formatTime(elapsedMs)}</Text>
          {rebuzzSentRef.current && <Text style={styles.rebuzzText}>Re-buzz sent (escalated)</Text>}
        </View>
      </View>
    );
  }

  if (buzzState === 'responded' && response) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><View style={{width: 32}} /><Text style={styles.headerTitle}>{receiver.name}</Text><View style={{width: 32}} /></View>
        <View style={styles.statusContainer}>
          <Text style={styles.responseIcon}>{response === 'ack' ? '✓' : response === 'five_min' ? '⏱' : '✗'}</Text>
          <Text style={styles.responseText}>{RESPONSE_LABELS[response]}</Text>
          <Text style={styles.elapsedText}>{formatTime(elapsedMs)}</Text>
        </View>
        <TouchableOpacity style={styles.doneButton} onPress={onClose}><Text style={styles.doneButtonText}>Done</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}><View style={{width: 32}} /><Text style={styles.headerTitle}>{receiver.name}</Text><View style={{width: 32}} /></View>
      <View style={styles.statusContainer}>
        <Text style={styles.noResponseIcon}>!</Text>
        <Text style={styles.noResponseText}>No response</Text>
        <Text style={styles.elapsedText}>{formatTime(elapsedMs)}</Text>
      </View>
      <TouchableOpacity style={styles.callButton} onPress={handleCall}><Text style={styles.callButtonText}>📞  Call {receiver.name}</Text></TouchableOpacity>
      <TouchableOpacity style={styles.doneButton} onPress={onClose}><Text style={styles.doneButtonText}>Close</Text></TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0D0D0D', paddingHorizontal: 20},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56, paddingBottom: 16},
  closeBtn: {color: '#888', fontSize: 24, padding: 4},
  headerTitle: {color: '#fff', fontSize: 20, fontWeight: '700'},
  label: {color: '#888', fontSize: 14, fontWeight: '600', marginBottom: 12, marginTop: 8},
  chipsContainer: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#333'},
  chipSelected: {backgroundColor: '#3a1515', borderColor: '#FF4D4D'},
  chipText: {color: '#ccc', fontSize: 15},
  chipTextSelected: {color: '#FF4D4D', fontWeight: '600'},
  noteInput: {backgroundColor: '#1A1A1A', color: '#fff', fontSize: 16, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10, marginTop: 16, borderWidth: 1, borderColor: '#333'},
  buzzButton: {backgroundColor: '#FF4D4D', paddingVertical: 20, borderRadius: 14, alignItems: 'center', marginTop: 24},
  buzzButtonDisabled: {opacity: 0.4},
  buzzButtonText: {color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 2},
  statusContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  pulseOuter: {width: 100, height: 100, borderRadius: 50, backgroundColor: '#3a1515', alignItems: 'center', justifyContent: 'center', marginBottom: 24},
  pulseInner: {width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF4D4D', alignItems: 'center', justifyContent: 'center'},
  pulseEmoji: {fontSize: 28},
  waitingText: {color: '#ccc', fontSize: 18, marginBottom: 8},
  elapsedText: {color: '#666', fontSize: 16},
  rebuzzText: {color: '#FF9800', fontSize: 14, marginTop: 12},
  responseIcon: {fontSize: 48, color: '#4CAF50', marginBottom: 16},
  responseText: {color: '#fff', fontSize: 20, fontWeight: '600', marginBottom: 8, textAlign: 'center'},
  noResponseIcon: {fontSize: 48, color: '#FF9800', fontWeight: '900', marginBottom: 16},
  noResponseText: {color: '#FF9800', fontSize: 22, fontWeight: '700', marginBottom: 8},
  callButton: {backgroundColor: '#4CAF50', paddingVertical: 18, borderRadius: 14, alignItems: 'center', marginBottom: 12},
  callButtonText: {color: '#fff', fontSize: 18, fontWeight: '700'},
  doneButton: {backgroundColor: '#1A1A1A', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 32},
  doneButtonText: {color: '#ccc', fontSize: 16, fontWeight: '600'},
});

export default BuzzSheet;
