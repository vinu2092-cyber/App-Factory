import React, { useState, useRef } from 'react';
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
import { useStore } from '../src/store/useStore';
import { chatWithGemini, isAIConfigured, getActiveProviderInfo } from '../src/api/geminiApi';

export default function HomeScreen() {
  const [input, setInput] = useState('');
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  
  const { messages, addMessage, isProcessing, setIsProcessing, setPendingFiles, linkedRepo } = useStore();
  const hasKey = isAIConfigured();
  const providerInfo = getActiveProviderInfo();

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
      const res = await chatWithGemini(text);
      
      if (res.action === 'write_code' && res.files) {
        addMessage({ role: 'ai', content: `${res.plan || 'Code generated!'}\n\nFiles: ${Object.keys(res.files).join(', ')}` });
        setPendingFiles(res.files);
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
            <Ionicons name="sparkles" size={24} color="#A78BFA" />
          </View>
          <View>
            <Text style={styles.title}>App Factory</Text>
            <Text style={styles.subtitle}>{providerInfo?.name || 'AI App Builder'}</Text>
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
            <Text style={styles.emptyTitle}>Welcome to App Factory!</Text>
            <Text style={styles.emptyText}>Describe your app idea and AI will generate code, push to GitHub, and build APK automatically.</Text>
          </View>
        )}

        {messages.map((msg, i) => (
          <View key={i} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <View style={styles.bubbleHeader}>
              <Ionicons name={msg.role === 'user' ? 'person' : 'sparkles'} size={14} color="#A78BFA" />
              <Text style={styles.roleText}>{msg.role === 'user' ? 'You' : 'AI'}</Text>
            </View>
            <Text style={styles.msgText}>{msg.content}</Text>
          </View>
        ))}

        {isProcessing && (
          <View style={styles.loading}>
            <ActivityIndicator color="#A78BFA" />
            <Text style={styles.loadingText}>AI is thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          placeholder="Describe your app..."
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
  logo: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  subtitle: { color: '#6B7280', fontSize: 12 },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center' },
  repoBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, backgroundColor: '#064E3B', gap: 6 },
  repoText: { color: '#10B981', fontSize: 12, fontWeight: '600' },
  warning: { padding: 10, backgroundColor: '#78350F', alignItems: 'center' },
  warningText: { color: '#FCD34D', fontSize: 13, fontWeight: '600' },
  chat: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  bubble: { padding: 14, borderRadius: 16, marginBottom: 12, maxWidth: '90%' },
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
