package com.example

import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.FrameLayout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class MainActivityTest {
    @Test
    fun freshLaunchLoadsGiovannasSiteWithLocalStorageAndRestrictedFileAccess() {
        val controller = Robolectric.buildActivity(MainActivity::class.java).setup()
        try {
            val content = controller.get().findViewById<FrameLayout>(android.R.id.content)
            val container = content.getChildAt(0) as FrameLayout
            val webView = container.getChildAt(0) as WebView
            assertEquals("https://dd.jeielmiranda.com.br/", shadowOf(webView).lastLoadedUrl)
            assertTrue(webView.settings.javaScriptEnabled)
            assertTrue(webView.settings.domStorageEnabled)
            assertFalse(webView.settings.allowFileAccess)
            assertFalse(webView.settings.allowContentAccess)
            assertEquals(WebSettings.MIXED_CONTENT_NEVER_ALLOW, webView.settings.mixedContentMode)
        } finally {
            controller.pause().stop().destroy()
        }
    }
}
