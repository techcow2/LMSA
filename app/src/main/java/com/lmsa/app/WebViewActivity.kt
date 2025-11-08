package com.lmsa.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.IOException
import android.util.Base64
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.os.Handler
import android.os.Looper
import android.media.AudioManager
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import java.util.Locale
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.android.billingclient.api.*
import android.widget.Button
import android.widget.Toast
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import com.google.android.play.core.review.ReviewManagerFactory

class WebViewActivity : AppCompatActivity() {

    private val TAG = "LMSA_WebView"

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private lateinit var fileChooserLauncher: ActivityResultLauncher<Intent>
    private lateinit var fileSaverLauncher: ActivityResultLauncher<Intent>
    private var pendingFileContent: String? = null
    private var pendingFileName: String? = null
    private var isImageFile: Boolean = false

    private lateinit var billingClient: BillingClient
    private var isAdFree = false
    private var textToSpeech: TextToSpeech? = null
    private var isTTSInitialized = false
    private lateinit var audioManager: AudioManager
    private var audioFocusChangeListener: AudioManager.OnAudioFocusChangeListener? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    private var currentChunks: List<String> = emptyList()
    private var currentChunkIndex: Int = 0
    private var isSpeakingChunks: Boolean = false
    private var ttsAudioSessionId: Int = AudioManager.AUDIO_SESSION_ID_GENERATE

    companion object {
        private const val STORAGE_PERMISSION_CODE = 101
        private const val AD_FREE_SKU = "ad_removal"
        private const val PREFS_NAME = "LMSA_PREFS"
        private const val IS_AD_FREE_KEY = "is_ad_free"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_webview)

        // Load premium status from SharedPreferences
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        isAdFree = prefs.getBoolean(IS_AD_FREE_KEY, false)

        setupBillingClient()
        
        // Initialize AudioManager for TTS audio focus management
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioFocusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
            when (focusChange) {
                AudioManager.AUDIOFOCUS_LOSS -> {
                    // Only stop on permanent focus loss
                    textToSpeech?.stop()
                    abandonAudioFocus()
                }
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                    // Don't stop on transient loss - just pause if needed
                    // This prevents stopping TTS when notifications or other brief audio events occur
                }
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                    // Continue playing at lower volume if needed
                }
                AudioManager.AUDIOFOCUS_GAIN -> {
                    // Resume normal playback if needed
                }
            }
        }
        
        // Create AudioFocusRequest for API 26+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                .build()
            
            audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(audioAttributes)
                .setAcceptsDelayedFocusGain(true)
                .setOnAudioFocusChangeListener(audioFocusChangeListener!!)
                .build()
        }

        fileChooserLauncher =
            registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
                val callback = filePathCallback
                if (callback == null) return@registerForActivityResult
                var results: Array<Uri>? = null
                if (result.resultCode == Activity.RESULT_OK) {
                    val data = result.data
                    if (data != null) {
                        if (data.clipData != null) {
                            results = Array(data.clipData!!.itemCount) { i ->
                                data.clipData!!.getItemAt(i).uri
                            }
                        } else if (data.data != null) {
                            results = arrayOf(data.data!!)
                        }
                    }
                }
                callback.onReceiveValue(results)
                filePathCallback = null
            }

        fileSaverLauncher =
            registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
                if (result.resultCode == Activity.RESULT_OK) {
                    val uri = result.data?.data
                    if (uri != null && pendingFileContent != null) {
                        try {
                            contentResolver.openOutputStream(uri)?.use { outputStream ->
                                if (isImageFile) {
                                    // Handle binary image data
                                    val imageBytes = Base64.decode(pendingFileContent!!, Base64.DEFAULT)
                                    outputStream.write(imageBytes)
                                    Log.d(TAG, "Image file saved successfully to: $uri")
                                    // Notify JavaScript that the image was saved successfully
                                    val webView: WebView = findViewById(R.id.webView)
                                    webView.post {
                                        webView.evaluateJavascript(
                                            "if (window.onImageSaved) window.onImageSaved(true);",
                                            null
                                        )
                                    }
                                } else {
                                    // Handle text data
                                    outputStream.write(pendingFileContent!!.toByteArray())
                                    Log.d(TAG, "Text file saved successfully to: $uri")
                                    // Notify JavaScript that the file was saved successfully
                                    val webView: WebView = findViewById(R.id.webView)
                                    webView.post {
                                        webView.evaluateJavascript(
                                            "if (window.onFileSaved) window.onFileSaved(true);",
                                            null
                                        )
                                    }
                                }
                            }
                        } catch (e: IOException) {
                            Log.e(TAG, "Error saving file", e)
                            // Notify JavaScript that the file save failed
                            val webView: WebView = findViewById(R.id.webView)
                            webView.post {
                                if (isImageFile) {
                                    webView.evaluateJavascript(
                                        "if (window.onImageSaved) window.onImageSaved(false);",
                                        null
                                    )
                                } else {
                                    webView.evaluateJavascript(
                                        "if (window.onFileSaved) window.onFileSaved(false);",
                                        null
                                    )
                                }
                            }
                        }
                    } else {
                        Log.e(TAG, "File save cancelled or no content to save")
                        // Notify JavaScript that the file save was cancelled
                        val webView: WebView = findViewById(R.id.webView)
                        webView.post {
                            if (isImageFile) {
                                webView.evaluateJavascript(
                                    "if (window.onImageSaved) window.onImageSaved(false);",
                                    null
                                )
                            } else {
                                webView.evaluateJavascript(
                                    "if (window.onFileSaved) window.onFileSaved(false);",
                                    null
                                )
                            }
                        }
                    }
                } else {
                    Log.d(TAG, "File save cancelled by user")
                    // Notify JavaScript that the file save was cancelled
                    val webView: WebView = findViewById(R.id.webView)
                    webView.post {
                        if (isImageFile) {
                            webView.evaluateJavascript(
                                "if (window.onImageSaved) window.onImageSaved(false);",
                                null
                            )
                        } else {
                            webView.evaluateJavascript(
                                "if (window.onFileSaved) window.onFileSaved(false);",
                                null
                            )
                        }
                    }
                }
                // Clear pending data
                pendingFileContent = null
                pendingFileName = null
                isImageFile = false
            }

        WebView.setWebContentsDebuggingEnabled(true)

        val webView: WebView = findViewById(R.id.webView)
        val webSettings: WebSettings = webView.settings

        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.allowFileAccess = true
        webSettings.allowContentAccess = true
        @Suppress("DEPRECATION")
        webSettings.allowFileAccessFromFileURLs = true
        webSettings.useWideViewPort = true
        webSettings.loadWithOverviewMode = true
        webSettings.setSupportZoom(false)
        webSettings.builtInZoomControls = false
        webSettings.displayZoomControls = false
        webSettings.cacheMode = WebSettings.LOAD_CACHE_ELSE_NETWORK
        @Suppress("DEPRECATION")
        webSettings.databaseEnabled = false
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        webView.clearCache(true)
        webView.clearHistory()

        // Add JavaScript interface for file operations
        webView.addJavascriptInterface(FileOperationInterface(), "AndroidFileOps")
        webView.addJavascriptInterface(BillingInterface(), "AndroidBilling")
        webView.addJavascriptInterface(ReviewInterface(), "AndroidReview")
        // Add JavaScript interface for TTS
        webView.addJavascriptInterface(TTSInterface(), "AndroidTTS")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Now that the page is loaded, update the UI with the persisted premium status
                updateWebViewPremiumUI()
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallbackIn: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                if (filePathCallback != null) {
                    filePathCallback!!.onReceiveValue(null)
                    filePathCallback = null
                }
                filePathCallback = filePathCallbackIn

                val intent =
                    fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                    }

                if (fileChooserParams?.isCaptureEnabled == true) {
                    // Handle capture intent
                }
                if (fileChooserParams != null && fileChooserParams.acceptTypes.isNotEmpty() && fileChooserParams.acceptTypes.first()
                        .isNotBlank()
                ) {
                    intent.type = fileChooserParams.acceptTypes.joinToString(",")
                }
                if (fileChooserParams?.mode == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                }

                try {
                    if (intent.resolveActivity(packageManager) != null) {
                        fileChooserLauncher.launch(intent)
                    } else {
                        val fallbackIntent =
                            Intent(Intent.ACTION_GET_CONTENT).apply {
                                addCategory(Intent.CATEGORY_OPENABLE)
                                type = "*/*"
                            }
                        if (fallbackIntent.resolveActivity(packageManager) != null) {
                            fileChooserLauncher.launch(fallbackIntent)
                        } else {
                            Log.e(TAG, "No app available to handle file selection")
                            filePathCallback?.onReceiveValue(null)
                            filePathCallback = null
                            return false
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Cannot open file chooser", e)
                    filePathCallback?.onReceiveValue(null)
                    filePathCallback = null
                    return false
                }
                return true
            }
        }

        checkAndRequestStoragePermissions()
        setupBackPressHandler()
        webView.loadUrl("file:///android_asset/LMSA/index.html")
    }

    private fun setupBillingClient() {
        @Suppress("DEPRECATION")
        billingClient = BillingClient.newBuilder(this)
            .setListener(purchasesUpdatedListener)
            .enablePendingPurchases()
            .build()

        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    Log.d(TAG, "Billing Client connected")
                    queryPurchases()
                } else {
                    Log.e(TAG, "Billing Client connection failed")
                }
            }

            override fun onBillingServiceDisconnected() {
                Log.w(TAG, "Billing Client disconnected")
                // Implement retry logic here if needed
            }
        })
    }

    private val purchasesUpdatedListener = PurchasesUpdatedListener { billingResult, purchases ->
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (purchase in purchases) {
                handlePurchase(purchase)
            }
        } else {
            // Handle error
            runOnUiThread {
                Toast.makeText(this, "An error occurred during your purchase. Please try again later.", Toast.LENGTH_LONG).show()
            }
            Log.e(TAG, "Error updating purchases: ${billingResult.responseCode}")
        }
    }

    private fun handlePurchase(purchase: Purchase) {
        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
            if (!purchase.isAcknowledged) {
                val acknowledgePurchaseParams = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchase.purchaseToken)
                    .build()
                billingClient.acknowledgePurchase(acknowledgePurchaseParams) { billingResult ->
                    if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                        setAdFreeStatus(true)
                    }
                }
            } else {
                setAdFreeStatus(true)
            }
        }
    }

    private fun queryPurchases() {
        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)

        billingClient.queryPurchasesAsync(params.build()) { billingResult, purchases ->
            var adFree = false
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                purchases.forEach { purchase ->
                    if (purchase.products.contains(AD_FREE_SKU) && purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                        adFree = true
                    }
                }
            }
            setAdFreeStatus(adFree)
        }
    }

    private fun launchPurchaseFlow() {
        if (!isNetworkAvailable()) {
            Toast.makeText(this, "Please check your internet connection and try again.", Toast.LENGTH_LONG).show()
            return
        }

        val productList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(AD_FREE_SKU)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
        )
        val params = QueryProductDetailsParams.newBuilder().setProductList(productList)


        billingClient.queryProductDetailsAsync(params.build()) { billingResult, productDetailsList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && productDetailsList.isNotEmpty()) {
                val productDetails = productDetailsList[0]
                val productDetailsParamsList =
                    listOf(
                        BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(productDetails)
                            .build()
                    )
                val billingFlowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(productDetailsParamsList)
                    .build()
                billingClient.launchBillingFlow(this, billingFlowParams)
            } else {
                Log.e(TAG, "Could not query product details: ${billingResult.responseCode}")
            }
        }
    }

    private fun setAdFreeStatus(adFree: Boolean) {
        if (isAdFree == adFree) return // No change needed

        isAdFree = adFree

        // Save the new status to SharedPreferences
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        with(prefs.edit()) {
            putBoolean(IS_AD_FREE_KEY, isAdFree)
            apply()
        }

        runOnUiThread {
            // Update the WebView UI
            updateWebViewPremiumUI()
        }
    }

    private fun updateWebViewPremiumUI() {
        val webView: WebView = findViewById(R.id.webView)
        val jsCommand = "if(typeof updateUiForPremium === 'function') { updateUiForPremium($isAdFree); }"
        webView.evaluateJavascript(jsCommand, null)
    }

    private fun checkAndRequestStoragePermissions() {
        val permissionsToRequest = mutableListOf<String>()
        if (ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.READ_EXTERNAL_STORAGE
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            permissionsToRequest.add(Manifest.permission.READ_EXTERNAL_STORAGE)
        }

        if (android.os.Build.VERSION.SDK_INT <= android.os.Build.VERSION_CODES.P) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                permissionsToRequest.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
            }
        }

        if (permissionsToRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                permissionsToRequest.toTypedArray(),
                STORAGE_PERMISSION_CODE
            )
        } else {
            Log.d(TAG, "Storage permissions already granted or not applicable.")
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == STORAGE_PERMISSION_CODE) {
            permissions.forEachIndexed { index, permission ->
                if (grantResults.getOrNull(index) == PackageManager.PERMISSION_GRANTED) {
                    if (permission == Manifest.permission.READ_EXTERNAL_STORAGE) {
                        Log.d(TAG, "READ_EXTERNAL_STORAGE permission granted.")
                    }
                    if (permission == Manifest.permission.WRITE_EXTERNAL_STORAGE && android.os.Build.VERSION.SDK_INT <= android.os.Build.VERSION_CODES.P) {
                        Log.d(TAG, "WRITE_EXTERNAL_STORAGE permission granted on API <= 28.")
                    }
                }
            }
        }
    }

    private fun setupBackPressHandler() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val webView: WebView = findViewById(R.id.webView)
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })
    }

    override fun onDestroy() {
        billingClient.endConnection()
        textToSpeech?.shutdown()
        super.onDestroy()
    }

    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork ?: return false
            val activeNetwork = connectivityManager.getNetworkCapabilities(network) ?: return false
            return when {
                activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> true
                activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> true
                else -> false
            }
        } else {
            @Suppress("DEPRECATION")
            val networkInfo = connectivityManager.activeNetworkInfo ?: return false
            @Suppress("DEPRECATION")
            return networkInfo.isConnected
        }
    }

    private fun launchInAppReview() {
        val manager = ReviewManagerFactory.create(this)
        val request = manager.requestReviewFlow()
        request.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                // We got the ReviewInfo object
                val reviewInfo = task.result
                val flow = manager.launchReviewFlow(this, reviewInfo)
                flow.addOnCompleteListener { _ ->
                    // The flow has finished
                    Log.d(TAG, "In-app review flow completed")
                }
            } else {
                // There was some problem, log the error
                Log.e(TAG, "Error requesting review flow: ${task.exception}")
            }
        }
    }

    private fun requestAudioFocus(): Int {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.requestAudioFocus(audioFocusRequest!!)
        } else {
            @Suppress("DEPRECATION")
            audioManager.requestAudioFocus(
                audioFocusChangeListener,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN
            )
        }
    }

    private fun abandonAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(audioFocusRequest!!)
        } else {
            @Suppress("DEPRECATION")
            audioManager.abandonAudioFocus(audioFocusChangeListener)
        }
    }

    inner class FileOperationInterface {
        @JavascriptInterface
        fun saveFile(content: String, filename: String) {
            Log.d(TAG, "JavaScript requested to save file: $filename")

            // Store the content and filename for later use
            pendingFileContent = content
            pendingFileName = filename
            isImageFile = false

            // Create an intent to open the Storage Access Framework
            val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "application/json"
                putExtra(Intent.EXTRA_TITLE, filename)
            }

            try {
                fileSaverLauncher.launch(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Error launching file saver", e)
                // Notify JavaScript that the save failed
                val webView: WebView = findViewById(R.id.webView)
                webView.post {
                    webView.evaluateJavascript(
                        "if (window.onFileSaved) window.onFileSaved(false);",
                        null
                    )
                }
            }
        }

        @JavascriptInterface
        fun saveImageFile(base64Data: String, filename: String) {
            Log.d(TAG, "JavaScript requested to save image file: $filename")

            try {
                // Remove data URL prefix if present (data:image/jpeg;base64,)
                val cleanBase64 = if (base64Data.contains(",")) {
                    base64Data.substring(base64Data.indexOf(",") + 1)
                } else {
                    base64Data
                }

                // Store the content and filename for later use
                pendingFileContent = cleanBase64
                pendingFileName = filename
                isImageFile = true

                // Determine MIME type based on file extension
                val mimeType = when {
                    filename.lowercase().endsWith(".jpg") || filename.lowercase().endsWith(".jpeg") -> "image/jpeg"
                    filename.lowercase().endsWith(".png") -> "image/png"
                    filename.lowercase().endsWith(".gif") -> "image/gif"
                    filename.lowercase().endsWith(".webp") -> "image/webp"
                    else -> "image/jpeg" // Default to JPEG
                }

                // Create an intent to open the Storage Access Framework for images
                val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = mimeType
                    putExtra(Intent.EXTRA_TITLE, filename)
                }

                fileSaverLauncher.launch(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Error launching image file saver", e)
                // Notify JavaScript that the save failed
                val webView: WebView = findViewById(R.id.webView)
                webView.post {
                    webView.evaluateJavascript(
                        "if (window.onImageSaved) window.onImageSaved(false);",
                        null
                    )
                }
            }
        }

        @JavascriptInterface
        fun isAndroidApp(): Boolean {
            return true
        }
    }

    inner class BillingInterface {
        @JavascriptInterface
        fun removeAds() {
            launchPurchaseFlow()
        }
        
        @JavascriptInterface
        fun restorePurchases() {
            queryPurchases()
        }
    }

    inner class ReviewInterface {
        @JavascriptInterface
        fun requestInAppReview() {
            Log.d(TAG, "JavaScript requested in-app review")
            runOnUiThread {
                launchInAppReview()
            }
        }
    }

    inner class TTSInterface {
        @JavascriptInterface
        fun initializeTTS() {
            runOnUiThread {
                if (textToSpeech == null) {
                    textToSpeech = TextToSpeech(this@WebViewActivity) { status ->
                        if (status == TextToSpeech.SUCCESS) {
                            val result = textToSpeech?.setLanguage(Locale.US)
                            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                                Log.e(TAG, "TTS Language not supported")
                                // Try to set default language
                                textToSpeech?.setLanguage(Locale.getDefault())
                            }
                            
                            // Optimize TTS settings for better audio quality
                            textToSpeech?.setSpeechRate(0.9f) // Slightly slower for clarity
                            textToSpeech?.setPitch(1.0f) // Normal pitch
                            
                            // Set proper audio attributes for API 21+
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                val audioAttributes = AudioAttributes.Builder()
                                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
                                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                    .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                                    .build()
                                textToSpeech?.setAudioAttributes(audioAttributes)
                                Log.d(TAG, "Audio attributes set for TTS with media usage")
                            }

                            // Generate and store a persistent audio session ID
                            try {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                    ttsAudioSessionId = audioManager.generateAudioSessionId()
                                    Log.d(TAG, "Generated persistent audio session ID: $ttsAudioSessionId")
                                }
                            } catch (e: Exception) {
                                Log.w(TAG, "Could not generate audio session ID: ${e.message}")
                            }

                            // Boost system volume for TTS to ensure audibility (do this once at init)
                            try {
                                val currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
                                val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
                                val targetVolume = (maxVolume * 0.70).toInt() // Set to 70% of max volume

                                if (currentVolume < targetVolume) {
                                    audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, targetVolume, 0)
                                    Log.d(TAG, "TTS volume boosted from $currentVolume to $targetVolume (max: $maxVolume)")
                                }
                            } catch (e: Exception) {
                                Log.w(TAG, "Could not adjust system volume for TTS: ${e.message}")
                            }
                            
                            // Set utterance progress listener for audio focus management
                            textToSpeech?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                                override fun onStart(utteranceId: String?) {
                                    Log.d(TAG, "TTS started speaking: $utteranceId")
                                }
                                
                                override fun onDone(utteranceId: String?) {
                                    Log.d(TAG, "TTS finished speaking: $utteranceId")
                                    // Release audio focus when done
                                    audioFocusChangeListener?.let { listener ->
                                        audioManager.abandonAudioFocus(listener)
                                    }
                                }
                                
                                override fun onError(utteranceId: String?) {
                                    Log.e(TAG, "TTS error for utterance: $utteranceId")
                                    // Release audio focus on error
                                    audioFocusChangeListener?.let { listener ->
                                        audioManager.abandonAudioFocus(listener)
                                    }
                                }
                            })
                            
                            Log.d(TAG, "TTS initialized successfully with optimized settings and audio attributes")
                            
                            // Set initialization flag
                            isTTSInitialized = true
                            
                            // Notify JavaScript that TTS is ready
                            val webView: WebView = findViewById(R.id.webView)
                            webView.post {
                                webView.evaluateJavascript("if (window.onTTSInitialized) window.onTTSInitialized(true);", null)
                            }
                        } else {
                            Log.e(TAG, "TTS initialization failed")
                            
                            // Set initialization flag to false
                            isTTSInitialized = false
                            
                            val webView: WebView = findViewById(R.id.webView)
                            webView.post {
                                webView.evaluateJavascript("if (window.onTTSInitialized) window.onTTSInitialized(false);", null)
                            }
                        }
                    }
                }
            }
        }

        @JavascriptInterface
        fun speak(text: String) {
            runOnUiThread {
                if (textToSpeech != null) {
                    // Request audio focus before speaking
                    val result = requestAudioFocus()
                    
                    if (result != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                        Log.w(TAG, "Audio focus request denied")
                        return@runOnUiThread
                    }
                    
                    // Clean the text to remove markdown and HTML
                    val cleanText = text
                        .replace(Regex("<[^>]*>"), "") // Remove HTML tags
                        .replace(Regex("\\*\\*([^*]+)\\*\\*"), "$1") // Remove bold markdown
                        .replace(Regex("\\*([^*]+)\\*"), "$1") // Remove italic markdown
                        .replace(Regex("```[\\s\\S]*?```"), " Code block. ") // Replace code blocks
                        .replace(Regex("`([^`]+)`"), "$1") // Remove inline code backticks
                        .replace(Regex("#{1,6}\\s*"), "") // Remove headers
                        .replace(Regex("\\[([^\\]]+)\\]\\([^)]+\\)"), "$1") // Convert links to text
                        // Remove emojis (they cause TTS to stop or produce artifacts)
                        // This regex matches most emoji ranges
                        .replace(Regex("[\\p{So}\\p{Sk}\\p{Cn}]"), " ")
                        // Remove other problematic unicode characters but keep basic text
                        .replace(Regex("[^\\p{L}\\p{N}\\s.,!?;:()\\-'\"]"), " ")
                        // Fix common abbreviations
                        .replace(Regex("\\bAPI\\b"), "A P I")
                        .replace(Regex("\\bURL\\b"), "U R L")
                        .replace(Regex("\\bHTML\\b"), "H T M L")
                        .replace(Regex("\\bCSS\\b"), "C S S")
                        .replace(Regex("\\bJS\\b"), "JavaScript")
                        .replace(Regex("\\bJSON\\b"), "J S O N")
                        .replace(Regex("\\bXML\\b"), "X M L")
                        .replace(Regex("\\bSQL\\b"), "S Q L")
                        // Handle numbers and special cases
                        .replace(Regex("(\\d+)\\.(\\d+)"), "$1 point $2")
                        .replace(Regex("\\b(\\d+)%"), "$1 percent")
                        .replace(Regex("\\$(\\d+)"), "$1 dollars")
                        // Fix punctuation spacing
                        .replace(Regex("([.!?])\\s*([.!?])"), "$1 ")
                        .replace(Regex("([,;:])\\s*([,;:])"), "$1 ")
                        // Add pauses for better speech flow
                        .replace(Regex("\\.\\s+"), ". ")
                        .replace(Regex("!\\s+"), "! ")
                        .replace(Regex("\\?\\s+"), "? ")
                        .replace(Regex(":\\s+"), ": ")
                        .replace(Regex(";\\s+"), "; ")
                        // Remove extra whitespace
                        .replace(Regex("\\s+"), " ")
                        .trim()
                    
                    if (cleanText.isNotEmpty()) {
                        // Split long text into chunks to prevent audio artifacts
                        val maxChunkLength = 200 // Maximum characters per chunk
                        val chunks = if (cleanText.length <= maxChunkLength) {
                            listOf(cleanText)
                        } else {
                            chunkText(cleanText, maxChunkLength)
                        }
                        
                        // Speak chunks sequentially
                        speakChunks(chunks, 0)
                    }
                } else {
                    Log.w(TAG, "TTS not initialized, attempting to initialize...")
                    initializeTTS()
                }
            }
        }
        
        private fun chunkText(text: String, maxLength: Int): List<String> {
            val chunks = mutableListOf<String>()
            var currentChunk = ""
            val sentences = text.split(Regex("(?<=[.!?])\\s+"))
            
            for (sentence in sentences) {
                if (currentChunk.length + sentence.length + 1 <= maxLength) {
                    currentChunk += if (currentChunk.isEmpty()) sentence else " $sentence"
                } else {
                    if (currentChunk.isNotEmpty()) {
                        chunks.add(currentChunk.trim())
                        currentChunk = sentence
                    } else {
                        // If a single sentence is too long, split it by words
                        val words = sentence.split(" ")
                        var wordChunk = ""
                        for (word in words) {
                            if (wordChunk.length + word.length + 1 <= maxLength) {
                                wordChunk += if (wordChunk.isEmpty()) word else " $word"
                            } else {
                                if (wordChunk.isNotEmpty()) {
                                    chunks.add(wordChunk.trim())
                                    wordChunk = word
                                } else {
                                    // If a single word is too long, just add it
                                    chunks.add(word)
                                }
                            }
                        }
                        if (wordChunk.isNotEmpty()) {
                            currentChunk = wordChunk
                        }
                    }
                }
            }
            
            if (currentChunk.isNotEmpty()) {
                chunks.add(currentChunk.trim())
            }
            
            return chunks
        }
        
        private fun speakChunks(chunks: List<String>, index: Int) {
            if (index >= chunks.size || textToSpeech == null) {
                isSpeakingChunks = false
                return
            }

            // Set up the utterance listener only once for the entire sequence
            if (index == 0) {
                currentChunks = chunks
                currentChunkIndex = 0
                isSpeakingChunks = true

                textToSpeech?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {
                        Log.d(TAG, "TTS started chunk: $utteranceId")
                    }

                    override fun onDone(utteranceId: String?) {
                        Log.d(TAG, "TTS done callback for: $utteranceId, current index: $currentChunkIndex, total chunks: ${currentChunks.size}")
                        if (utteranceId?.startsWith("chunk_") == true && isSpeakingChunks) {
                            val completedIndex = utteranceId.substringAfter("chunk_").toIntOrNull()
                            Log.d(TAG, "Completed chunk index: $completedIndex")

                            // Check if this is the last utterance in the queue
                            if (completedIndex != null) {
                                // Move to the next chunk
                                val nextIndex = completedIndex + 1
                                if (nextIndex < currentChunks.size) {
                                    Log.d(TAG, "Preparing next chunk: $nextIndex")
                                    // Continue with next chunk immediately
                                    Handler(Looper.getMainLooper()).postDelayed({
                                        if (isSpeakingChunks) {
                                            currentChunkIndex = nextIndex
                                            speakNextChunk()
                                        }
                                    }, 50) // Minimal delay for smooth transitions
                                } else {
                                    // All chunks completed
                                    Log.d(TAG, "All chunks completed")
                                    isSpeakingChunks = false
                                    currentChunkIndex = 0
                                    currentChunks = emptyList()
                                    abandonAudioFocus()
                                }
                            }
                        }
                    }

                    override fun onError(utteranceId: String?) {
                        Log.e(TAG, "TTS error for chunk: $utteranceId")
                        if (utteranceId?.startsWith("chunk_") == true && isSpeakingChunks) {
                            val errorIndex = utteranceId.substringAfter("chunk_").toIntOrNull()
                            if (errorIndex != null) {
                                val nextIndex = errorIndex + 1
                                if (nextIndex < currentChunks.size) {
                                    // Try to continue with next chunk
                                    Handler(Looper.getMainLooper()).postDelayed({
                                        if (isSpeakingChunks) {
                                            currentChunkIndex = nextIndex
                                            speakNextChunk()
                                        }
                                    }, 100)
                                } else {
                                    isSpeakingChunks = false
                                    currentChunkIndex = 0
                                    currentChunks = emptyList()
                                    abandonAudioFocus()
                                }
                            }
                        }
                    }
                })
            }

            val chunk = chunks[index]
            val params = Bundle()
            params.putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, "chunk_$index")
            params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f) // Increased volume
            params.putString(TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_MUSIC.toString())

            // Use persistent audio session for all chunks to prevent audio artifacts
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                params.putInt(TextToSpeech.Engine.KEY_PARAM_SESSION_ID, ttsAudioSessionId)
            }

            // Always use QUEUE_FLUSH to ensure clean playback
            textToSpeech?.speak(chunk, TextToSpeech.QUEUE_FLUSH, params, "chunk_$index")
            Log.d(TAG, "TTS speaking chunk $index of ${chunks.size}: ${chunk.take(50)}...")
        }
        
        private fun speakNextChunk() {
            if (currentChunkIndex < currentChunks.size && isSpeakingChunks) {
                val chunk = currentChunks[currentChunkIndex]
                val params = Bundle()
                params.putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, "chunk_$currentChunkIndex")
                params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f) // Increased volume
                params.putString(TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_MUSIC.toString())

                // Use persistent audio session for all chunks to prevent audio artifacts
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    params.putInt(TextToSpeech.Engine.KEY_PARAM_SESSION_ID, ttsAudioSessionId)
                }

                // Use QUEUE_FLUSH for clean playback of each chunk
                textToSpeech?.speak(chunk, TextToSpeech.QUEUE_FLUSH, params, "chunk_$currentChunkIndex")
                Log.d(TAG, "TTS speaking next chunk $currentChunkIndex of ${currentChunks.size}: ${chunk.take(50)}...")
            }
        }

        @JavascriptInterface
        fun stop() {
            runOnUiThread {
                isSpeakingChunks = false
                currentChunks = emptyList()
                currentChunkIndex = 0
                textToSpeech?.stop()
                abandonAudioFocus()

                // Reset audio session ID for next playback
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    try {
                        ttsAudioSessionId = audioManager.generateAudioSessionId()
                        Log.d(TAG, "Audio session ID reset for next playback: $ttsAudioSessionId")
                    } catch (e: Exception) {
                        Log.w(TAG, "Could not reset audio session ID: ${e.message}")
                    }
                }

                Log.d(TAG, "TTS stopped")
            }
        }

        @JavascriptInterface
        fun isSpeaking(): Boolean {
            return (textToSpeech?.isSpeaking ?: false) || isSpeakingChunks
        }

        @JavascriptInterface
        fun isAvailable(): Boolean {
            return textToSpeech != null
        }

        @JavascriptInterface
        fun setLanguage(languageCode: String) {
            runOnUiThread {
                textToSpeech?.let { tts ->
                    val locale = when (languageCode.lowercase()) {
                        "en" -> Locale.ENGLISH
                        "es" -> Locale.forLanguageTag("es")
                        "fr" -> Locale.FRENCH
                        "de" -> Locale.GERMAN
                        "it" -> Locale.ITALIAN
                        "pt" -> Locale.forLanguageTag("pt")
                        "zh" -> Locale.CHINESE
                        "ja" -> Locale.JAPANESE
                        "ko" -> Locale.KOREAN
                        else -> Locale.US
                    }
                    val result = tts.setLanguage(locale)
                    if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                        Log.w(TAG, "Language $languageCode not supported, using default")
                        tts.setLanguage(Locale.getDefault())
                    }
                }
            }
        }

        @JavascriptInterface
        fun setSpeechRate(rate: Float) {
            runOnUiThread {
                textToSpeech?.setSpeechRate(rate.coerceIn(0.1f, 3.0f))
            }
        }

        @JavascriptInterface
        fun setPitch(pitch: Float) {
            runOnUiThread {
                textToSpeech?.setPitch(pitch.coerceIn(0.1f, 2.0f))
            }
        }






        
        @JavascriptInterface
        fun isReady(): Boolean {
            return isTTSInitialized
        }

        @JavascriptInterface
        fun getAvailableVoices(): String {
            return try {
                if (textToSpeech == null) {
                    "[]"
                } else {
                    val voices = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        textToSpeech?.voices?.mapNotNull { voice ->
                            try {
                                // Extract gender and network info from the voice name
                                val voiceName = voice.name.lowercase()
                                val isMale = voiceName.contains("male") && !voiceName.contains("female")
                                val isFemale = voiceName.contains("female")
                                val isNetwork = voiceName.contains("network") || voice.isNetworkConnectionRequired

                                // Determine gender string
                                val gender = when {
                                    isMale -> "male"
                                    isFemale -> "female"
                                    else -> ""
                                }

                                // Create a JSON object for each voice with extracted metadata
                                """{"name":"${voice.name.replace("\"", "\\\"")}","locale":"${voice.locale}","quality":"${if (voice.quality == android.speech.tts.Voice.QUALITY_VERY_HIGH) "Very High" else if (voice.quality == android.speech.tts.Voice.QUALITY_HIGH) "High" else if (voice.quality == android.speech.tts.Voice.QUALITY_NORMAL) "Normal" else "Low"}","isNetworkConnectionRequired":${isNetwork},"gender":"${gender}"}"""
                            } catch (e: Exception) {
                                Log.e(TAG, "Error processing voice: ${e.message}")
                                null
                            }
                        } ?: emptyList()
                    } else {
                        // For API levels below 21, we can't get detailed voice info
                        emptyList()
                    }

                    val jsonArray = voices.joinToString(",", "[", "]")
                    Log.d(TAG, "Available TTS voices: $jsonArray")
                    jsonArray
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error getting available voices: ${e.message}")
                "[]"
            }
        }

        @JavascriptInterface
        fun setVoice(voiceName: String): Boolean {
            return try {
                if (textToSpeech == null) {
                    Log.w(TAG, "TTS not initialized, cannot set voice")
                    false
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    val voices = textToSpeech?.voices
                    val selectedVoice = voices?.find { it.name == voiceName }

                    if (selectedVoice != null) {
                        textToSpeech?.voice = selectedVoice
                        Log.d(TAG, "Voice set to: $voiceName")
                        true
                    } else {
                        Log.w(TAG, "Voice not found: $voiceName")
                        false
                    }
                } else {
                    Log.w(TAG, "Voice selection not supported on API level < 21")
                    false
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error setting voice: ${e.message}")
                false
            }
        }
    }
}
