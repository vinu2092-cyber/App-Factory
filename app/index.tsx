import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore, getDefaultGitHubAccount } from '../src/store/useStore';

// Lazy imports - loaded only when needed, not at startup
let _chatWithGemini: any = null;
let _isAIConfigured: any = null;
let _getActiveProviderInfo: any = null;
let _generateFullProject: any = null;
let _createAgenticEngine: any = null;

const loadAIModules = async () => {
  if (!_chatWithGemini) {
    const gemini = require('../src/api/geminiApi');
    _chatWithGemini = gemini.chatWithGemini;
    _isAIConfigured = gemini.isAIConfigured;
    _getActiveProviderInfo = gemini.getActiveProviderInfo;
    _generateFullProject = gemini.generateFullProject;
  }
};

const loadEngineModules = async () => {
  if (!_createAgenticEngine) {
    const engine = require('../src/engine/AgenticEngine');
    _createAgenticEngine = engine.createAgenticEngine;
  }
};

export default function HomeScreen() {
  const [input, setInput] = useState('');
  const [buildStatus, setBuildStatus] = useState('');
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  
  const { 
    messages, addMessage, isProcessing, setIsProcessing, 
    setPendingFiles, linkedRepo, setLinkedRepo,
    autonomousMode, selfHealingEnabled,
    addProject
  } = useStore();
  
  const hasKey = useStore.getState().aiProviders.length > 0;
  const activeProvider = useStore.getState().aiProviders.find(
    p => p.id === useStore.getState().activeProviderId
  );
  const providerInfo = activeProvider ? { name: activeProvider.name, type: activeProvider.type } : null;
  const ghAccount = getDefaultGitHubAccount();

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // Start autonomous build with self-healing
  const startAutonomousBuild = useCallback(async (repoName: string) => {
    if (!ghAccount) {
      Alert.alert('No GitHub Account', 'Add a GitHub account in Settings first');
      return;
    }

    // Lazy load engine
    await loadEngineModules();
    if (!_createAgenticEngine) return;

    setBuildStatus('Connecting to GitHub...');
    
    try {
      const projectEngine = _createAgenticEngine(repoName, 'App Factory project');
      
      // Load pending files into engine
      const files = useStore.getState().pendingFiles;
      if (files) projectEngine.loadFiles(files);
      
      projectEngine.connectGitHub(ghAccount.token, ghAccount.username);
      
      setBuildStatus('Creating repository...');
      const repoFullName = await projectEngine.createAndPush(repoName);
      setLinkedRepo(repoFullName);
      
      addMessage({ 
        role: 'ai', 
        content: `Repository created: github.com/${repoFullName}\n\nStarting autonomous build with ${selfHealingEnabled ? 'self-healing enabled' : 'self-healing disabled'}...` 
      });
      scrollToBottom();

      // Start build with self-healing
      await projectEngine.autonomousBuild(
        (status: string) => {
          setBuildStatus(status);
        },
        (result: any) => {
          setBuildStatus('');
          if (result.success) {
            addMessage({ 
              role: 'ai', 
              content: `BUILD SUCCESSFUL!\n\nDownload APK from:\n${result.artifactUrl}\n\nGo to Actions > Artifacts > Download` 
            });
          } else {
            addMessage({ 
              role: 'ai', 
              content: `Build failed${selfHealingEnabled ? ' after self-healing attempts' : ''}.\n\nError: ${result.failedStep || 'Unknown'}\n\nLogs:\n${result.logs?.slice(0, 500) || 'No logs'}` 
            });
          }
          scrollToBottom();
        }
      );
    } catch (e: any) {
      setBuildStatus('');
      addMessage({ role: 'ai', content: `Error: ${e.message}` });
      scrollToBottom();
    }
  }, [ghAccount, selfHealingEnabled, setLinkedRepo, addMessage, scrollToBottom]);

  // Send message
  const send = async () => {
    if (!input.trim()) return;
    
    if (!hasKey) {
      Alert.alert('No API Key', 'Please add an AI provider key in Settings');
      router.push('/settings');
      return;
    }

    addMessage({ role: 'user', content: input });
    const userInput = input;
    setInput('');
    setIsProcessing(true);
    scrollToBottom();

    try {
      // Lazy load AI modules
      await loadAIModules();
      
      // Check if user wants full project
      const wantsProject = /app|build|create|बनाओ|banao|project/i.test(userInput);

      let res;
      if (wantsProject) {
        addMessage({ role: 'ai', content: 'Generating complete project structure with all files...' });
        scrollToBottom();
        res = await _generateFullProject(userInput);
      } else {
        res = await _chatWithGemini(userInput);
      }
      
      if ((res.action === 'write_code' || res.action === 'fix_error') && res.files) {
        // Create engine with files
        const projectName = userInput
          .split(' ')
          .slice(0, 3)
          .join('-')
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '') || 'my-app';
        
        const fileCount = Object.keys(res.files).length;
        const fileList = Object.keys(res.files).slice(0, 15).join('\n- ');
        
        addMessage({ 
          role: 'ai', 
          content: `Generated ${fileCount} files:\n\n- ${fileList}${fileCount > 15 ? `\n- ... and ${fileCount - 15} more` : ''}\n\nPlan: ${res.plan || 'Project generated'}\n\nLibraries: ${res.libraries?.join(', ') || 'None'}\n\nNative Modules: ${res.nativeModules?.join(', ') || 'None'}` 
        });
        
        setPendingFiles(res.files);
        
        // Save as project
        addProject({
          name: projectName,
          description: userInput,
          files: res.files,
          repo: null,
          buildStatus: 'idle',
          lastBuildLog: '',
        });
        
        scrollToBottom();

        // Auto-start build if autonomous mode
        if (autonomousMode && ghAccount) {
          Alert.alert(
            'Start Autonomous Build?',
            'Create GitHub repo, push code, and auto-build APK with self-healing?',
            [
              { text: 'Later', style: 'cancel' },
              { 
                text: 'Start Build', 
                onPress: () => startAutonomousBuild(projectName)
              },
            ]
          );
        }
      } else {
        addMessage({ role: 'ai', content: res.message || 'Done!' });
        scrollToBottom();
      }
    } catch (e: any) {
      addMessage({ role: 'ai', content: `Error: ${e.message}` });
      scrollToBottom();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}>
            <Ionicons name="flash" size={24} color="#A78BFA" />
          </View>
          <View>
            <Text style={styles.title}>App Factory</Text>
            <Text style={styles.subtitle}>
              {providerInfo?.name || 'Autonomous AI Builder'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/github')}>
            <Ionicons name="logo-github" size={22} color="#A78BFA" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings')}>
            <Ionicons name="settings" size={22} color="#A78BFA" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Build Status */}
      {buildStatus ? (
        <View style={styles.buildBanner}>
          <ActivityIndicator size="small" color="#FFF" />
          <Text style={styles.buildText}>{buildStatus}</Text>
        </View>
      ) : null}

      {/* Linked Repo */}
      {linkedRepo ? (
        <View style={styles.repoBanner}>
          <Ionicons name="git-branch" size={14} color="#10B981" />
          <Text style={styles.repoText}>{linkedRepo}</Text>
        </View>
      ) : null}

      {/* No API Key Warning */}
      {!hasKey ? (
        <TouchableOpacity style={styles.warning} onPress={() => router.push('/settings')}>
          <Ionicons name="warning" size={16} color="#FCD34D" />
          <Text style={styles.warningText}>No API Key - Tap to configure</Text>
        </TouchableOpacity>
      ) : null}

      {/* Chat Area */}
      <ScrollView 
        ref={scrollRef} 
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
      >
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="rocket" size={44} color="#A78BFA" />
            </View>
            <Text style={styles.emptyTitle}>Autonomous App Builder</Text>
            <Text style={styles.emptyText}>
              Generate complete projects, auto-push to GitHub, build APK, and self-heal on errors.
            </Text>
            
            <View style={styles.features}>
              <View style={styles.featureRow}>
                <View style={styles.feature}>
                  <Ionicons name="folder-open" size={18} color="#A78BFA" />
                  <Text style={styles.featureText}>Multi-File Projects</Text>
                </View>
                <View style={styles.feature}>
                  <Ionicons name="git-branch" size={18} color="#10B981" />
                  <Text style={styles.featureText}>GitHub Auto-Push</Text>
                </View>
              </View>
              <View style={styles.featureRow}>
                <View style={styles.feature}>
                  <Ionicons name="build" size={18} color="#F59E0B" />
                  <Text style={styles.featureText}>Self-Healing Builds</Text>
                </View>
                <View style={styles.feature}>
                  <Ionicons name="phone-portrait" size={18} color="#EF4444" />
                  <Text style={styles.featureText}>Native Modules</Text>
                </View>
              </View>
            </View>

            <Text style={styles.tryText}>Try: "Build a todo app with notifications"</Text>
          </View>
        ) : null}

        {messages.map((msg, i) => (
          <View key={i} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <View style={styles.bubbleHeader}>
              <Ionicons name={msg.role === 'user' ? 'person' : 'flash'} size={14} color="#A78BFA" />
              <Text style={styles.roleText}>{msg.role === 'user' ? 'You' : 'Agentic AI'}</Text>
            </View>
            <Text style={styles.msgText}>{msg.content}</Text>
          </View>
        ))}

        {isProcessing ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#A78BFA" />
            <Text style={styles.loadingText}>Generating complete project structure...</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          placeholder="Describe your app idea..."
          placeholderTextColor="#6B7280"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity 
          style={[styles.sendBtn, (!input.trim() || isProcessing) && styles.sendDisabled]} 
          onPress={send}
          disabled={!input.trim() || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#0A0A0F" size="small" />
          ) : (
            <Ionicons name="send" size={20} color="#0A0A0F" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1F1F2E' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  subtitle: { color: '#A78BFA', fontSize: 12, fontWeight: '600' },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center' },
  buildBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#7C3AED', gap: 10 },
  buildText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  repoBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, backgroundColor: '#064E3B', gap: 6 },
  repoText: { color: '#10B981', fontSize: 12, fontWeight: '600' },
  warning: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: '#78350F', gap: 8 },
  warningText: { color: '#FCD34D', fontSize: 13, fontWeight: '600' },
  chat: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { width: 88, height: 88, borderRadius: 24, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingHorizontal: 20, lineHeight: 22, marginBottom: 24 },
  features: { gap: 10, marginBottom: 20 },
  featureRow: { flexDirection: 'row', gap: 10 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1F1F2E', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, flex: 1 },
  featureText: { color: '#D1D5DB', fontSize: 12 },
  tryText: { color: '#6B7280', fontSize: 13, fontStyle: 'italic' },
  bubble: { padding: 14, borderRadius: 16, marginBottom: 12, maxWidth: '92%' },
  userBubble: { backgroundColor: '#3B2D5B', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#1F1F2E', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#2D2D3D' },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  roleText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  msgText: { color: '#E5E7EB', fontSize: 14, lineHeight: 22 },
  loading: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  loadingText: { color: '#9CA3AF', fontSize: 14 },
  inputBox: { flexDirection: 'row', padding: 12, backgroundColor: '#12121A', borderTopWidth: 1, borderTopColor: '#1F1F2E', gap: 10, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#1F1F2E', color: '#FFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, maxHeight: 100, fontSize: 15 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#A78BFA', alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
});
