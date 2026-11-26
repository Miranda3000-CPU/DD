package com.example

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SiteOriginTest {
    @Test
    fun productionSiteCanCallNativeFeatures() {
        assertTrue(SiteOrigin.accepts("https", "dd.jeielmiranda.com.br", -1))
        assertTrue(SiteOrigin.accepts("https", "DD.JEIELMIRANDA.COM.BR", 443))
    }

    @Test
    fun otherOriginsCannotCallNativeFeatures() {
        assertFalse(SiteOrigin.accepts("http", "dd.jeielmiranda.com.br", -1))
        assertFalse(SiteOrigin.accepts("https", "dd.jeielmiranda.com.br.example.org", -1))
        assertFalse(SiteOrigin.accepts("https", "dd.jeielmiranda.com.br", 444))
        assertFalse(SiteOrigin.accepts("file", null, -1))
    }
}
