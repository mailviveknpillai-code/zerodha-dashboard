package com.zerodha.dashboard;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.RedisTemplate;
import java.time.Duration;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.containers.wait.strategy.Wait;

@Configuration
public class TestcontainersConfiguration {

	private static final DockerImageName REDIS_IMAGE = DockerImageName.parse("redis:7-alpine");

	@Bean
	public RedisTemplate<String, String> redisTemplate() {
		String disabled = System.getenv("TESTCONTAINERS_DISABLED");
		String hostEnv = System.getenv("REDIS_HOST");
		System.out.println(">>> TESTCONTAINERS_DISABLED=" + disabled + ", REDIS_HOST=" + hostEnv);

		// Use compose Redis if Testcontainers disabled or REDIS_HOST provided
		if ("true".equalsIgnoreCase(disabled) || (hostEnv != null && !hostEnv.isBlank())) {
			String host = (hostEnv != null && !hostEnv.isBlank()) ? hostEnv : "redis";
			int port = Integer.parseInt(System.getenv().getOrDefault("REDIS_PORT", "6379"));
			LettuceConnectionFactory factory = new LettuceConnectionFactory(host, port);
			factory.afterPropertiesSet();
			StringRedisTemplate template = new StringRedisTemplate();
			template.setConnectionFactory(factory);
			template.afterPropertiesSet();
			return template;
		}

		// Otherwise use Testcontainers-managed Redis
		GenericContainer<?> redisContainer = new GenericContainer<>(REDIS_IMAGE)
				.withExposedPorts(6379)
				.waitingFor(Wait.forLogMessage(".*Ready to accept connections.*\\n", 1)
						.withStartupTimeout(Duration.ofSeconds(120)));
		redisContainer.start();

		String host = redisContainer.getHost();
		Integer port = redisContainer.getMappedPort(6379);
		LettuceConnectionFactory factory = new LettuceConnectionFactory(host, port);
		factory.afterPropertiesSet();
		StringRedisTemplate template = new StringRedisTemplate();
		template.setConnectionFactory(factory);
		template.afterPropertiesSet();
		return template;
	}
}
