package com.zerodha.dashboard.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuration to serve frontend static files
 * Frontend files should be in src/main/resources/static/
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve static files from /static/ directory
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(0); // Disable caching for development
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Redirect root to index.html (for React Router)
        registry.addViewController("/")
                .setViewName("forward:/index.html");
    }
}


