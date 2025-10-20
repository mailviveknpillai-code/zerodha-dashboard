package com.zerodha.dashboard.controller;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.springframework.beans.factory.annotation.Autowired;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AlphaDemoControllerIT {

    @Autowired
    private WebTestClient webClient;

    @Test
    void alphaDemoEndpoint_returnsSomething() {
        webClient.get().uri(uriBuilder -> uriBuilder.path("/api/alpha-demo").queryParam("symbol", "IBM").build())
                .exchange()
                .expectStatus().is2xxSuccessful();
    }
}
