<template>
  <div class="form-wrapper">
    <div class="form-header">
      <div class="form-header-title">
        <img src="@/assets/logo.svg" alt="MyBooks" class="logo logo-header" />
        <h1>{{ isNewBook ? 'Add' : 'Edit' }}</h1>
      </div>
      <div class="form-header-actions">
        <button class="goodreads-btn" @click="goodreadsModalOpen = true" title="Import metadata from Goodreads">
          From Goodreads
        </button>
        <button class="cancel-btn" @click="cancel">Cancel</button>
      </div>
    </div>

    <div v-if="props.errorMessage" class="error-banner">
      {{ props.errorMessage }}
    </div>

    <form @submit.prevent="save" class="form-wrapper-inner">
      <div class="form-content">
        <div class="form-section">
          <label class="form-label">
            <span class="label-text">Title *</span>
            <input v-model="formData.title" type="text" placeholder="Book title" class="form-input" required />
          </label>

          <label class="form-label">
            <span class="label-text">Author *</span>
            <div class="autocomplete-wrapper">
              <input
                v-model="formData.author"
                type="text"
                placeholder="Author name"
                class="form-input"
                @focus="showAuthorDropdown = true"
                @blur="closeAuthorDropdown"
                required
              />
              <div v-if="showAuthorDropdown && filteredAuthors.length" class="autocomplete-dropdown">
                <div
                  v-for="author in filteredAuthors"
                  :key="author"
                  class="autocomplete-item"
                  @click="
                    formData.author = author;
                    showAuthorDropdown = false;
                  "
                >
                  {{ author }}
                </div>
              </div>
            </div>
          </label>

          <label class="form-label">
            <span class="label-text">Date</span>
            <input
              v-model="formData.date"
              type="text"
              placeholder="YYYY-MM-DD or YYYY-MM or YYYY or ?"
              class="form-input"
              @blur="formatDateInput"
            />
          </label>

          <label class="form-label">
            <input v-model="formData.dnf" type="checkbox" class="form-checkbox" />
            <span>Did Not Finish (DNF)</span>
          </label>
        </div>

        <div class="form-section notes-section">
          <div class="notes-header">
            <span class="label-text">Notes</span>
            <button
              type="button"
              class="expand-notes-btn"
              @click="toggleFullscreenNotes"
              title="Fullscreen notes (Cmd+Enter on Mac, Ctrl+Enter on Windows/Linux)"
            >
              ⛶
            </button>
          </div>
          <label class="form-label notes-label">
            <textarea
              ref="inlineNotesTextarea"
              v-model="formData.notes"
              placeholder="Your notes and summary..."
              class="form-textarea"
              @input="autoGrowTextarea"
            ></textarea>
          </label>
        </div>

        <div class="form-section">
          <h3 class="section-title">Metadata</h3>

          <div class="metadata-form">
            <label class="form-label">
              <span class="label-text">Pages</span>
              <input
                v-model.number="formData.meta.pages"
                type="number"
                placeholder="Page count"
                class="form-input"
                min="0"
              />
            </label>

            <label class="form-label">
              <span class="label-text">Duration (audiobook)</span>
              <input
                v-model="formData.meta.duration"
                type="text"
                placeholder="7h34 or 2h0"
                class="form-input"
                @blur="formatDurationInput"
              />
              <div v-if="durationError" class="error-message">
                {{ durationError }}
              </div>
            </label>

            <label class="form-label">
              <span class="label-text">Goodreads ID</span>
              <input v-model="formData.meta.GoodreadsID" type="text" placeholder="Goodreads ID" class="form-input" />
            </label>

            <label class="form-label">
              <span class="label-text">ISBN</span>
              <input v-model="formData.meta.ISBN" type="text" placeholder="ISBN" class="form-input" />
            </label>

            <label class="form-label">
              <span class="label-text">Publication Date</span>
              <input v-model="formData.meta.pubDate" type="text" placeholder="YYYY-MM-DD" class="form-input" />
            </label>
          </div>
        </div>
      </div>
      <div class="form-footer">
        <button type="button" class="btn-cancel" @click="cancel" :disabled="isSaving">Cancel</button>
        <button type="submit" class="btn-save" :disabled="!hasChanged || !isValid || isSaving">
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </form>

    <div v-if="fullscreenNotesOpen" class="notes-fullscreen-modal-overlay" @click="toggleFullscreenNotes">
      <div class="notes-fullscreen-modal" @click.stop>
        <div class="notes-fullscreen-header">
          <h2>Notes</h2>
          <div class="notes-fullscreen-help">Cmd+Enter to close (or click outside)</div>
          <button type="button" class="notes-fullscreen-close" @click="toggleFullscreenNotes">✕</button>
        </div>
        <textarea
          ref="fullscreenNotesTextarea"
          v-model="formData.notes"
          placeholder="Your notes and summary..."
          class="notes-fullscreen-textarea"
          @input="autoGrowTextarea"
        ></textarea>
      </div>
    </div>

    <GoodreadsModal
      :isOpen="goodreadsModalOpen"
      @close="goodreadsModalOpen = false"
      @metadata-fetched="handleGoodreadsData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, toRefs, onMounted, onUnmounted } from 'vue';
import type { Book, BookMeta } from '../types';
import {
  getTodayDate,
  formatDateString,
  durationToMinutes,
  minutesToDuration,
  getFilteredAuthors,
  validateDuration,
} from '../utils/validation';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage';
import GoodreadsModal from './GoodreadsModal.vue';
import { GoodreadsMetadata } from '../services/goodreads';

const props = defineProps<{
  book: Book | null;
  allBooks: Book[];
  isNewBook: boolean;
  errorMessage?: string | null;
  isSaving: boolean;
}>();

type FormData = Omit<Book, '_key' | 'meta'> & {
  meta: Omit<BookMeta, 'duration'> & {
    duration: string;
  };
};

const newFormData = (book: Book | null | undefined = undefined): FormData => {
  if (book) {
    return {
      title: book.title,
      author: book.author,
      date: book.date,
      dnf: book.dnf || false,
      notes: book.notes || '',
      meta: {
        pages: book.meta?.pages ? Number(book.meta.pages) : null,
        duration: book.meta?.duration ? minutesToDuration(book.meta.duration) : '',
        GoodreadsID: book.meta?.GoodreadsID || '',
        ISBN: book.meta?.ISBN || '',
        pubDate: book.meta?.pubDate || '',
      },
    };
  }
  return {
    title: '',
    author: '',
    date: getTodayDate(),
    dnf: false,
    notes: '',
    meta: {
      pages: null,
      duration: '',
      GoodreadsID: '',
      ISBN: '',
      pubDate: '',
    },
  };
};

const { isSaving } = toRefs(props);

const emit = defineEmits(['save', 'cancel']);

const formData = ref<FormData>(newFormData());

const originalData = ref<typeof formData.value>();
const showAuthorDropdown = ref(false);
const durationError = ref<string | null>(null);
const inlineNotesTextarea = ref<HTMLTextAreaElement | null>(null);
const fullscreenNotesTextarea = ref<HTMLTextAreaElement | null>(null);
const goodreadsModalOpen = ref(false);
const fullscreenNotesOpen = ref(false);
const notesSaveTimeout = ref<NodeJS.Timeout | null>(null);

const NOTES_AUTO_SAVE_KEY = 'mybooks_editform_draft';

const getCurrentHash = () => {
  return props.isNewBook ? 'new' : props.book?._key;
};

const filteredAuthors = computed(() => {
  return getFilteredAuthors(formData.value.author, props.allBooks);
});

const hasChanged = computed(() => {
  return JSON.stringify(formData.value) !== JSON.stringify(originalData.value);
});

const isValid = computed(() => {
  if (!formData.value.title.trim() || !formData.value.author.trim()) return false;
  if (durationError.value) return false;
  return true;
});

const formatDateInput = () => {
  formData.value.date = formatDateString(formData.value.date);
};

const formatDurationInput = () => {
  const duration = formData.value.meta.duration.trim();
  if (!duration) {
    durationError.value = null;
    return;
  }

  const result = validateDuration(duration);
  durationError.value = result.error || null;
  if (result.formatted) {
    formData.value.meta.duration = result.formatted;
  }
};

const autoGrowTextarea = async () => {
  await nextTick();
  const textarea = inlineNotesTextarea.value;
  if (textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
};

const closeAuthorDropdown = () => {
  setTimeout(() => {
    showAuthorDropdown.value = false;
  }, 150);
};

const toggleFullscreenNotes = () => {
  fullscreenNotesOpen.value = !fullscreenNotesOpen.value;
  if (fullscreenNotesOpen.value) {
    nextTick(() => {
      fullscreenNotesTextarea.value?.focus();
    });
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const isToggleKey = isMac ? e.metaKey && e.code === 'Enter' : e.ctrlKey && e.code === 'Enter';

  if (isToggleKey) {
    e.preventDefault();
    toggleFullscreenNotes();
  }
};

const saveNotesToLocalStorage = () => {
  const draft = {
    hash: getCurrentHash(),
    notes: formData.value.notes,
  };
  safeSetItem(NOTES_AUTO_SAVE_KEY, draft);
};

const restoreNotesFromLocalStorage = () => {
  const draft: any = safeGetItem(NOTES_AUTO_SAVE_KEY);
  if (draft && !formData.value.notes && draft.hash === getCurrentHash()) {
    formData.value.notes = draft.notes;
  }
};

const clearNotesFromLocalStorage = () => {
  safeRemoveItem(NOTES_AUTO_SAVE_KEY);
};

const debounceAutoSaveNotes = () => {
  if (notesSaveTimeout.value) {
    clearTimeout(notesSaveTimeout.value);
  }

  notesSaveTimeout.value = setTimeout(() => {
    saveNotesToLocalStorage();
  }, 300);
};

const handleGoodreadsData = (metadata: GoodreadsMetadata) => {
  formData.value.title = metadata.title;
  formData.value.author = metadata.author;
  formData.value.meta.ISBN = metadata.isbn || '';
  formData.value.meta.GoodreadsID = metadata.goodreadsId;
  if (metadata.pages) {
    formData.value.meta.pages = metadata.pages;
  }
  if (metadata.pubDate) {
    formData.value.meta.pubDate = metadata.pubDate;
  }
  goodreadsModalOpen.value = false;
};

const cancel = () => {
  clearNotesFromLocalStorage();
  emit('cancel');
};

const save = () => {
  if (!isValid.value) return;

  clearNotesFromLocalStorage();
  emit('save', {
    ...formData.value,
    meta: {
      pages: formData.value.meta.pages ?? null,
      duration: formData.value.meta.duration ? durationToMinutes(formData.value.meta.duration) : null,
      GoodreadsID: formData.value.meta.GoodreadsID || null,
      ISBN: formData.value.meta.ISBN || null,
      pubDate: formData.value.meta.pubDate || null,
    },
  });
};

watch(
  () => [props.book, props.isNewBook],
  () => {
    formData.value = newFormData(!props.isNewBook && props.book ? props.book : undefined);
    originalData.value = JSON.parse(JSON.stringify(formData.value));
    durationError.value = null;
    autoGrowTextarea();
  },
  { immediate: true, deep: true }
);

watch(() => formData.value.notes, debounceAutoSaveNotes);

onMounted(() => {
  restoreNotesFromLocalStorage();
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  if (notesSaveTimeout.value) {
    clearTimeout(notesSaveTimeout.value);
  }
});
</script>

<style scoped>
.form-wrapper {
  width: 100%;
  height: 100svh;
  background-color: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 1rem;
  flex-wrap: wrap;
}

@media (max-width: 600px) {
  .form-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .form-header-title {
    margin-bottom: 0.5rem;
  }

  .form-header-actions {
    flex-direction: column;
  }

  .form-header-actions button {
    width: 100%;
  }
}

.form-header-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.form-header h1 {
  margin: 0;
  color: var(--accent-primary);
  font-size: 1.8rem;
}

.form-header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.error-banner {
  background-color: rgba(255, 107, 107, 0.1);
  color: var(--warning);
  padding: 1rem;
  border-bottom: 1px solid var(--warning);
  font-size: 0.9rem;
}

.goodreads-btn {
  background-color: var(--accent-secondary);
  border: 1px solid var(--accent-secondary);
  color: var(--bg-primary);
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.15s;
}

.goodreads-btn:hover {
  opacity: 0.9;
}

.cancel-btn {
  background-color: transparent;
  border: 1px solid var(--accent-primary);
  color: var(--accent-primary);
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.15s;
}

.cancel-btn:hover {
  background-color: var(--accent-primary);
  color: var(--bg-primary);
}

@media (max-width: 600px) {
  .cancel-btn {
    display: none;
  }
}

.form-wrapper-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.form-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  width: 100%;
}

.form-section {
  margin: 0 auto;
  max-width: 700px;
}

.notes-section {
  max-width: 1500px;
  text-align: center;
}

.notes-section .form-textarea {
  max-width: 100%;
}

.form-section {
  margin-bottom: 2rem;
}

.form-section:last-of-type {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 1rem;
}

.label-text {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.9rem;
}

.form-input,
.form-textarea {
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

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.form-textarea {
  resize: vertical;
  min-height: 300px;
  line-height: 1.5;
  overflow: hidden;
}

.form-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  margin-right: 0.75rem;
  vertical-align: middle;
}

.form-label:has(.form-checkbox) {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.form-label:has(.form-checkbox) .label-text {
  margin: 0;
  font-weight: normal;
  display: inline;
}

.autocomplete-wrapper {
  position: relative;
}

.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
}

.autocomplete-item {
  padding: 0.75rem;
  cursor: pointer;
  color: var(--text-primary);
  transition: background-color 0.15s;
}

.autocomplete-item:hover {
  background-color: var(--bg-hover);
}

.section-title {
  margin: 0 0 1rem 0;
  color: var(--accent-primary);
  font-size: 0.95rem;
  font-weight: 600;
}

.metadata-form {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.metadata-form .form-label {
  margin-bottom: 0.75rem;
}

.error-message {
  color: var(--warning);
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.form-footer {
  display: flex;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  background-color: var(--bg-primary);
  justify-content: center;
  width: 100%;
  position: sticky;
  bottom: 0;
  z-index: 5;
}

.btn-cancel,
.btn-save {
  flex: 0 0 400px;
  padding: 0.5rem 1.5rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.85rem;
}

@media (max-width: 600px) {
  .form-footer {
    flex-direction: column;
    padding: 1rem;
    gap: 0.5rem;
  }

  .btn-cancel,
  .btn-save {
    flex: 1;
    width: 100%;
    min-width: unset;
  }
}

.btn-cancel {
  background-color: transparent;
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.btn-cancel:hover {
  background-color: var(--accent-primary);
  color: var(--bg-primary);
}

.btn-save {
  background-color: var(--accent-primary);
  color: var(--bg-primary);
  border-color: var(--accent-primary);
}

.btn-save:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.notes-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.expand-notes-btn {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-primary);
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
  font-size: 1rem;
  transition: all 0.15s;
}

.expand-notes-btn:hover {
  background-color: var(--bg-secondary);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.notes-label {
  display: block;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.notes-fullscreen-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.15s ease-out;
}

.notes-fullscreen-modal {
  position: relative;
  width: 95%;
  height: 95%;
  max-width: 1200px;
  background-color: var(--bg-primary);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.notes-fullscreen-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 1rem;
}

.notes-fullscreen-header h2 {
  margin: 0;
  color: var(--accent-primary);
  font-size: 1.2rem;
  flex: 1;
}

.notes-fullscreen-help {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.notes-fullscreen-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s;
  flex-shrink: 0;
}

.notes-fullscreen-close:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.notes-fullscreen-textarea {
  flex: 1;
  padding: 1.5rem;
  background-color: var(--bg-secondary);
  border: none;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.95rem;
  resize: none;
  line-height: 1.6;
  outline: none;
}

.notes-fullscreen-textarea::placeholder {
  color: var(--text-secondary);
}

@media (max-width: 600px) {
  .notes-header {
    flex-wrap: wrap;
  }

  .notes-fullscreen-modal {
    width: 100%;
    height: 100%;
    max-width: 100%;
    border-radius: 0;
  }

  .notes-fullscreen-header {
    flex-wrap: wrap;
  }

  .notes-fullscreen-help {
    display: none;
  }
}
</style>
