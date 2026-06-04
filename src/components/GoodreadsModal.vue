<template>
  <div v-if="isOpen" class="modal-overlay" @click="close">
    <div class="modal-dialog" @click.stop>
      <div class="modal-header">
        <h2>Import from Goodreads</h2>
        <button class="btn-icon-only" @click="close" aria-label="Close">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <p class="modal-subtitle">Paste a Goodreads URL to automatically import book details such as title, author, publication date, etc.</p>

        <div v-if="error" class="error-banner">
          {{ error }}
        </div>

        <label class="form-label">
          <span class="label-text">Goodreads Book URL</span>
          <input
            v-model="url"
            type="text"
            placeholder="https://www.goodreads.com/book/show/..."
            class="form-input"
            :disabled="loading"
            @keyup.enter="submit"
          />
        </label>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-outline btn-dimmed btn-icon-text" @click="close" :disabled="loading">
          <X :size="18" />
          <span>Cancel</span>
        </button>
        <button type="button" class="btn-solid btn-primary btn-icon-text" @click="submit" :disabled="!url.trim() || loading">
          <template v-if="loading"><span class="spinner"></span> Importing</template>
          <template v-else><Search :size="18" /> Import&nbsp;&nbsp;&nbsp;</template>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { X, Search } from '@lucide/vue';
import { fetchBookMetadata } from '../services/goodreads.js';

defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['close', 'metadata-fetched']);

const url = ref('');
const loading = ref(false);
const error = ref(null);

const close = () => {
  url.value = '';
  error.value = null;
  emit('close');
};

const submit = async () => {
  if (!url.value.trim() || loading.value) return;

  error.value = null;
  loading.value = true;

  try {
    const metadata = await fetchBookMetadata(url.value);
    emit('metadata-fetched', metadata);
    url.value = '';
    error.value = null;
  } catch (err: any) {
    console.error("[Goodreads] Failed to read metadata", err);
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-dialog {
  background-color: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.15s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.modal-header h2 {
  margin: 0;
  color: var(--accent-primary);
  font-size: 1.3rem;
}

.modal-subtitle {
  margin: 0 0 1rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 400;
  line-height: 1.4;
}


.modal-body {
  padding: 1.5rem;
  flex-shrink: 0;
}

.error-banner {
  background-color: rgba(255, 107, 107, 0.1);
  color: var(--warning);
  padding: 0.75rem;
  border-radius: 4px;
  border-left: 3px solid var(--warning);
  margin-bottom: 1rem;
  font-size: 0.9rem;
  word-break: break-word;
}

.form-label {
  display: block;
}

.label-text {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.95rem;
  transition: border-color 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  flex-shrink: 0;
  justify-content: flex-end;
}

.modal-footer button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.85rem;
}
</style>
