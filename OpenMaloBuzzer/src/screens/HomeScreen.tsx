import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import {User} from '../types';
import {useUsers} from '../hooks/useUsers';
import {getRecentBuzzes} from '../services/firebase';
import {PRESENCE_TIMEOUT_MS} from '../constants';

const {width} = Dimensions.get('window');
const CARD_SIZE = (width - 48) / 3;

interface Props {
  currentUser: User;
  onSelectUser: (user: User) => void;
  onSettings: () => void;
  onHistory: () => void;
  onLogout: () => void;
}

const HomeScreen: React.FC<Props> = ({currentUser, onSelectUser, onSettings, onHistory, onLogout}) => {
  const {users, isOnline} = useUsers(currentUser.id);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const canBuzz = (target: User) => {
    if (currentUser.role === 'owner' || currentUser.role === 'manager') return true;
    return target.role === 'owner' || target.role === 'manager';
  };

  useEffect(() => {
    getRecentBuzzes(currentUser.id, 50)
      .then(buzzes => {
        const seen = new Set<string>();
        const ids: string[] = [];
        for (const b of buzzes) {
          if (!seen.has(b.to_user_id)) {
            seen.add(b.to_user_id);
            ids.push(b.to_user_id);
          }
          if (ids.length >= 3) break;
        }
        setRecentIds(ids);
      })
      .catch(() => {});
  }, [currentUser.id]);

  const recentUsers = recentIds
    .map(id => users.find(u => u.id === id))
    .filter(Boolean) as User[];

  const buzzableUsers = users.filter(u => canBuzz(u));

  const renderUserCard = useCallback(
    ({item}: {item: User}) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onSelectUser(item)}
        activeOpacity={0.7}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, isOnline(item) && styles.avatarOnline]}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View
            style={[
              styles.statusDot,
              isOnline(item) ? styles.dotOnline : styles.dotOffline,
            ]}
          />
        </View>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardRole}>{item.role}</Text>
      </TouchableOpacity>
    ),
    [isOnline, onSelectUser],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Buzzer</Text>
        <View style={styles.headerButtons}>
          {(currentUser.role === 'owner' || currentUser.role === 'manager') && (
            <TouchableOpacity style={styles.headerBtn} onPress={onHistory}>
              <Text style={styles.headerBtnText}>Log</Text>
            </TouchableOpacity>
          )}
          {currentUser.role === 'owner' && (
            <TouchableOpacity style={styles.headerBtn} onPress={onSettings}>
              <Text style={styles.headerBtnText}>Settings</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.logoutBtn} onPress={() => setShowLogoutModal(true)}>
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {recentUsers.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionLabel}>RECENT</Text>
          <View style={styles.recentRow}>
            {recentUsers.map(u => (
              <TouchableOpacity
                key={u.id}
                style={styles.recentChip}
                onPress={() => onSelectUser(u)}>
                <View style={[styles.recentAvatar, isOnline(u) && styles.avatarOnline]}>
                  <Text style={styles.recentAvatarText}>
                    {u.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.recentName} numberOfLines={1}>{u.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.sectionLabel}>PEOPLE</Text>
      <FlatList
        data={buzzableUsers}
        renderItem={renderUserCard}
        keyExtractor={item => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
      />

      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconWrap}>
              <Text style={styles.modalIcon}>👋</Text>
            </View>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalLogoutBtn} onPress={() => { setShowLogoutModal(false); onLogout(); }}>
                <Text style={styles.modalLogoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0D0D0D'},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12},
  title: {fontSize: 24, fontWeight: '800', color: '#FF4D4D'},
  headerButtons: {flexDirection: 'row', gap: 8},
  headerBtn: {backgroundColor: '#1A1A1A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8},
  headerBtnText: {color: '#ccc', fontSize: 14, fontWeight: '600'},
  logoutBtn: {backgroundColor: '#2a1515', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8},
  logoutBtnText: {color: '#F44336', fontSize: 14, fontWeight: '600'},
  sectionLabel: {color: '#666', fontSize: 12, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 16, marginTop: 16, marginBottom: 8},
  recentSection: {borderBottomWidth: 1, borderBottomColor: '#1A1A1A', paddingBottom: 12},
  recentRow: {flexDirection: 'row', paddingHorizontal: 16, gap: 12},
  recentChip: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 24, paddingRight: 16, paddingLeft: 4, paddingVertical: 4},
  recentAvatar: {width: 32, height: 32, borderRadius: 16, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', marginRight: 8},
  recentAvatarText: {color: '#fff', fontSize: 14, fontWeight: '700'},
  recentName: {color: '#fff', fontSize: 14, maxWidth: 80},
  grid: {paddingHorizontal: 12, paddingBottom: 24},
  gridRow: {gap: 8, paddingHorizontal: 4},
  card: {width: CARD_SIZE, backgroundColor: '#1A1A1A', borderRadius: 16, alignItems: 'center', paddingVertical: 16, marginBottom: 8},
  avatarContainer: {position: 'relative', marginBottom: 8},
  avatar: {width: 52, height: 52, borderRadius: 26, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center'},
  avatarOnline: {backgroundColor: '#1a3a1a'},
  avatarText: {color: '#fff', fontSize: 22, fontWeight: '700'},
  statusDot: {position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#1A1A1A'},
  dotOnline: {backgroundColor: '#4CAF50'},
  dotOffline: {backgroundColor: '#555'},
  cardName: {color: '#fff', fontSize: 13, fontWeight: '600'},
  cardRole: {color: '#666', fontSize: 11, marginTop: 2, textTransform: 'capitalize'},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32},
  modalBox: {backgroundColor: '#1A1A1A', borderRadius: 20, padding: 28, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#333'},
  modalIconWrap: {width: 64, height: 64, borderRadius: 32, backgroundColor: '#2a1515', alignItems: 'center', justifyContent: 'center', marginBottom: 16},
  modalIcon: {fontSize: 30},
  modalTitle: {color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8},
  modalMessage: {color: '#888', fontSize: 15, textAlign: 'center', marginBottom: 24},
  modalButtons: {flexDirection: 'row', gap: 12, width: '100%'},
  modalCancelBtn: {flex: 1, backgroundColor: '#252525', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333'},
  modalCancelText: {color: '#ccc', fontSize: 16, fontWeight: '700'},
  modalLogoutBtn: {flex: 1, backgroundColor: '#FF4D4D', paddingVertical: 14, borderRadius: 12, alignItems: 'center'},
  modalLogoutText: {color: '#fff', fontSize: 16, fontWeight: '700'},
});

export default HomeScreen;
