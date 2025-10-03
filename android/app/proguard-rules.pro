# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ADD these rules for APK audio support
# Keep expo-av classes
-keep class expo.modules.av.** { *; }
-keep class expo.modules.av.player.** { *; }

# Keep React Native audio classes
-keep class com.facebook.react.modules.** { *; }
-keep class com.facebook.react.bridge.** { *; }

# Keep Android media classes
-keep class android.media.** { *; }
-keep class androidx.media.** { *; }

# Keep ExoPlayer classes (used by expo-av)
-keep class com.google.android.exoplayer2.** { *; }

# Keep file system classes
-keep class expo.modules.filesystem.** { *; }

# Don't obfuscate audio-related classes
-keepclassmembers class * {
    native <methods>;
}

# Keep JavaScript bridge methods
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# Add any project specific keep options here:
