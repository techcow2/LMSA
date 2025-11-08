plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

kotlin {
    jvmToolchain(17)
}

// repositories { // THIS BLOCK SHOULD BE GONE
//     mavenCentral()
// }

android {
    namespace = "com.lmsa.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.lmsa.app"
        minSdk = 23
        targetSdk = 35
        versionCode = 161
        versionName = "8.9"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        buildConfig = true
    }
    packaging {
        resources {
            excludes += "**/LMSA/.git/**"
            excludes += "**/.vscode/**"
        }
    }
}

dependencies {
    implementation("com.android.billingclient:billing-ktx:7.0.0")
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("com.google.android.play:review:2.0.2")
    implementation("com.google.android.play:review-ktx:2.0.2")
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}

tasks.matching { it.name == "produceReleaseBundleIdeListingFile" }.configureEach { enabled = false }
tasks.matching { it.name == "createReleaseBundleListingFileRedirect" }.configureEach { enabled = false }
