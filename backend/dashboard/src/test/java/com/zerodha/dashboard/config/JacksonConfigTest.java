package com.zerodha.dashboard.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JacksonConfigTest {

    @Test
    void registerModules_addsJavaTimeModule() {
        Jackson2ObjectMapperBuilder builder = mock(Jackson2ObjectMapperBuilder.class);
        ObjectMapper mapper = mock(ObjectMapper.class);
        when(builder.build()).thenReturn(mapper);

        JacksonConfig config = new JacksonConfig(builder);
        config.registerModules();

        ArgumentCaptor<com.fasterxml.jackson.databind.Module> captor = ArgumentCaptor.forClass(com.fasterxml.jackson.databind.Module.class);
        verify(mapper).registerModule(captor.capture());
        assertThat(captor.getValue()).isInstanceOf(JavaTimeModule.class);
    }
}
