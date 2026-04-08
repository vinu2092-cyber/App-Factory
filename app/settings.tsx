import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../src/store/useStore';

const PROVIDERS = [
  { type: 'gemini', name: 'Google Gemini', color: '#4285F4' },
  { type: 'groq', name: 'Groq', color: '#FF6B35' },
  { type: 'deepseek', name: 'DeepSeek', color: '#6366F1' },
  { type: 'huggingface', name: 'Hugging Face', color: '#FFD21E' },
  { type: 'openrouter', name: 'OpenRouter', color: '#10B981' },
];

export default function Settings() {
  const store = useStore();
  const [modal, setModal] = useState<'ai' | 'github' | 'expo' | null>(null);
  const [newAI, setNewAI] = useState({ type: 'gemini', apiKey: '' });
  const [newGH, setNewGH] = useState({ username: '', token: '' });
  const [newExpo, setNewExpo] = useState({ username: '', password: '' });

  const addAI = () => {
    if (!newAI.apiKey.trim()) return Alert.alert('Error', 'API Key required');
    const info = PROVIDERS.find(p => p.type === newAI.type);
    store.addAIProvider({ name: info?.name || newAI.type, type: newAI.type, apiKey: newAI.apiKey.trim() });
    setNewAI({ type: 'gemini', apiKey: '' });
    setModal(null);
  };

  const addGH = () => {
    if (!newGH.username.trim() || !newGH.token.trim()) return Alert.alert('Error', 'All fields required');
    store.addGitHubAccount({ username: newGH.username.trim(), token: newGH.token.trim(), isDefault: false });
    setNewGH({ username: '', token: '' });
    setModal(null);
  };

  const addExpoAcc = () => {
    if (!newExpo.username.trim()) return Alert.alert('Error', 'Username required');
    store.addExpoAccount({ username: newExpo.username.trim(), password: newExpo.password.trim(), isDefault: false });
    setNewExpo({ username: '', password: '' });
    setModal(null);
  };

  return (
    <ScrollView style={styles.container}>
      {/* AI Providers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Providers</Text>
        {store.aiProviders.map(p => (
          <View key={p.id} style={[styles.item, store.activeProviderId === p.id && styles.itemActive]}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{p.name}</Text>
              <Text style={styles.itemSub}>{p.apiKey.slice(0, 10)}...</Text>
            </View>
            {store.activeProviderId === p.id ? (
              <View style={styles.badge}><Text style={styles.badgeText}>Active</Text></View>
            ) : (
              <TouchableOpacity style={styles.setBtn} onPress={() => store.setActiveAIProvider(p.id)}>
                <Text style={styles.setBtnText}>Set Active</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => store.removeAIProvider(p.id)}>
              <Ionicons name="trash" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.btnGrid}>
          {PROVIDERS.map(p => (
            <TouchableOpacity key={p.type} style={[styles.addBtn, { borderColor: p.color }]} onPress={() => { setNewAI({ type: p.type, apiKey: '' }); setModal('ai'); }}>
              <Text style={[styles.addBtnText, { color: p.color }]}>+ {p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* GitHub */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GitHub Accounts</Text>
        {store.githubAccounts.map(a => (
          <View key={a.id} style={[styles.item, a.isDefault && styles.itemActive]}>
            <Ionicons name="logo-github" size={20} color="#FFF" />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>@{a.username}</Text>
            </View>
            {a.isDefault ? (
              <View style={styles.badge}><Text style={styles.badgeText}>Default</Text></View>
            ) : (
              <TouchableOpacity style={styles.setBtn} onPress={() => store.setDefaultGitHubAccount(a.id)}>
                <Text style={styles.setBtnText}>Set Default</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => store.removeGitHubAccount(a.id)}>
              <Ionicons name="trash" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addFull} onPress={() => setModal('github')}>
          <Ionicons name="add" size={18} color="#A78BFA" />
          <Text style={styles.addFullText}>Add GitHub Account</Text>
        </TouchableOpacity>
      </View>

      {/* Expo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expo Accounts</Text>
        {store.expoAccounts.map(a => (
          <View key={a.id} style={[styles.item, a.isDefault && styles.itemActive]}>
            <Ionicons name="phone-portrait" size={20} color="#FFF" />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>@{a.username}</Text>
            </View>
            {a.isDefault ? (
              <View style={styles.badge}><Text style={styles.badgeText}>Default</Text></View>
            ) : (
              <TouchableOpacity style={styles.setBtn} onPress={() => store.setDefaultExpoAccount(a.id)}>
                <Text style={styles.setBtnText}>Set Default</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => store.removeExpoAccount(a.id)}>
              <Ionicons name="trash" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addFull} onPress={() => setModal('expo')}>
          <Ionicons name="add" size={18} color="#A78BFA" />
          <Text style={styles.addFullText}>Add Expo Account</Text>
        </TouchableOpacity>
      </View>

      {/* Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Features</Text>
        <View style={styles.toggle}>
          <Text style={styles.toggleText}>Autonomous Mode</Text>
          <Switch value={store.autonomousMode} onValueChange={v => store.setSettings({ autonomousMode: v })} trackColor={{ false: '#374151', true: '#7C3AED' }} />
        </View>
        <View style={styles.toggle}>
          <Text style={styles.toggleText}>Auto-Test Mode</Text>
          <Switch value={store.autoTestMode} onValueChange={v => store.setSettings({ autoTestMode: v })} trackColor={{ false: '#374151', true: '#7C3AED' }} />
        </View>
        <View style={styles.toggle}>
          <Text style={styles.toggleText}>Auto-Debug Mode</Text>
          <Switch value={store.autoDebugMode} onValueChange={v => store.setSettings({ autoDebugMode: v })} trackColor={{ false: '#374151', true: '#7C3AED' }} />
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.infoTitle}>Get API Keys:</Text>
        <Text style={styles.infoText}>• Gemini: aistudio.google.com{"\n"}• Groq: console.groq.com{"\n"}• GitHub: Settings → Developer → Tokens</Text>
      </View>

      {/* Modal */}
      <Modal visible={!!modal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modal === 'ai' ? 'Add AI Provider' : modal === 'github' ? 'Add GitHub' : 'Add Expo'}</Text>
              <TouchableOpacity onPress={() => setModal(null)}><Ionicons name="close" size={24} color="#9CA3AF" /></TouchableOpacity>
            </View>

            {modal === 'ai' && (
              <>
                <View style={styles.providerRow}>
                  {PROVIDERS.map(p => (
                    <TouchableOpacity key={p.type} style={[styles.providerBtn, newAI.type === p.type && styles.providerBtnActive]} onPress={() => setNewAI({ ...newAI, type: p.type })}>
                      <Text style={[styles.providerBtnText, { color: p.color }]}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={styles.modalInput} placeholder="API Key" placeholderTextColor="#6B7280" value={newAI.apiKey} onChangeText={t => setNewAI({ ...newAI, apiKey: t })} secureTextEntry />
                <TouchableOpacity style={styles.modalSubmit} onPress={addAI}><Text style={styles.modalSubmitText}>Add Provider</Text></TouchableOpacity>
              </>
            )}

            {modal === 'github' && (
              <>
                <TextInput style={styles.modalInput} placeholder="GitHub Username" placeholderTextColor="#6B7280" value={newGH.username} onChangeText={t => setNewGH({ ...newGH, username: t })} />
                <TextInput style={styles.modalInput} placeholder="Personal Access Token" placeholderTextColor="#6B7280" value={newGH.token} onChangeText={t => setNewGH({ ...newGH, token: t })} secureTextEntry />
                <TouchableOpacity style={styles.modalSubmit} onPress={addGH}><Text style={styles.modalSubmitText}>Add Account</Text></TouchableOpacity>
              </>
            )}

            {modal === 'expo' && (
              <>
                <TextInput style={styles.modalInput} placeholder="Expo Username" placeholderTextColor="#6B7280" value={newExpo.username} onChangeText={t => setNewExpo({ ...newExpo, username: t })} />
                <TextInput style={styles.modalInput} placeholder="Password (optional)" placeholderTextColor="#6B7280" value={newExpo.password} onChangeText={t => setNewExpo({ ...newExpo, password: t })} secureTextEntry />
                <TouchableOpacity style={styles.modalSubmit} onPress={addExpoAcc}><Text style={styles.modalSubmitText}>Add Account</Text></TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F', padding: 16 },
  section: { backgroundColor: '#12121A', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1F1F2E' },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F1F2E', padding: 12, borderRadius: 10, marginBottom: 8, gap: 10 },
  itemActive: { borderWidth: 1, borderColor: '#A78BFA' },
  itemInfo: { flex: 1 },
  itemName: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  itemSub: { color: '#6B7280', fontSize: 12 },
  badge: { backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  setBtn: { backgroundColor: '#374151', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  setBtnText: { color: '#D1D5DB', fontSize: 11, fontWeight: '600' },
  btnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  addBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  addBtnText: { fontSize: 11, fontWeight: '600' },
  addFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#A78BFA', borderStyle: 'dashed', gap: 6, marginTop: 8 },
  addFullText: { color: '#A78BFA', fontSize: 14, fontWeight: '600' },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1F1F2E' },
  toggleText: { color: '#FFF', fontSize: 14 },
  info: { padding: 16, backgroundColor: '#1F1F2E', borderRadius: 12 },
  infoTitle: { color: '#FCD34D', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  infoText: { color: '#9CA3AF', fontSize: 12, lineHeight: 20 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#12121A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  providerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  providerBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#2D2D3D', backgroundColor: '#1F1F2E' },
  providerBtnActive: { backgroundColor: '#2D2D4A' },
  providerBtnText: { fontSize: 12, fontWeight: '600' },
  modalInput: { backgroundColor: '#1F1F2E', borderWidth: 1, borderColor: '#2D2D3D', borderRadius: 10, color: '#FFF', padding: 14, fontSize: 15, marginBottom: 12 },
  modalSubmit: { backgroundColor: '#A78BFA', padding: 16, borderRadius: 12, alignItems: 'center' },
  modalSubmitText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
});
