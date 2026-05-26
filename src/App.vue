<template>
  <div class="app">
    <AuthCallback v-if="isAuthCallback" />
    <div v-else-if="isLoading" class="loading">Loading...</div>
    <AuthScreen v-else-if="!isAuthenticated" @authenticate="handleAuth" />
    <BookList v-else @logout="handleLogout" :files-changed="filesChanged" @files-refreshed="filesChanged = false" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import AuthScreen from './components/AuthScreen.vue';
import BookList from './components/BookList.vue';
import AuthCallback from './components/AuthCallback.vue';
import { tryInitDropbox, checkFileRevision } from './services/dropbox';

const isAuthenticated = ref(false);
const isAuthCallback = ref(false);
const isLoading = ref(true);
const filesChanged = ref(false);

const handleVisibilityChange = async () => {
  if (document.visibilityState === 'visible' && isAuthenticated.value) {
    const revisionChanged = await checkFileRevision();
    if (revisionChanged) {
      filesChanged.value = true;
    }
  }
};

onMounted(async () => {
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Check if this is the auth callback page
  if (window.location.pathname.endsWith('/auth-callback.html') && window.location.search.includes('code=')) {
    isAuthCallback.value = true;
  } else {
    try {
      isAuthenticated.value = await tryInitDropbox();
    } catch (err) {
      console.error('Failed to login to dropbox:', err);
      handleLogout();
      return;
    }
    isLoading.value = false;
  }
});

const handleAuth = (_token) => {
  isAuthenticated.value = true;
};

const handleLogout = () => {
  isAuthenticated.value = false;
  localStorage.removeItem('dropbox_auth');
};
</script>

<style scoped>
.app {
  width: 100%;
  height: 100%;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--text-primary);
  font-size: 1.1rem;
}
</style>
