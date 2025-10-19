package com.zerodha.dashboard.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class JacksonConfig {
    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper m = new ObjectMapper();
        // Register Java Time support
        m.registerModule(new JavaTimeModule());
        // Optional: keep default serialization features from Spring Boot otherwise adjust as needed
        return m;
    }
}
