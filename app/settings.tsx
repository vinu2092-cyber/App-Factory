import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { useStore, APIProvider, GitHubAccount, ExpoAccount, BuildToolAccount } from '../src/store/useStore';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

// Provider Type Definitions
const AI_PROVIDER_TYPES = [
  { type: 'gemini', name: 'Google Gemini', icon: 'flash', color: '#4285F4', placeholder: 'AIzaSy...' },
  { type: 'groq', name: 'Groq', icon: 'speedometer', color: '#FF6B35', placeholder: 'gsk_...' },
  { type: 'deepseek', name: 'DeepSeek', icon: 'planet', color: '#6366F1', placeholder: 'sk-...' },
  { type: 'huggingface', name: 'Hugging Face', icon: 'happy', color: '#FFD21E', placeholder: 'hf_...' },
  { type: 'openrouter', name: 'OpenRouter', icon: 'git-network', color: '#10B981', placeholder: 'sk-or-...' },
];

const BUILD_TOOL_TYPES = [
  { type: 'firebase', name: 'Firebase', icon: 'flame', color: '#FFA000' },
  { type: 'playstore', name: 'Play Store', icon: 'logo-google-playstore', color: '#34A853' },
  { type: 'appstore', name: 'App Store', icon: 'logo-apple', color: '#007AFF' },
  { type: 'vercel', name: 'Vercel', icon: 'triangle', color: '#000000' },
  { type: 'netlify', name: 'Netlify', icon: 'globe', color: '#00C7B7' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { 
    settings, 
    setSettings,
    addAIProvider,
    removeAIProvider,
    updateAIProvider,
    setActiveAIProvider,
    addGitHubAccount,
    removeGitHubAccount,
    setDefaultGitHubAccount,
    addExpoAccount,
    removeExpoAccount,
    setDefaultExpoAccount,
    addBuildTool,
    removeBuildTool,
  } = useStore();

  // Local state for forms
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  // Modal states
  const [showAddAIModal, setShowAddAIModal] = useState(false);
  const [showAddGitHubModal, setShowAddGitHubModal] = useState(false);
  const [showAddExpoModal, setShowAddExpoModal] = useState(false);
  const [showAddBuildToolModal, setShowAddBuildToolModal] = useState(false);
  
  // Form states
  const [newAIProvider, setNewAIProvider] = useState({ type: 'gemini', name: '', apiKey: '' });
  const [newGitHub, setNewGitHub] = useState({ username: '', token: '' });
  const [newExpo, setNewExpo] = useState({ username: '', password: '', accessToken: '' });
  const [newBuildTool, setNewBuildTool] = useState({ type: 'firebase', name: '', credentials: {} as Record<string, string> });
  
  // Feature toggles
  const [autoCorrect, setAutoCorrect] = useState(settings.autoCorrectMode ?? true);
  const [autoTest, setAutoTest] = useState(settings.autoTestMode ?? true);
  const [screenshotAnalysis, setScreenshotAnalysis] = useState(settings.screenshotAnalysis ?? true);
  const [highPerformance, setHighPerformance] = useState(settings.highPerformanceMode ?? true);
  const [autoDebug, setAutoDebug] = useState(settings.autoDebugMode ?? true);
  const [autonomousMode, setAutonomousMode] = useState(settings.autonomousMode ?? true);

  useEffect(() => {
    setAutoCorrect(settings.autoCorrectMode ?? true);
    setAutoTest(settings.autoTestMode ?? true);
    setScreenshotAnalysis(settings.screenshotAnalysis ?? true);
    setHighPerformance(settings.highPerformanceMode ?? true);
    setAutoDebug(settings.autoDebugMode ?? true);
    setAutonomousMode(settings.autonomousMode ?? true);
  }, [settings]);

  const handleSaveFeatures = () => {
    setSettings({
      autoCorrectMode: autoCorrect,
      autoTestMode: autoTest,
      screenshotAnalysis,
      highPerformanceMode: highPerformance,
      autoDebugMode: autoDebug,
      autonomousMode,
    });
    Alert.alert('Saved', 'Feature settings updated successfully!');
  };

  // Add AI Provider
  const handleAddAIProvider = () => {
    if (!newAIProvider.apiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }
    const providerInfo = AI_PROVIDER_TYPES.find(p => p.type === newAIProvider.type);
    addAIProvider({
      name: newAIProvider.name || providerInfo?.name || newAIProvider.type,
      type: newAIProvider.type as APIProvider['type'],
      apiKey: newAIProvider.apiKey.trim(),
      isActive: settings.aiProviders.length === 0,
    });
    setNewAIProvider({ type: 'gemini', name: '', apiKey: '' });
    setShowAddAIModal(false);
    Alert.alert('Added', 'AI Provider added successfully!');
  };

  // Add GitHub Account
  const handleAddGitHubAccount = () => {
    if (!newGitHub.username.trim() || !newGitHub.token.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    addGitHubAccount({
      username: newGitHub.username.trim(),
      token: newGitHub.token.trim(),
      isDefault: settings.githubAccounts.length === 0,
    });
    setNewGitHub({ username: '', token: '' });
    setShowAddGitHubModal(false);
    Alert.alert('Added', 'GitHub account added successfully!');
  };

  // Add Expo Account
  const handleAddExpoAccount = () => {
    if (!newExpo.username.trim()) {
      Alert.alert('Error', 'Please enter username');
      return;
    }
    addExpoAccount({
      username: newExpo.username.trim(),
      password: newExpo.password.trim(),
      accessToken: newExpo.accessToken.trim() || undefined,
      isDefault: settings.expoAccounts.length === 0,
    });
    setNewExpo({ username: '', password: '', accessToken: '' });
    setShowAddExpoModal(false);
    Alert.alert('Added', 'Expo account added successfully!');
  };

  // Add Build Tool
  const handleAddBuildTool = () => {
    const toolInfo = BUILD_TOOL_TYPES.find(t => t.type === newBuildTool.type);
    addBuildTool({
      name: newBuildTool.name || toolInfo?.name || newBuildTool.type,
      type: newBuildTool.type as BuildToolAccount['type'],
      credentials: newBuildTool.credentials,
      isActive: true,
    });
    setNewBuildTool({ type: 'firebase', name: '', credentials: {} });
    setShowAddBuildToolModal(false);
    Alert.alert('Added', 'Build tool added successfully!');
  };

  const getProviderIcon = (type: string) => {
    const provider = AI_PROVIDER_TYPES.find(p => p.type === type);
    return provider?.icon || 'key';
  };

  const getProviderColor = (type: string) => {
    const provider = AI_PROVIDER_TYPES.find(p => p.type === type);
    return provider?.color || '#A78BFA';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* AI Providers Section */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setActiveSection(activeSection === 'ai' ? null : 'ai')}
        >
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="flash" size={22} color="#A78BFA" />
            <View>
              <Text style={styles.sectionTitle}>AI Providers</Text>
              <Text style={styles.sectionSubtitle}>
                {settings.aiProviders.length} provider{settings.aiProviders.length !== 1 ? 's' : ''} configured
              </Text>
            </View>
          </View>
          <Ionicons 
            name={activeSection === 'ai' ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color="#6B7280" 
          />
        </TouchableOpacity>

        {activeSection === 'ai' && (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionDesc}>
              Add multiple AI providers. App Factory will automatically switch between them.
            </Text>

            {/* Provider Cards */}
            {settings.aiProviders.map((provider) => (
              <View key={provider.id} style={[
                styles.itemCard,
                settings.activeProviderId === provider.id && styles.itemCardActive
              ]}>
                <View style={styles.itemCardHeader}>
                  <View style={[styles.providerIcon, { backgroundColor: getProviderColor(provider.type) + '20' }]}>
                    <Ionicons name={getProviderIcon(provider.type) as any} size={18} color={getProviderColor(provider.type)} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{provider.name}</Text>
                    <Text style={styles.itemSubtitle}>{provider.type.toUpperCase()} • {provider.apiKey.slice(0, 8)}...</Text>
                  </View>
                  <View style={styles.itemActions}>
                    {settings.activeProviderId !== provider.id && (
                      <TouchableOpacity 
                        style={styles.setActiveBtn}
                        onPress={() => setActiveAIProvider(provider.id)}
                      >
                        <Text style={styles.setActiveBtnText}>Set Active</Text>
                      </TouchableOpacity>
                    )}
                    {settings.activeProviderId === provider.id && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    )}
                    <TouchableOpacity 
                      style={styles.deleteBtn}
                      onPress={() => {
                        Alert.alert('Remove Provider', 'Are you sure?', [
                          { text: 'Cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => removeAIProvider(provider.id) }
                        ]);
                      }}
                    >
                      <Ionicons name="trash" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {/* Add Provider Buttons */}
            <View style={styles.providerButtons}>
              {AI_PROVIDER_TYPES.map((type) => (
                <TouchableOpacity 
                  key={type.type}
                  style={[styles.addProviderBtn, { borderColor: type.color }]}
                  onPress={() => {
                    setNewAIProvider({ type: type.type, name: type.name, apiKey: '' });
                    setShowAddAIModal(true);
                  }}
                >
                  <Ionicons name={type.icon as any} size={16} color={type.color} />
                  <Text style={[styles.addProviderBtnText, { color: type.color }]}>+ {type.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* GitHub Accounts Section */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setActiveSection(activeSection === 'github' ? null : 'github')}
        >
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="logo-github" size={22} color="#A78BFA" />
            <View>
              <Text style={styles.sectionTitle}>GitHub Accounts</Text>
              <Text style={styles.sectionSubtitle}>
                {settings.githubAccounts.length} account{settings.githubAccounts.length !== 1 ? 's' : ''} linked
              </Text>
            </View>
          </View>
          <Ionicons 
            name={activeSection === 'github' ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color="#6B7280" 
          />
        </TouchableOpacity>

        {activeSection === 'github' && (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionDesc}>
              Manage GitHub accounts for pushing code and managing repositories.
            </Text>

            {settings.githubAccounts.map((account) => (
              <View key={account.id} style={[
                styles.itemCard,
                account.isDefault && styles.itemCardActive
              ]}>
                <View style={styles.itemCardHeader}>
                  <View style={[styles.providerIcon, { backgroundColor: '#333' }]}>
                    <Ionicons name="logo-github" size={18} color="#FFF" />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>@{account.username}</Text>
                    <Text style={styles.itemSubtitle}>Token: {account.token.slice(0, 10)}...</Text>
                  </View>
                  <View style={styles.itemActions}>
                    {!account.isDefault && (
                      <TouchableOpacity 
                        style={styles.setActiveBtn}
                        onPress={() => setDefaultGitHubAccount(account.id)}
                      >
                        <Text style={styles.setActiveBtnText}>Set Default</Text>
                      </TouchableOpacity>
                    )}
                    {account.isDefault && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Default</Text>
                      </View>
                    )}
                    <TouchableOpacity 
                      style={styles.deleteBtn}
                      onPress={() => {
                        Alert.alert('Remove Account', 'Are you sure?', [
                          { text: 'Cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => removeGitHubAccount(account.id) }
                        ]);
                      }}
                    >
                      <Ionicons name="trash" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity 
              style={styles.addBtn}
              onPress={() => setShowAddGitHubModal(true)}
            >
              <Ionicons name="add" size={18} color="#A78BFA" />
              <Text style={styles.addBtnText}>Add GitHub Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Expo Accounts Section */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setActiveSection(activeSection === 'expo' ? null : 'expo')}
        >
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="phone-portrait" size={22} color="#A78BFA" />
            <View>
              <Text style={styles.sectionTitle}>Expo Accounts</Text>
              <Text style={styles.sectionSubtitle}>
                {settings.expoAccounts.length} account{settings.expoAccounts.length !== 1 ? 's' : ''} configured
              </Text>
            </View>
          </View>
          <Ionicons 
            name={activeSection === 'expo' ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color="#6B7280" 
          />
        </TouchableOpacity>

        {activeSection === 'expo' && (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionDesc}>
              For auto-testing and live preview. Get credentials from expo.dev
            </Text>

            {settings.expoAccounts.map((account) => (
              <View key={account.id} style={[
                styles.itemCard,
                account.isDefault && styles.itemCardActive
              ]}>
                <View style={styles.itemCardHeader}>
                  <View style={[styles.providerIcon, { backgroundColor: '#000' }]}>
                    <MaterialCommunityIcons name="react" size={18} color="#FFF" />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>@{account.username}</Text>
                    <Text style={styles.itemSubtitle}>
                      {account.accessToken ? 'Access Token' : 'Password'} configured
                    </Text>
                  </View>
                  <View style={styles.itemActions}>
                    {!account.isDefault && (
                      <TouchableOpacity 
                        style={styles.setActiveBtn}
                        onPress={() => setDefaultExpoAccount(account.id)}
                      >
                        <Text style={styles.setActiveBtnText}>Set Default</Text>
                      </TouchableOpacity>
                    )}
                    {account.isDefault && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Default</Text>
                      </View>
                    )}
                    <TouchableOpacity 
                      style={styles.deleteBtn}
                      onPress={() => {
                        Alert.alert('Remove Account', 'Are you sure?', [
                          { text: 'Cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => removeExpoAccount(account.id) }
                        ]);
                      }}
                    >
                      <Ionicons name="trash" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity 
              style={styles.addBtn}
              onPress={() => setShowAddExpoModal(true)}
            >
              <Ionicons name="add" size={18} color="#A78BFA" />
              <Text style={styles.addBtnText}>Add Expo Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Build Tools Section */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setActiveSection(activeSection === 'build' ? null : 'build')}
        >
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="construct" size={22} color="#A78BFA" />
            <View>
              <Text style={styles.sectionTitle}>Build & Deploy Tools</Text>
              <Text style={styles.sectionSubtitle}>
                {settings.buildTools.length} tool{settings.buildTools.length !== 1 ? 's' : ''} configured
              </Text>
            </View>
          </View>
          <Ionicons 
            name={activeSection === 'build' ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color="#6B7280" 
          />
        </TouchableOpacity>

        {activeSection === 'build' && (
          <View style={styles.sectionContent}>
            <Text style={styles.sectionDesc}>
              Firebase, Play Store, App Store and other deployment credentials.
            </Text>

            {settings.buildTools.map((tool) => {
              const toolInfo = BUILD_TOOL_TYPES.find(t => t.type === tool.type);
              return (
                <View key={tool.id} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <View style={[styles.providerIcon, { backgroundColor: (toolInfo?.color || '#666') + '20' }]}>
                      <Ionicons name={toolInfo?.icon as any || 'construct'} size={18} color={toolInfo?.color || '#666'} />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle}>{tool.name}</Text>
                      <Text style={styles.itemSubtitle}>{tool.type.toUpperCase()}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.deleteBtn}
                      onPress={() => {
                        Alert.alert('Remove Tool', 'Are you sure?', [
                          { text: 'Cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => removeBuildTool(tool.id) }
                        ]);
                      }}
                    >
                      <Ionicons name="trash" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity 
              style={styles.addBtn}
              onPress={() => setShowAddBuildToolModal(true)}
            >
              <Ionicons name="add" size={18} color="#A78BFA" />
              <Text style={styles.addBtnText}>Add Build Tool</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* AI Agent Features */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setActiveSection(activeSection === 'features' ? null : 'features')}
        >
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="sparkles" size={22} color="#A78BFA" />
            <View>
              <Text style={styles.sectionTitle}>AI Agent Features</Text>
              <Text style={styles.sectionSubtitle}>Autonomous capabilities</Text>
            </View>
          </View>
          <Ionicons 
            name={activeSection === 'features' ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color="#6B7280" 
          />
        </TouchableOpacity>

        {activeSection === 'features' && (
          <View style={styles.sectionContent}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="rocket" size={18} color="#8B5CF6" />
                <View style={styles.toggleTextContainer}>
                  <Text style={styles.toggleTitle}>Autonomous Mode</Text>
                  <Text style={styles.toggleDesc}>Full auto like Emergent - code, test, debug</Text>
                </View>
              </View>
              <Switch
                value={autonomousMode}
                onValueChange={setAutonomousMode}
                trackColor={{ false: '#374151', true: '#7C3AED' }}
                thumbColor={autonomousMode ? '#A78BFA' : '#9CA3AF'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="construct" size={18} color="#10B981" />
                <View style={styles.toggleTextContainer}>
                  <Text style={styles.toggleTitle}>Auto-Test Mode</Text>
                  <Text style={styles.toggleDesc}>Auto test via Expo and screenshot analysis</Text>
                </View>
              </View>
              <Switch
                value={autoTest}
                onValueChange={setAutoTest}
                trackColor={{ false: '#374151', true: '#7C3AED' }}
                thumbColor={autoTest ? '#A78BFA' : '#9CA3AF'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="camera" size={18} color="#F59E0B" />
                <View style={styles.toggleTextContainer}>
                  <Text style={styles.toggleTitle}>Screenshot Analysis</Text>
                  <Text style={styles.toggleDesc}>Take screenshots and detect UI errors</Text>
                </View>
              </View>
              <Switch
                value={screenshotAnalysis}
                onValueChange={setScreenshotAnalysis}
                trackColor={{ false: '#374151', true: '#7C3AED' }}
                thumbColor={screenshotAnalysis ? '#A78BFA' : '#9CA3AF'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="shield-checkmark" size={18} color="#EF4444" />
                <View style={styles.toggleTextContainer}>
                  <Text style={styles.toggleTitle}>Auto-Correction Mode</Text>
                  <Text style={styles.toggleDesc}>AI reads errors and fixes automatically</Text>
                </View>
              </View>
              <Switch
                value={autoCorrect}
                onValueChange={setAutoCorrect}
                trackColor={{ false: '#374151', true: '#7C3AED' }}
                thumbColor={autoCorrect ? '#A78BFA' : '#9CA3AF'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="bug" size={18} color="#EC4899" />
                <View style={styles.toggleTextContainer}>
                  <Text style={styles.toggleTitle}>Auto-Debug Mode</Text>
                  <Text style={styles.toggleDesc}>Automatically debug and fix issues</Text>
                </View>
              </View>
              <Switch
                value={autoDebug}
                onValueChange={setAutoDebug}
                trackColor={{ false: '#374151', true: '#7C3AED' }}
                thumbColor={autoDebug ? '#A78BFA' : '#9CA3AF'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="speedometer" size={18} color="#3B82F6" />
                <View style={styles.toggleTextContainer}>
                  <Text style={styles.toggleTitle}>High-Performance Mode</Text>
                  <Text style={styles.toggleDesc}>Optimized code with FlatList, Memoization</Text>
                </View>
              </View>
              <Switch
                value={highPerformance}
                onValueChange={setHighPerformance}
                trackColor={{ false: '#374151', true: '#7C3AED' }}
                thumbColor={highPerformance ? '#A78BFA' : '#9CA3AF'}
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveFeatures}>
              <Text style={styles.saveBtnText}>Save Feature Settings</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>How to get credentials:</Text>
        <Text style={styles.infoText}>
          • Gemini: aistudio.google.com{"\n"}
          • Groq: console.groq.com{"\n"}
          • DeepSeek: platform.deepseek.com{"\n"}
          • Hugging Face: huggingface.co/settings/tokens{"\n"}
          • OpenRouter: openrouter.ai/keys{"\n"}
          • GitHub: Settings → Developer Settings → Tokens{"\n"}
          • Expo: expo.dev → Account Settings → Access Tokens
        </Text>
      </View>

      {/* ADD AI PROVIDER MODAL */}
      <Modal
        visible={showAddAIModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddAIModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add AI Provider</Text>
              <TouchableOpacity onPress={() => setShowAddAIModal(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Provider Type</Text>
              <View style={styles.providerTypeGrid}>
                {AI_PROVIDER_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.type}
                    style={[
                      styles.providerTypeBtn,
                      newAIProvider.type === type.type && styles.providerTypeBtnActive,
                      { borderColor: type.color }
                    ]}
                    onPress={() => setNewAIProvider({ ...newAIProvider, type: type.type, name: type.name })}
                  >
                    <Ionicons name={type.icon as any} size={20} color={type.color} />
                    <Text style={[styles.providerTypeBtnText, { color: type.color }]}>{type.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>API Key</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={AI_PROVIDER_TYPES.find(p => p.type === newAIProvider.type)?.placeholder}
                placeholderTextColor="#4B5563"
                value={newAIProvider.apiKey}
                onChangeText={(text) => setNewAIProvider({ ...newAIProvider, apiKey: text })}
                secureTextEntry
                autoCapitalize="none"
              />

              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddAIProvider}>
                <Text style={styles.modalSubmitBtnText}>Add Provider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD GITHUB MODAL */}
      <Modal
        visible={showAddGitHubModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddGitHubModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add GitHub Account</Text>
              <TouchableOpacity onPress={() => setShowAddGitHubModal(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>GitHub Username</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="your-username"
                placeholderTextColor="#4B5563"
                value={newGitHub.username}
                onChangeText={(text) => setNewGitHub({ ...newGitHub, username: text })}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Personal Access Token</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="ghp_xxxxxxxxxxxx"
                placeholderTextColor="#4B5563"
                value={newGitHub.token}
                onChangeText={(text) => setNewGitHub({ ...newGitHub, token: text })}
                secureTextEntry
                autoCapitalize="none"
              />

              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddGitHubAccount}>
                <Text style={styles.modalSubmitBtnText}>Add Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD EXPO MODAL */}
      <Modal
        visible={showAddExpoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddExpoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Expo Account</Text>
              <TouchableOpacity onPress={() => setShowAddExpoModal(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Expo Username</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="your-expo-username"
                placeholderTextColor="#4B5563"
                value={newExpo.username}
                onChangeText={(text) => setNewExpo({ ...newExpo, username: text })}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Password (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Your expo password"
                placeholderTextColor="#4B5563"
                value={newExpo.password}
                onChangeText={(text) => setNewExpo({ ...newExpo, password: text })}
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Access Token (Recommended)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="expo_xxxxxxxxxxxx"
                placeholderTextColor="#4B5563"
                value={newExpo.accessToken}
                onChangeText={(text) => setNewExpo({ ...newExpo, accessToken: text })}
                secureTextEntry
                autoCapitalize="none"
              />

              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddExpoAccount}>
                <Text style={styles.modalSubmitBtnText}>Add Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD BUILD TOOL MODAL */}
      <Modal
        visible={showAddBuildToolModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddBuildToolModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Build Tool</Text>
              <TouchableOpacity onPress={() => setShowAddBuildToolModal(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Tool Type</Text>
              <View style={styles.providerTypeGrid}>
                {BUILD_TOOL_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.type}
                    style={[
                      styles.providerTypeBtn,
                      newBuildTool.type === type.type && styles.providerTypeBtnActive,
                      { borderColor: type.color }
                    ]}
                    onPress={() => setNewBuildTool({ ...newBuildTool, type: type.type, name: type.name })}
                  >
                    <Ionicons name={type.icon as any} size={20} color={type.color} />
                    <Text style={[styles.providerTypeBtnText, { color: type.color }]}>{type.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>API Key / Credentials</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Paste your credentials JSON or API key"
                placeholderTextColor="#4B5563"
                value={JSON.stringify(newBuildTool.credentials)}
                onChangeText={(text) => {
                  try {
                    setNewBuildTool({ ...newBuildTool, credentials: JSON.parse(text) });
                  } catch {
                    setNewBuildTool({ ...newBuildTool, credentials: { apiKey: text } });
                  }
                }}
                multiline
                autoCapitalize="none"
              />

              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddBuildTool}>
                <Text style={styles.modalSubmitBtnText}>Add Tool</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#12121A',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F1F2E',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#1F1F2E',
  },
  sectionDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
    marginTop: 12,
  },
  itemCard: {
    backgroundColor: '#1F1F2E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2D2D3D',
  },
  itemCardActive: {
    borderColor: '#A78BFA',
    backgroundColor: '#2D2D4A',
  },
  itemCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  providerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  itemSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setActiveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#374151',
  },
  setActiveBtnText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '600',
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#7F1D1D20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  addProviderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  addProviderBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A78BFA',
    borderStyle: 'dashed',
    gap: 8,
    marginTop: 8,
  },
  addBtnText: {
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F2E',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  toggleDesc: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
  },
  saveBtn: {
    backgroundColor: '#A78BFA',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#0A0A0F',
    fontSize: 15,
    fontWeight: 'bold',
  },
  infoSection: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#1F1F2E',
    borderRadius: 12,
  },
  infoTitle: {
    color: '#FCD34D',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 22,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#12121A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F2E',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: '#1F1F2E',
    borderWidth: 1,
    borderColor: '#2D2D3D',
    borderRadius: 10,
    color: '#FFFFFF',
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  providerTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  providerTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    backgroundColor: '#1F1F2E',
  },
  providerTypeBtnActive: {
    backgroundColor: '#2D2D4A',
  },
  providerTypeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    backgroundColor: '#A78BFA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSubmitBtnText: {
    color: '#0A0A0F',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
