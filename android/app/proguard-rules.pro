# Capacitor core + plugin discovery (reflection)
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers @com.getcapacitor.annotation.CapacitorPlugin class * {
    @com.getcapacitor.PluginMethod <methods>;
}
-keep class * extends com.getcapacitor.Plugin { *; }
-keep class org.apache.cordova.** { *; }

# Firebase Messaging + GMS (Google Sign-In) — invoked via reflection.
-keep class * extends com.google.firebase.messaging.FirebaseMessagingService { *; }
-keep class com.google.firebase.iid.** { *; }
-keep class com.google.android.gms.** { *; }
-keep class com.google.firebase.** { *; }

# Important Capacitor Plugins Namespaces
-keep class com.getcapacitor.community.** { *; }
-keep class io.capawesome.** { *; }
-keep class com.codetrixstudio.** { *; }
-keep class ee.forgr.audio.** { *; }
-keep class com.capacitorjs.plugins.** { *; }
-keep class com.tchvu3.** { *; }
-keep class com.aparajita.** { *; }
-keep class com.capgo.** { *; }

# Firebase Kotlin extensions (ktx) — required for Firebase Installations
-keep class com.google.firebase.ktx.** { *; }
-keep class com.google.firebase.installations.ktx.** { *; }
-keep class com.google.firebase.messaging.ktx.** { *; }
-keep class com.google.firebase.common.ktx.** { *; }


# WebView JS bridge
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }

# Symbolication attributes for Play Console / Crashlytics
-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod
-renamesourcefileattribute SourceFile

# Aggressive optimizations
-allowaccessmodification
-repackageclasses ''

# Silence warnings from optional transitive deps
-dontwarn org.slf4j.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
# Firebase KTX may reference classes not present in stripped builds.
-dontwarn com.google.firebase.ktx.**
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**
