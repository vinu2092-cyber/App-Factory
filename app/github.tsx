import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useStore } from '../src/store/useStore';
import { useRouter } from 'expo-router';
import {
  getRepositories,
  createRepository,
  pushFiles,
  getWorkflowRuns,
  setupGitHubActionsWorkflow,
  Repository,
  WorkflowRun,
} from '../src/api/githubApi';
import { Ionicons, Feather } from '@expo/vector-icons';

export default function GitHubDashboard() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [newRepoName, setNewRepoName] = useState('');
  const [commitMessage, setCommitMessage] = useState('Update via App Factory AI');
  const [pushing, setPushing] = useState(false);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [showNewRepo, setShowNewRepo] = useState(false);
  const [creatingRepo, setCreatingRepo] = useState(false);

  const { pendingFiles, setPendingFiles, linkedRepo, setLinkedRepo, settings } = useStore();
  const router = useRouter();

  const fetchRepos = useCallback(async () => {
    if (!settings.githubToken) {
      setLoading(false);
      return;
    }
    try {
      const data = await getRepositories();
      setRepos(data);
    } catch (error: any) {
      console.error('Failed to fetch repos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [settings.githubToken]);

  const fetchWorkflows = useCallback(async (repoFullName: string) => {
    try {
      const runs = await getWorkflowRuns(repoFullName);
      setWorkflowRuns(runs);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    }
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  useEffect(() => {
    if (selectedRepo) {
      fetchWorkflows(selectedRepo.full_name);
    }
  }, [selectedRepo, fetchWorkflows]);

  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) {
      Alert.alert('Error', 'Please enter a repository name');
      return;
    }
    setCreatingRepo(true);
    try {
      const repo = await createRepository(newRepoName.trim());
      await setupGitHubActionsWorkflow(repo.full_name);
      setRepos([repo, ...repos]);
      setSelectedRepo(repo);
      setNewRepoName('');
      setShowNewRepo(false);
      Alert.alert('✅ Success', `Repository "${repo.name}" created with build workflow!`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create repository');
    } finally {
      setCreatingRepo(false);
    }
  };

  const handlePush = async () => {
    if (!selectedRepo) {
      Alert.alert('Error', 'Please select a repository');
      return;
    }
    if (!pendingFiles || Object.keys(pendingFiles).length === 0) {
      Alert.alert('Error', 'No files to push');
      return;
    }

    setPushing(true);
    try {
      await pushFiles(selectedRepo.full_name, pendingFiles, commitMessage);
      setPendingFiles(null);
      Alert.alert(
        '🚀 Push Successful!',
        `Code pushed to ${selectedRepo.name}. GitHub Actions will build APK/AAB automatically.`,
        [
          { text: 'View Builds', onPress: () => fetchWorkflows(selectedRepo.full_name) },
          { text: 'Done', onPress: () => router.back() },
        ]
      );
    } catch (error: any) {
      Alert.alert('Push Failed', error.message || 'Failed to push files');
    } finally {
      setPushing(false);
    }
  };

  const handleLinkRepo = (repo: Repository) => {
    setLinkedRepo(repo.full_name);
    Alert.alert('🔗 Repository Linked', `AI can now read files from ${repo.name}`);
  };

  const getStatusIcon = (conclusion: string | null, status: string) => {
    if (status === 'in_progress' || status === 'queued') {
      return <Ionicons name="time" size={16} color="#F59E0B" />;
    }
    if (conclusion === 'success') {
      return <Ionicons name="checkmark-circle" size={16} color="#10B981" />;
    }
    if (conclusion === 'failure') {
      return <Ionicons name="close-circle" size={16} color="#EF4444" />;
    }
    return <Ionicons name="time" size={16} color="#6B7280" />;
  };

  if (!settings.githubToken) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="logo-github" size={48} color="#6B7280" />
        <Text style={styles.emptyTitle}>GitHub Not Configured</Text>
        <Text style={styles.emptyDesc}>
          Add your GitHub Personal Access Token in Settings to manage repositories.
        </Text>
        <TouchableOpacity
          style={styles.configButton}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.configButtonText}>Configure GitHub</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A78BFA" />
        <Text style={styles.loadingText}>Loading repositories...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchRepos(); }}
          tintColor="#A78BFA"
        />
      }
    >
      {/* Pending Files Card */}
      {pendingFiles && Object.keys(pendingFiles).length > 0 && (
        <View style={styles.pendingCard}>
          <View style={styles.pendingHeader}>
            <Feather name="file-text" size={24} color="#10B981" />
            <View style={styles.pendingInfo}>
              <Text style={styles.pendingTitle}>📦 Ready to Push!</Text>
              <Text style={styles.pendingCount}>
                {Object.keys(pendingFiles).length} files generated by AI
              </Text>
            </View>
          </View>
          <View style={styles.pendingFiles}>
            {Object.keys(pendingFiles).slice(0, 5).map((file, i) => (
              <Text key={i} style={styles.pendingFileName}>• {file}</Text>
            ))}
            {Object.keys(pendingFiles).length > 5 && (
              <Text style={styles.pendingMore}>
                +{Object.keys(pendingFiles).length - 5} more
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Create New Repository */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setShowNewRepo(!showNewRepo)}
        >
          <Ionicons name="add" size={20} color="#A78BFA" />
          <Text style={styles.sectionTitle}>Create New Repository</Text>
        </TouchableOpacity>

        {showNewRepo && (
          <View style={styles.newRepoForm}>
            <TextInput
              style={styles.input}
              placeholder="my-awesome-app"
              placeholderTextColor="#6B7280"
              value={newRepoName}
              onChangeText={setNewRepoName}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.createButton, creatingRepo && styles.buttonDisabled]}
              onPress={handleCreateRepo}
              disabled={creatingRepo}
            >
              {creatingRepo ? (
                <ActivityIndicator color="#0A0A0F" size="small" />
              ) : (
                <>
                  <Ionicons name="rocket" size={18} color="#0A0A0F" />
                  <Text style={styles.createButtonText}>Create with Workflow</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Repository List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="git-branch" size={20} color="#A78BFA" />
          <Text style={styles.sectionTitle}>Your Repositories</Text>
        </View>

        {repos.map((repo) => (
          <TouchableOpacity
            key={repo.id}
            style={[
              styles.repoCard,
              selectedRepo?.id === repo.id && styles.repoCardSelected,
            ]}
            onPress={() => setSelectedRepo(repo)}
          >
            <View style={styles.repoInfo}>
              <Ionicons
                name="logo-github"
                size={20}
                color={selectedRepo?.id === repo.id ? '#A78BFA' : '#6B7280'}
              />
              <View style={styles.repoDetails}>
                <Text
                  style={[
                    styles.repoName,
                    selectedRepo?.id === repo.id && styles.repoNameSelected,
                  ]}
                >
                  {repo.name}
                </Text>
                <Text style={styles.repoMeta}>
                  {repo.private ? '🔒 Private' : '🌐 Public'} • Updated{' '}
                  {new Date(repo.updated_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.linkButton,
                linkedRepo === repo.full_name && styles.linkButtonActive,
              ]}
              onPress={() => handleLinkRepo(repo)}
            >
              <Ionicons
                name="link"
                size={14}
                color={linkedRepo === repo.full_name ? '#0A0A0F' : '#A78BFA'}
              />
              <Text
                style={[
                  styles.linkButtonText,
                  linkedRepo === repo.full_name && styles.linkButtonTextActive,
                ]}
              >
                {linkedRepo === repo.full_name ? 'Linked' : 'Link'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>

      {/* Workflow Runs */}
      {selectedRepo && workflowRuns.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="construct" size={20} color="#A78BFA" />
            <Text style={styles.sectionTitle}>Build History</Text>
            <TouchableOpacity onPress={() => fetchWorkflows(selectedRepo.full_name)}>
              <Ionicons name="refresh" size={18} color="#A78BFA" />
            </TouchableOpacity>
          </View>

          {workflowRuns.slice(0, 5).map((run) => (
            <View key={run.id} style={styles.workflowCard}>
              {getStatusIcon(run.conclusion, run.status)}
              <View style={styles.workflowInfo}>
                <Text style={styles.workflowName}>{run.name}</Text>
                <Text style={styles.workflowDate}>
                  {new Date(run.created_at).toLocaleString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.workflowStatus,
                  run.conclusion === 'success' && styles.statusSuccess,
                  run.conclusion === 'failure' && styles.statusFailed,
                ]}
              >
                {run.conclusion || run.status}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Push Section */}
      {pendingFiles && selectedRepo && (
        <View style={styles.pushSection}>
          <Text style={styles.pushLabel}>Commit Message</Text>
          <TextInput
            style={styles.input}
            value={commitMessage}
            onChangeText={setCommitMessage}
            placeholder="Describe your changes..."
            placeholderTextColor="#6B7280"
          />
          <TouchableOpacity
            style={[styles.pushButton, pushing && styles.buttonDisabled]}
            onPress={handlePush}
            disabled={pushing}
          >
            {pushing ? (
              <ActivityIndicator color="#0A0A0F" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#0A0A0F" />
                <Text style={styles.pushButtonText}>Push & Build APK</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  configButton: {
    backgroundColor: '#A78BFA',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  configButtonText: {
    color: '#0A0A0F',
    fontWeight: 'bold',
    fontSize: 15,
  },
  pendingCard: {
    backgroundColor: '#064E3B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingTitle: {
    color: '#A7F3D0',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pendingCount: {
    color: '#6EE7B7',
    fontSize: 13,
  },
  pendingFiles: {
    marginLeft: 36,
  },
  pendingFileName: {
    color: '#A7F3D0',
    fontSize: 12,
    marginBottom: 2,
  },
  pendingMore: {
    color: '#6EE7B7',
    fontSize: 11,
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#12121A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F1F2E',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  newRepoForm: {
    gap: 12,
  },
  input: {
    backgroundColor: '#1F1F2E',
    borderWidth: 1,
    borderColor: '#2D2D3D',
    borderRadius: 10,
    color: '#FFFFFF',
    padding: 14,
    fontSize: 15,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A78BFA',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  createButtonText: {
    color: '#0A0A0F',
    fontWeight: 'bold',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  repoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F1F2E',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2D2D3D',
  },
  repoCardSelected: {
    borderColor: '#A78BFA',
    backgroundColor: '#2D2D4A',
  },
  repoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  repoDetails: {
    flex: 1,
  },
  repoName: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '600',
  },
  repoNameSelected: {
    color: '#A78BFA',
  },
  repoMeta: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A78BFA',
    gap: 4,
  },
  linkButtonActive: {
    backgroundColor: '#A78BFA',
  },
  linkButtonText: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '600',
  },
  linkButtonTextActive: {
    color: '#0A0A0F',
  },
  workflowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F2E',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  workflowInfo: {
    flex: 1,
  },
  workflowName: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '500',
  },
  workflowDate: {
    color: '#6B7280',
    fontSize: 11,
  },
  workflowStatus: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusSuccess: {
    color: '#10B981',
  },
  statusFailed: {
    color: '#EF4444',
  },
  pushSection: {
    backgroundColor: '#12121A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A78BFA',
  },
  pushLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  pushButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A78BFA',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  pushButtonText: {
    color: '#0A0A0F',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
