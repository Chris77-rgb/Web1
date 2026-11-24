import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// All app-specific values come from ../forjapp.properties (written by the builder).
val forjapp = Properties().apply { rootProject.file("forjapp.properties").inputStream().use { load(it) } }
fun prop(key: String): String = forjapp.getProperty(key) ?: error("forjapp.properties: falta '$key'")
val pushEnabled = prop("pushEnabled").toBoolean() && file("google-services.json").exists()

// Signing values come from ../signing.properties (written by the builder, never committed).
val signingFile = rootProject.file("signing.properties")
val signing = Properties().apply { if (signingFile.exists()) signingFile.inputStream().use { load(it) } }

if (pushEnabled) apply(plugin = "com.google.gms.google-services")

android {
    namespace = "app.forjapp.shell"
    compileSdk = 35

    defaultConfig {
        applicationId = prop("applicationId")
        minSdk = 24
        targetSdk = 35
        versionCode = prop("versionCode").toInt()
        versionName = prop("versionName")
        buildConfigField("boolean", "PUSH_ENABLED", pushEnabled.toString())
    }

    signingConfigs {
        if (signingFile.exists()) {
            create("release") {
                storeFile = rootProject.file(signing.getProperty("storeFile"))
                storePassword = signing.getProperty("storePassword")
                keyAlias = signing.getProperty("keyAlias")
                keyPassword = signing.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (signingFile.exists()) signingConfig = signingConfigs.getByName("release")
        }
    }

    sourceSets {
        getByName("main") {
            if (pushEnabled) java.srcDir("src/push/java")
        }
    }

    buildFeatures { buildConfig = true }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
    if (pushEnabled) {
        implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
        implementation("com.google.firebase:firebase-messaging")
    }
}
