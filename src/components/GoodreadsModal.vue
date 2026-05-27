<template>
  <div v-if="isOpen" class="modal-overlay" @click="close">
    <div class="modal-dialog" @click.stop>
      <div class="modal-header">
        <h2>Import from Goodreads</h2>
        <button class="close-btn" @click="close" aria-label="Close">
          <span>×</span>
        </button>
      </div>

      <div class="modal-body">
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
          <div v-if="loading" class="loading-text"><span class="spinner"></span> Searching...</div>
        </label>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" @click="close" :disabled="loading">Cancel</button>
        <button type="button" class="btn-search" @click="submit" :disabled="!url.trim() || loading">
          {{ loading ? 'Searching...' : 'Search' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
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

.close-btn {
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.15s;
}

.close-btn:hover {
  color: var(--accent-primary);
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

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--border);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.modal-footer {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  background-color: var(--bg-secondary);
  justify-content: flex-end;
}

.btn-cancel,
.btn-search {
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.95rem;
}

.btn-cancel {
  background-color: transparent;
  color: var(--text-primary);
}

.btn-cancel:hover:not(:disabled) {
  background-color: var(--bg-hover);
}

.btn-search {
  background-color: var(--accent-primary);
  color: var(--bg-primary);
  border-color: var(--accent-primary);
}

.btn-search:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-cancel:disabled,
.btn-search:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
