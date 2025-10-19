package com.zerodha.dashboard;

import org.springframework.boot.SpringApplication;

public class TestZerodhaDashboardApplication {

	public static void main(String[] args) {
		SpringApplication.from(ZerodhaDashboardApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
