<template>
  <div class="alpha-demo">
    <h2>Alpha Vantage Demo</h2>
    <div>
      <input v-model="symbol" placeholder="Symbol (e.g., IBM, NIFTY)" />
      <button @click="fetchDemo">Fetch</button>
    </div>

    <div v-if="loading">Loading…</div>

    <div v-if="error" class="error">{{ error }}</div>

    <pre v-if="snapshot">{{ formattedSnapshot }}</pre>
  </div>
</template>

<script>
export default {
  name: 'AlphaDemo',
  data() {
    return {
      symbol: 'IBM',
      snapshot: null,
      loading: false,
      error: null,
    }
  },
  computed: {
    formattedSnapshot() {
      if (!this.snapshot) return '';
      try {
        return JSON.stringify(this.snapshot, null, 2);
      } catch (e) {
        return String(this.snapshot);
      }
    }
  },
  methods: {
    async fetchDemo() {
      this.loading = true;
      this.error = null;
      this.snapshot = null;
      try {
        const res = await fetch(`/api/alpha-demo?symbol=${encodeURIComponent(this.symbol)}`);
        if (!res.ok) {
          this.error = `Server error (${res.status}): ${await res.text()}`;
        } else {
          this.snapshot = await res.json();
        }
      } catch (e) {
        this.error = e.message || 'Network error';
      } finally {
        this.loading = false;
      }
    }
  },
  mounted() {
    // Auto-fetch once for convenience
    this.fetchDemo();
  }
}
</script>

<style scoped>
.alpha-demo { padding: 1rem; border: 1px solid #ddd; border-radius: 6px; }
.error { color: red; margin-top: 0.5rem; }
pre { background: #f7f7f7; padding: 0.75rem; border-radius: 4px; }
</style>
