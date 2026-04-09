# App Factory - AI-Powered Android App Builder

> **As powerful as Emergent** - A fully autonomous AI agent that builds Android apps

## Overview

App Factory is a powerful Android app that lets you build other Android apps using AI. Simply describe your app idea, and the AI agent will:
- Generate complete code
- Push to GitHub automatically
- Build APK & AAB via GitHub Actions
- Auto-debug and fix errors
- Test and validate the build

## Features

### AI Providers (Configurable in Settings)
- **Google Gemini** - Primary AI provider
- **Groq** - Fast inference
- **DeepSeek** - Advanced coding
- **Hugging Face** - Open source models
- **OpenRouter** - Multi-model access

### Autonomous Capabilities
- **Full Code Generation** - Complete React Native apps with all screens
- **Auto-Correction Mode** - Reads build errors and fixes automatically
- **Auto-Test Mode** - Tests via Expo and analyzes screenshots
- **Auto-Debug Mode** - Detects and fixes issues automatically
- **Screenshot Analysis** - Analyzes UI for errors
- **Video Analysis** - Watch bug videos and auto-fix

### Account Management (Settings)
- **Multiple GitHub Accounts** - Add/remove/switch accounts
- **Multiple Expo Accounts** - For testing and preview
- **Build Tools** - Firebase, Play Store, App Store credentials

### Build Pipeline
- **One-Click Push** - Push AI-generated code to GitHub
- **GitHub Actions** - Automatic APK/AAB builds on push
- **Build Status** - Track progress and download artifacts

## Project Structure

```
app-factory/
├── app/
│   ├── _layout.tsx        # Navigation layout
│   ├── index.tsx          # Main AI chat screen
│   ├── settings.tsx       # API keys & accounts configuration
│   ├── github.tsx         # GitHub dashboard
│   └── projects.tsx       # Project management
├── src/
│   ├── api/
│   │   ├── geminiApi.ts   # Multi-provider AI integration
│   │   └── githubApi.ts   # GitHub API with multi-account
│   └── store/
│       └── useStore.ts    # Zustand state (accounts, providers)
├── .github/
│   └── workflows/
│       └── build-android.yml  # GitHub Actions workflow
├── assets/                 # App icons and images
├── app.json               # Expo configuration
└── eas.json               # EAS Build configuration
```

## Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-username/app-factory.git
cd app-factory
yarn install
```

### 2. Configure API Keys (In App Settings)
- Open the app
- Go to **Settings**
- Add your AI provider API keys
- Add GitHub Personal Access Token
- (Optional) Add Expo credentials

### 3. Build APK
```bash
# Using Expo
npx expo prebuild --platform android
cd android
./gradlew assembleDebug

# Or push to GitHub for automated builds
git push origin main
```

## How to Get API Keys

| Provider | URL | Key Format |
|----------|-----|------------|
| Gemini | aistudio.google.com | `AIzaSy...` |
| Groq | console.groq.com | `gsk_...` |
| DeepSeek | platform.deepseek.com | `sk-...` |
| Hugging Face | huggingface.co/settings/tokens | `hf_...` |
| OpenRouter | openrouter.ai/keys | `sk-or-...` |
| GitHub | Settings → Developer → Tokens | `ghp_...` |

## GitHub Actions - Build Options

### Option 1: Simple Build (Recommended)
Uses `build-simple.yml` - most reliable for Expo SDK 54:
1. Go to **Actions** tab
2. Select **"Build APK (Simple)"**
3. Click **"Run workflow"**
4. Download APK from artifacts

### Option 2: EAS Build (For Expo Account)
Uses `build-eas.yml` - requires EXPO_TOKEN secret:
1. Create account on expo.dev
2. Get token from expo.dev/settings/access-tokens
3. Add `EXPO_TOKEN` secret in repo settings
4. Run the workflow

### Option 3: Standard Build
Uses `build-android.yml` - may have Kotlin compatibility issues

**Note**: If build fails with "Unresolved reference" errors, use Option 1.

Download your APK from **Actions → [Workflow] → Artifacts**

## Usage

### Build an App
1. Describe your app: *"Build a todo app with dark mode"*
2. AI generates complete code
3. Review & push to GitHub
4. Download APK from GitHub Actions

### Fix Errors
1. If build fails, AI reads error logs
2. Auto-generates fixed code
3. Push again for new build

### Attach Media
- **Screenshot**: AI clones the UI design
- **Video**: AI watches bug and fixes it

## Tech Stack

- **Frontend**: React Native + Expo Router
- **State**: Zustand
- **AI**: Multiple providers (Gemini, Groq, DeepSeek, HuggingFace, OpenRouter)
- **Build**: EAS Build + GitHub Actions

## License

MIT License - Build freely!

---

Built with ❤️ - As powerful as Emergent
