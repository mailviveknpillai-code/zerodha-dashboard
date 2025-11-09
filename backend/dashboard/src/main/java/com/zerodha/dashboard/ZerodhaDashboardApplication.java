package com.zerodha.dashboard;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ZerodhaDashboardApplication {
    private static final Logger log = LoggerFactory.getLogger(ZerodhaDashboardApplication.class);

    public static void main(String[] args) {
        log.info("Zerodha Dashboard starting...");
        SpringApplication.run(ZerodhaDashboardApplication.class, args);
    }
}
