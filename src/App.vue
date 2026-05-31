<template>
  <div class="app">
    <ToastContainer />
    <AuthCallback v-if="isAuthCallback" />
    <div v-else-if="isLoading" class="loading">Loading...</div>
    <AuthScreen
      v-else-if="!isAuthenticated"
      :dropbox-service="dropboxService"
      @authenticate="handleAuth"
    />
    <BookPage
      v-else
      :books-provider="booksProvider"
      @logout="handleLogout"
      :files-changed="filesChanged"
      @files-refreshed="filesChanged = false"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import AuthCallback from "./components/AuthCallback.vue";
import AuthScreen from "./components/AuthScreen.vue";
import BookPage from "./components/BookPage.vue";
import ToastContainer from "./components/ToastContainer.vue";
import { BooksProvider } from "./services/booksProvider";
import { DropboxService } from "./services/dropboxService";
import { createToastProvider } from "./composables/useToast";

const isAuthenticated = ref(false);
const isAuthCallback = ref(false);
const isLoading = ref(true);
const filesChanged = ref(false);
const dropboxService = new DropboxService();
const booksProvider = new BooksProvider(dropboxService);

const toastApi = createToastProvider();

// Expose for testing in dev console
if (import.meta.env.DEV) {
  (window as any).__toast = toastApi;
}

const handleVisibilityChange = async () => {
  if (document.visibilityState === "visible" && isAuthenticated.value) {
    try {
      const revisionChanged = await booksProvider.checkFileRevision();
      if (revisionChanged) {
        console.log("File revision has changed, refreshing book list.");
        filesChanged.value = true;
      }
    } catch (err) {
      console.error("Error checking file revision:", err);
    }
  }
};

onMounted(async () => {
  document.addEventListener("visibilitychange", handleVisibilityChange);

  if (
    window.location.pathname.endsWith("/auth-callback.html") &&
    window.location.search.includes("code=")
  ) {
    isAuthCallback.value = true;
  } else {
    try {
      isAuthenticated.value = await dropboxService.tryLogin();
    } catch (err) {
      console.error("Failed to login to dropbox:", err);
      handleLogout();
      return;
    }
    isLoading.value = false;
  }
});

const handleAuth = () => {
  isAuthenticated.value = true;
};

const handleLogout = () => {
  isAuthenticated.value = false;
  dropboxService.logout();
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
