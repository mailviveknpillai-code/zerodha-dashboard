package com.zerodha.dashboard.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

@Configuration
public class JacksonConfig {
    private final Jackson2ObjectMapperBuilder builder;

    public JacksonConfig(Jackson2ObjectMapperBuilder builder) {
        this.builder = builder;
    }

    @PostConstruct
    public void registerModules() {
        ObjectMapper mapper = builder.build();
        mapper.registerModule(new JavaTimeModule());
        // ensure Spring uses it (the builder is already used by Spring Boot).
    }
}
