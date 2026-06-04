# ============================================================
# HiTasky — R8 / ProGuard keep rules (Phase 4.2)
#
# In the Expo managed workflow there is no android/ folder checked in.
# Feed these rules to the generated project via expo-build-properties:
#
#   ["expo-build-properties", {
#     "android": {
#       "enableProguardInReleaseBuilds": true,
#       "enableShrinkResourcesInReleaseBuilds": true,
#       "extraProguardRules": "<contents of this file>"
#     }
#   }]
#
# (Or paste these lines directly into the plugin's extraProguardRules.)
# Keep this file as the source of truth and copy it in.
# ============================================================

# ---- React Native / Hermes / JSI ----
-keep,allowobfuscation class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**

# ---- Keep annotations & generics (needed by reflection-based libs) ----
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# ---- Room (only relevant if you migrate to a native Room DB) ----
-keep class * extends androidx.room.RoomDatabase { *; }
-keep @androidx.room.Entity class * { *; }
-dontwarn androidx.room.paging.**

# ---- SQLCipher (Phase 2.2 encrypted DB) ----
-keep class net.sqlcipher.** { *; }
-keep class net.sqlcipher.database.** { *; }
-dontwarn net.sqlcipher.**

# ---- Google Play Billing + react-native-iap ----
-keep class com.android.vending.billing.** { *; }
-keep class com.android.billingclient.api.** { *; }
-keep class com.dooboolab.** { *; }            # react-native-iap (RNIap)
-dontwarn com.android.billingclient.**

# ---- Firebase (Analytics + Crashlytics) ----
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**
# Crashlytics needs line numbers + source file to symbolicate stacks.
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception

# ---- Lottie (if/when added for animations) ----
-keep class com.airbnb.lottie.** { *; }
-dontwarn com.airbnb.lottie.**

# ---- jail-monkey (root detection) ----
-keep class com.gantix.JailMonkey.** { *; }

# ---- jsrsasign is pure JS (bundled by Metro) — no native rules needed.

# ---- Strip Android Log.* calls in release (belt-and-suspenders;
#      Babel already strips console.* — see babel.config.js) ----
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}
