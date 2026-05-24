<template>
  <div class="app">
    <AuthCallback v-if="isAuthCallback" />
    <AuthScreen v-else-if="!isAuthenticated" @authenticate="handleAuth" />
    <BookList v-else @logout="handleLogout" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import AuthScreen from './components/AuthScreen.vue';
import BookList from './components/BookList.vue';
import AuthCallback from './components/AuthCallback.vue';
import { initDropbox, getStoredToken, setAuthExpiredCallback } from './services/dropbox';

const isAuthenticated = ref(false);
const isAuthCallback = ref(false);

const handleAuthExpired = () => {
  handleLogout();
};

onMounted(() => {
  setAuthExpiredCallback(handleAuthExpired);

  // Check if this is the auth callback page
  if (window.location.pathname.endsWith('/auth-callback.html') && window.location.search.includes('code=')) {
    isAuthCallback.value = true;
  } else {
    const token = getStoredToken();
    if (token) {
      isAuthenticated.value = true;
      initDropbox(token);
    }
  }
});

const handleAuth = (token) => {
  isAuthenticated.value = true;
  initDropbox(token);
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
</style>
