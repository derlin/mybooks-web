<template>
  <div class="form-wrapper">
    <div class="form-header">
      <h1>{{ isNewBook ? 'Add New Book' : 'Edit Book' }}</h1>
      <div class="form-header-actions">
        <button
          class="goodreads-btn"
          @click="goodreadsModalOpen = true"
          title="Import metadata from Goodreads"
        >
          From Goodreads
        </button>
        <button class="cancel-btn" @click="cancel">Cancel</button>
      </div>
    </div>

    <div v-if="props.errorMessage" class="error-banner">
      {{ props.errorMessage }}
    </div>

    <form @submit.prevent="save" class="form-content">
      <div class="form-section">
        <label class="form-label">
          <span class="label-text">Title *</span>
          <input
            v-model="formData.title"
            type="text"
            placeholder="Book title"
            class="form-input"
            required
          />
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
            <div
              v-if="showAuthorDropdown && filteredAuthors.length"
              class="autocomplete-dropdown"
            >
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
            @blur="formatDate"
          />
        </label>

        <label class="form-label">
          <input v-model="formData.dnf" type="checkbox" class="form-checkbox" />
          <span>Did Not Finish (DNF)</span>
        </label>
      </div>

      <div class="form-section notes-section">
        <label class="form-label">
          <span class="label-text">Notes</span>
          <textarea
            ref="notesTextarea"
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
              @blur="formatDuration"
            />
            <div v-if="durationError" class="error-message">
              {{ durationError }}
            </div>
          </label>

          <label class="form-label">
            <span class="label-text">Goodreads ID</span>
            <input
              v-model="formData.meta.GoodreadsID"
              type="text"
              placeholder="Goodreads ID"
              class="form-input"
            />
          </label>

          <label class="form-label">
            <span class="label-text">ISBN</span>
            <input
              v-model="formData.meta.ISBN"
              type="text"
              placeholder="ISBN"
              class="form-input"
            />
          </label>

          <label class="form-label">
            <span class="label-text">Publication Date</span>
            <input
              v-model="formData.meta.pubDate"
              type="text"
              placeholder="YYYY-MM-DD"
              class="form-input"
            />
          </label>
        </div>
      </div>

      <div class="form-footer">
        <button
          type="button"
          class="btn-cancel"
          @click="cancel"
          :disabled="isSaving"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn-save"
          :disabled="!hasChanged || !isValid || isSaving"
        >
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </form>

    <GoodreadsModal
      :isOpen="goodreadsModalOpen"
      @close="goodreadsModalOpen = false"
      @metadata-fetched="handleGoodreadsData"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, toRefs } from 'vue';
import GoodreadsModal from './GoodreadsModal.vue';

const props = defineProps({
  book: {
    type: Object,
    default: null,
  },
  allBooks: {
    type: Array,
    required: true,
  },
  isNewBook: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: null,
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
});

const { isSaving } = toRefs(props);

const emit = defineEmits(['save', 'cancel']);

const formData = ref({
  title: '',
  author: '',
  date: '',
  dnf: false,
  notes: '',
  meta: {
    pages: null,
    duration: '',
    GoodreadsID: '',
    ISBN: '',
    pubDate: '',
  },
});

const originalData = ref({});
const showAuthorDropdown = ref(false);
const durationError = ref(null);
const notesTextarea = ref(null);
const goodreadsModalOpen = ref(false);

const durationRegex = /^(\d+)h(\d{1,2})?$/;

const filteredAuthors = computed(() => {
  if (!formData.value.author) return [];
  const query = formData.value.author.toLowerCase();
  const authors = new Set(
    props.allBooks
      .map((b) => b.author)
      .filter((a) => a && a.toLowerCase().includes(query))
  );
  return Array.from(authors).sort();
});

const hasChanged = computed(() => {
  return JSON.stringify(formData.value) !== JSON.stringify(originalData.value);
});

const isValid = computed(() => {
  if (!formData.value.title.trim() || !formData.value.author.trim())
    return false;
  if (durationError.value) return false;
  return true;
});

const formatDate = () => {
  let date = formData.value.date.trim();
  if (!date) return;

  if (date === '?') return;

  const parts = date.split('-');
  if (parts.length === 1) {
    if (/^\d{4}$/.test(parts[0])) return;
  } else if (parts.length === 2) {
    parts[1] = parts[1].padStart(2, '0');
    formData.value.date = parts.join('-');
  } else if (parts.length === 3) {
    parts[1] = parts[1].padStart(2, '0');
    parts[2] = parts[2].padStart(2, '0');
    formData.value.date = parts.join('-');
  }
};

const formatDuration = () => {
  const duration = formData.value.meta.duration.trim();
  if (!duration) {
    durationError.value = null;
    return;
  }

  const match = duration.match(durationRegex);
  if (!match) {
    durationError.value = 'Format: Xh or Xh:MM (e.g., 7h34)';
    return;
  }

  const hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;

  if (minutes > 59) {
    durationError.value = 'Minutes must be 0-59';
    return;
  }

  durationError.value = null;
  formData.value.meta.duration = `${hours}h${String(minutes).padStart(2, '0')}`;
};

const autoGrowTextarea = () => {
  const textarea = notesTextarea.value;
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

const handleGoodreadsData = (metadata) => {
  formData.value.title = metadata.title;
  formData.value.author = metadata.author;
  formData.value.meta.ISBN = metadata.isbn;
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
  emit('cancel');
};

const durationToMinutes = (durationStr) => {
  if (!durationStr) return null;
  const match = durationStr.match(/^(\d+)h(\d{1,2})$/);
  if (!match) return null;
  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  return hours * 60 + minutes;
};

const save = () => {
  if (!isValid.value) return;

  emit('save', {
    ...formData.value,
    meta: {
      ...formData.value.meta,
      duration: durationToMinutes(formData.value.meta.duration),
      pages: formData.value.meta.pages || null,
      GoodreadsID: formData.value.meta.GoodreadsID || null,
      ISBN: formData.value.meta.ISBN || null,
      pubDate: formData.value.meta.pubDate || null,
    },
  });
};

watch(
  () => [props.book, props.isNewBook],
  () => {
    if (props.isNewBook || !props.book) {
      formData.value = {
        title: '',
        author: '',
        date: '',
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
    } else {
      formData.value = {
        title: props.book.title,
        author: props.book.author,
        date: props.book.date,
        dnf: props.book.dnf || false,
        notes: props.book.notes || '',
        meta: {
          pages: props.book.meta?.pages || null,
          duration: props.book.meta?.duration
            ? `${Math.floor(props.book.meta.duration / 60)}h${String(props.book.meta.duration % 60).padStart(2, '0')}`
            : '',
          GoodreadsID: props.book.meta?.GoodreadsID || '',
          ISBN: props.book.meta?.ISBN || '',
          pubDate: props.book.meta?.pubDate || '',
        },
      };
    }
    originalData.value = JSON.parse(JSON.stringify(formData.value));
    durationError.value = null;
    nextTick(() => {
      autoGrowTextarea();
    });
  },
  { immediate: true, deep: true }
);
</script>

<style scoped>
.form-wrapper {
  width: 100%;
  height: 100%;
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
}

.form-header h1 {
  margin: 0;
  color: var(--accent-primary);
  font-size: 1.8rem;
  flex: 1;
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

.form-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
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
  background-color: var(--bg-secondary);
  justify-content: flex-end;
  margin: 0 auto;
  width: 100%;
  max-width: 700px;
}

.btn-cancel,
.btn-save {
  flex: 1;
  padding: 0.75rem;
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

.btn-cancel:hover {
  background-color: var(--bg-hover);
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
</style>
