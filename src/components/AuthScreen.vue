<template>
  <div class="auth-container">
    <div class="auth-card">
      <img src="@/assets/logo.svg" alt="MyBooks" class="logo" />
      <p class="subtitle">Manage your book collection</p>

      <button @click="authenticate" :disabled="loading" class="auth-button">
        <span v-if="!loading">Connect to Dropbox</span>
        <span v-else>Connecting...</span>
      </button>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <p class="info-text">
        Your books are stored in a JSON file on your Dropbox account. We'll authenticate via OAuth to sync them.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getAuthUrl, exchangeCodeForToken } from '../services/dropbox';

const emit = defineEmits(['authenticate']);
const loading = ref(false);
const error = ref<string | null>(null);

const authenticate = async () => {
  loading.value = true;
  error.value = null;

  try {
    const authUrl = await getAuthUrl();
    const width = 500;
    const height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    const popup = window.open(authUrl, 'dropbox-auth', `width=${width},height=${height},left=${left},top=${top}`);

    const messageHandler = (event: any) => {
      if (event.data.type === 'auth-code') {
        window.removeEventListener('message', messageHandler);
        const code = event.data.code;
        if (code) {
          handleAuthCode(code);
        }
      } else if (event.data.type === 'auth-error') {
        window.removeEventListener('message', messageHandler);
        error.value = `Authentication failed: ${event.data.error}`;
        loading.value = false;
      }
    };

    window.addEventListener('message', messageHandler);

    const checkPopup = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkPopup);
        window.removeEventListener('message', messageHandler);
        if (!loading.value) return;
        loading.value = false;
        error.value = 'Authentication cancelled';
      }
    }, 500);
  } catch (err: any) {
    error.value = err.message || 'Failed to initialize authentication';
    loading.value = false;
  }
};

const handleAuthCode = async (code: string) => {
  try {
    const token = await exchangeCodeForToken(code);
    emit('authenticate', token);
  } catch (err: any) {
    error.value = err.message || 'Authentication failed';
    loading.value = false;
  }
};
</script>

<style scoped>
.auth-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: var(--bg-primary);
}

.auth-card {
  background-color: var(--bg-secondary);
  padding: 3rem;
  border-radius: 8px;
  box-shadow: 0 10px 40px var(--shadow);
  max-width: 400px;
  text-align: center;
}

h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: var(--accent-primary);
}

.logo {
  height: 100px;
  width: auto;
  margin-bottom: 1.5rem;
  filter: drop-shadow(0 0 18px var(--accent-primary));
}

.subtitle {
  color: var(--text-secondary);
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.auth-button {
  width: 100%;
  padding: 1rem;
  font-size: 1rem;
  margin-bottom: 2rem;
}

.error-message {
  color: var(--warning);
  padding: 1rem;
  background-color: rgba(255, 107, 107, 0.1);
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

.info-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}
</style>
