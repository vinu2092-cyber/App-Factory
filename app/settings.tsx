import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { useStore } from '../src/store/useStore';
import { Ionicons } from '@expo/vector-icons';

const AI_PROVIDERS = [
  { type: 'gemini', name: 'Google Gemini', icon: 'flash', color: '#4285F4', placeholder: 'AIzaSy...' },
  { type: 'groq', name: 'Groq', icon: 'speedometer', color: '#FF6B35', placeholder: 'gsk_...' },
  { type: 'deepseek', name: 'DeepSeek', icon: 'planet', color: '#6366F1', placeholder: 'sk-...' },
  { type: 'huggingface', name: 'Hugging Face', icon: 'happy', color: '#FFD21E', placeholder: 'hf_...' },
  { type: 'openrouter', name: 'OpenRouter', icon: 'git-network', color: '#10B981', placeholder: 'sk-or-...' },
];

export default function SettingsScreen() {
  const { 
    settings, 
    addAIProvider,
    removeAIProvider,
    setActiveAIProvider,
    addGitHubAccount,
    removeGitHubAccount,
    setDefaultGitHubAccount,
    addExpoAccount,
    removeExpoAccount,
    setDefaultExpoAccount,
    setSettings,
  } = useStore();

  const [activeSection, setActiveSection] = useState<string | null>('ai');
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<'ai' | 'github' | 'expo'>('ai');
  
  const [newProvider, setNewProvider] = useState({ type: 'gemini', name: '', apiKey: '' });
  const [newGitHub, setNewGitHub] = useState({ username: '', token: '' });
  const [newExpo, setNewExpo] = useState({ username: '', password: '' });

  const handleAddAI = () => {
    if (!newProvider.apiKey.trim()) {
      Alert.alert('Error', 'API Key is required');
      return;
    }
    const providerInfo = AI_PROVIDERS.find(p => p.type === newProvider.type);
    addAIProvider({
      name: providerInfo?.name || newProvider.type,
      type: newProvider.type as any,
      apiKey: newProvider.apiKey.trim(),
      isActive: settings.aiProviders.length === 0,
    });
    setNewProvider({ type: 'gemini', name: '', apiKey: '' });
    setShowAddModal(false);
    Alert.alert('Success', 'AI Provider added!');
  };

  const handleAddGitHub = () => {
    if (!newGitHub.username.trim() || !newGitHub.token.trim()) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    addGitHubAccount({
      username: newGitHub.username.trim(),
      token: newGitHub.token.trim(),
      isDefault: false,
    });
    setNewGitHub({ username: '', token: '' });
    setShowAddModal(false);
    Alert.alert('Success', 'GitHub account added!');
  };

  const handleAddExpo = () => {
    if (!newExpo.username.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }
    addExpoAccount({
      username: newExpo.username.trim(),
      password: newExpo.password.trim(),
      isDefault: false,
    });
    setNewExpo({ username: '', password: '' });
    setShowAddModal(false);
    Alert.alert('Success', 'Expo account added!');
  };

  const openAddModal = (type: 'ai' | 'github' | 'expo') => {
    setModalType(type);
    setShowAddModal(true);
  };

  const getProviderColor = (type: string) => AI_PROVIDERS.find(p => p.type === type)?.color || '#A78BFA';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* AI Providers */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setActiveSection(activeSection === 'ai' ? null : 'ai')}
        >
          <View style={styles.sectionLeft}>
            <Ionicons name="flash" size={22} color="#A78BFA" />
            <View>
              <Text style={styles.sectionTitle}>AI Providers</Text>
              <Text style={styles.sectionSub}>{settings.aiProviders.length} configured</Text>
            </View>
          </View>
          <Ionicons name={activeSection === 'ai' ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
        </TouchableOpacity>

        {activeSection === 'ai' && (
          <View style={styles.sectionBody}>
            {settings.aiProviders.map((provider) => (
              <View key={provider.id} style={[styles.item, settings.activeProviderId === provider.id && styles.itemActive]}>
                <View style={[styles.itemIcon, { backgroundColor: getProviderColor(provider.type) + '20' }]}>
                  <Ionicons name="key" size={16} color={getProviderColor(provider.type)} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{provider.name}</Text>
                  <Text style={styles.itemSub}>{provider.apiKey.slice(0, 10)}...</Text>
                </View>
                {settings.activeProviderId === provider.id ? (
                  <View style={styles.activeBadge}>
                    <Text style={styles.badgeText}>Active</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.setBtn} onPress={() => setActiveAIProvider(provider.id)}>
                    <Text style={styles.setBtnText}>Set Active</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => removeAIProvider(provider.id)}>
                  <Ionicons name="trash" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.providerGrid}>
              {AI_PROVIDERS.map((p) => (
                <TouchableOpacity 
                  key={p.type} 
                  style={[styles.addProviderBtn, { borderColor: p.color }]}
                  onPress={() => {
                    setNewProvider({ type: p.type, name: p.name, apiKey: '' });
                    openAddModal('ai');
                  }}
                >
                  <Ionicons name={p.icon as any} size={14} color={p.color} />
                  <Text style={[styles.addProviderText, { color: p.color }]}>+ {p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* GitHub Accounts */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setActiveSection(activeSection === 'github' ? null : 'github')}
        >
          <View style={styles.sectionLeft}>
            <Ionicons name="logo-github" size={22} color="#A78BFA" />
            <View>
              <Text style={styles.sectionTitle}>GitHub Accounts</Text>
              <Text style={styles.sectionSub}>{settings.githubAccounts.length} linked</Text>
            </View>
          </View>
          <Ionicons name={activeSection === 'github' ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
        </TouchableOpacity>

        {activeSection === 'github' && (
          <View style={styles.sectionBody}>
            {settings.githubAccounts.map((account) => (
              <View key={account.id} style={[styles.item, account.isDefault && styles.itemActive]}>
                <View style={[styles.itemIcon, { backgroundColor: '#333' }]}>
                  <Ionicons name="logo-github" size={16} color="#FFF" />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>@{account.username}</Text>
                  <Text style={styles.itemSub}>{account.token.slice(0, 10)}...</Text>
                </View>
                {account.isDefault ? (
                  <View style={styles.activeBadge}>
                    <Text style={styles.badgeText}>Default</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.setBtn} onPress={() => setDefaultGitHubAccount(account.id)}>
                    <Text style={styles.setBtnText}>Set Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => removeGitHubAccount(account.id)}>
                  <Ionicons name="trash" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addBtn} onPress={() => openAddModal('github')}>
              <Ionicons name="add" size={18} color="#A78BFA" />
              <Text style={styles.addBtnText}>Add GitHub Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Expo Accounts */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setActiveSection(activeSection === 'expo' ? null : 'expo')}
        >
          <View style={styles.sectionLeft}>
            <Ionicons name="phone-portrait" size={22} color="#A78BFA" />
            <View>
              <Text style={styles.sectionTitle}>Expo Accounts</Text>
              <Text style={styles.sectionSub}>{settings.expoAccounts.length} configured</Text>
            </View>
          </View>
          <Ionicons name={activeSection === 'expo' ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
        </TouchableOpacity>

        {activeSection === 'expo' && (
          <View style={styles.sectionBody}>
            {settings.expoAccounts.map((account) => (
              <View key={account.id} style={[styles.item, account.isDefault && styles.itemActive]}>
                <View style={[styles.itemIcon, { backgroundColor: '#000' }]}>
                  <Ionicons name="apps" size={16} color="#FFF" />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>@{account.username}</Text>
                  <Text style={styles.itemSub}>Password set</Text>
                </View>
                {account.isDefault ? (
                  <View style={styles.activeBadge}>
                    <Text style={styles.badgeText}>Default</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.setBtn} onPress={() => setDefaultExpoAccount(account.id)}>
                    <Text style={styles.setBtnText}>Set Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => removeExpoAccount(account.id)}>
                  <Ionicons name="trash" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addBtn} onPress={() => openAddModal('expo')}>
              <Ionicons name="add" size={18} color="#A78BFA" />
              <Text style={styles.addBtnText}>Add Expo Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* AI Features */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setActiveSection(activeSection === 'features' ? null : 'features')}
        >
          <View style={styles.sectionLeft}>
            <Ionicons name="sparkles" size={22} color="#A78BFA" />
            <View>
              <Text style={styles.sectionTitle}>AI Agent Features</Text>
              <Text style={styles.sectionSub}>Autonomous capabilities</Text>
            </View>
          </View>
          <Ionicons name={activeSection === 'features' ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
        </TouchableOpacity>

        {activeSection === 'features' && (
          <View style={styles.sectionBody}>
            <View style={styles.toggle}>
              <View style={styles.toggleInfo}>
                <Ionicons name="rocket" size={18} color="#8B5CF6" />
                <Text style={styles.toggleText}>Autonomous Mode</Text>
              </View>
              <Switch
                value={settings.autonomousMode}
                onValueChange={(v) => setSettings({ autonomousMode: v })}
                trackColor={{ false: '#374151', true: '#7C3AED' }}
              />
            </View>
            <View style={styles.toggle}>
              <View style={styles.toggleInfo}>
                <Ionicons name="construct" size={18} color="#10B981" />
                <Text style={styles.toggleText}>Auto-Test Mode</Text>
              </View>
              <Switch
                value={settings.autoTestMode}
                onValueChange={(v) => setSettings({ autoTestMode: v })}
                trackColor={{ false: '#374151', true: '#7C3AED' }}
              />
            </View>
            <View style={styles.toggle}>
              <View style={styles.toggleInfo}>
                <Ionicons name="bug" size={18} color="#EF4444" />
                <Text style={styles.toggleText}>Auto-Debug Mode</Text>
              </View>
              <Switch
                value={settings.autoDebugMode}
                onValueChange={(v) => setSettings({ autoDebugMode: v })}
                trackColor={{ false: '#374151', true: '#7C3AED' }}
              />
            </View>
            <View style={styles.toggle}>
              <View style={styles.toggleInfo}>
                <Ionicons name="camera" size={18} color="#F59E0B" />
                <Text style={styles.toggleText}>Screenshot Analysis</Text>
              </View>
              <Switch
                value={settings.screenshotAnalysis}
                onValueChange={(v) => setSettings({ screenshotAnalysis: v })}
                trackColor={{ false: '#374151', true: '#7C3AED' }}
              />
            </View>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Get API Keys:</Text>
        <Text style={styles.infoText}>
          • Gemini: aistudio.google.com{"\n"}
          • Groq: console.groq.com{"\n"}
          • DeepSeek: platform.deepseek.com{"\n"}
          • GitHub: Settings → Developer → Tokens{"\n"}
          • Expo: expo.dev → Account Settings
        </Text>
      </View>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'ai' ? 'Add AI Provider' : modalType === 'github' ? 'Add GitHub' : 'Add Expo'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {modalType === 'ai' && (
                <>
                  <View style={styles.providerSelect}>
                    {AI_PROVIDERS.map((p) => (
                      <TouchableOpacity
                        key={p.type}
                        style={[styles.providerOption, newProvider.type === p.type && styles.providerOptionActive]}
                        onPress={() => setNewProvider({ ...newProvider, type: p.type })}
                      >
                        <Ionicons name={p.icon as any} size={16} color={p.color} />
                        <Text style={[styles.providerOptionText, { color: p.color }]}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={AI_PROVIDERS.find(p => p.type === newProvider.type)?.placeholder}
                    placeholderTextColor="#6B7280"
                    value={newProvider.apiKey}
                    onChangeText={(t) => setNewProvider({ ...newProvider, apiKey: t })}
                    secureTextEntry
                  />
                  <TouchableOpacity style={styles.modalSubmit} onPress={handleAddAI}>
                    <Text style={styles.modalSubmitText}>Add Provider</Text>
                  </TouchableOpacity>
                </>
              )}

              {modalType === 'github' && (
                <>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="GitHub Username"
                    placeholderTextColor="#6B7280"
                    value={newGitHub.username}
                    onChangeText={(t) => setNewGitHub({ ...newGitHub, username: t })}
                  />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Personal Access Token (ghp_...)"
                    placeholderTextColor="#6B7280"
                    value={newGitHub.token}
                    onChangeText={(t) => setNewGitHub({ ...newGitHub, token: t })}
                    secureTextEntry
                  />
                  <TouchableOpacity style={styles.modalSubmit} onPress={handleAddGitHub}>
                    <Text style={styles.modalSubmitText}>Add Account</Text>
                  </TouchableOpacity>
                </>
              )}

              {modalType === 'expo' && (
                <>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Expo Username"
                    placeholderTextColor="#6B7280"
                    value={newExpo.username}
                    onChangeText={(t) => setNewExpo({ ...newExpo, username: t })}
                  />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Password"
                    placeholderTextColor="#6B7280"
                    value={newExpo.password}
                    onChangeText={(t) => setNewExpo({ ...newExpo, password: t })}
                    secureTextEntry
                  />
                  <TouchableOpacity style={styles.modalSubmit} onPress={handleAddExpo}>
                    <Text style={styles.modalSubmitText}>Add Account</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  content: { padding: 16, paddingBottom: 40 },
  section: { backgroundColor: '#12121A', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1F1F2E' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  sectionSub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  sectionBody: { padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#1F1F2E' },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F1F2E', padding: 12, borderRadius: 10, marginBottom: 10, gap: 10 },
  itemActive: { borderWidth: 1, borderColor: '#A78BFA' },
  itemIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemTitle: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  itemSub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  activeBadge: { backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  setBtn: { backgroundColor: '#374151', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  setBtnText: { color: '#D1D5DB', fontSize: 11, fontWeight: '600' },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  addProviderBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, gap: 4 },
  addProviderText: { fontSize: 11, fontWeight: '600' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#A78BFA', borderStyle: 'dashed', gap: 8, marginTop: 8 },
  addBtnText: { color: '#A78BFA', fontSize: 14, fontWeight: '600' },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1F1F2E' },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleText: { color: '#FFF', fontSize: 14 },
  infoBox: { padding: 16, backgroundColor: '#1F1F2E', borderRadius: 12, marginTop: 8 },
  infoTitle: { color: '#FCD34D', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  infoText: { color: '#9CA3AF', fontSize: 12, lineHeight: 22 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#12121A', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1F1F2E' },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  modalInput: { backgroundColor: '#1F1F2E', borderWidth: 1, borderColor: '#2D2D3D', borderRadius: 10, color: '#FFF', padding: 14, fontSize: 15, marginBottom: 16 },
  providerSelect: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  providerOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#2D2D3D', backgroundColor: '#1F1F2E', gap: 8 },
  providerOptionActive: { backgroundColor: '#2D2D4A' },
  providerOptionText: { fontSize: 12, fontWeight: '600' },
  modalSubmit: { backgroundColor: '#A78BFA', padding: 16, borderRadius: 12, alignItems: 'center' },
  modalSubmitText: { color: '#0A0A0F', fontSize: 16, fontWeight: 'bold' },
});
