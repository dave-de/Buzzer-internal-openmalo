import React, {useState, useEffect} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView} from 'react-native';
import {User, Reason} from '../types';
import {subscribeToUsers, subscribeToReasons, addUser, removeUser, resetUserPin, updateUserRole, addReason, removeReason} from '../services/firebase';
import {hashPin} from '../services/auth';
import {MAX_REASONS} from '../constants';

interface Props {
  currentUser: User;
  onBack: () => void;
}

const SettingsScreen: React.FC<Props> = ({currentUser, onBack}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'manager' | 'member'>('member');
  const [newReasonLabel, setNewReasonLabel] = useState('');

  useEffect(() => {
    const unsub1 = subscribeToUsers(setUsers);
    const unsub2 = subscribeToReasons(setReasons);
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleAddUser = async () => {
    if (!newName.trim() || !newPhone.trim()) { Alert.alert('Error', 'Name and phone are required'); return; }
    const defaultPin = '1234';
    await addUser({name: newName.trim(), phone: newPhone.trim(), pin_hash: hashPin(defaultPin), role: newRole, fcm_token: '', last_seen_at: 0, is_active: true});
    Alert.alert('Added', `${newName} added with default PIN: ${defaultPin}`);
    setNewName(''); setNewPhone(''); setShowAddUser(false);
  };

  const handleRemoveUser = (user: User) => {
    Alert.alert('Remove User', `Remove ${user.name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Remove', style: 'destructive', onPress: () => removeUser(user.id)},
    ]);
  };

  const handleResetPin = (user: User) => {
    const newPin = '1234';
    Alert.alert('Reset PIN', `Reset ${user.name}'s PIN to ${newPin}?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Reset', onPress: () => resetUserPin(user.id, hashPin(newPin))},
    ]);
  };

  const handleChangeRole = (user: User) => {
    const newRole = user.role === 'manager' ? 'member' : 'manager';
    Alert.alert(
      'Change Role',
      `Change ${user.name}'s role to ${newRole}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Change', onPress: () => updateUserRole(user.id, newRole)},
      ],
    );
  };

  const handleAddReason = async () => {
    if (!newReasonLabel.trim()) return;
    if (reasons.length >= MAX_REASONS) { Alert.alert('Limit', `Maximum ${MAX_REASONS} reasons allowed`); return; }
    await addReason(newReasonLabel.trim(), reasons.length);
    setNewReasonLabel('');
  };

  const handleRemoveReason = (reason: Reason) => {
    Alert.alert('Remove Reason', `Remove "${reason.label}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Remove', style: 'destructive', onPress: () => removeReason(reason.id)},
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{width: 50}} />
      </View>
      <ScrollView style={styles.scroll}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>USERS</Text>
            <TouchableOpacity onPress={() => setShowAddUser(!showAddUser)}><Text style={styles.addBtn}>{showAddUser ? '✕' : '+ Add'}</Text></TouchableOpacity>
          </View>
          {showAddUser && (
            <View style={styles.addForm}>
              <TextInput style={styles.formInput} placeholder="Name" placeholderTextColor="#666" value={newName} onChangeText={setNewName} />
              <TextInput style={styles.formInput} placeholder="Phone" placeholderTextColor="#666" keyboardType="phone-pad" value={newPhone} onChangeText={setNewPhone} />
              <View style={styles.roleRow}>
                {(['manager', 'member'] as const).map(role => (
                  <TouchableOpacity key={role} style={[styles.roleChip, newRole === role && styles.roleChipActive]} onPress={() => setNewRole(role)}>
                    <Text style={[styles.roleChipText, newRole === role && styles.roleChipTextActive]}>{role}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddUser}><Text style={styles.submitBtnText}>Add User</Text></TouchableOpacity>
            </View>
          )}
          {users.map(user => (
            <View key={user.id} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <View style={styles.nameRow}>
                  <Text style={styles.listItemName}>{user.name}</Text>
                  <View style={[styles.roleBadge, user.role === 'owner' ? styles.roleBadgeOwner : user.role === 'manager' ? styles.roleBadgeManager : styles.roleBadgeMember]}>
                    <Text style={[styles.roleBadgeText, user.role === 'owner' ? styles.roleBadgeTextOwner : user.role === 'manager' ? styles.roleBadgeTextManager : styles.roleBadgeTextMember]}>{user.role}</Text>
                  </View>
                </View>
                <Text style={styles.listItemSub}>{user.phone}</Text>
              </View>
              {user.id !== currentUser.id && user.role !== 'owner' && (
                <View style={styles.listItemActions}>
                  <TouchableOpacity onPress={() => handleChangeRole(user)}>
                    <Text style={styles.actionTextRole}>{user.role === 'manager' ? '↓' : '↑'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleResetPin(user)}><Text style={styles.actionText}>PIN</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRemoveUser(user)}><Text style={[styles.actionText, styles.actionDanger]}>✕</Text></TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BUZZ REASONS</Text>
          <View style={styles.addReasonRow}>
            <TextInput style={[styles.formInput, {flex: 1, marginBottom: 0}]} placeholder="New reason" placeholderTextColor="#666" value={newReasonLabel} onChangeText={setNewReasonLabel} />
            <TouchableOpacity style={styles.addReasonBtn} onPress={handleAddReason}><Text style={styles.addReasonBtnText}>+</Text></TouchableOpacity>
          </View>
          {reasons.map(reason => (
            <View key={reason.id} style={styles.listItem}>
              <Text style={styles.listItemName}>{reason.label}</Text>
              <TouchableOpacity onPress={() => handleRemoveReason(reason)}><Text style={[styles.actionText, styles.actionDanger]}>✕</Text></TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0D0D0D'},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12},
  backBtn: {color: '#FF4D4D', fontSize: 16, fontWeight: '600'},
  headerTitle: {color: '#fff', fontSize: 20, fontWeight: '700'},
  scroll: {flex: 1},
  section: {paddingHorizontal: 16, marginBottom: 32},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  sectionTitle: {color: '#666', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12},
  addBtn: {color: '#FF4D4D', fontSize: 14, fontWeight: '600', marginBottom: 12},
  addForm: {backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, marginBottom: 12},
  formInput: {backgroundColor: '#252525', color: '#fff', fontSize: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, marginBottom: 10},
  roleRow: {flexDirection: 'row', gap: 8, marginBottom: 12},
  roleChip: {paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#252525'},
  roleChipActive: {backgroundColor: '#3a1515', borderWidth: 1, borderColor: '#FF4D4D'},
  roleChipText: {color: '#888', fontSize: 14, textTransform: 'capitalize'},
  roleChipTextActive: {color: '#FF4D4D'},
  submitBtn: {backgroundColor: '#FF4D4D', paddingVertical: 12, borderRadius: 8, alignItems: 'center'},
  submitBtnText: {color: '#fff', fontSize: 16, fontWeight: '700'},
  listItem: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10, marginBottom: 6},
  listItemLeft: {flex: 1},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  listItemName: {color: '#fff', fontSize: 16, fontWeight: '600'},
  roleBadge: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6},
  roleBadgeOwner: {backgroundColor: '#FF4D4D20'},
  roleBadgeManager: {backgroundColor: '#FF980020'},
  roleBadgeMember: {backgroundColor: '#33333380'},
  roleBadgeText: {fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5},
  roleBadgeTextOwner: {color: '#FF4D4D'},
  roleBadgeTextManager: {color: '#FF9800'},
  roleBadgeTextMember: {color: '#888'},
  listItemSub: {color: '#666', fontSize: 13, marginTop: 2},
  listItemActions: {flexDirection: 'row', gap: 16, alignItems: 'center'},
  actionText: {color: '#888', fontSize: 14, fontWeight: '600'},
  actionTextRole: {color: '#FF9800', fontSize: 18, fontWeight: '800'},
  actionDanger: {color: '#F44336'},
  addReasonRow: {flexDirection: 'row', gap: 8, marginBottom: 12},
  addReasonBtn: {backgroundColor: '#FF4D4D', width: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  addReasonBtnText: {color: '#fff', fontSize: 24, fontWeight: '700'},
});

export default SettingsScreen;
