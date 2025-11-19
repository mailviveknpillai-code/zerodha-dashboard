package com.zerodha.dashboard.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.config.annotation.CorsRegistration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class CorsConfigTest {

    private CorsRegistry registry;
    private CorsRegistration registration;
    private CorsConfig config;

    @BeforeEach
    void setUp() {
        registry = mock(CorsRegistry.class);
        registration = mock(CorsRegistration.class, RETURNS_SELF);
        when(registry.addMapping("/api/**")).thenReturn(registration);
        config = new CorsConfig();
        ReflectionTestUtils.setField(config, "allowedOriginsProp", "http://localhost:5173");
        ReflectionTestUtils.setField(config, "allowedMethodsProp", "GET,POST");
        ReflectionTestUtils.setField(config, "allowedHeadersProp", "Content-Type,Authorization");
        ReflectionTestUtils.setField(config, "allowCredentials", false);
        ReflectionTestUtils.setField(config, "maxAgeSeconds", 3600L);
    }

    @Test
    void usesAllowedOriginsWhenNoWildcardPresent() {
        ReflectionTestUtils.setField(config, "allowedOriginsProp", "http://a.com, https://b.com");
        ReflectionTestUtils.setField(config, "allowedMethodsProp", "GET,POST");
        ReflectionTestUtils.setField(config, "allowedHeadersProp", "Content-Type,Authorization");
        ReflectionTestUtils.setField(config, "allowCredentials", false);
        ReflectionTestUtils.setField(config, "maxAgeSeconds", 3600L);

        config.addCorsMappings(registry);

        ArgumentCaptor<String[]> captor = ArgumentCaptor.forClass(String[].class);
        verify(registration).allowedOrigins(captor.capture());
        assertThat(captor.getValue()).containsExactly("http://a.com", "https://b.com");
        verify(registration).allowedMethods("GET", "POST");
        verify(registration).allowedHeaders("Content-Type", "Authorization");
        verify(registration).allowCredentials(false);
        verify(registration).maxAge(3600L);
    }

    @Test
    void usesPatternsWhenWildcardPresent() {
        ReflectionTestUtils.setField(config, "allowedOriginsProp", "https://*.example.com");

        config.addCorsMappings(registry);

        ArgumentCaptor<String[]> captor = ArgumentCaptor.forClass(String[].class);
        verify(registration).allowedOriginPatterns(captor.capture());
        assertThat(captor.getValue()).containsExactly("https://*.example.com");
    }

    @Test
    void honoursCustomMethodsHeadersAndCredentials() {
        ReflectionTestUtils.setField(config, "allowedOriginsProp", "https://secure.example.com");
        ReflectionTestUtils.setField(config, "allowedMethodsProp", "GET,PUT");
        ReflectionTestUtils.setField(config, "allowedHeadersProp", "Content-Type,X-Requested-With");
        ReflectionTestUtils.setField(config, "allowCredentials", true);
        ReflectionTestUtils.setField(config, "maxAgeSeconds", 1800L);

        config.addCorsMappings(registry);

        verify(registration).allowedOrigins("https://secure.example.com");
        verify(registration).allowedMethods("GET", "PUT");
        verify(registration).allowedHeaders("Content-Type", "X-Requested-With");
        verify(registration).allowCredentials(true);
        verify(registration).maxAge(1800L);
    }

    @Test
    void fallsBackToDefaultMethodsAndHeadersWhenBlank() {
        ReflectionTestUtils.setField(config, "allowedMethodsProp", " ");
        ReflectionTestUtils.setField(config, "allowedHeadersProp", "");

        config.addCorsMappings(registry);

        verify(registration).allowedMethods("GET", "POST");
        verify(registration).allowedHeaders("Content-Type", "Authorization");
    }
}
