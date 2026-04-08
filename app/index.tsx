import React, { useState, useRef, useEffect } from 'react';
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
  Image,
  Alert,
  Animated,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useStore, getActiveAIProvider } from '../src/store/useStore';
import { chatWithGemini, getActiveProviderInfo, isAIConfigured } from '../src/api/geminiApi';

export default function AgentScreen() {
  const [prompt, setPrompt] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const {
    messages,
    addMessage,
    setPendingFiles,
    linkedRepo,
    isRecording,
    setIsRecording,
    isProcessing,
    setIsProcessing,
    settings,
  } = useStore();

  // Handle keyboard
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Pulse animation for recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageBase64(result.assets[0].base64);
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const toggleVoiceRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      Alert.alert('Voice Recording', 'Voice recording stopped.');
    } else {
      setIsRecording(true);
      Alert.alert('Voice Recording', 'Listening... (Requires native speech module)');
    }
  };

  const handleSend = async () => {
    if (!prompt.trim() && !imageBase64 && !videoUri) return;

    Keyboard.dismiss();

    const userMessage = {
      role: 'user' as const,
      content: prompt,
      image: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : undefined,
      video: videoUri || undefined,
    };

    addMessage(userMessage);

    const currentPrompt = prompt;
    const currentImg = imageBase64;
    const currentVideo = videoUri;
    setPrompt('');
    setImageBase64(null);
    setVideoUri(null);
    setIsProcessing(true);

    try {
      const response = await chatWithGemini(
        currentPrompt,
        currentImg,
        currentVideo,
        { repoName: linkedRepo || undefined }
      );

      // Handle different response types
      if (response.action === 'write_code' && response.files) {
        // Code generation response
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
      } else if (response.action === 'message' || response.message) {
        // Simple message response
        addMessage({
          role: 'ai',
          content: response.message || response.plan || 'Done!',
        });
      } else if (response.plan && !response.files) {
        // Plan only (explanation)
        addMessage({
          role: 'ai',
          content: response.plan,
        });
      } else {
        // Fallback - try to extract meaningful content
        const text = response.message || response.plan || 
          (typeof response === 'string' ? response : 'Task completed.');
        addMessage({
          role: 'ai',
          content: text,
        });
      }
    } catch (error: any) {
      addMessage({
        role: 'ai',
        content: `❌ Error: ${error.message || 'Failed to communicate with AI'}`,
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const renderMessage = (msg: any, idx: number) => {
    const isUser = msg.role === 'user';
    const content = msg.content;

    return (
      <View
        key={idx}
        style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}
      >
        <View style={styles.roleHeader}>
          {isUser ? (
            <View style={styles.roleIconContainer}>
              <Ionicons name="person" size={14} color="#A78BFA" />
            </View>
          ) : (
            <View style={[styles.roleIconContainer, styles.aiIconContainer]}>
              <Ionicons name="sparkles" size={14} color="#A78BFA" />
            </View>
          )}
          <Text style={styles.roleText}>{isUser ? 'You' : 'App Factory AI'}</Text>
        </View>

        {msg.image && (
          <Image source={{ uri: msg.image }} style={styles.chatImage} />
        )}

        {msg.video && (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam" size={24} color="#A78BFA" />
            <Text style={styles.videoText}>Video attached</Text>
          </View>
        )}

        {/* Render content based on type */}
        {typeof content === 'string' ? (
          <Text style={styles.messageText}>{content}</Text>
        ) : content?.type === 'code_generation' ? (
          <View>
            {/* Plan/Description */}
            {content.plan && (
              <View style={styles.planContainer}>
                <MaterialCommunityIcons name="lightbulb-outline" size={18} color="#10B981" />
                <Text style={styles.planText}>{content.plan}</Text>
              </View>
            )}

            {/* Generated Files */}
            {content.files && Object.keys(content.files).length > 0 && (
              <View style={styles.filesContainer}>
                <View style={styles.filesHeader}>
                  <Feather name="code" size={16} color="#A78BFA" />
                  <Text style={styles.filesTitle}>
                    ✅ Generated {Object.keys(content.files).length} files
                  </Text>
                </View>
                {Object.keys(content.files).slice(0, 8).map((file, i) => (
                  <Text key={i} style={styles.fileName}>• {file}</Text>
                ))}
                {Object.keys(content.files).length > 8 && (
                  <Text style={styles.moreFiles}>
                    +{Object.keys(content.files).length - 8} more files
                  </Text>
                )}
              </View>
            )}

            {/* Required Libraries */}
            {content.libraries && content.libraries.length > 0 && (
              <View style={styles.librariesContainer}>
                <Ionicons name="cube-outline" size={16} color="#F59E0B" />
                <Text style={styles.librariesText}>
                  📦 Dependencies: {content.libraries.join(', ')}
                </Text>
              </View>
            )}

            {/* Push Button */}
            <TouchableOpacity
              style={styles.pushButton}
              onPress={() => router.push('/github')}
            >
              <Ionicons name="rocket" size={18} color="#0A0A0F" />
              <Text style={styles.pushButtonText}>Review & Push to GitHub</Text>
            </TouchableOpacity>
          </View>
        ) : content?.files ? (
          // Legacy format support
          <View>
            {content.plan && (
              <View style={styles.planContainer}>
                <MaterialCommunityIcons name="lightbulb-outline" size={18} color="#10B981" />
                <Text style={styles.planText}>{content.plan}</Text>
              </View>
            )}
            <View style={styles.filesContainer}>
              <View style={styles.filesHeader}>
                <Feather name="code" size={16} color="#A78BFA" />
                <Text style={styles.filesTitle}>
                  ✅ Generated {Object.keys(content.files).length} files
                </Text>
              </View>
              {Object.keys(content.files).slice(0, 8).map((file, i) => (
                <Text key={i} style={styles.fileName}>• {file}</Text>
              ))}
            </View>
            <TouchableOpacity
              style={styles.pushButton}
              onPress={() => router.push('/github')}
            >
              <Ionicons name="rocket" size={18} color="#0A0A0F" />
              <Text style={styles.pushButtonText}>Review & Push to GitHub</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Unknown format - show as message
          <Text style={styles.messageText}>
            {content?.message || content?.plan || String(content)}
          </Text>
        )}
      </View>
    );
  };

  const hasValidKey = isAIConfigured();
  const activeProviderInfo = getActiveProviderInfo();

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
              {activeProviderInfo ? `${activeProviderInfo.name}` : 'AI-Powered App Builder'}
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

      {/* Active Provider Banner */}
      {activeProviderInfo && (
        <View style={styles.providerBanner}>
          <Ionicons name="flash" size={14} color="#A78BFA" />
          <Text style={styles.providerBannerText}>
            Active: {activeProviderInfo.name} ({activeProviderInfo.type.toUpperCase()})
          </Text>
        </View>
      )}

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
            ⚠️ No AI Provider configured - Tap to add API keys
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
          contentContainerStyle={[
            styles.chatContent,
            { paddingBottom: keyboardHeight > 0 ? 20 : 100 }
          ]}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="sparkles" size={48} color="#A78BFA" />
              </View>
              <Text style={styles.emptyTitle}>Welcome to App Factory!</Text>
              <Text style={styles.emptySubtitle}>
                Describe the Android app you want to build.{"\n"}
                Attach screenshots for UI cloning or videos showing bugs.
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
              <Text style={styles.processingText}>
                🧠 AI is thinking & generating code...
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Attachments Preview */}
        {(imageBase64 || videoUri) && (
          <View style={styles.attachmentsPreview}>
            {imageBase64 && (
              <View style={styles.attachmentItem}>
                <Image
                  source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
                  style={styles.attachmentThumb}
                />
                <TouchableOpacity
                  style={styles.removeAttachment}
                  onPress={() => setImageBase64(null)}
                >
                  <Ionicons name="close" size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
            {videoUri && (
              <View style={styles.attachmentItem}>
                <View style={styles.videoThumb}>
                  <Ionicons name="videocam" size={24} color="#A78BFA" />
                </View>
                <TouchableOpacity
                  style={styles.removeAttachment}
                  onPress={() => setVideoUri(null)}
                >
                  <Ionicons name="close" size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          {/* Action Buttons Row */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={pickImage}>
              <Ionicons name="image" size={20} color="#A78BFA" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={pickVideo}>
              <Ionicons name="videocam" size={20} color="#A78BFA" />
            </TouchableOpacity>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[styles.actionBtn, isRecording && styles.recordingBtn]}
                onPress={toggleVoiceRecording}
              >
                <Ionicons 
                  name={isRecording ? "mic-off" : "mic"} 
                  size={20} 
                  color={isRecording ? "#EF4444" : "#A78BFA"} 
                />
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/github')}
            >
              <Ionicons name="logo-github" size={20} color="#A78BFA" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Feather name="download" size={20} color="#A78BFA" />
            </TouchableOpacity>
          </View>

          {/* Text Input Row */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Describe your app idea..."
              placeholderTextColor="#6B7280"
              value={prompt}
              onChangeText={setPrompt}
              multiline
              maxLength={4000}
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!prompt.trim() && !imageBase64 && !videoUri) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={isProcessing || (!prompt.trim() && !imageBase64 && !videoUri)}
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
  providerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#1F1F3A',
    gap: 6,
  },
  providerBannerText: {
    color: '#A78BFA',
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
  roleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B2D5B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiIconContainer: {
    backgroundColor: '#1F1F2E',
    borderWidth: 1,
    borderColor: '#A78BFA',
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
  chatImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
    resizeMode: 'cover',
  },
  videoPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2D2D3D',
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  videoText: {
    color: '#A78BFA',
    fontSize: 14,
  },
  planContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#064E3B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 10,
  },
  planText: {
    color: '#A7F3D0',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  filesContainer: {
    backgroundColor: '#1A1A2E',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  filesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  filesTitle: {
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: '600',
  },
  fileName: {
    color: '#9CA3AF',
    fontSize: 13,
    marginLeft: 24,
    marginTop: 4,
  },
  moreFiles: {
    color: '#6B7280',
    fontSize: 12,
    marginLeft: 24,
    marginTop: 4,
    fontStyle: 'italic',
  },
  librariesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#78350F',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  librariesText: {
    color: '#FCD34D',
    fontSize: 13,
    flex: 1,
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
  attachmentsPreview: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#12121A',
    borderTopWidth: 1,
    borderTopColor: '#1F1F2E',
    gap: 12,
  },
  attachmentItem: {
    position: 'relative',
  },
  attachmentThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  videoThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#1F1F2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeAttachment: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    padding: 12,
    backgroundColor: '#12121A',
    borderTopWidth: 1,
    borderTopColor: '#1F1F2E',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1F1F2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingBtn: {
    backgroundColor: '#7F1D1D',
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
