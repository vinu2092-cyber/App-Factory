# App Factory - Product Requirements Document

## Original Problem Statement
App Factory - Android mobile app jo Android mobile apps build karegi. User app idea bataye, AI code generate kare, GitHub repo bane aur code push ho, GitHub Actions se APK build ho.

## Architecture
- **Platform**: React Native + Expo
- **State Management**: Zustand
- **AI**: Multiple providers (Gemini, Groq, DeepSeek, HuggingFace, OpenRouter)
- **Build**: GitHub Actions + EAS Build

## User Personas
1. **Non-Technical User**: App idea batata hai, code generate hota hai, one-click build
2. **Developer**: Code review, modifications, GitHub integration

## Core Requirements (Static)
- Multi-file project generation via AI
- GitHub auto-push
- GitHub Actions APK build
- Self-healing builds (auto-fix errors)
- Import/Export from GitHub repos
- Multiple account management (AI, GitHub, Expo)

## What's Been Implemented

### April 9, 2026 - Previous Agent Work
- Complete App Factory app structure
- AgenticEngine with FileSystemManager, GitHubAutonomousService
- Autonomous build with self-healing
- Multi-provider AI support
- Native module integration (Overlay, Foreground Service)
- Project management

### April 9, 2026 - Current Session (Continuation)
- **AgenticEngine.ts**:
  - Added `getRepoFiles()` - Import all files from GitHub repo
  - Added `listUserRepos()` - List user's repos for import selection
  - Added `getRepoInfo()` - Get repo metadata
  - Added `decodeBase64()` helper for React Native compatibility
  
- **index.tsx**:
  - Added Import Modal UI
  - Added `loadUserRepos()` - Load repos from GitHub
  - Added `importRepo()` - Import selected repo files
  - Added Import button in header (green cloud-download icon)
  - Full import flow: repos list -> select -> import files -> show in pending

- **MediaService.ts** (New):
  - `pickImage()` - Gallery se image select
  - `pickVideo()` - Gallery se video select  
  - `pickAudio()` - Files se audio select
  - `takePhoto()` - Camera se photo capture
  - `exportProjectToStorage()` - Project files device mein save
  - `downloadAPKFromGitHub()` - GitHub Actions se APK download
  - `prepareMediaForAI()` - Media ko AI analysis ke liye prepare

- **geminiApi.ts** - Media Analysis Functions:
  - `analyzeScreenshot()` - Screenshot se bugs/errors detect
  - `analyzeVideo()` - Video recording se bug reproduction analyze
  - `analyzeVoice()` - Voice command transcribe aur process
  - `analyzeWithMedia()` - Multi-modal analysis (text + media)

- **index.tsx** - Media UI:
  - Media attach button (paperclip icon)
  - Media menu modal (image, video, audio, camera options)
  - Attached media preview
  - Export Project option
  - Download APK option
  - Progress bar for downloads

## Feature Status
| Feature | Status |
|---------|--------|
| AI Code Generation | Complete |
| GitHub Push | Complete |
| GitHub Actions Build | Complete |
| Self-Healing | Complete |
| GitHub Import | Complete |
| Native Modules | Complete |
| Multi-Account | Complete |
| Screenshot Analysis | Complete |
| Video Bug Detection | Complete |
| Voice Commands | Complete |
| Export to Storage | Complete |
| APK Download | Complete |

## P0 (Critical) - Done
- [x] AI code generation
- [x] GitHub auto-push
- [x] Build monitoring
- [x] Import from GitHub
- [x] Media analysis (Screenshot, Video, Voice)
- [x] Export project to storage
- [x] APK download from GitHub

## P1 (Next)
- [ ] Real-time voice recording
- [ ] Build notifications
- [ ] Share APK directly

## P2 (Future)
- [ ] Play Store integration
- [ ] Firebase integration
- [ ] Collaboration features

## Technical Notes
- Base64 decoding uses custom function for React Native compatibility (no Buffer)
- Lazy loading for AI and Engine modules to improve startup time
- Gemini Vision API used for screenshot/video/audio analysis
- expo-image-picker for media selection
- expo-file-system for storage operations
