# Capacitor core + plugin discovery (reflection)
-keep,allowobfuscation,allowshrinking class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers @com.getcapacitor.annotation.CapacitorPlugin class * {
    @com.getcapacitor.PluginMethod <methods>;
}
-keep class * extends com.getcapacitor.Plugin { *; }

# Firebase Messaging + GMS (Google Sign-In) — invoked via reflection.
# allowobfuscation/allowshrinking permite R8 renomear/remover classes
# não usadas, elevando as taxas de otimização/ofuscação/redução
# (recomendação Play #4).
-keep class * extends com.google.firebase.messaging.FirebaseMessagingService { *; }
-keep,allowobfuscation,allowshrinking class com.google.firebase.iid.** { *; }
-keep,allowobfuscation,allowshrinking class com.google.android.gms.** { *; }
-keep,allowobfuscation,allowshrinking class com.google.firebase.** { *; }

# Firebase Kotlin extensions (ktx) — required for Firebase Installations
-keep,allowobfuscation,allowshrinking class com.google.firebase.ktx.** { *; }
-keep,allowobfuscation,allowshrinking class com.google.firebase.installations.ktx.** { *; }
-keep,allowobfuscation,allowshrinking class com.google.firebase.messaging.ktx.** { *; }
-keep,allowobfuscation,allowshrinking class com.google.firebase.common.ktx.** { *; }


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
