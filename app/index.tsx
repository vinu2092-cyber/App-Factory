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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore, getDefaultGitHubAccount } from '../src/store/useStore';

// Lazy imports - loaded only when needed, not at startup
let _chatWithGemini: any = null;
let _generateFullProject: any = null;
let _generateProjectWithProgress: any = null;
let _createAgenticEngine: any = null;
let _analyzeScreenshot: any = null;
let _analyzeVideo: any = null;
let _analyzeVoice: any = null;
let _analyzeWithMedia: any = null;

const loadAIModules = async () => {
  if (!_chatWithGemini) {
    const gemini = require('../src/api/geminiApi');
    _chatWithGemini = gemini.chatWithGemini;
    _generateFullProject = gemini.generateFullProject;
    _generateProjectWithProgress = gemini.generateProjectWithProgress;
    _analyzeScreenshot = gemini.analyzeScreenshot;
    _analyzeVideo = gemini.analyzeVideo;
    _analyzeVoice = gemini.analyzeVoice;
    _analyzeWithMedia = gemini.analyzeWithMedia;
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
  const [showActions, setShowActions] = useState(false);
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  
  const { 
    messages, addMessage, isProcessing, setIsProcessing, 
    pendingFiles, setPendingFiles, linkedRepo, setLinkedRepo,
    autonomousMode, selfHealingEnabled,
    addProject
  } = useStore();
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [userRepos, setUserRepos] = useState<Array<{ name: string; fullName: string; description: string }>>([]);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState<{ type: string; uri: string; base64?: string; mimeType?: string } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [processingStatus, setProcessingStatus] = useState('AI soch raha hai...');
  const [progressLogs, setProgressLogs] = useState<Array<{ msg: string; type: 'info' | 'file' | 'success' | 'error' }>>([]);
  const [showProgressPanel, setShowProgressPanel] = useState(false);
  const [liveGitHubPush, setLiveGitHubPush] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const hasKey = useStore.getState().aiProviders.length > 0;
  const activeProvider = useStore.getState().aiProviders.find(
    p => p.id === useStore.getState().activeProviderId
  );
  const providerInfo = activeProvider ? { name: activeProvider.name, type: activeProvider.type } : null;
  const ghAccount = getDefaultGitHubAccount();
  const hasPendingFiles = pendingFiles && Object.keys(pendingFiles).length > 0;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, []);

  // Load user repos for import
  const loadUserRepos = useCallback(async () => {
    if (!ghAccount) {
      Alert.alert('No GitHub', 'Settings mein GitHub account add karo');
      router.push('/settings');
      return;
    }
    
    setImportLoading(true);
    try {
      const { GitHubAutonomousService } = require('../src/engine/AgenticEngine');
      const service = new GitHubAutonomousService(ghAccount.token, ghAccount.username);
      const repos = await service.listUserRepos();
      setUserRepos(repos);
      setShowImportModal(true);
    } catch (e: any) {
      Alert.alert('Error', `Repos load nahi ho paye: ${e.message}`);
    } finally {
      setImportLoading(false);
    }
  }, [ghAccount, router]);

  // Import repo files
  const importRepo = useCallback(async (repoFullName: string) => {
    if (!ghAccount) return;
    
    setShowImportModal(false);
    setBuildStatus(`Importing ${repoFullName}...`);
    
    try {
      const { GitHubAutonomousService } = require('../src/engine/AgenticEngine');
      const service = new GitHubAutonomousService(ghAccount.token, ghAccount.username);
      
      const repoInfo = await service.getRepoInfo(repoFullName);
      const files = await service.getRepoFiles(repoFullName, repoInfo.defaultBranch);
      
      if (Object.keys(files).length === 0) {
        setBuildStatus('');
        addMessage({ role: 'ai', content: `Repo mein koi readable files nahi mili.` });
        return;
      }
      
      setPendingFiles(files);
      setLinkedRepo(repoFullName);
      
      const projectName = repoInfo.name;
      addProject({
        name: projectName,
        description: repoInfo.description || `Imported from ${repoFullName}`,
        files: files,
        repo: repoFullName,
        buildStatus: 'idle',
        lastBuildLog: '',
      });
      
      setBuildStatus('');
      addMessage({ 
        role: 'ai', 
        content: `${repoFullName} se ${Object.keys(files).length} files import ho gayi!\n\nFiles:\n- ${Object.keys(files).slice(0, 10).join('\n- ')}${Object.keys(files).length > 10 ? '\n- ...' : ''}\n\nAb changes karke GitHub pe push kar sakte ho ya build start kar sakte ho.` 
      });
      setShowActions(true);
      scrollToBottom();
    } catch (e: any) {
      setBuildStatus('');
      addMessage({ role: 'ai', content: `Import failed: ${e.message}` });
      scrollToBottom();
    }
  }, [ghAccount, setPendingFiles, setLinkedRepo, addProject, addMessage, scrollToBottom]);

  // Pick media for analysis
  const pickMedia = useCallback(async (type: 'image' | 'video' | 'audio') => {
    setShowMediaMenu(false);
    
    try {
      const MediaService = require('../src/services/MediaService');
      let media;
      
      switch (type) {
        case 'image':
          media = await MediaService.pickImage();
          break;
        case 'video':
          media = await MediaService.pickVideo();
          break;
        case 'audio':
          media = await MediaService.pickAudio();
          break;
      }
      
      if (media) {
        setAttachedMedia({
          type: media.type,
          uri: media.uri,
          base64: media.base64,
          mimeType: media.mimeType,
        });
        addMessage({ 
          role: 'ai', 
          content: `${type === 'image' ? 'Screenshot' : type === 'video' ? 'Video' : 'Audio'} attached! Ab batao kya analyze karna hai ya message type karo.` 
        });
        scrollToBottom();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, [addMessage, scrollToBottom]);

  // Take photo for analysis
  const takePhoto = useCallback(async () => {
    setShowMediaMenu(false);
    
    try {
      const MediaService = require('../src/services/MediaService');
      const media = await MediaService.takePhoto();
      
      if (media) {
        setAttachedMedia({
          type: 'image',
          uri: media.uri,
          base64: media.base64,
          mimeType: 'image/jpeg',
        });
        addMessage({ 
          role: 'ai', 
          content: `Photo capture ho gayi! Ab batao kya analyze karna hai.` 
        });
        scrollToBottom();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, [addMessage, scrollToBottom]);

  // Export project to storage
  const exportProject = useCallback(async () => {
    if (!hasPendingFiles) {
      Alert.alert('No Project', 'Pehle project generate karo');
      return;
    }
    
    const projectName = useStore.getState().projects.slice(-1)[0]?.name || 'my-app';
    setBuildStatus('Exporting project...');
    
    try {
      const MediaService = require('../src/services/MediaService');
      const result = await MediaService.exportProjectToStorage(projectName, pendingFiles!);
      
      setBuildStatus('');
      if (result.success) {
        addMessage({ 
          role: 'ai', 
          content: `Project export ho gaya!\n\nPath: ${result.path}\n\n${Object.keys(pendingFiles!).length} files save ho gayi.` 
        });
      } else {
        addMessage({ role: 'ai', content: `Export failed: ${result.error}` });
      }
      scrollToBottom();
    } catch (e: any) {
      setBuildStatus('');
      Alert.alert('Error', e.message);
    }
  }, [hasPendingFiles, pendingFiles, addMessage, scrollToBottom]);

  // Download APK
  const downloadAPK = useCallback(async () => {
    if (!linkedRepo || !ghAccount) {
      Alert.alert('No Build', 'Pehle GitHub pe push karo aur build complete hone do');
      return;
    }
    
    setBuildStatus('Getting build info...');
    
    try {
      const { GitHubAutonomousService } = require('../src/engine/AgenticEngine');
      const service = new GitHubAutonomousService(ghAccount.token, ghAccount.username);
      
      const runs = await service.getWorkflowRuns(linkedRepo);
      const successfulRun = runs.find((r: any) => r.conclusion === 'success');
      
      if (!successfulRun) {
        setBuildStatus('');
        addMessage({ role: 'ai', content: 'Koi successful build nahi mila. Build complete hone ka wait karo ya GitHub Actions check karo.' });
        scrollToBottom();
        return;
      }
      
      setBuildStatus('Downloading APK...');
      setDownloadProgress(0);
      
      const MediaService = require('../src/services/MediaService');
      const result = await MediaService.downloadAPKFromGitHub(
        ghAccount.token,
        linkedRepo,
        successfulRun.id,
        (progress: number) => setDownloadProgress(progress)
      );
      
      setDownloadProgress(null);
      setBuildStatus('');
      
      if (result.success) {
        addMessage({ 
          role: 'ai', 
          content: `APK download ho gaya!\n\nPath: ${result.path}\n\nNote: Downloaded file ek ZIP hai jisme APK hai. File manager se extract karo.` 
        });
      } else {
        addMessage({ role: 'ai', content: `Download failed: ${result.error}` });
      }
      scrollToBottom();
    } catch (e: any) {
      setDownloadProgress(null);
      setBuildStatus('');
      addMessage({ role: 'ai', content: `Error: ${e.message}` });
      scrollToBottom();
    }
  }, [linkedRepo, ghAccount, addMessage, scrollToBottom]);

  // Voice Recording - Start
  const startVoiceRecording = useCallback(async () => {
    try {
      const VoiceService = require('../src/services/VoiceInputService').voiceInputService;
      const started = await VoiceService.startRecording();
      
      if (started) {
        setIsRecording(true);
        setRecordingDuration(0);
        
        // Update duration every second
        const interval = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
        
        // Store interval ID to clear later
        (global as any).recordingInterval = interval;
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, []);

  // Voice Recording - Stop and Send
  const stopVoiceRecording = useCallback(async () => {
    try {
      // Clear interval
      if ((global as any).recordingInterval) {
        clearInterval((global as any).recordingInterval);
      }
      
      setIsRecording(false);
      
      const VoiceService = require('../src/services/VoiceInputService').voiceInputService;
      const result = await VoiceService.stopRecording();
      
      if (result) {
        addMessage({ 
          role: 'ai', 
          content: `${result.duration}s voice recorded. Voice-to-text abhi sirf Gemini pe kaam karta hai. Gemini quota reset hone ka wait karo ya text type karo.` 
        });
        scrollToBottom();
      } else {
        addMessage({ role: 'ai', content: 'Recording nahi ho payi. Microphone permission check karo.' });
        scrollToBottom();
      }
    } catch (e: any) {
      setIsRecording(false);
      addMessage({ role: 'ai', content: `Recording error: ${e.message}` });
      scrollToBottom();
    }
  }, [addMessage, scrollToBottom]);

  // Cancel voice recording
  const cancelVoiceRecording = useCallback(async () => {
    if ((global as any).recordingInterval) {
      clearInterval((global as any).recordingInterval);
    }
    
    setIsRecording(false);
    setRecordingDuration(0);
    
    try {
      const VoiceService = require('../src/services/VoiceInputService').voiceInputService;
      await VoiceService.cancelRecording();
    } catch {}
  }, []);

  // Push to GitHub
  const pushToGitHub = useCallback(async () => {
    if (!ghAccount) {
      Alert.alert('No GitHub', 'Settings mein GitHub account add karo');
      router.push('/settings');
      return;
    }
    if (!hasPendingFiles) return;

    await loadEngineModules();
    if (!_createAgenticEngine) return;

    const projectName = useStore.getState().projects.slice(-1)[0]?.name || 'my-app';
    
    setShowActions(false);
    setBuildStatus('Pushing to GitHub...');
    
    try {
      const { GitHubAutonomousService } = require('../src/engine/AgenticEngine');
      const service = new GitHubAutonomousService(ghAccount.token, ghAccount.username);
      
      const repoFullName = await service.createRepository(
        projectName,
        'Generated by App Factory'
      );
      await new Promise(r => setTimeout(r, 3000));
      await service.pushFiles(repoFullName, pendingFiles!, 'Initial commit: App Factory');
      
      setLinkedRepo(repoFullName);
      setBuildStatus('');
      
      addMessage({ 
        role: 'ai', 
        content: `GitHub pe push ho gaya: ${repoFullName}\n\nGitHub Actions ab APK build karega. GitHub tab mein jaake status dekh sakte ho.` 
      });
      scrollToBottom();
    } catch (e: any) {
      setBuildStatus('');
      addMessage({ role: 'ai', content: `Push failed: ${e.message}` });
      scrollToBottom();
    }
  }, [ghAccount, hasPendingFiles, pendingFiles, setLinkedRepo, addMessage, scrollToBottom, router]);

  // Start autonomous build
  const startAutonomousBuild = useCallback(async () => {
    if (!ghAccount) {
      Alert.alert('No GitHub Account', 'Settings mein add karo');
      return;
    }

    await loadEngineModules();
    if (!_createAgenticEngine) return;

    const projectName = useStore.getState().projects.slice(-1)[0]?.name || 'my-app';
    
    setShowActions(false);
    setBuildStatus('Connecting to GitHub...');
    
    try {
      const projectEngine = _createAgenticEngine(projectName, 'App Factory project');
      const files = useStore.getState().pendingFiles;
      if (files) projectEngine.loadFiles(files);
      
      projectEngine.connectGitHub(ghAccount.token, ghAccount.username);
      
      setBuildStatus('Creating repo & pushing...');
      const repoFullName = await projectEngine.createAndPush(projectName);
      setLinkedRepo(repoFullName);
      
      addMessage({ 
        role: 'ai', 
        content: `Repo created: ${repoFullName}\n\nAutonomous build shuru ho rahi hai${selfHealingEnabled ? ' (self-healing ON)' : ''}...` 
      });
      scrollToBottom();

      await projectEngine.autonomousBuild(
        (status: string) => setBuildStatus(status),
        (result: any) => {
          setBuildStatus('');
          if (result.success) {
            addMessage({ role: 'ai', content: `BUILD SUCCESSFUL!\n\nAPK download karo: GitHub Actions > Artifacts` });
          } else {
            addMessage({ role: 'ai', content: `Build failed: ${result.failedStep || 'Unknown error'}\n\n${result.logs?.slice(0, 300) || ''}` });
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

  // Send message with full conversation context
  const send = async () => {
    if (!input.trim() && !attachedMedia) return;
    
    if (!hasKey) {
      Alert.alert('No API Key', 'Settings mein AI provider key add karo');
      router.push('/settings');
      return;
    }

    Keyboard.dismiss();
    const userInput = input.trim();
    const media = attachedMedia;
    
    addMessage({ role: 'user', content: userInput || (media ? `[${media.type} attached for analysis]` : '') });
    setInput('');
    setAttachedMedia(null);
    setIsProcessing(true);
    setProcessingStatus('AI soch raha hai...');
    setShowActions(false);
    scrollToBottom();

    try {
      await loadAIModules();
      
      let res;
      
      // Handle media analysis
      if (media && media.base64) {
        setProcessingStatus(`${media.type === 'image' ? 'Screenshot' : media.type === 'video' ? 'Video' : 'Audio'} analyze ho raha hai...`);
        addMessage({ role: 'ai', content: `${media.type === 'image' ? 'Screenshot' : media.type === 'video' ? 'Video' : 'Audio'} analyze ho raha hai...` });
        scrollToBottom();
        
        if (media.type === 'image') {
          res = userInput 
            ? await _analyzeWithMedia(userInput, { type: 'image', data: media.base64, mimeType: media.mimeType || 'image/jpeg' })
            : await _analyzeScreenshot(media.base64);
        } else if (media.type === 'video') {
          res = await _analyzeVideo(media.base64, media.mimeType || 'video/mp4', userInput);
        } else if (media.type === 'audio') {
          res = await _analyzeVoice(media.base64, media.mimeType || 'audio/mpeg', userInput);
        }
      } else {
        // Normal text processing - SIMPLE VERSION
        setProcessingStatus('AI code generate kar raha hai...');

        const isFirstProjectRequest = !hasPendingFiles && 
          /app|build|create|बनाओ|banao|project|calculator|todo|game|chat/i.test(userInput);

        if (isFirstProjectRequest) {
          addMessage({ role: 'ai', content: 'Project generate ho raha hai...' });
          scrollToBottom();
          res = await _generateFullProject(userInput);
        } else {
          res = await _chatWithGemini(userInput, {
            existingFiles: pendingFiles || undefined,
            hasPendingFiles: !!hasPendingFiles,
          });
        }
      }
      
      // Handle response
      if (res?.action === 'analyze' && res.issues) {
        // Analysis result
        const issueList = res.issues.join('\n- ');
        addMessage({ 
          role: 'ai', 
          content: `**Analysis Result:**\n\nIssues found:\n- ${issueList}\n\nSeverity: ${res.severity || 'medium'}\n\n${res.message || ''}` 
        });
        
        // If fixes provided, apply them
        if (res.files && Object.keys(res.files).length > 0) {
          const mergedFiles = { ...pendingFiles, ...res.files };
          setPendingFiles(mergedFiles);
          addMessage({ role: 'ai', content: `${Object.keys(res.files).length} files fix ho gayi. Push ya review karo.` });
          setShowActions(true);
        }
      } else if ((res?.action === 'write_code' || res?.action === 'fix_error') && res.files) {
        const projectName = userInput
          .split(' ')
          .slice(0, 3)
          .join('-')
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '') || 'my-app';
        
        const fileCount = Object.keys(res.files).length;
        const fileList = Object.keys(res.files).slice(0, 12).join('\n- ');
        
        addMessage({ 
          role: 'ai', 
          content: `${fileCount} files generate ho gayi:\n\n- ${fileList}${fileCount > 12 ? `\n- ... aur ${fileCount - 12} more` : ''}\n\nPlan: ${res.plan || 'Project ready'}\n\nLibraries: ${res.libraries?.join(', ') || 'Standard'}` 
        });
        
        const mergedFiles = hasPendingFiles ? { ...pendingFiles, ...res.files } : res.files;
        setPendingFiles(mergedFiles);
        
        if (!hasPendingFiles) {
          addProject({
            name: projectName,
            description: userInput,
            files: mergedFiles,
            repo: null,
            buildStatus: 'idle',
            lastBuildLog: '',
          });
        }
        
        setShowActions(true);
        scrollToBottom();
      } else {
        // Voice transcription or message
        let msg = res?.message || 'Done!';
        if (res?.transcription) {
          msg = `**Transcription:** ${res.transcription}\n\n${msg}`;
        }
        addMessage({ role: 'ai', content: msg });
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
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={loadUserRepos}
            disabled={importLoading}
            data-testid="import-btn"
          >
            {importLoading ? (
              <ActivityIndicator size="small" color="#A78BFA" />
            ) : (
              <Ionicons name="cloud-download" size={22} color="#10B981" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/projects')} data-testid="projects-btn">
            <Ionicons name="folder" size={22} color="#A78BFA" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/github')} data-testid="github-btn">
            <Ionicons name="logo-github" size={22} color="#A78BFA" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings')} data-testid="settings-btn">
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

      {/* Live GitHub Push Toggle */}
      {ghAccount ? (
        <TouchableOpacity 
          style={[styles.livePushBanner, liveGitHubPush && styles.livePushActive]}
          onPress={() => setLiveGitHubPush(!liveGitHubPush)}
        >
          <Ionicons name={liveGitHubPush ? 'sync' : 'sync-outline'} size={14} color={liveGitHubPush ? '#10B981' : '#6B7280'} />
          <Text style={[styles.livePushText, liveGitHubPush && styles.livePushTextActive]}>
            Live GitHub Push: {liveGitHubPush ? 'ON' : 'OFF'}
          </Text>
          {liveGitHubPush && <Text style={styles.livePushHint}>Files real-time push hongi</Text>}
        </TouchableOpacity>
      ) : null}

      {/* No API Key Warning */}
      {!hasKey ? (
        <TouchableOpacity style={styles.warning} onPress={() => router.push('/settings')}>
          <Ionicons name="warning" size={16} color="#FCD34D" />
          <Text style={styles.warningText}>No API Key - Tap to configure</Text>
        </TouchableOpacity>
      ) : null}

      <KeyboardAvoidingView 
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Chat Area */}
        <ScrollView 
          ref={scrollRef} 
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="rocket" size={44} color="#A78BFA" />
              </View>
              <Text style={styles.emptyTitle}>App Factory AI</Text>
              <Text style={styles.emptyText}>
                Apna app idea batao - complete project generate hoga, GitHub pe push hoga, APK build hoga.
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

              <Text style={styles.tryText}>Try: "Calculator app banao"</Text>
            </View>
          ) : null}

          {messages.map((msg, i) => (
            <View key={msg.id || i} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              <View style={styles.bubbleHeader}>
                <Ionicons name={msg.role === 'user' ? 'person' : 'flash'} size={14} color="#A78BFA" />
                <Text style={styles.roleText}>{msg.role === 'user' ? 'You' : 'Agentic AI'}</Text>
              </View>
              <Text style={styles.msgText} selectable>{msg.content}</Text>
            </View>
          ))}

          {/* Action Buttons after code generation */}
          {showActions && hasPendingFiles && !isProcessing ? (
            <View style={styles.actionBox}>
              <Text style={styles.actionTitle}>Code ready! Aage kya karna hai?</Text>
              <View style={styles.actionBtns}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.actionPush]}
                  onPress={pushToGitHub}
                  data-testid="action-push-github"
                >
                  <Ionicons name="cloud-upload" size={18} color="#FFF" />
                  <Text style={styles.actionBtnText}>GitHub Push</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.actionBuild]}
                  onPress={startAutonomousBuild}
                  data-testid="action-auto-build"
                >
                  <Ionicons name="rocket" size={18} color="#FFF" />
                  <Text style={styles.actionBtnText}>Auto Build</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.actionBtns}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.actionView]}
                  onPress={() => router.push('/projects')}
                  data-testid="action-view-code"
                >
                  <Ionicons name="code-slash" size={18} color="#FFF" />
                  <Text style={styles.actionBtnText}>Code Dekho</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.actionChat]}
                  onPress={() => setShowActions(false)}
                  data-testid="action-continue-chat"
                >
                  <Ionicons name="chatbubble" size={18} color="#FFF" />
                  <Text style={styles.actionBtnText}>Chat Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {isProcessing ? (
            <View style={styles.loading}>
              <ActivityIndicator color="#A78BFA" />
              <Text style={styles.loadingText}>{processingStatus}</Text>
            </View>
          ) : null}

          {/* Live Progress Panel */}
          {showProgressPanel && progressLogs.length > 0 ? (
            <View style={styles.progressPanel}>
              <View style={styles.progressHeader}>
                <Ionicons name="terminal" size={16} color="#10B981" />
                <Text style={styles.progressTitle}>Live Progress</Text>
                <TouchableOpacity onPress={() => setShowProgressPanel(false)}>
                  <Ionicons name="close" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.progressScroll} nestedScrollEnabled>
                {progressLogs.map((log, i) => (
                  <View key={i} style={styles.progressLine}>
                    <Ionicons 
                      name={
                        log.type === 'success' ? 'checkmark-circle' : 
                        log.type === 'error' ? 'close-circle' : 
                        log.type === 'file' ? 'document' : 
                        'arrow-forward'
                      } 
                      size={12} 
                      color={
                        log.type === 'success' ? '#10B981' : 
                        log.type === 'error' ? '#EF4444' : 
                        log.type === 'file' ? '#A78BFA' : 
                        '#6B7280'
                      } 
                    />
                    <Text style={[
                      styles.progressText,
                      log.type === 'success' && styles.progressSuccess,
                      log.type === 'error' && styles.progressError,
                      log.type === 'file' && styles.progressFile,
                    ]}>{log.msg}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </ScrollView>

        {/* Attached Media Preview */}
        {attachedMedia ? (
          <View style={styles.attachedPreview}>
            <Ionicons 
              name={attachedMedia.type === 'image' ? 'image' : attachedMedia.type === 'video' ? 'videocam' : 'mic'} 
              size={18} 
              color="#A78BFA" 
            />
            <Text style={styles.attachedText}>
              {attachedMedia.type === 'image' ? 'Screenshot' : attachedMedia.type === 'video' ? 'Video' : 'Audio'} attached
            </Text>
            <TouchableOpacity onPress={() => setAttachedMedia(null)}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Download Progress */}
        {downloadProgress !== null ? (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
            <Text style={styles.progressText}>{downloadProgress}%</Text>
          </View>
        ) : null}

        {/* Input */}
        <View style={styles.inputBox}>
          {/* Media Button */}
          <TouchableOpacity 
            style={styles.mediaBtn}
            onPress={() => setShowMediaMenu(true)}
            disabled={isRecording}
            data-testid="media-btn"
          >
            <Ionicons name="attach" size={24} color="#A78BFA" />
          </TouchableOpacity>
          
          {/* Voice Recording UI */}
          {isRecording ? (
            <View style={styles.recordingContainer}>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingTime}>{recordingDuration}s</Text>
              </View>
              <Text style={styles.recordingText}>Recording... Hindi/English mein bolo</Text>
              <TouchableOpacity style={styles.cancelRecordBtn} onPress={cancelVoiceRecording}>
                <Ionicons name="close" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TextInput
              style={styles.input}
              placeholder={attachedMedia ? "Describe kya analyze karna hai..." : hasPendingFiles ? "Kuch aur karna hai? Batao..." : "App idea describe karo ya mic tap karo..."}
              placeholderTextColor="#6B7280"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
              onFocus={scrollToBottom}
              data-testid="chat-input"
            />
          )}
          
          {/* Voice/Send Button */}
          {isRecording ? (
            <TouchableOpacity 
              style={styles.stopRecordBtn}
              onPress={stopVoiceRecording}
              data-testid="stop-record-btn"
            >
              <Ionicons name="checkmark" size={24} color="#FFF" />
            </TouchableOpacity>
          ) : input.trim() || attachedMedia ? (
            <TouchableOpacity 
              style={[styles.sendBtn, isProcessing && styles.sendDisabled]} 
              onPress={send}
              disabled={isProcessing}
              data-testid="send-btn"
            >
              {isProcessing ? (
                <ActivityIndicator color="#0A0A0F" size="small" />
              ) : (
                <Ionicons name="send" size={20} color="#0A0A0F" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.micBtn}
              onPress={startVoiceRecording}
              disabled={isProcessing}
              data-testid="mic-btn"
            >
              <Ionicons name="mic" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Media Menu Modal */}
      <Modal
        visible={showMediaMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMediaMenu(false)}
      >
        <TouchableOpacity 
          style={styles.mediaMenuOverlay} 
          activeOpacity={1} 
          onPress={() => setShowMediaMenu(false)}
        >
          <View style={styles.mediaMenu}>
            <Text style={styles.mediaMenuTitle}>Media Attach karo</Text>
            
            <TouchableOpacity style={styles.mediaMenuItem} onPress={() => pickMedia('image')} data-testid="pick-image">
              <View style={[styles.mediaIcon, { backgroundColor: '#7C3AED20' }]}>
                <Ionicons name="image" size={24} color="#7C3AED" />
              </View>
              <View>
                <Text style={styles.mediaItemTitle}>Screenshot</Text>
                <Text style={styles.mediaItemDesc}>Gallery se photo select karo</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.mediaMenuItem} onPress={takePhoto} data-testid="take-photo">
              <View style={[styles.mediaIcon, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="camera" size={24} color="#10B981" />
              </View>
              <View>
                <Text style={styles.mediaItemTitle}>Camera</Text>
                <Text style={styles.mediaItemDesc}>Live photo capture karo</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.mediaMenuItem} onPress={() => pickMedia('video')} data-testid="pick-video">
              <View style={[styles.mediaIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="videocam" size={24} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.mediaItemTitle}>Video</Text>
                <Text style={styles.mediaItemDesc}>Bug recording ya screen recording</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.mediaMenuItem} onPress={() => pickMedia('audio')} data-testid="pick-audio">
              <View style={[styles.mediaIcon, { backgroundColor: '#EF444420' }]}>
                <Ionicons name="mic" size={24} color="#EF4444" />
              </View>
              <View>
                <Text style={styles.mediaItemTitle}>Voice</Text>
                <Text style={styles.mediaItemDesc}>Voice command ya recording</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.menuDivider} />
            
            <TouchableOpacity style={styles.mediaMenuItem} onPress={exportProject} data-testid="export-project">
              <View style={[styles.mediaIcon, { backgroundColor: '#2563EB20' }]}>
                <Ionicons name="folder-open" size={24} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.mediaItemTitle}>Export Project</Text>
                <Text style={styles.mediaItemDesc}>Storage mein save karo</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.mediaMenuItem} onPress={downloadAPK} data-testid="download-apk">
              <View style={[styles.mediaIcon, { backgroundColor: '#059669' }]}>
                <Ionicons name="download" size={24} color="#FFF" />
              </View>
              <View>
                <Text style={styles.mediaItemTitle}>Download APK</Text>
                <Text style={styles.mediaItemDesc}>GitHub se APK download karo</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Import Modal */}
      <Modal
        visible={showImportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>GitHub se Import karo</Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)} data-testid="close-import-modal">
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.repoList}>
              {userRepos.length === 0 ? (
                <Text style={styles.noReposText}>Koi repos nahi mili</Text>
              ) : (
                userRepos.map((repo, i) => (
                  <TouchableOpacity 
                    key={i} 
                    style={styles.repoItem}
                    onPress={() => importRepo(repo.fullName)}
                    data-testid={`repo-${repo.name}`}
                  >
                    <View style={styles.repoIcon}>
                      <Ionicons name="git-branch" size={18} color="#A78BFA" />
                    </View>
                    <View style={styles.repoInfo}>
                      <Text style={styles.repoName}>{repo.name}</Text>
                      <Text style={styles.repoDesc} numberOfLines={1}>
                        {repo.description || repo.fullName}
                      </Text>
                    </View>
                    <Ionicons name="download" size={20} color="#10B981" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  keyboardArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1F1F2E' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  title: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  subtitle: { color: '#A78BFA', fontSize: 11, fontWeight: '600' },
  headerRight: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center' },
  buildBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: '#7C3AED', gap: 8 },
  buildText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  repoBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 6, backgroundColor: '#064E3B', gap: 6 },
  repoText: { color: '#10B981', fontSize: 11, fontWeight: '600' },
  warning: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, backgroundColor: '#78350F', gap: 6 },
  warningText: { color: '#FCD34D', fontSize: 12, fontWeight: '600' },
  chat: { flex: 1 },
  chatContent: { padding: 14, paddingBottom: 20 },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyIcon: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20, marginBottom: 20 },
  features: { gap: 8, marginBottom: 16 },
  featureRow: { flexDirection: 'row', gap: 8 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1F1F2E', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, flex: 1 },
  featureText: { color: '#D1D5DB', fontSize: 11 },
  tryText: { color: '#6B7280', fontSize: 12, fontStyle: 'italic' },
  bubble: { padding: 12, borderRadius: 14, marginBottom: 10, maxWidth: '90%' },
  userBubble: { backgroundColor: '#3B2D5B', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#1F1F2E', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#2D2D3D' },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 5 },
  roleText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },
  msgText: { color: '#E5E7EB', fontSize: 13, lineHeight: 20 },
  loading: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  loadingText: { color: '#9CA3AF', fontSize: 13 },
  // Action buttons
  actionBox: { backgroundColor: '#12121A', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#A78BFA30' },
  actionTitle: { color: '#A78BFA', fontSize: 14, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  actionBtns: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, gap: 6 },
  actionPush: { backgroundColor: '#7C3AED' },
  actionBuild: { backgroundColor: '#059669' },
  actionView: { backgroundColor: '#2563EB' },
  actionChat: { backgroundColor: '#374151' },
  actionBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  // Input
  inputBox: { flexDirection: 'row', padding: 10, backgroundColor: '#12121A', borderTopWidth: 1, borderTopColor: '#1F1F2E', gap: 8, alignItems: 'flex-end' },
  mediaBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: '#1F1F2E', color: '#FFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 80, fontSize: 14 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#A78BFA', alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
  // Attached Media Preview
  attachedPreview: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#1F1F2E', gap: 8, marginHorizontal: 10, marginBottom: 0, borderRadius: 10 },
  attachedText: { flex: 1, color: '#A78BFA', fontSize: 12 },
  // Progress Bar
  progressBar: { height: 24, backgroundColor: '#1F1F2E', marginHorizontal: 10, borderRadius: 12, overflow: 'hidden', justifyContent: 'center' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#7C3AED', borderRadius: 12 },
  progressText: { color: '#FFF', fontSize: 11, textAlign: 'center', fontWeight: '600' },
  // Media Menu Modal
  mediaMenuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  mediaMenu: { backgroundColor: '#12121A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  mediaMenuTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  mediaMenuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  mediaIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mediaItemTitle: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  mediaItemDesc: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: '#1F1F2E', marginVertical: 10 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', maxHeight: '70%', backgroundColor: '#12121A', borderRadius: 16, borderWidth: 1, borderColor: '#A78BFA40' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1F1F2E' },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  repoList: { maxHeight: 400 },
  noReposText: { color: '#9CA3AF', textAlign: 'center', padding: 30, fontSize: 14 },
  repoItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#1F1F2E' },
  repoIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  repoInfo: { flex: 1 },
  repoName: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  repoDesc: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  // Live Push Banner
  livePushBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, backgroundColor: '#1F1F2E', gap: 6 },
  livePushActive: { backgroundColor: '#064E3B' },
  livePushText: { color: '#6B7280', fontSize: 11, fontWeight: '600' },
  livePushTextActive: { color: '#10B981' },
  livePushHint: { color: '#10B981', fontSize: 10, marginLeft: 4 },
  // Progress Panel
  progressPanel: { backgroundColor: '#0D1117', borderRadius: 12, margin: 10, borderWidth: 1, borderColor: '#30363D', maxHeight: 200 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#30363D', gap: 6 },
  progressTitle: { flex: 1, color: '#10B981', fontSize: 12, fontWeight: '600' },
  progressScroll: { padding: 10, maxHeight: 150 },
  progressLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  progressText: { color: '#8B949E', fontSize: 11, flex: 1 },
  progressSuccess: { color: '#10B981' },
  progressError: { color: '#EF4444' },
  progressFile: { color: '#A78BFA' },
  // Voice Recording
  micBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  recordingContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F1F2E', borderRadius: 14, paddingHorizontal: 14, gap: 8 },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  recordingTime: { color: '#EF4444', fontSize: 14, fontWeight: 'bold' },
  recordingText: { flex: 1, color: '#9CA3AF', fontSize: 12 },
  cancelRecordBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center' },
  stopRecordBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
});
