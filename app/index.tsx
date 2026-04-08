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
import { chatWithGemini, isAIConfigured, getActiveProviderInfo, generateFullProject } from '../src/api/geminiApi';
import { createAgenticEngine, AgenticEngine } from '../src/engine/AgenticEngine';

export default function HomeScreen() {
  const [input, setInput] = useState('');
  const [buildStatus, setBuildStatus] = useState('');
  const [engine, setEngine] = useState<AgenticEngine | null>(null);
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  
  const { messages, addMessage, isProcessing, setIsProcessing, setPendingFiles, linkedRepo, setLinkedRepo } = useStore();
  const hasKey = isAIConfigured();
  const providerInfo = getActiveProviderInfo();
  const ghAccount = getDefaultGitHubAccount();

  // AUTONOMOUS BUILD FLOW
  const startAutonomousBuild = useCallback(async (repoName: string) => {
    if (!engine || !ghAccount) return;

    setBuildStatus('Starting autonomous build...');
    
    try {
      // Connect GitHub
      engine.connectGitHub(ghAccount.token, ghAccount.username);
      
      // Create repo and push
      setBuildStatus('Creating repository...');
      const repoFullName = await engine.createAndPush(repoName);
      setLinkedRepo(repoFullName);
      
      addMessage({ 
        role: 'ai', 
        content: `Repository created: ${repoFullName}\n\nStarting autonomous build with self-healing...` 
      });

      // Start autonomous build loop with self-healing
      await engine.autonomousBuildLoop(
        (status) => {
          setBuildStatus(status);
          addMessage({ role: 'ai', content: `[BUILD] ${status}` });
        },
        (success) => {
          if (success) {
            setBuildStatus('BUILD SUCCESS!');
            addMessage({ 
              role: 'ai', 
              content: `✅ BUILD SUCCESSFUL!\n\nDownload APK from:\nhttps://github.com/${repoFullName}/actions` 
            });
          } else {
            setBuildStatus('Build failed after max retries');
            addMessage({ 
              role: 'ai', 
              content: '❌ Build failed after 3 self-healing attempts. Check the error logs manually.' 
            });
          }
        }
      );
    } catch (e: any) {
      setBuildStatus(`Error: ${e.message}`);
      addMessage({ role: 'ai', content: `Error: ${e.message}` });
    }
  }, [engine, ghAccount, setLinkedRepo, addMessage]);

  const send = async () => {
    if (!input.trim()) return;
    
    if (!hasKey) {
      Alert.alert('No API Key', 'Please add an AI provider key in Settings');
      router.push('/settings');
      return;
    }

    addMessage({ role: 'user', content: input });
    const text = input;
    setInput('');
    setIsProcessing(true);

    try {
      // Check if user wants full project generation
      const isFullProject = text.toLowerCase().includes('app') || 
                           text.toLowerCase().includes('build') ||
                           text.toLowerCase().includes('create') ||
                           text.toLowerCase().includes('बनाओ') ||
                           text.toLowerCase().includes('banao');

      let res;
      if (isFullProject) {
        addMessage({ role: 'ai', content: '🚀 Generating complete project structure...' });
        res = await generateFullProject(text);
      } else {
        res = await chatWithGemini(text);
      }
      
      if ((res.action === 'write_code' || res.action === 'fix_error') && res.files) {
        // Create agentic engine with files
        const projectName = text.split(' ').slice(0, 3).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');
        const newEngine = createAgenticEngine(projectName || 'my-app', text);
        newEngine.loadGeneratedFiles(res.files);
        setEngine(newEngine);
        
        const fileCount = Object.keys(res.files).length;
        const fileList = Object.keys(res.files).slice(0, 10).join('\n• ');
        
        addMessage({ 
          role: 'ai', 
          content: `✅ Generated ${fileCount} files:\n\n• ${fileList}${fileCount > 10 ? `\n... and ${fileCount - 10} more` : ''}\n\n${res.plan || ''}\n\n${res.libraries?.length ? `Libraries: ${res.libraries.join(', ')}` : ''}\n\n${res.nativeModules?.length ? `Native Modules: ${res.nativeModules.join(', ')}` : ''}` 
        });
        
        setPendingFiles(res.files);

        // Auto-start build if GitHub connected
        if (ghAccount) {
          Alert.alert(
            'Start Autonomous Build?',
            'Push to GitHub and start auto-build with self-healing?',
            [
              { text: 'Later', style: 'cancel' },
              { 
                text: 'Start Build', 
                onPress: () => startAutonomousBuild(projectName || 'my-app')
              },
            ]
          );
        }
      } else {
        addMessage({ role: 'ai', content: res.message || 'Done!' });
      }
    } catch (e: any) {
      addMessage({ role: 'ai', content: `Error: ${e.message}` });
    } finally {
      setIsProcessing(false);
      scrollRef.current?.scrollToEnd({ animated: true });
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
            <Text style={styles.subtitle}>{providerInfo?.name || 'Autonomous AI Builder'}</Text>
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

      {/* Build Status Banner */}
      {buildStatus && (
        <View style={styles.buildBanner}>
          <ActivityIndicator size="small" color="#FFF" />
          <Text style={styles.buildText}>{buildStatus}</Text>
        </View>
      )}

      {linkedRepo && (
        <View style={styles.repoBanner}>
          <Ionicons name="git-branch" size={14} color="#10B981" />
          <Text style={styles.repoText}>{linkedRepo}</Text>
        </View>
      )}

      {!hasKey && (
        <TouchableOpacity style={styles.warning} onPress={() => router.push('/settings')}>
          <Text style={styles.warningText}>Tap to add API Key</Text>
        </TouchableOpacity>
      )}

      {/* Chat */}
      <ScrollView 
        ref={scrollRef} 
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
      >
        {messages.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="rocket" size={40} color="#A78BFA" />
            </View>
            <Text style={styles.emptyTitle}>Autonomous App Builder</Text>
            <Text style={styles.emptyText}>
              I generate complete projects, push to GitHub, auto-build APK, and self-heal on errors.
              {"\n\n"}Try: "Build a floating scoreboard app"
            </Text>
            <View style={styles.features}>
              <View style={styles.featureItem}>
                <Ionicons name="folder-open" size={16} color="#A78BFA" />
                <Text style={styles.featureText}>Multi-File Project Structure</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="git-branch" size={16} color="#10B981" />
                <Text style={styles.featureText}>GitHub Auto-Push</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="build" size={16} color="#F59E0B" />
                <Text style={styles.featureText}>Self-Healing Builds</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="phone-portrait" size={16} color="#EF4444" />
                <Text style={styles.featureText}>Native Module Support</Text>
              </View>
            </View>
          </View>
        )}

        {messages.map((msg, i) => (
          <View key={i} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <View style={styles.bubbleHeader}>
              <Ionicons name={msg.role === 'user' ? 'person' : 'flash'} size={14} color="#A78BFA" />
              <Text style={styles.roleText}>{msg.role === 'user' ? 'You' : 'Agentic AI'}</Text>
            </View>
            <Text style={styles.msgText}>{msg.content}</Text>
          </View>
        ))}

        {isProcessing && (
          <View style={styles.loading}>
            <ActivityIndicator color="#A78BFA" />
            <Text style={styles.loadingText}>Generating project...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          placeholder="Describe your app... (e.g., 'Build a todo app with dark mode')"
          placeholderTextColor="#6B7280"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendBtn, (!input.trim() || isProcessing) && styles.sendDisabled]} 
          onPress={send}
          disabled={!input.trim() || isProcessing}
        >
          <Ionicons name="send" size={20} color="#000" />
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
  buildBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: '#7C3AED', gap: 8 },
  buildText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  repoBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, backgroundColor: '#064E3B', gap: 6 },
  repoText: { color: '#10B981', fontSize: 12, fontWeight: '600' },
  warning: { padding: 10, backgroundColor: '#78350F', alignItems: 'center' },
  warningText: { color: '#FCD34D', fontSize: 13, fontWeight: '600' },
  chat: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingHorizontal: 24, lineHeight: 22, marginBottom: 24 },
  features: { gap: 10, width: '100%', paddingHorizontal: 20 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1F1F2E', padding: 12, borderRadius: 10 },
  featureText: { color: '#D1D5DB', fontSize: 14 },
  bubble: { padding: 14, borderRadius: 16, marginBottom: 12, maxWidth: '92%' },
  userBubble: { backgroundColor: '#3B2D5B', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#1F1F2E', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#2D2D3D' },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  roleText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  msgText: { color: '#E5E7EB', fontSize: 15, lineHeight: 22 },
  loading: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  loadingText: { color: '#9CA3AF', fontSize: 14 },
  inputBox: { flexDirection: 'row', padding: 12, backgroundColor: '#12121A', borderTopWidth: 1, borderTopColor: '#1F1F2E', gap: 10, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#1F1F2E', color: '#FFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, maxHeight: 100, fontSize: 15 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#A78BFA', alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
});
