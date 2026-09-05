<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-dialog" @click.stop>
      <div class="modal-header">
        <h2>Import from Goodreads</h2>
        <button type="button" class="btn-icon-only" @click="close" aria-label="Close">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <p class="modal-subtitle">
          Enter a Goodreads URL, an ISBN, or a title/author search to import book details.
        </p>

        <div v-if="error" class="error-banner">
          {{ error }}
        </div>

        <label class="form-label">
          <span class="label-text">Goodreads URL, ISBN or search query</span>
          <div class="input-with-action">
            <input
              v-model="query"
              type="text"
              placeholder="https://www.goodreads.com/book/show/... or 9782070368228 or tolkien hobbit"
              class="form-input"
              :disabled="loading"
              @keyup.enter="submit"
            />
            <button
              type="button"
              class="btn-icon-only input-action"
              :disabled="loading"
              title="Scan the ISBN barcode with the camera"
              aria-label="Scan ISBN barcode"
              @click="scannerOpen = true"
            >
              <ScanBarcode :size="18" />
            </button>
          </div>
        </label>

        <div v-if="results.length" class="search-results">
          <div
            v-for="result in results"
            :key="result.id"
            class="search-result"
            :class="{ 'is-active': selectedId === result.id }"
          >
            <button
              type="button"
              class="search-result-main"
              :disabled="loading"
              @click="selectResult(result)"
            >
              <BookCover :title="result.title" :cover-image="result.coverImage" :width="60" />
              <div class="search-result-info">
                <div class="search-result-title">{{ result.title }}</div>
                <div class="search-result-author">{{ result.authors.join(', ') }}</div>
                <div v-if="result.pubDate" class="search-result-date">{{ result.pubDate }}</div>
              </div>
            </button>
            <span v-if="selectedId === result.id && loading" class="spinner"></span>
            <a
              v-else
              :href="result.url"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-icon-only search-result-open"
              title="Open on Goodreads"
            >
              <ExternalLink :size="16" />
            </a>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-outline btn-dimmed btn-icon-text" @click="close" :disabled="loading">
          <X :size="18" />
          <span>Cancel</span>
        </button>
        <button type="button" class="btn-solid btn-primary btn-icon-text" @click="submit" :disabled="loading || !query.trim()">
          <template v-if="loading"><span class="spinner"></span> Searching</template>
          <template v-else><Search :size="18" /> Search&nbsp;&nbsp;&nbsp;</template>
        </button>
      </div>
    </div>

    <BarcodeScannerModal :isOpen="scannerOpen" @close="scannerOpen = false" @scanned="handleScanned" />
  </div>
</template>

<script setup lang="ts">
import { ExternalLink, ScanBarcode, Search, X } from '@lucide/vue';
import { ref } from 'vue';
import { useEscapeKey } from '../composables/useEscapeKey';
import {
  fetchGoodreadsBookMetadata,
  type GoodreadsSearchResult,
  searchAndFetchGoodreads,
  searchGoodreads,
} from '../services/goodreads-fetcher.js';
import { isIsbn } from '../utils/isbn';
import BarcodeScannerModal from './BarcodeScannerModal.vue';
import BookCover from './BookCover.vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['close', 'metadata-fetched']);

const query = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const results = ref<GoodreadsSearchResult[]>([]);
const selectedId = ref<string | null>(null);
const scannerOpen = ref(false);

const close = () => {
  scannerOpen.value = false;
  query.value = '';
  error.value = null;
  results.value = [];
  selectedId.value = null;
  emit('close');
};

useEscapeKey(close, () => props.isOpen);

const errorMessage = (err: any): string => err?.message ?? 'Could not reach Goodreads.';

const isUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.hostname === 'www.goodreads.com' && url.pathname.includes('/book/show/');
  } catch {
    return false;
  }
};

const submit = async () => {
  const value = query.value.trim();
  if (!value || loading.value) return;

  error.value = null;
  results.value = [];
  selectedId.value = null;
  loading.value = true;

  try {
    // A URL or an ISBN identifies a single book, so it imports straight away;
    // anything else is free text and needs the user to pick from the results.
    if (!isUrl(value) && !isIsbn(value)) {
      results.value = await searchGoodreads(value);
      return;
    }
    const metadata = isUrl(value)
      ? await fetchGoodreadsBookMetadata(value)
      : await searchAndFetchGoodreads(value);
    emit('metadata-fetched', metadata);
    query.value = '';
  } catch (err: any) {
    console.error('[Goodreads] Failed to fetch metadata', err);
    error.value = errorMessage(err);
  } finally {
    loading.value = false;
  }
};

const handleScanned = (isbn: string) => {
  query.value = isbn;
  // A scanned ISBN is unambiguous, so there is nothing to review before searching.
  void submit();
};

const selectResult = async (result: GoodreadsSearchResult) => {
  error.value = null;
  selectedId.value = result.id;
  loading.value = true;

  try {
    const metadata = await fetchGoodreadsBookMetadata(result.url);
    emit('metadata-fetched', metadata);
    query.value = '';
    results.value = [];
  } catch (err: any) {
    console.error('[Goodreads] Failed to fetch metadata', err);
    error.value = errorMessage(err);
  } finally {
    loading.value = false;
    selectedId.value = null;
  }
};
</script>

<style scoped>
.form-label {
  display: block;
}


.input-with-action {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.input-action {
  width: 36px;
  height: 36px;
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

.search-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.search-result {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  transition: border-color 0.15s;
  --cover-width: 45px;
}

.search-result:has(.search-result-main:not(:disabled)):hover {
  border-color: var(--accent-primary);
}

.search-result.is-active {
  border-color: var(--accent-primary);
  background-color: var(--bg-hover);
}

.search-result-main {
  display: flex;
  flex: 1;
  min-width: 0;
  gap: 0.75rem;
  text-align: left;
  font-family: inherit;
  color: inherit;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.search-result-main:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.search-result.is-active .search-result-main:disabled {
  opacity: 1;
}

.search-result-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.search-result-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-result-author,
.search-result-date {
  color: var(--text-secondary);
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-result-open {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
}
</style>
