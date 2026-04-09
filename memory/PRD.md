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

### API Reliability Improvements (April 9, 2026)
- **Auto-Retry with Exponential Backoff**: If API fails, automatically retries up to 3 times with increasing delays
- **Backup Model Fallback**: If gemini-2.0-flash fails, automatically tries gemini-1.5-flash
- **Multi-Provider Fallback**: If all Gemini retries fail, tries other configured providers (Groq, DeepSeek, etc.)
- **Better Error Messages**: Hindi mein clear error messages with suggestions

### Real-time Progress Feature (April 9, 2026)
- **Live Progress Panel**: Shows what AI is doing in real-time
- **Step-by-step logging**: Each file creation, edit, push shown
- **Live GitHub Push Toggle**: Toggle to push files to GitHub as they are created
- **Progress status in chat**: Status updates visible in chat
- **Files created**: Shows which files are being generated
- **GitHub commits**: Real-time commits for each file

### Voice Input Feature (April 9, 2026)
- **Mic button**: Red mic button in input area
- **Hindi/English support**: Speak in any language
- **Auto transcription**: Gemini transcribes voice to text
- **Auto processing**: After recording, AI processes the command
- **Recording indicator**: Shows recording duration and status
- **Cancel option**: Can cancel recording anytime

### Settings Improvements (April 9, 2026)
- **Groq recommendation banner**: Prominent banner to add Groq as backup
- **Auto-fallback info**: Shows that multiple providers enable fallback
