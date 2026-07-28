<template>
  <div class="form-wrapper">
    <div class="form-header">
      <div class="form-header-title">
        <img src="@/assets/logo.svg" alt="MyBooks" class="logo logo-header" />
        <h1>{{ !book ? 'Add' : 'Edit' }}</h1>
      </div>
      <div class="form-header-actions">
        <button class="btn-outline btn-secondary btn-icon-text" @click="goodreadsModalOpen = true" title="Import metadata from Goodreads">
          <Download :size="18" />
          <span>From Goodreads</span>
        </button>
        <button class="btn-icon-only" @click="cancel" title="Cancel">
          <X :size="20" />
        </button>
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
        </div>

        <div class="form-section metadata-section">
          <div class="metadata-grid">
            <label class="form-label form-label-inline">
              <span class="label-text">Date read</span>
              <input
                v-model="formData.date_read"
                type="text"
                placeholder="YYYY-MM-DD"
                class="form-input"
                @blur="formatDateInput"
              />
            </label>

            <label class="form-label form-label-inline">
              <span class="label-text">Format</span>
              <select v-model="formData.format" class="form-input">
                <option value="print">Print</option>
                <option value="audio">Audio</option>
                <option value="ebook">E-Book</option>
              </select>
            </label>

            <label class="form-label form-label-inline">
              <span class="label-text">Rating</span>
              <input
                v-model.number="formData.rating"
                type="number"
                placeholder="0-5 (e.g., 4.2)"
                class="form-input"
                min="0"
                max="5"
                step="0.1"
                @change="validateRatingInput"
              />
              <div v-if="ratingError" class="error-message">
                {{ ratingError }}
              </div>
            </label>

            <label class="form-label form-label-inline">
              <span class="label-text">Pages</span>
              <input
                v-model.number="formData.pages"
                type="number"
                placeholder="Page count"
                class="form-input"
                min="0"
              />
            </label>

            <label class="form-label form-label-inline">
              <span class="label-text">Duration</span>
              <input
                v-model="formData.duration"
                type="text"
                placeholder="7h34"
                class="form-input"
                @blur="formatDurationInput"
              />
              <div v-if="durationError" class="error-message">
                {{ durationError }}
              </div>
            </label>


            <label class="form-label form-label-inline">
              <span class="label-text">ISBN</span>
              <input v-model="formData.isbn" type="text" placeholder="ISBN" class="form-input" />
            </label>

            <label class="form-label form-label-inline">
              <span class="label-text">Publication Date</span>
              <input v-model="formData.date_published" type="text" placeholder="YYYY-MM-DD" class="form-input" />
            </label>
          </div>
        </div>

        <div class="form-section">
          <label class="form-label">
            <input v-model="formData.dnf" type="checkbox" class="form-checkbox" />
            <span>Did Not Finish (DNF)</span>
          </label>
        </div>


        <!-- do NOT use label for the Tags, it messes the event system (clicking on the label triggers a remove event) -->
        <div class="form-section">
          <div class="form-label">
            <span class="label-text">Tags</span>
            <TagInput
              v-model="formData.tags"
              :all-tags="TagsUtil.getAll(allBooks)"
              placeholder="Add tags..."
              :allow-new="true"
            />
            <div class="form-helper">Max 32 characters per tag, no spaces.</div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-label">
            <span class="label-text">Links</span>
            <div class="links-list">
              <div v-for="(link, index) in formData.links" :key="index" class="link-entry">
                <input
                  v-model="link.name"
                  type="text"
                  placeholder="Name *"
                  class="form-input link-input"
                />
                <input
                  v-model="link.id"
                  type="text"
                  placeholder="ID *"
                  class="form-input link-input"
                />
                <input
                  v-model="link.url"
                  type="text"
                  placeholder="URL *"
                  class="form-input link-input"
                />
                <button
                  type="button"
                  class="btn-icon-only btn-remove"
                  @click="formData.links.splice(index, 1)"
                  title="Remove link"
                >
                  <X :size="18" />
                </button>
              </div>
            </div>
            <button
              type="button"
              class="btn-outline btn-secondary btn-add-link"
              @click="formData.links.push({ name: '', id: '', url: '' })"
            >
              + Add Link
            </button>
          </div>
        </div>

        <div class="form-section notes-section">
          <div class="notes-header">
            <span>Notes</span>
            <button
              type="button"
              class="btn-icon-only"
              @click="toggleFullscreenNotes"
              title="Fullscreen notes (Cmd+Enter on Mac, Ctrl+Enter on Windows/Linux)"
            >
              <Maximize2 :size="16" />
            </button>
          </div>
          <label class="form-label notes-label">
            <textarea
              ref="inlineNotesTextarea"
              v-model="formData.notes"
              placeholder="Your notes and summary..."
              class="form-textarea"
            ></textarea>
          </label>
        </div>
      </div>
      <div class="form-footer">
        <button type="button" class="btn-outline btn-dimmed btn-icon-text" @click="cancel" :disabled="isSaving">
          <X :size="18" />
          <span>Cancel</span>
        </button>
        <button type="submit" class="btn-solid btn-primary btn-icon-text" :disabled="!hasChanged || !isValid || isSaving">
          <Check :size="18" />
          <span>{{ isSaving ? 'Saving...' : 'Save' }}</span>
        </button>
      </div>
    </form>

    <div v-if="fullscreenNotesOpen" class="notes-fullscreen-modal-overlay" @click="toggleFullscreenNotes">
      <div class="notes-fullscreen-modal" @click.stop>
        <div class="notes-fullscreen-header">
          <h2>Notes</h2>
          <div class="notes-fullscreen-help">Cmd+Enter to close (or click outside)</div>
          <button type="button" class="notes-fullscreen-close" @click="toggleFullscreenNotes">
            <X :size="20" />
          </button>
        </div>
        <textarea
          ref="fullscreenNotesTextarea"
          v-model="formData.notes"
          placeholder="Your notes and summary..."
          class="notes-fullscreen-textarea"
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
import { computed, nextTick, onMounted, onUnmounted, ref, toRefs, watch } from 'vue';
import { X, Check, Download, Maximize2 } from '@lucide/vue';
import type { GoodreadsMetadata } from '../services/goodreads-fetcher';
import type { Book } from '../types';
import { Storage } from '../utils/storage';
import { TagsUtil } from '../utils/tags';
import * as validation from '../utils/helpers';
import GoodreadsModal from './GoodreadsModal.vue';
import TagInput from './TagInput.vue';

const storage = new Storage({ silentFail: true });

type DraftNotes = {
  hash: string;
  notes: string;
};

const props = defineProps<{
  book: Book | null;
  allBooks: Book[];
  errorMessage?: string | null;
  isSaving: boolean;
}>();

type FormData = Omit<Book, '_key' | 'pages' | 'duration' | 'rating' | 'links'> & {
  pages: number | null;
  duration: string;
  tags: string[];
  rating: number | null;
  links: Array<{ name: string; id: string; url: string }>;
};

const newFormData = (book: Book | null | undefined = undefined): FormData => {
  const linksArray = book?.links
    ? Object.entries(book.links).map(([name, link]) => ({
        name,
        id: link.id,
        url: link.url,
      }))
    : [];

  if (book) {
    return {
      title: book.title,
      author: book.author,
      date_published: book.date_published || '',
      isbn: book.isbn || '',
      pages: book.pages ? Number(book.pages) : null,
      duration: book.duration ? validation.minutesToDuration(book.duration) : '',
      date_read: book.date_read,
      dnf: book.dnf || false,
      format: book.format ?? 'print',
      notes: book.notes || '',
      rating: book.rating ?? null,
      tags: book.tags ?? [],
      links: linksArray,
    };
  }
  return {
    title: '',
    author: '',
    date_published: '',
    isbn: '',
    pages: null,
    duration: '',
    date_read: validation.getTodayDate(),
    dnf: false,
    format: 'print',
    notes: '',
    tags: [],
    rating: null,
    links: [],
  };
};

const { isSaving } = toRefs(props);

const emit = defineEmits(['save', 'cancel']);

const formData = ref<FormData>(newFormData());

const originalData = ref<typeof formData.value>();
const showAuthorDropdown = ref(false);
const durationError = ref<string | null>(null);
const ratingError = ref<string | null>(null);
const inlineNotesTextarea = ref<HTMLTextAreaElement | null>(null);
const fullscreenNotesTextarea = ref<HTMLTextAreaElement | null>(null);
const goodreadsModalOpen = ref(false);
const fullscreenNotesOpen = ref(false);
const notesSaveTimeout = ref<NodeJS.Timeout | null>(null);

const NOTES_AUTO_SAVE_KEY = 'mybooks_editform_draft';

const getCurrentHash = (): string => {
  return props.book?._key ?? 'new';
};

const filteredAuthors = computed(() => {
  return validation.getFilteredAuthors(formData.value.author, props.allBooks);
});

const hasChanged = computed(() => {
  return JSON.stringify(formData.value) !== JSON.stringify(originalData.value);
});

const isValid = computed(() => {
  if (!formData.value.title.trim() || !formData.value.author.trim()) return false;
  if (durationError.value) return false;
  if (ratingError.value) return false;

  for (const link of formData.value.links) {
    const fields = [link.name, link.id, link.url].map(f => f.trim());
    if (fields.some(f => f) && !fields.every(f => f)) {
      return false;
    }
  }
  return true;
});

const formatDateInput = () => {
  formData.value.date_read = validation.formatDateString(formData.value.date_read);
};

const formatDurationInput = () => {
  const duration = formData.value.duration.trim();
  if (!duration) {
    durationError.value = null;
    return;
  }

  const result = validation.validateDuration(duration);
  durationError.value = result.error || null;
  if (result.formatted) {
    formData.value.duration = result.formatted;
  }
};

const validateRatingInput = () => {
  const rating = formData.value.rating;
  ratingError.value = null;

  if (!validation.isValidRating(rating)) {
    ratingError.value = 'Rating must be between 0 and 5';
    return;
  }

  if (rating !== null && rating !== undefined && rating !== 0 && rating) {
    formData.value.rating = Math.round(rating * 10) / 10;
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
  const draft: DraftNotes = {
    hash: getCurrentHash(),
    notes: formData.value.notes,
  };
  storage.saveJson(NOTES_AUTO_SAVE_KEY, draft);
};

const restoreNotesFromLocalStorage = () => {
  const draft = storage.loadJson<DraftNotes>(NOTES_AUTO_SAVE_KEY);
  if (draft && draft.hash === getCurrentHash()) {
    formData.value.notes = draft.notes;
  }
};

const clearNotesFromLocalStorage = () => {
  storage.clear(NOTES_AUTO_SAVE_KEY);
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
  formData.value.isbn = metadata.isbn || '';
  if (metadata.pages) {
    formData.value.pages = metadata.pages;
  }
  if (metadata.pubDate) {
    formData.value.date_published = metadata.pubDate;
  }
  if (metadata.goodreadsId) {
    const existingIndex = formData.value.links.findIndex(l => l.name.toLowerCase() === 'goodreads');
    const goodreadsLink = {
      name: 'goodreads',
      id: metadata.goodreadsId,
      url: `https://www.goodreads.com/book/show/${metadata.goodreadsId}`,
    };
    if (existingIndex >= 0) {
      formData.value.links[existingIndex] = goodreadsLink;
    } else {
      formData.value.links.push(goodreadsLink);
    }
  }
  goodreadsModalOpen.value = false;
};

const cancel = () => {
  clearNotesFromLocalStorage();
  emit('cancel');
};

const save = () => {
  if (!isValid.value) return;

  const { links: linksArray, ...values } = formData.value;
  const linksRecord = linksArray.reduce(
    (acc, link) => {
      if (link.name && link.id && link.url) {
        acc[link.name.toLowerCase()] = { id: link.id, url: link.url };
      }
      return acc;
    },
    {} as Record<string, { id: string; url: string }>
  );

  clearNotesFromLocalStorage();
  emit('save', {
    ...(props.book || {}),
    ...values,
    duration: values.duration ? validation.durationToMinutes(values.duration) : null,
    rating: values.rating ?? null,
    links: linksRecord,
  });
};

watch(
  () => props.book,
  () => {
    formData.value = newFormData(props.book || undefined);
    originalData.value = JSON.parse(JSON.stringify(formData.value));
    durationError.value = null;
    ratingError.value = null;
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
    position: relative;
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .form-header-title {
    margin-bottom: 0;
  }

  .form-header-actions {
    display: flex;
    flex-direction: row;
    gap: 0.75rem;
    align-items: center;
  }

  .form-header-actions button:first-child {
    flex: 1;
  }

  .form-header-actions button:last-child {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    width: auto;
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

.form-textarea {
  field-sizing: content;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.form-textarea {
  resize: none;
  min-height: 300px;
  line-height: 1.5;
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

.metadata-section {
  max-width: 700px;
}

.metadata-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5em 0;
}

.form-label-inline {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0;
}

.form-label-inline .label-text {
  margin-bottom: 0;
}

.error-message {
  color: var(--warning);
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.form-helper {
  color: var(--text-secondary);
  font-size: 0.8125rem;
  margin-top: 0.25rem;
  display: block;
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

button[type="submit"],
button[type="button"].btn-icon-text {
  flex: 0 0 400px;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
}

@media (max-width: 600px) {
  .form-footer {
    padding: 1rem;
    gap: 0.75rem;
  }

  button[type="submit"],
  button[type="button"].btn-icon-text {
    flex: 1;
    min-width: unset;
  }
}

.notes-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}


.notes-label {
  display: block;
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.link-entry {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr 40px;
  gap: 0.75rem;
  align-items: center;
}

.link-input {
  width: 100%;
}

.btn-remove {
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: 1px solid var(--border);
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-remove:hover {
  background-color: rgba(255, 107, 107, 0.1);
  color: var(--warning);
  border-color: var(--warning);
}

.btn-add-link {
  align-self: flex-start;
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
