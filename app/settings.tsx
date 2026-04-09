import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, Alert, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../src/store/useStore';

// All AI Providers with their details
const AI_PROVIDERS = [
  { type: 'gemini', name: 'Google Gemini', color: '#4285F4', placeholder: 'AIzaSy...', url: 'https://aistudio.google.com' },
  { type: 'groq', name: 'Groq', color: '#FF6B35', placeholder: 'gsk_...', url: 'https://console.groq.com' },
  { type: 'deepseek', name: 'DeepSeek', color: '#6366F1', placeholder: 'sk-...', url: 'https://platform.deepseek.com' },
  { type: 'huggingface', name: 'Hugging Face', color: '#FFD21E', placeholder: 'hf_...', url: 'https://huggingface.co/settings/tokens' },
  { type: 'openrouter', name: 'OpenRouter', color: '#10B981', placeholder: 'sk-or-...', url: 'https://openrouter.ai/keys' },
];

// Build Tools
const BUILD_TOOLS = [
  { type: 'firebase', name: 'Firebase', color: '#FFA000' },
  { type: 'playstore', name: 'Play Store', color: '#34A853' },
  { type: 'appstore', name: 'App Store', color: '#007AFF' },
];

export default function Settings() {
  const store = useStore();
  const [activeSection, setActiveSection] = useState<string | null>('ai');
  const [modal, setModal] = useState<'ai' | 'github' | 'expo' | 'build' | null>(null);
  
  // Form states
  const [newAI, setNewAI] = useState({ type: 'gemini', apiKey: '' });
  const [newGH, setNewGH] = useState({ username: '', token: '' });
  const [newExpo, setNewExpo] = useState({ username: '', password: '', accessToken: '' });
  const [newBuild, setNewBuild] = useState({ type: 'firebase', credentials: '' });

  // Add AI Provider
  const addAI = () => {
    if (!newAI.apiKey.trim()) {
      Alert.alert('Error', 'API Key is required');
      return;
    }
    const info = AI_PROVIDERS.find(p => p.type === newAI.type);
    store.addAIProvider({ 
      name: info?.name || newAI.type, 
      type: newAI.type, 
      apiKey: newAI.apiKey.trim() 
    });
    setNewAI({ type: 'gemini', apiKey: '' });
    setModal(null);
    Alert.alert('Success', `${info?.name} added successfully!`);
  };

  // Add GitHub Account
  const addGH = () => {
    if (!newGH.username.trim() || !newGH.token.trim()) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    store.addGitHubAccount({ 
      username: newGH.username.trim(), 
      token: newGH.token.trim(), 
      isDefault: false 
    });
    setNewGH({ username: '', token: '' });
    setModal(null);
    Alert.alert('Success', 'GitHub account added!');
  };

  // Add Expo Account
  const addExpoAcc = () => {
    if (!newExpo.username.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }
    store.addExpoAccount({ 
      username: newExpo.username.trim(), 
      password: newExpo.password.trim(),
      accessToken: newExpo.accessToken.trim() || undefined,
      isDefault: false 
    });
    setNewExpo({ username: '', password: '', accessToken: '' });
    setModal(null);
    Alert.alert('Success', 'Expo account added!');
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ==================== AI PROVIDERS ==================== */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('ai')}>
          <View style={styles.sectionLeft}>
            <Ionicons name="flash" size={22} color="#A78BFA" />
            <View>
              <Text style={styles.sectionTitle}>AI Providers</Text>
              <Text style={styles.sectionSub}>{store.aiProviders.length} configured</Text>
            </View>
          </View>
          <Ionicons name={activeSection === 'ai' ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
        </TouchableOpacity>

        {activeSection === 'ai' && (
          <View style={styles.sectionBody}>
            <Text style={styles.desc}>
              Add multiple AI providers. App Factory will use the active one for code generation.
            </Text>

            {/* Groq Recommendation Banner */}
            {!store.aiProviders.some(p => p.type === 'groq') && (
              <TouchableOpacity 
                style={styles.recommendBanner}
                onPress={() => {
                  setNewAI({ type: 'groq', apiKey: '' });
                  setModal('ai');
                }}
              >
                <View style={styles.recommendIcon}>
                  <Ionicons name="flash" size={20} color="#FF6B35" />
                </View>
                <View style={styles.recommendContent}>
                  <Text style={styles.recommendTitle}>Groq Add karo - FREE Backup!</Text>
                  <Text style={styles.recommendDesc}>Gemini fail ho toh Groq automatic use hoga. Super fast hai!</Text>
                </View>
                <Ionicons name="add-circle" size={24} color="#FF6B35" />
              </TouchableOpacity>
            )}

            {/* Existing Providers */}
            {store.aiProviders.map(p => {
              const info = AI_PROVIDERS.find(pr => pr.type === p.type);
              return (
                <View key={p.id} style={[styles.item, store.activeProviderId === p.id && styles.itemActive]}>
                  <View style={[styles.itemIcon, { backgroundColor: (info?.color || '#A78BFA') + '20' }]}>
                    <Ionicons name="key" size={16} color={info?.color || '#A78BFA'} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{p.name}</Text>
                    <Text style={styles.itemSub}>{p.apiKey.slice(0, 12)}...</Text>
                  </View>
                  {store.activeProviderId === p.id ? (
                    <View style={styles.activeBadge}>
                      <Text style={styles.badgeText}>Active</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.setBtn} onPress={() => store.setActiveAIProvider(p.id)}>
                      <Text style={styles.setBtnText}>Set Active</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => {
                    Alert.alert('Remove?', `Remove ${p.name}?`, [
                      { text: 'Cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => store.removeAIProvider(p.id) }
                    ]);
                  }}>
                    <Ionicons name="trash" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* Add Provider Buttons */}
            <View style={styles.btnGrid}>
              {AI_PROVIDERS.map(p => (
                <TouchableOpacity 
                  key={p.type} 
                  style={[styles.addProviderBtn, { borderColor: p.color }]}
                  onPress={() => {
                    setNewAI({ type: p.type, apiKey: '' });
                    setModal('ai');
                  }}
                >
                  <Ionicons name="add" size={14} color={p.color} />
                  <Text style={[styles.addProviderText, { color: p.color }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* ==================== GITHUB ACCOUNTS ==================== */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('github')}>
          <View style={styles.sectionLeft}>
            <Ionicons name="logo-github" size={22} color="#A78BFA" />
            <View>
              <Text style={styles.sectionTitle}>GitHub Accounts</Text>
              <Text style={styles.sectionSub}>{store.githubAccounts.length} linked</Text>
            </View>
          </View>
          <Ionicons name={activeSection === 'github' ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
        </TouchableOpacity>

        {activeSection === 'github' && (
          <View style={styles.sectionBody}>
            <Text style={styles.desc}>
              Link GitHub accounts for auto-push and CI/CD builds. Agent will use default account.
            </Text>

            {store.githubAccounts.map(a => (
              <View key={a.id} style={[styles.item, a.isDefault && styles.itemActive]}>
                <View style={[styles.itemIcon, { backgroundColor: '#333' }]}>
                  <Ionicons name="logo-github" size={16} color="#FFF" />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>@{a.username}</Text>
                  <Text style={styles.itemSub}>{a.token.slice(0, 10)}...</Text>
                </View>
                {a.isDefault ? (
                  <View style={styles.activeBadge}>
                    <Text style={styles.badgeText}>Default</Text>
                  </View>
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

            <TouchableOpacity style={styles.addFullBtn} onPress={() => setModal('github')}>
              <Ionicons name="add" size={18} color="#A78BFA" />
              <Text style={styles.addFullText}>Add GitHub Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ==================== EXPO ACCOUNTS ==================== */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('expo')}>
          <View style={styles.sectionLeft}>
            <Ionicons name="phone-portrait" size={22} color="#A78BFA" />
            <View>
              <Text style={styles.sectionTitle}>Expo Accounts</Text>
              <Text style={styles.sectionSub}>{store.expoAccounts.length} configured</Text>
            </View>
          </View>
          <Ionicons name={activeSection === 'expo' ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
        </TouchableOpacity>

        {activeSection === 'expo' && (
          <View style={styles.sectionBody}>
            <Text style={styles.desc}>
              For EAS Build, live preview, and OTA updates. Get credentials from expo.dev
            </Text>

            {store.expoAccounts.map(a => (
              <View key={a.id} style={[styles.item, a.isDefault && styles.itemActive]}>
                <View style={[styles.itemIcon, { backgroundColor: '#000' }]}>
                  <Ionicons name="apps" size={16} color="#FFF" />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>@{a.username}</Text>
                  <Text style={styles.itemSub}>{a.accessToken ? 'Access Token' : 'Password'} set</Text>
                </View>
                {a.isDefault ? (
                  <View style={styles.activeBadge}>
                    <Text style={styles.badgeText}>Default</Text>
                  </View>
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

            <TouchableOpacity style={styles.addFullBtn} onPress={() => setModal('expo')}>
              <Ionicons name="add" size={18} color="#A78BFA" />
              <Text style={styles.addFullText}>Add Expo Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ==================== AI AGENT FEATURES ==================== */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('features')}>
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
              <View style={styles.toggleLeft}>
                <Ionicons name="rocket" size={18} color="#8B5CF6" />
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Autonomous Mode</Text>
                  <Text style={styles.toggleDesc}>Full auto - code, push, build, self-heal</Text>
                </View>
              </View>
              <Switch
                value={store.autonomousMode}
                onValueChange={v => store.setSettings({ autonomousMode: v })}
                trackColor={{ false: '#374151', true: '#7C3AED' }}
              />
            </View>

            <View style={styles.toggle}>
              <View style={styles.toggleLeft}>
                <Ionicons name="git-branch" size={18} color="#10B981" />
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Auto GitHub Push</Text>
                  <Text style={styles.toggleDesc}>Push code automatically after generation</Text>
                </View>
              </View>
              <Switch
                value={store.autoTestMode}
                onValueChange={v => store.setSettings({ autoTestMode: v })}
                trackColor={{ false: '#374151', true: '#7C3AED' }}
              />
            </View>

            <View style={styles.toggle}>
              <View style={styles.toggleLeft}>
                <Ionicons name="build" size={18} color="#F59E0B" />
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Self-Healing Builds</Text>
                  <Text style={styles.toggleDesc}>Auto-fix errors and retry builds</Text>
                </View>
              </View>
              <Switch
                value={store.autoDebugMode}
                onValueChange={v => store.setSettings({ autoDebugMode: v })}
                trackColor={{ false: '#374151', true: '#7C3AED' }}
              />
            </View>

            <View style={styles.toggle}>
              <View style={styles.toggleLeft}>
                <Ionicons name="camera" size={18} color="#EF4444" />
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Screenshot Analysis</Text>
                  <Text style={styles.toggleDesc}>Analyze UI from screenshots</Text>
                </View>
              </View>
              <Switch
                value={store.screenshotAnalysis}
                onValueChange={v => store.setSettings({ screenshotAnalysis: v })}
                trackColor={{ false: '#374151', true: '#7C3AED' }}
              />
            </View>
          </View>
        )}
      </View>

      {/* ==================== HOW TO GET KEYS ==================== */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>How to get API Keys:</Text>
        {AI_PROVIDERS.map(p => (
          <TouchableOpacity key={p.type} style={styles.infoRow} onPress={() => Linking.openURL(p.url)}>
            <Text style={[styles.infoLabel, { color: p.color }]}>{p.name}:</Text>
            <Text style={styles.infoUrl}>{p.url.replace('https://', '')}</Text>
            <Ionicons name="open-outline" size={14} color="#6B7280" />
          </TouchableOpacity>
        ))}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>GitHub:</Text>
          <Text style={styles.infoUrl}>Settings → Developer → Personal Access Tokens</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Expo:</Text>
          <Text style={styles.infoUrl}>expo.dev → Account Settings → Access Tokens</Text>
        </View>
      </View>

      {/* ==================== MODALS ==================== */}
      
      {/* AI Provider Modal */}
      <Modal visible={modal === 'ai'} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add AI Provider</Text>
              <TouchableOpacity onPress={() => setModal(null)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Select Provider</Text>
              <View style={styles.providerGrid}>
                {AI_PROVIDERS.map(p => (
                  <TouchableOpacity 
                    key={p.type}
                    style={[styles.providerBtn, newAI.type === p.type && styles.providerBtnActive, { borderColor: p.color }]}
                    onPress={() => setNewAI({ ...newAI, type: p.type })}
                  >
                    <Text style={[styles.providerBtnText, { color: p.color }]}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>API Key</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={AI_PROVIDERS.find(p => p.type === newAI.type)?.placeholder}
                placeholderTextColor="#6B7280"
                value={newAI.apiKey}
                onChangeText={t => setNewAI({ ...newAI, apiKey: t })}
                secureTextEntry
                autoCapitalize="none"
              />

              <TouchableOpacity style={styles.modalSubmit} onPress={addAI}>
                <Text style={styles.modalSubmitText}>Add Provider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* GitHub Modal */}
      <Modal visible={modal === 'github'} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add GitHub Account</Text>
              <TouchableOpacity onPress={() => setModal(null)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>GitHub Username</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="your-username"
                placeholderTextColor="#6B7280"
                value={newGH.username}
                onChangeText={t => setNewGH({ ...newGH, username: t })}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Personal Access Token</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="ghp_xxxxxxxxxxxx"
                placeholderTextColor="#6B7280"
                value={newGH.token}
                onChangeText={t => setNewGH({ ...newGH, token: t })}
                secureTextEntry
                autoCapitalize="none"
              />
              <Text style={styles.hint}>Need: repo, workflow permissions</Text>

              <TouchableOpacity style={styles.modalSubmit} onPress={addGH}>
                <Text style={styles.modalSubmitText}>Add Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Expo Modal */}
      <Modal visible={modal === 'expo'} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Expo Account</Text>
              <TouchableOpacity onPress={() => setModal(null)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Expo Username</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="your-expo-username"
                placeholderTextColor="#6B7280"
                value={newExpo.username}
                onChangeText={t => setNewExpo({ ...newExpo, username: t })}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Password (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Your Expo password"
                placeholderTextColor="#6B7280"
                value={newExpo.password}
                onChangeText={t => setNewExpo({ ...newExpo, password: t })}
                secureTextEntry
              />

              <Text style={styles.inputLabel}>Access Token (Recommended)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="expo_xxxxxxxxxxxx"
                placeholderTextColor="#6B7280"
                value={newExpo.accessToken}
                onChangeText={t => setNewExpo({ ...newExpo, accessToken: t })}
                secureTextEntry
                autoCapitalize="none"
              />

              <TouchableOpacity style={styles.modalSubmit} onPress={addExpoAcc}>
                <Text style={styles.modalSubmitText}>Add Account</Text>
              </TouchableOpacity>
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
  section: { backgroundColor: '#12121A', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1F1F2E', overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  sectionSub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  sectionBody: { padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#1F1F2E' },
  desc: { color: '#9CA3AF', fontSize: 13, lineHeight: 20, marginVertical: 12 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F1F2E', padding: 12, borderRadius: 10, marginBottom: 8, gap: 10 },
  itemActive: { borderWidth: 1, borderColor: '#A78BFA' },
  itemIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  itemSub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  activeBadge: { backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  setBtn: { backgroundColor: '#374151', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  setBtnText: { color: '#D1D5DB', fontSize: 11, fontWeight: '600' },
  btnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  addProviderBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, gap: 4 },
  addProviderText: { fontSize: 12, fontWeight: '600' },
  addFullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#A78BFA', borderStyle: 'dashed', gap: 8, marginTop: 8 },
  addFullText: { color: '#A78BFA', fontSize: 14, fontWeight: '600' },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1F1F2E' },
  toggleLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 12 },
  toggleInfo: { flex: 1 },
  toggleTitle: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  toggleDesc: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  infoBox: { padding: 16, backgroundColor: '#1F1F2E', borderRadius: 12, marginTop: 8 },
  infoTitle: { color: '#FCD34D', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  infoLabel: { color: '#A78BFA', fontSize: 12, fontWeight: '600', width: 90 },
  infoUrl: { color: '#9CA3AF', fontSize: 11, flex: 1 },
  hint: { color: '#6B7280', fontSize: 11, marginTop: -8, marginBottom: 12 },
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#12121A', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1F1F2E' },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  inputLabel: { color: '#9CA3AF', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  modalInput: { backgroundColor: '#1F1F2E', borderWidth: 1, borderColor: '#2D2D3D', borderRadius: 10, color: '#FFF', padding: 14, fontSize: 15, marginBottom: 16 },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  providerBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, backgroundColor: '#1F1F2E' },
  providerBtnActive: { backgroundColor: '#2D2D4A' },
  providerBtnText: { fontSize: 13, fontWeight: '600' },
  modalSubmit: { backgroundColor: '#A78BFA', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  modalSubmitText: { color: '#0A0A0F', fontSize: 16, fontWeight: 'bold' },
  // Recommend Banner
  recommendBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF6B3510', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FF6B35', marginBottom: 12, gap: 12 },
  recommendIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FF6B3520', alignItems: 'center', justifyContent: 'center' },
  recommendContent: { flex: 1 },
  recommendTitle: { color: '#FF6B35', fontSize: 14, fontWeight: 'bold' },
  recommendDesc: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
});
