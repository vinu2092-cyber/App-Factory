import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore, getDefaultGitHubAccount } from '../src/store/useStore';
import { useRouter } from 'expo-router';

// Lazy loaded
let _GitHubAutonomousService: any = null;
let _autoFixBuildError: any = null;

const loadGitHubService = async () => {
  if (!_GitHubAutonomousService) {
    const engine = require('../src/engine/AgenticEngine');
    _GitHubAutonomousService = engine.GitHubAutonomousService;
  }
  return _GitHubAutonomousService;
};

const loadAutoFix = async () => {
  if (!_autoFixBuildError) {
    const gemini = require('../src/api/geminiApi');
    _autoFixBuildError = gemini.autoFixBuildError;
  }
  return _autoFixBuildError;
};

interface WorkflowRun {
  id: number;
  run_number: number;
  status: string;
  conclusion: string | null;
  name: string;
  created_at: string;
  html_url: string;
}

export default function GitHub() {
  const router = useRouter();
  const { pendingFiles, setPendingFiles, linkedRepo, setLinkedRepo } = useStore();
  const [repoName, setRepoName] = useState('');
  const [pushing, setPushing] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowRun[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);
  const [fixStatus, setFixStatus] = useState('');
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [buildLogs, setBuildLogs] = useState<Record<number, string>>({});
  
  const ghAccount = getDefaultGitHubAccount();
  const hasFiles = pendingFiles && Object.keys(pendingFiles).length > 0;
  const hasAI = useStore.getState().aiProviders.length > 0;

  // Load workflow runs
  const loadWorkflows = useCallback(async () => {
    if (!ghAccount || !linkedRepo) return;
    
    setLoadingWorkflows(true);
    try {
      const Service = await loadGitHubService();
      const service = new Service(ghAccount.token, ghAccount.username);
      const runs = await service.getWorkflowRuns(linkedRepo);
      setWorkflows(runs);
    } catch (e) {
      console.error('Failed to load workflows:', e);
    } finally {
      setLoadingWorkflows(false);
    }
  }, [ghAccount, linkedRepo]);

  useEffect(() => {
    if (linkedRepo) {
      loadWorkflows();
      const interval = setInterval(loadWorkflows, 30000);
      return () => clearInterval(interval);
    }
  }, [linkedRepo, loadWorkflows]);

  // Fetch build logs for a specific run
  const fetchBuildLogs = async (runId: number) => {
    if (!ghAccount || !linkedRepo) return;
    
    if (expandedLog === runId) {
      setExpandedLog(null);
      return;
    }

    setExpandedLog(runId);
    
    if (buildLogs[runId]) return; // Already fetched

    try {
      const Service = await loadGitHubService();
      const service = new Service(ghAccount.token, ghAccount.username);
      const { logs, failedStep } = await service.getBuildLogs(linkedRepo, runId);
      setBuildLogs(prev => ({ ...prev, [runId]: logs || 'No detailed logs available.' }));
    } catch (e: any) {
      setBuildLogs(prev => ({ ...prev, [runId]: `Failed to fetch logs: ${e.message}` }));
    }
  };

  // Auto-fix failed build
  const autoFixBuild = async (run: WorkflowRun) => {
    if (!ghAccount || !linkedRepo) return;
    if (!hasAI) {
      Alert.alert('No AI Key', 'Auto-fix ke liye AI provider key add karo Settings mein.');
      return;
    }

    setAutoFixing(true);
    setFixStatus('Fetching build error logs...');

    try {
      const Service = await loadGitHubService();
      const service = new Service(ghAccount.token, ghAccount.username);
      
      // Step 1: Get error logs
      setFixStatus('Analyzing error logs...');
      const { logs, failedStep } = await service.getBuildLogs(linkedRepo, run.id);

      if (!logs.trim()) {
        Alert.alert('No Logs', 'Build logs available nahi hain. Manual check karo.');
        return;
      }

      // Step 2: Send to AI for fix
      setFixStatus(`AI analyzing: "${failedStep || 'build error'}"...`);
      const autoFix = await loadAutoFix();
      const fixResponse = await autoFix(logs);

      if (fixResponse.files && Object.keys(fixResponse.files).length > 0) {
        // Step 3: Push fix to GitHub
        setFixStatus(`Pushing ${Object.keys(fixResponse.files).length} fixed files...`);
        
        // Merge fixed files with pending files
        const allFiles = { ...(pendingFiles || {}), ...fixResponse.files };
        
        await service.pushFiles(
          linkedRepo,
          allFiles,
          `Auto-fix: ${failedStep || 'Build error'} - ${fixResponse.plan || 'AI generated fix'}`
        );

        setPendingFiles(allFiles);

        Alert.alert(
          'Fix Pushed!',
          `AI ne ${Object.keys(fixResponse.files).length} files fix karke push kiya.\n\nPlan: ${fixResponse.plan || 'Auto-fixed'}\n\nNew build automatically trigger hoga.`,
          [{ text: 'OK' }]
        );

        // Refresh workflows after a delay
        setTimeout(loadWorkflows, 5000);
      } else {
        Alert.alert(
          'Fix Not Found',
          `AI ne fix generate nahi kar paaya.\n\n${fixResponse.message || 'Manual debugging required.'}`
        );
      }
    } catch (e: any) {
      Alert.alert('Error', `Auto-fix failed: ${e.message}`);
    } finally {
      setAutoFixing(false);
      setFixStatus('');
    }
  };

  const createAndPush = async () => {
    if (!ghAccount) {
      Alert.alert('No GitHub Account', 'Add a GitHub account in Settings');
      router.push('/settings');
      return;
    }
    if (!repoName.trim()) {
      Alert.alert('Error', 'Enter repository name');
      return;
    }
    if (!hasFiles) {
      Alert.alert('No Files', 'Generate code first using AI chat');
      return;
    }

    setPushing(true);
    try {
      const Service = await loadGitHubService();
      const service = new Service(ghAccount.token, ghAccount.username);
      
      const repoFullName = await service.createRepository(
        repoName.trim(),
        'Generated by App Factory - Autonomous AI Builder'
      );

      await new Promise(r => setTimeout(r, 3000));
      await service.pushFiles(repoFullName, pendingFiles!, 'Initial commit: App Factory generated project');

      setLinkedRepo(repoFullName);
      setPendingFiles(null);
      Alert.alert('Success!', `Code pushed to ${repoFullName}\n\nGitHub Actions will auto-build APK`);
      
      setTimeout(loadWorkflows, 5000);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setPushing(false);
    }
  };

  const getStatusColor = (status: string, conclusion: string | null) => {
    if (status === 'in_progress' || status === 'queued') return '#F59E0B';
    if (conclusion === 'success') return '#10B981';
    if (conclusion === 'failure') return '#EF4444';
    return '#6B7280';
  };

  const getStatusIcon = (status: string, conclusion: string | null) => {
    if (status === 'in_progress' || status === 'queued') return 'time';
    if (conclusion === 'success') return 'checkmark-circle';
    if (conclusion === 'failure') return 'close-circle';
    return 'help-circle';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Auto-Fix Status Banner */}
      {autoFixing && (
        <View style={styles.fixBanner}>
          <ActivityIndicator size="small" color="#FFF" />
          <Text style={styles.fixBannerText}>{fixStatus}</Text>
        </View>
      )}

      {/* GitHub Account Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GitHub Account</Text>
        {ghAccount ? (
          <View style={styles.accountBox}>
            <Ionicons name="logo-github" size={24} color="#FFF" />
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>@{ghAccount.username}</Text>
              <Text style={styles.accountStatus}>Connected</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
        ) : (
          <TouchableOpacity style={styles.addAccount} onPress={() => router.push('/settings')}>
            <Text style={styles.addAccountText}>Add GitHub Account</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Pending Files */}
      {hasFiles && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Files ({Object.keys(pendingFiles!).length})</Text>
          <ScrollView style={styles.fileList} nestedScrollEnabled>
            {Object.keys(pendingFiles!).map((file, i) => (
              <View key={i} style={styles.fileItem}>
                <Ionicons name="document-text" size={14} color="#A78BFA" />
                <Text style={styles.fileName}>{file}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Create & Push */}
      {!linkedRepo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create Repository</Text>
          <TextInput
            style={styles.input}
            placeholder="Repository name (e.g., my-awesome-app)"
            placeholderTextColor="#6B7280"
            value={repoName}
            onChangeText={setRepoName}
          />
          <TouchableOpacity 
            style={[styles.pushBtn, (!hasFiles || pushing) && styles.pushBtnDisabled]} 
            onPress={createAndPush}
            disabled={!hasFiles || pushing}
            data-testid="create-push-btn"
          >
            {pushing ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="rocket" size={20} color="#000" />
                <Text style={styles.pushBtnText}>Create & Push</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Linked Repo & Workflows */}
      {linkedRepo && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Linked Repository</Text>
            <TouchableOpacity 
              style={styles.linkedBox}
              onPress={() => Linking.openURL(`https://github.com/${linkedRepo}`)}
            >
              <Ionicons name="git-branch" size={20} color="#10B981" />
              <Text style={styles.linkedText}>{linkedRepo}</Text>
              <Ionicons name="open-outline" size={14} color="#10B981" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Build Status</Text>
              <TouchableOpacity onPress={loadWorkflows} disabled={loadingWorkflows}>
                <Ionicons name="refresh" size={20} color={loadingWorkflows ? '#6B7280' : '#A78BFA'} />
              </TouchableOpacity>
            </View>

            {loadingWorkflows && workflows.length === 0 ? (
              <ActivityIndicator color="#A78BFA" style={{ marginVertical: 20 }} />
            ) : workflows.length === 0 ? (
              <Text style={styles.noBuilds}>No builds yet. Push code to trigger a build.</Text>
            ) : (
              workflows.map((run) => (
                <View key={run.id}>
                  <TouchableOpacity 
                    style={styles.workflowItem}
                    onPress={() => fetchBuildLogs(run.id)}
                  >
                    <Ionicons 
                      name={getStatusIcon(run.status, run.conclusion) as any} 
                      size={24} 
                      color={getStatusColor(run.status, run.conclusion)} 
                    />
                    <View style={styles.workflowInfo}>
                      <Text style={styles.workflowName}>Build #{run.run_number}</Text>
                      <Text style={styles.workflowStatus}>
                        {run.status === 'in_progress' ? 'Building...' : run.conclusion || run.status}
                        {' | '}
                        {new Date(run.created_at).toLocaleString()}
                      </Text>
                    </View>
                    {run.status === 'in_progress' && (
                      <ActivityIndicator size="small" color="#F59E0B" />
                    )}
                    {run.conclusion === 'failure' && !autoFixing && (
                      <TouchableOpacity 
                        style={styles.autoFixBtn}
                        onPress={() => autoFixBuild(run)}
                        data-testid={`autofix-btn-${run.id}`}
                      >
                        <Ionicons name="build" size={14} color="#FFF" />
                        <Text style={styles.autoFixText}>Auto-Fix</Text>
                      </TouchableOpacity>
                    )}
                    {run.conclusion === 'success' && (
                      <TouchableOpacity 
                        style={styles.downloadBadge}
                        onPress={() => Linking.openURL(run.html_url)}
                      >
                        <Ionicons name="download" size={14} color="#10B981" />
                        <Text style={styles.downloadBadgeText}>APK</Text>
                      </TouchableOpacity>
                    )}
                    <Ionicons 
                      name={expandedLog === run.id ? 'chevron-up' : 'chevron-down'} 
                      size={16} 
                      color="#6B7280" 
                    />
                  </TouchableOpacity>

                  {/* Expanded Log */}
                  {expandedLog === run.id && (
                    <View style={styles.logBox}>
                      <Text style={styles.logTitle}>Build Logs:</Text>
                      <ScrollView style={styles.logScroll} nestedScrollEnabled>
                        <Text style={styles.logText} selectable>
                          {buildLogs[run.id] || 'Loading logs...'}
                        </Text>
                      </ScrollView>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>

          {/* Download Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Download APK</Text>
            <Text style={styles.downloadHint}>
              Successful build ke baad, APK GitHub Actions artifacts se download karo:
            </Text>
            <TouchableOpacity 
              style={styles.downloadBtn}
              onPress={() => linkedRepo && Linking.openURL(`https://github.com/${linkedRepo}/actions`)}
            >
              <Ionicons name="download" size={20} color="#A78BFA" />
              <Text style={styles.downloadBtnText}>Open GitHub Actions</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F', padding: 16 },
  section: { backgroundColor: '#12121A', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1F1F2E' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  accountBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F1F2E', padding: 12, borderRadius: 10, gap: 12 },
  accountInfo: { flex: 1 },
  accountName: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  accountStatus: { color: '#10B981', fontSize: 12 },
  addAccount: { backgroundColor: '#A78BFA', padding: 14, borderRadius: 10, alignItems: 'center' },
  addAccountText: { color: '#000', fontSize: 14, fontWeight: 'bold' },
  fileList: { maxHeight: 150 },
  fileItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  fileName: { color: '#D1D5DB', fontSize: 12, flex: 1 },
  input: { backgroundColor: '#1F1F2E', borderWidth: 1, borderColor: '#2D2D3D', borderRadius: 10, color: '#FFF', padding: 14, fontSize: 15, marginBottom: 12 },
  pushBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#A78BFA', padding: 14, borderRadius: 10, gap: 8 },
  pushBtnDisabled: { opacity: 0.5 },
  pushBtnText: { color: '#000', fontSize: 15, fontWeight: 'bold' },
  linkedBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#064E3B', padding: 12, borderRadius: 10, gap: 10 },
  linkedText: { color: '#10B981', fontSize: 14, fontWeight: '600', flex: 1 },
  noBuilds: { color: '#6B7280', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  workflowItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F1F2E', padding: 12, borderRadius: 10, marginBottom: 8, gap: 10 },
  workflowInfo: { flex: 1 },
  workflowName: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  workflowStatus: { color: '#9CA3AF', fontSize: 11, textTransform: 'capitalize', marginTop: 2 },
  autoFixBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#7C3AED', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, gap: 4 },
  autoFixText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  downloadBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#064E3B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  downloadBadgeText: { color: '#10B981', fontSize: 11, fontWeight: '600' },
  downloadHint: { color: '#9CA3AF', fontSize: 13, marginBottom: 12, lineHeight: 20 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#A78BFA', padding: 12, borderRadius: 10, gap: 8 },
  downloadBtnText: { color: '#A78BFA', fontSize: 14, fontWeight: '600' },
  fixBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C3AED', padding: 12, borderRadius: 12, marginBottom: 12, gap: 10 },
  fixBannerText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  logBox: { backgroundColor: '#0D0D14', borderRadius: 10, padding: 12, marginBottom: 8, marginTop: -4, borderWidth: 1, borderColor: '#1F1F2E' },
  logTitle: { color: '#6B7280', fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
  logScroll: { maxHeight: 200 },
  logText: { color: '#9CA3AF', fontSize: 10, fontFamily: 'monospace', lineHeight: 16 },
});
