import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useStore, getActiveAIProvider } from '../src/store/useStore';
import { chatWithGemini, isAIConfigured, getActiveProviderInfo } from '../src/api/geminiApi';

export default function AgentScreen() {
  const [prompt, setPrompt] = useState('');
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    messages,
    addMessage,
    setPendingFiles,
    linkedRepo,
    isProcessing,
    setIsProcessing,
    settings,
  } = useStore();

  const activeProviderInfo = getActiveProviderInfo();
  const hasValidKey = isAIConfigured();

  const handleSend = useCallback(async () => {
    if (!prompt.trim()) return;
    if (!hasValidKey) {
      Alert.alert('No API Key', 'Please add an AI provider API key in Settings');
      router.push('/settings');
      return;
    }

    const userMessage = { role: 'user' as const, content: prompt };
    addMessage(userMessage);

    const currentPrompt = prompt;
    setPrompt('');
    setIsProcessing(true);

    try {
      const response = await chatWithGemini(currentPrompt, null, null, {
        repoName: linkedRepo || undefined,
      });

      if (response.action === 'write_code' && response.files) {
        addMessage({
          role: 'ai',
          content: {
            type: 'code_generation',
            plan: response.plan || 'Code generated successfully',
            files: response.files,
            libraries: response.libraries || [],
          },
        });
        setPendingFiles(response.files);
      } else {
        addMessage({
          role: 'ai',
          content: response.message || response.plan || 'Done!',
        });
      }
    } catch (error: any) {
      addMessage({
        role: 'ai',
        content: `Error: ${error.message || 'Failed to communicate with AI'}`,
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [prompt, hasValidKey, linkedRepo, addMessage, setPendingFiles, setIsProcessing, router]);

  const renderMessage = (msg: any, idx: number) => {
    const isUser = msg.role === 'user';
    const content = msg.content;

    return (
      <View
        key={idx}
        style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}
      >
        <View style={styles.roleHeader}>
          <Ionicons
            name={isUser ? 'person' : 'sparkles'}
            size={14}
            color="#A78BFA"
          />
          <Text style={styles.roleText}>{isUser ? 'You' : 'App Factory AI'}</Text>
        </View>

        {typeof content === 'string' ? (
          <Text style={styles.messageText}>{content}</Text>
        ) : content?.type === 'code_generation' ? (
          <View>
            {content.plan && (
              <View style={styles.planContainer}>
                <Text style={styles.planText}>{content.plan}</Text>
              </View>
            )}
            {content.files && Object.keys(content.files).length > 0 && (
              <View style={styles.filesContainer}>
                <Text style={styles.filesTitle}>
                  Generated {Object.keys(content.files).length} files
                </Text>
                {Object.keys(content.files).slice(0, 5).map((file, i) => (
                  <Text key={i} style={styles.fileName}>• {file}</Text>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={styles.pushButton}
              onPress={() => router.push('/github')}
            >
              <Ionicons name="rocket" size={18} color="#0A0A0F" />
              <Text style={styles.pushButtonText}>Push to GitHub</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.messageText}>{String(content)}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Ionicons name="sparkles" size={24} color="#A78BFA" />
          </View>
          <View>
            <Text style={styles.title}>App Factory</Text>
            <Text style={styles.subtitle}>
              {activeProviderInfo ? activeProviderInfo.name : 'AI-Powered App Builder'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/projects')}
          >
            <Ionicons name="folder-open" size={22} color="#A78BFA" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-sharp" size={22} color="#A78BFA" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Linked Repo Banner */}
      {linkedRepo && (
        <View style={styles.repoBanner}>
          <Ionicons name="logo-github" size={14} color="#10B981" />
          <Text style={styles.repoBannerText}>Linked: {linkedRepo}</Text>
        </View>
      )}

      {/* No API Key Warning */}
      {!hasValidKey && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.warningText}>
            No AI Provider - Tap to configure
          </Text>
        </TouchableOpacity>
      )}

      {/* Chat Area */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="sparkles" size={48} color="#A78BFA" />
              </View>
              <Text style={styles.emptyTitle}>Welcome to App Factory!</Text>
              <Text style={styles.emptySubtitle}>
                Describe the Android app you want to build.{"\n"}
                AI will generate code and push to GitHub.
              </Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Feather name="code" size={16} color="#A78BFA" />
                  <Text style={styles.featureText}>Full app generation with AI</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="logo-github" size={16} color="#A78BFA" />
                  <Text style={styles.featureText}>Auto GitHub push & APK build</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="flash" size={16} color="#A78BFA" />
                  <Text style={styles.featureText}>Auto error detection & fix</Text>
                </View>
              </View>
            </View>
          )}

          {messages.map(renderMessage)}

          {isProcessing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator color="#A78BFA" size="small" />
              <Text style={styles.processingText}>AI is thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Describe your app idea..."
              placeholderTextColor="#6B7280"
              value={prompt}
              onChangeText={setPrompt}
              multiline
              maxLength={4000}
            />
            <TouchableOpacity
              style={[styles.sendButton, !prompt.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={isProcessing || !prompt.trim()}
            >
              {isProcessing ? (
                <ActivityIndicator color="#0A0A0F" size="small" />
              ) : (
                <Ionicons name="send" size={20} color="#0A0A0F" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  chatContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F2E',
    backgroundColor: '#12121A',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1F1F2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1F1F2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#064E3B',
    gap: 6,
  },
  repoBannerText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  warningBanner: {
    padding: 10,
    backgroundColor: '#78350F',
    alignItems: 'center',
  },
  warningText: {
    color: '#FCD34D',
    fontSize: 13,
    fontWeight: '600',
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#1F1F2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1F1F2E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  featureText: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  messageBubble: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    maxWidth: '95%',
  },
  userBubble: {
    backgroundColor: '#3B2D5B',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#1F1F2E',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2D2D3D',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  roleText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  messageText: {
    color: '#E5E7EB',
    fontSize: 15,
    lineHeight: 22,
  },
  planContainer: {
    backgroundColor: '#064E3B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  planText: {
    color: '#A7F3D0',
    fontSize: 14,
    lineHeight: 20,
  },
  filesContainer: {
    backgroundColor: '#1A1A2E',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  filesTitle: {
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  fileName: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 4,
  },
  pushButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A78BFA',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  pushButtonText: {
    color: '#0A0A0F',
    fontSize: 15,
    fontWeight: 'bold',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  processingText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  inputContainer: {
    padding: 12,
    backgroundColor: '#12121A',
    borderTopWidth: 1,
    borderTopColor: '#1F1F2E',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#1F1F2E',
    color: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 100,
    minHeight: 48,
    fontSize: 15,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#A78BFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
