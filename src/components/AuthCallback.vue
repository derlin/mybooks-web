<template>
  <div class="callback-container">
    <p v-if="processing">Processing authentication...</p>
    <p v-else-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const processing = ref(true);
const error = ref<string | null>(null);

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const errorCode = params.get('error');

  if (errorCode) {
    error.value = `Authentication failed: ${errorCode}`;
    processing.value = false;
    if (window.opener) {
      window.opener.postMessage({ type: 'auth-error', error: errorCode }, '*');
    }
    return;
  }

  if (code) {
    if (window.opener) {
      window.opener.postMessage({ type: 'auth-code', code }, '*');
      setTimeout(() => window.close(), 500);
    }
  } else {
    error.value = 'No authorization code received';
    processing.value = false;
  }
});
</script>

<style scoped>
.callback-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.error {
  color: var(--warning);
}
</style>
