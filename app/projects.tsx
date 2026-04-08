import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useStore, Project } from '../src/store/useStore';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';

export default function ProjectsScreen() {
  const { projects, activeProject, setActiveProject } = useStore();
  const router = useRouter();

  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'building':
        return <Ionicons name="sync" size={18} color="#F59E0B" />;
      case 'success':
        return <Ionicons name="checkmark-circle" size={18} color="#10B981" />;
      case 'failed':
        return <Ionicons name="close-circle" size={18} color="#EF4444" />;
      default:
        return <Ionicons name="time" size={18} color="#6B7280" />;
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'building':
        return '#F59E0B';
      case 'success':
        return '#10B981';
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.infoCard}>
        <Ionicons name="folder-open" size={24} color="#A78BFA" />
        <View style={styles.infoText}>
          <Text style={styles.infoTitle}>Your Projects</Text>
          <Text style={styles.infoDesc}>
            Projects are created when you push code to GitHub. Track build status here.
          </Text>
        </View>
      </View>

      {/* New Project Button */}
      <TouchableOpacity
        style={styles.newProjectButton}
        onPress={() => {
          router.back();
          Alert.alert(
            '🚀 Create New Project',
            'Describe your app idea in the chat and push to GitHub to create a project.'
          );
        }}
      >
        <Ionicons name="add" size={20} color="#A78BFA" />
        <Text style={styles.newProjectText}>Start New Project</Text>
      </TouchableOpacity>

      {/* Projects List */}
      {projects.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={48} color="#4B5563" />
          <Text style={styles.emptyTitle}>No Projects Yet</Text>
          <Text style={styles.emptyDesc}>
            Start by describing your app idea to the AI, then push to GitHub.
          </Text>
        </View>
      ) : (
        projects.map((project) => (
          <TouchableOpacity
            key={project.id}
            style={[
              styles.projectCard,
              activeProject?.id === project.id && styles.projectCardActive,
            ]}
            onPress={() => setActiveProject(project)}
          >
            <View style={styles.projectHeader}>
              {getStatusIcon(project.status)}
              <View style={styles.projectInfo}>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectRepo}>{project.repoName}</Text>
              </View>
              <Text style={[styles.projectStatus, { color: getStatusColor(project.status) }]}>
                {project.status}
              </Text>
            </View>

            {project.description && (
              <Text style={styles.projectDescription}>{project.description}</Text>
            )}

            <View style={styles.projectFooter}>
              <Text style={styles.projectDate}>
                Updated: {new Date(project.updatedAt).toLocaleDateString()}
              </Text>
              {project.lastBuildUrl && (
                <TouchableOpacity style={styles.viewBuildButton}>
                  <Ionicons name="open-outline" size={14} color="#A78BFA" />
                  <Text style={styles.viewBuildText}>View Build</Text>
                </TouchableOpacity>
              )}
            </View>

            {project.lastError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>⚠️ Last Error:</Text>
                <Text style={styles.errorText} numberOfLines={3}>
                  {project.lastError}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#12121A',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F1F2E',
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 20,
  },
  newProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F1F2E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A78BFA',
    borderStyle: 'dashed',
    gap: 8,
  },
  newProjectText: {
    color: '#A78BFA',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },
  projectCard: {
    backgroundColor: '#12121A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F1F2E',
  },
  projectCardActive: {
    borderColor: '#A78BFA',
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  projectRepo: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  projectStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  projectDescription: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  projectFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F1F2E',
  },
  projectDate: {
    color: '#6B7280',
    fontSize: 12,
  },
  viewBuildButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewBuildText: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#7F1D1D',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorTitle: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  errorText: {
    color: '#FEE2E2',
    fontSize: 11,
    lineHeight: 16,
  },
});
