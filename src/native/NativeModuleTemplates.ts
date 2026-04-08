/**
 * NATIVE MODULE TEMPLATES
 * 
 * Complete templates for:
 * 1. System Overlay (Floating Window) - SYSTEM_ALERT_WINDOW
 * 2. Native Android Service (Java/Kotlin)
 * 3. WindowManager API
 * 4. Foreground Service
 * 5. Custom Native Module Bridge
 */

// ===========================================
// ANDROID MANIFEST PERMISSIONS
// ===========================================

export const AndroidManifestPermissions = {
  systemOverlay: `
    <!-- System Overlay Permission for Floating Windows -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
    <uses-permission android:name="android.permission.ACTION_MANAGE_OVERLAY_PERMISSION"/>
`,

  foregroundService: `
    <!-- Foreground Service Permissions -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC"/>
    <uses-permission android:name="android.permission.WAKE_LOCK"/>
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
`,

  fullNetwork: `
    <!-- Network Permissions -->
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>
`,
};

// ===========================================
// SYSTEM OVERLAY SERVICE (JAVA)
// ===========================================

export const OverlayServiceJava = `
package com.appfactory.overlay;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

public class OverlayService extends Service {
    private WindowManager windowManager;
    private View overlayView;
    private WindowManager.LayoutParams params;
    private float initialX, initialY;
    private float initialTouchX, initialTouchY;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        
        // Create overlay view
        overlayView = createOverlayView();
        
        // Window parameters
        int layoutFlag;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
        }
        
        params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );
        
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 0;
        params.y = 100;
        
        // Add touch listener for drag
        overlayView.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        params.x = (int) (initialX + (event.getRawX() - initialTouchX));
                        params.y = (int) (initialY + (event.getRawY() - initialTouchY));
                        windowManager.updateViewLayout(overlayView, params);
                        return true;
                }
                return false;
            }
        });
        
        windowManager.addView(overlayView, params);
    }
    
    private View createOverlayView() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setBackgroundColor(Color.parseColor("#1F1F2E"));
        layout.setPadding(24, 16, 24, 16);
        
        TextView titleText = new TextView(this);
        titleText.setText("App Factory Overlay");
        titleText.setTextColor(Color.WHITE);
        titleText.setTextSize(16);
        
        TextView contentText = new TextView(this);
        contentText.setText("Drag to move");
        contentText.setTextColor(Color.parseColor("#9CA3AF"));
        contentText.setTextSize(12);
        
        layout.addView(titleText);
        layout.addView(contentText);
        
        return layout;
    }
    
    public void updateContent(String title, String content) {
        if (overlayView != null && overlayView instanceof LinearLayout) {
            LinearLayout layout = (LinearLayout) overlayView;
            if (layout.getChildCount() >= 2) {
                ((TextView) layout.getChildAt(0)).setText(title);
                ((TextView) layout.getChildAt(1)).setText(content);
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (overlayView != null) {
            windowManager.removeView(overlayView);
        }
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String title = intent.getStringExtra("title");
            String content = intent.getStringExtra("content");
            if (title != null && content != null) {
                updateContent(title, content);
            }
        }
        return START_STICKY;
    }
}
`;

// ===========================================
// FOREGROUND SERVICE (JAVA)
// ===========================================

export const ForegroundServiceJava = `
package com.appfactory.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import androidx.core.app.NotificationCompat;

public class AppFactoryForegroundService extends Service {
    private static final String CHANNEL_ID = "AppFactoryServiceChannel";
    private static final int NOTIFICATION_ID = 1001;
    private Handler handler;
    private Runnable runnable;
    private boolean isRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        handler = new Handler(Looper.getMainLooper());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        
        if ("STOP".equals(action)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        
        String title = intent != null ? intent.getStringExtra("title") : "App Factory";
        String content = intent != null ? intent.getStringExtra("content") : "Running in background";
        
        Notification notification = createNotification(title, content);
        startForeground(NOTIFICATION_ID, notification);
        
        // Start background task
        startBackgroundTask();
        
        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "App Factory Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps App Factory running in background");
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification(String title, String content) {
        Intent stopIntent = new Intent(this, AppFactoryForegroundService.class);
        stopIntent.setAction("STOP");
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent, PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .addAction(android.R.drawable.ic_delete, "Stop", stopPendingIntent)
            .setOngoing(true)
            .build();
    }
    
    private void startBackgroundTask() {
        if (isRunning) return;
        isRunning = true;
        
        runnable = new Runnable() {
            @Override
            public void run() {
                // Your background task logic here
                // This runs every 10 seconds
                
                if (isRunning) {
                    handler.postDelayed(this, 10000);
                }
            }
        };
        
        handler.post(runnable);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isRunning = false;
        if (handler != null && runnable != null) {
            handler.removeCallbacks(runnable);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
`;

// ===========================================
// NATIVE MODULE BRIDGE (JAVA)
// ===========================================

export const NativeModuleBridgeJava = `
package com.appfactory.modules;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

import com.appfactory.overlay.OverlayService;
import com.appfactory.services.AppFactoryForegroundService;

@ReactModule(name = AppFactoryModule.NAME)
public class AppFactoryModule extends ReactContextBaseJavaModule {
    public static final String NAME = "AppFactoryModule";
    private final ReactApplicationContext reactContext;

    public AppFactoryModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return NAME;
    }

    // ========== OVERLAY METHODS ==========
    
    @ReactMethod
    public void checkOverlayPermission(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(reactContext));
        } else {
            promise.resolve(true);
        }
    }

    @ReactMethod
    public void requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + reactContext.getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
        }
    }

    @ReactMethod
    public void startOverlay(String title, String content) {
        Intent intent = new Intent(reactContext, OverlayService.class);
        intent.putExtra("title", title);
        intent.putExtra("content", content);
        reactContext.startService(intent);
    }

    @ReactMethod
    public void stopOverlay() {
        Intent intent = new Intent(reactContext, OverlayService.class);
        reactContext.stopService(intent);
    }

    @ReactMethod
    public void updateOverlay(String title, String content) {
        Intent intent = new Intent(reactContext, OverlayService.class);
        intent.putExtra("title", title);
        intent.putExtra("content", content);
        reactContext.startService(intent);
    }

    // ========== FOREGROUND SERVICE METHODS ==========

    @ReactMethod
    public void startForegroundService(String title, String content) {
        Intent intent = new Intent(reactContext, AppFactoryForegroundService.class);
        intent.putExtra("title", title);
        intent.putExtra("content", content);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent);
        } else {
            reactContext.startService(intent);
        }
    }

    @ReactMethod
    public void stopForegroundService() {
        Intent intent = new Intent(reactContext, AppFactoryForegroundService.class);
        intent.setAction("STOP");
        reactContext.startService(intent);
    }
}
`;

// ===========================================
// NATIVE MODULE PACKAGE (JAVA)
// ===========================================

export const NativeModulePackageJava = `
package com.appfactory.modules;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class AppFactoryPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new AppFactoryModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;

// ===========================================
// REACT NATIVE BRIDGE (TypeScript)
// ===========================================

export const NativeModuleBridgeTS = `
/**
 * App Factory Native Module Bridge
 * 
 * Provides React Native interface to:
 * - System Overlay (Floating Windows)
 * - Foreground Services
 * - Native Android APIs
 */

import { NativeModules, Platform, Linking, Alert } from 'react-native';

const { AppFactoryModule } = NativeModules;

// ===========================================
// OVERLAY MANAGER
// ===========================================

export const OverlayManager = {
  /**
   * Check if overlay permission is granted
   */
  async checkPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    try {
      return await AppFactoryModule.checkOverlayPermission();
    } catch (error) {
      console.error('Overlay permission check failed:', error);
      return false;
    }
  },

  /**
   * Request overlay permission (opens system settings)
   */
  async requestPermission(): Promise<void> {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Supported', 'Overlay is only supported on Android');
      return;
    }

    const hasPermission = await this.checkPermission();
    if (hasPermission) {
      Alert.alert('Permission Granted', 'You already have overlay permission');
      return;
    }

    Alert.alert(
      'Permission Required',
      'Please enable "Display over other apps" permission for App Factory',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => AppFactoryModule.requestOverlayPermission() 
        },
      ]
    );
  },

  /**
   * Start overlay with given content
   */
  async start(title: string, content: string): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      await this.requestPermission();
      return false;
    }

    try {
      AppFactoryModule.startOverlay(title, content);
      return true;
    } catch (error) {
      console.error('Failed to start overlay:', error);
      return false;
    }
  },

  /**
   * Stop overlay
   */
  stop(): void {
    if (Platform.OS !== 'android') return;
    
    try {
      AppFactoryModule.stopOverlay();
    } catch (error) {
      console.error('Failed to stop overlay:', error);
    }
  },

  /**
   * Update overlay content
   */
  update(title: string, content: string): void {
    if (Platform.OS !== 'android') return;
    
    try {
      AppFactoryModule.updateOverlay(title, content);
    } catch (error) {
      console.error('Failed to update overlay:', error);
    }
  },
};

// ===========================================
// FOREGROUND SERVICE MANAGER
// ===========================================

export const ForegroundServiceManager = {
  /**
   * Start foreground service
   */
  start(title: string, content: string): void {
    if (Platform.OS !== 'android') {
      console.warn('Foreground service is only supported on Android');
      return;
    }

    try {
      AppFactoryModule.startForegroundService(title, content);
    } catch (error) {
      console.error('Failed to start foreground service:', error);
    }
  },

  /**
   * Stop foreground service
   */
  stop(): void {
    if (Platform.OS !== 'android') return;

    try {
      AppFactoryModule.stopForegroundService();
    } catch (error) {
      console.error('Failed to stop foreground service:', error);
    }
  },
};

// ===========================================
// EXAMPLE USAGE
// ===========================================

/*
// Start floating overlay
await OverlayManager.start('Score', 'Team A: 5 | Team B: 3');

// Update overlay
OverlayManager.update('Score', 'Team A: 6 | Team B: 3');

// Stop overlay
OverlayManager.stop();

// Start foreground service
ForegroundServiceManager.start('App Factory', 'Running in background...');

// Stop foreground service
ForegroundServiceManager.stop();
*/
`;

// ===========================================
// ANDROID MANIFEST SERVICE DECLARATIONS
// ===========================================

export const AndroidManifestServices = `
        <!-- Overlay Service -->
        <service
            android:name="com.appfactory.overlay.OverlayService"
            android:enabled="true"
            android:exported="false" />

        <!-- Foreground Service -->
        <service
            android:name="com.appfactory.services.AppFactoryForegroundService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="dataSync" />

        <!-- Boot Receiver for auto-start -->
        <receiver
            android:name="com.appfactory.receivers.BootReceiver"
            android:enabled="true"
            android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>
`;

// ===========================================
// MAIN APPLICATION REGISTRATION
// ===========================================

export const MainApplicationUpdate = `
// Add to MainApplication.java in getPackages() method:

import com.appfactory.modules.AppFactoryPackage;

@Override
protected List<ReactPackage> getPackages() {
    List<ReactPackage> packages = new PackageList(this).getPackages();
    packages.add(new AppFactoryPackage()); // Add this line
    return packages;
}
`;

export default {
  AndroidManifestPermissions,
  AndroidManifestServices,
  OverlayServiceJava,
  ForegroundServiceJava,
  NativeModuleBridgeJava,
  NativeModulePackageJava,
  NativeModuleBridgeTS,
  MainApplicationUpdate,
};
