package com.zerodha.dashboard.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.lang.NonNull;

import java.util.Arrays;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String allowedOriginsProp;

    @Value("${app.cors.allowed-methods:GET,POST,PUT,OPTIONS}")
    private String allowedMethodsProp;

    @Value("${app.cors.allowed-headers:Content-Type,Authorization}")
    private String allowedHeadersProp;

    @Value("${app.cors.allow-credentials:false}")
    private boolean allowCredentials;

    @Value("${app.cors.max-age:3600}")
    private long maxAgeSeconds;

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        String[] origins = parseCsv(allowedOriginsProp);
        String[] methods = ensureNonEmpty(parseCsv(allowedMethodsProp), "GET", "POST", "PUT", "OPTIONS");
        String[] headers = ensureNonEmpty(parseCsv(allowedHeadersProp), "Content-Type", "Authorization");

        var registration = registry.addMapping("/api/**")
                .allowedMethods(methods)
                .allowedHeaders(headers)
                .allowCredentials(allowCredentials)
                .maxAge(maxAgeSeconds);

        boolean hasWildcards = Arrays.stream(origins).anyMatch(origin -> origin.contains("*"));
        if (hasWildcards) {
            registration.allowedOriginPatterns(origins);
        } else {
            registration.allowedOrigins(origins);
        }
    }

    private String[] parseCsv(String csv) {
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .toArray(String[]::new);
    }

    private String[] ensureNonEmpty(String[] values, String... defaults) {
        if (values.length == 0) {
            return defaults;
        }
        return values;
    }
}
