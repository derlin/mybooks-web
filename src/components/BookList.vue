<template>
  <div
    v-if="successMessage"
    class="toast-notification"
    :class="{
      success: successMessage !== 'deleted',
      delete: successMessage === 'deleted',
    }"
  >
    <span v-if="successMessage === 'deleted'">
      Book deleted
      <button class="undo-btn" @click="undoDelete">Undo</button>
    </span>
    <span v-else>{{ successMessage }}</span>
  </div>

  <div v-if="!editFormOpen" class="book-list-container">
    <div class="header">
      <img src="@/assets/logo.svg" alt="MyBooks" class="logo logo-header" />
      <div class="header-actions">
        <button @click="openNewBook" class="add-btn" title="Add new book">+</button>
        <button @click="emit('logout')" class="logout-btn">Logout</button>
      </div>
    </div>

    <div v-if="loading" class="content">
      <p class="loading">Loading books...</p>
    </div>

    <div v-else-if="error" class="content">
      <p class="error">{{ error }}</p>
    </div>

    <div v-else-if="!books || books.length === 0" class="content">
      <p class="empty">No books yet. Add your first book!</p>
    </div>

    <div v-else class="table-wrapper">
      <div class="controls">
        <div class="search-bar">
          <div class="search-input-wrapper">
            <input
              ref="searchInput"
              v-model="globalFilter"
              type="text"
              placeholder="Search books..."
              class="search-input"
              @keydown="handleSearchKeyboard"
              @keyup="handleSearchKeyboard"
            />
            <button
              v-if="globalFilter"
              type="button"
              class="clear-search-btn"
              @click="
                globalFilter = '';
                searchInput?.blur();
              "
              title="Clear search"
            >
              ✕
            </button>
          </div>
          <button
            type="button"
            class="filters-toggle-btn"
            :class="{ active: filtersOpen }"
            @click="filtersOpen = !filtersOpen"
            title="Toggle filters"
          >
            ☰
          </button>
        </div>
        <div v-if="filtersOpen" class="filters-collapsible">
          <BookFilters
            :search-fields-filter="searchFieldsFilter"
            :audiobook-filter="audiobookFilter"
            :dnf-filter="dnfFilter"
            @update:search-fields-filter="searchFieldsFilter = $event"
            @update:audiobook-filter="audiobookFilter = $event"
            @update:dnf-filter="dnfFilter = $event"
          />
        </div>
        <div v-else class="filters-desktop">
          <BookFilters
            :search-fields-filter="searchFieldsFilter"
            :audiobook-filter="audiobookFilter"
            :dnf-filter="dnfFilter"
            @update:search-fields-filter="searchFieldsFilter = $event"
            @update:audiobook-filter="audiobookFilter = $event"
            @update:dnf-filter="dnfFilter = $event"
          />
        </div>
        <span class="row-count"
          ><span class="row-count-filtered">{{ filteredAndSortedBooks.length }}</span>
          <span class="row-count-separator">/</span>
          {{ books.length }}</span
        >
      </div>

      <div class="table-scroll">
        <table class="books-table">
          <thead>
            <tr>
              <th
                v-for="column in columns"
                :key="column.id"
                @click="toggleSort(column.id)"
                :class="{ sortable: column.enableSorting }"
              >
                <div class="header-cell">
                  {{ column.header }}
                  <span v-if="sorting[0]?.id === column.id" class="sort-indicator">
                    {{ sorting[0].desc ? '▼' : '▲' }}
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in filteredAndSortedBooks"
              :key="row._key"
              class="table-row"
              :class="{ audiobook: row.meta?.duration }"
              @click="openDrawer(row)"
            >
              <td>{{ row.author || '—' }}</td>
              <td>{{ row.title }}</td>
              <td>{{ row.date || '—' }}</td>
              <td class="duration-cell">
                {{ row.meta?.duration ? formatDuration(row.meta?.duration) : '—' }}
              </td>
              <td class="pages-cell">
                {{ row.meta?.pages || '—' }}
              </td>
              <td class="boolean-cell">
                <span v-if="row.dnf" class="badge dnf">DNF</span>
              </td>
              <td class="actions-cell">
                <button class="action-btn edit-btn" title="Edit" @click.stop="openEditForm(row)">✎</button>
                <button class="action-btn delete-btn" title="Delete" @click.stop="deleteBook(row)">×</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <DetailsDrawer
      v-if="selectedBook"
      :book="selectedBook"
      :isOpen="drawerOpen"
      @close="drawerOpen = false"
      @edit="openEditForm(selectedBook)"
      @delete="
        deleteBook(selectedBook);
        drawerOpen = false;
      "
    />
  </div>

  <EditForm
    v-else
    :key="selectedBook?._key || 'new'"
    :book="selectedBook"
    :allBooks="books"
    :errorMessage="error"
    :isSaving="isSaving"
    @save="handleEditSave"
    @cancel="closeForm"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { BooksProvider } from '../services/booksProvider';
import type { Book } from '../types';
import { normalizeTitle } from '../utils/books';
import { filterAndSort } from '../utils/filtering';
import { formatDuration } from '../utils/formatting';
import { checkDuplicateTitle } from '../utils/validation';
import BookFilters from './BookFilters.vue';
import DetailsDrawer from './DetailsDrawer.vue';
import EditForm from './EditForm.vue';

const props = defineProps<{ booksProvider: BooksProvider; filesChanged?: boolean }>();
const emit = defineEmits(['logout', 'files-refreshed']);

const books = ref<Book[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const globalFilter = ref('');
const dnfFilter = ref('all'); // 'all', 'dnf', 'finished'
const audiobookFilter = ref('all'); // 'all', 'audiobook', 'paper'
const searchFieldsFilter = ref('anything'); // 'anything', 'title', 'author', 'title+author', 'date', 'notes'
const filtersOpen = ref(false);
const sorting = ref([{ id: 'date', desc: true }]);
const selectedBook = ref<Book | null>(null);
const drawerOpen = ref(false);
const editFormOpen = ref(false);
const successMessage = ref<string | null>(null);
const undoData = ref<{ key: string; book: Book } | null>(null);
const undoTimeout = ref<NodeJS.Timeout | null>(null);
const isSaving = ref(false);
const searchInput = ref<HTMLInputElement | null>(null);

const columns = [
  { id: 'author', header: 'Author', enableSorting: true },
  { id: 'title', header: 'Title', enableSorting: true },
  { id: 'date', header: 'Read', enableSorting: true },
  { id: 'duration', header: 'Duration', enableSorting: true },
  { id: 'pages', header: 'Pages', enableSorting: true },
  { id: 'dnf', header: 'DNF?', enableSorting: true },
  { id: 'actions', header: 'Actions', enableSorting: false },
];

const filteredAndSortedBooks = computed(() => {
  if (sorting.value.length === 0) return books.value;

  const { id, desc } = sorting.value[0];
  return filterAndSort(books.value, {
    dnfFilter: dnfFilter.value,
    audiobookFilter: audiobookFilter.value,
    searchQuery: globalFilter.value,
    searchField: searchFieldsFilter.value,
    sortBy: id,
    sortDesc: desc,
  });
});

const dismissMessageAfter = (ms = 3000) => {
  setTimeout(() => {
    successMessage.value = null;
  }, ms);
};

const handleSearchKeyboard = (keyboardEvent: KeyboardEvent) => {
  if (keyboardEvent.key === 'Enter' || keyboardEvent.keyCode === 13) {
    searchInput.value?.blur();
  }
};

const toggleSort = (columnId: string) => {
  if (sorting.value[0]?.id === columnId) {
    sorting.value[0].desc = !sorting.value[0].desc;
  } else {
    sorting.value = [{ id: columnId, desc: false }];
  }
};

const setFormHash = (mode?: string | null, bookKey?: string) => {
  if (!mode) {
    window.location.hash = '';
  } else if (mode === 'new') {
    window.location.hash = 'new';
  } else if (mode === 'edit' && bookKey) {
    window.location.hash = bookKey;
  }
};

const restoreFormFromHash = () => {
  const hash = decodeURIComponent(window.location.hash.slice(1));
  if (hash === 'new') {
    openNewBook();
  } else if (hash) {
    const book = books.value.find((b) => b._key === hash);
    if (book) {
      openEditForm(book);
    } else {
      window.location.hash = '';
    }
  }
};

const openDrawer = (book: Book) => {
  if (selectedBook.value?._key === book._key) {
    drawerOpen.value = !drawerOpen.value;
  } else {
    selectedBook.value = book;
    drawerOpen.value = true;
  }
};

const openEditForm = (book: Book) => {
  selectedBook.value = book;
  editFormOpen.value = true;
  setFormHash('edit', book._key);
};

const openNewBook = () => {
  selectedBook.value = null;
  editFormOpen.value = true;
  setFormHash('new');
};

const closeForm = () => {
  editFormOpen.value = false;
  error.value = null;
  setFormHash();
};

const loadBooksFromDropbox = async () => {
  books.value = await props.booksProvider.downloadBooks();
};

const checkRevisionBeforeOperation = async (operationName: string) => {
  try {
    const revisionChanged = await props.booksProvider.checkFileRevision();
    if (revisionChanged) {
      console.log(`[Books] ${operationName} aborted: file revision changed, reloading`);
      await loadBooksFromDropbox();
      error.value = 'Books were updated by another session. Please review changes and try again.';
      return false;
    }
    return true;
  } catch (err: any) {
    console.error(`[Books] Error checking revision before ${operationName}:`, err);
    error.value = 'Failed to verify book state. Please try again.';
    return false;
  }
};

const deleteBook = async (book: Book) => {
  if (!(await checkRevisionBeforeOperation('delete'))) {
    return;
  }

  try {
    const deletedBook = books.value.find((b) => b._key === book._key);
    if (!deletedBook) return;

    // Store for undo before removing
    undoData.value = {
      key: book._key,
      book: deletedBook,
    };

    // Remove from local state
    books.value = books.value.filter((b) => b._key !== book._key);

    // Upload to Dropbox
    await props.booksProvider.uploadBooks(books.value);

    // Show delete toast with undo button
    successMessage.value = 'deleted';

    // Clear any existing undo timeout
    if (undoTimeout.value) {
      clearTimeout(undoTimeout.value);
    }

    // Auto-dismiss after 5 seconds if not manually undone
    undoTimeout.value = setTimeout(() => {
      undoData.value = null;
      successMessage.value = null;
    }, 5000);
  } catch (err: any) {
    // Restore local state on error
    if (undoData.value) {
      books.value.push(undoData.value.book);
    }
    error.value = err.message || 'Failed to delete book';
    undoData.value = null;
  }
};

const undoDelete = async () => {
  if (!undoData.value) return;

  try {
    // Restore book to array
    books.value.push(undoData.value.book);

    // Upload to Dropbox
    await props.booksProvider.uploadBooks(books.value);

    // Clear undo
    if (undoTimeout.value) {
      clearTimeout(undoTimeout.value);
    }
    undoData.value = null;
    successMessage.value = 'Book restored';

    // Auto-dismiss after 3 seconds
    dismissMessageAfter(3000);
  } catch (err: any) {
    // Rollback on error
    books.value = books.value.filter((b) => b._key !== undoData.value!.key);
    error.value = err.message || 'Failed to restore book';
  }
};

const handleEditSave = async (editedBook: any) => {
  const isNew = !selectedBook.value;
  if (!(await checkRevisionBeforeOperation('save'))) {
    isSaving.value = false;
    return;
  }

  const duplicateCheck = checkDuplicateTitle(editedBook.title, books.value, selectedBook.value?._key);
  if (duplicateCheck.isDuplicate) {
    error.value = duplicateCheck.error;
    isSaving.value = false;
    return;
  }

  isSaving.value = true;
  try {
    const newKey = isNew ? normalizeTitle(editedBook.title) : selectedBook.value!._key;

    const bookToSave: Book = {
      title: editedBook.title,
      author: editedBook.author,
      date: editedBook.date,
      dnf: editedBook.dnf,
      notes: editedBook.notes,
      meta: editedBook.meta,
      _key: newKey,
    };

    // Build new books array
    let newBooks: Book[];
    if (isNew) {
      // New book: add to array
      newBooks = [...books.value, bookToSave];
    } else {
      const oldKey = selectedBook.value!._key;
      if (oldKey === newKey) {
        // Edit without rename: replace in place
        newBooks = books.value.map((b) => (b._key === oldKey ? bookToSave : b));
      } else {
        // Rename: remove old key, add with new key
        newBooks = [...books.value.filter((b) => b._key !== oldKey), bookToSave];
      }
    }

    // Upload to Dropbox
    await props.booksProvider.uploadBooks(newBooks);

    // Update local state only after successful upload
    books.value = newBooks;
    selectedBook.value = bookToSave;
    error.value = null;
    successMessage.value = isNew ? 'Book added successfully' : 'Book saved successfully';
    closeForm();
    dismissMessageAfter(3000);
  } catch (err: any) {
    error.value = err.message || 'Failed to save book';
  } finally {
    isSaving.value = false;
  }
};

watch(
  () => props.filesChanged,
  async (changed) => {
    if (changed) {
      console.log('[Books] File revision changed, reloading from Dropbox');
      try {
        await loadBooksFromDropbox();
        console.log(`[Books] Reloaded ${books.value.length} books from Dropbox`);
        successMessage.value = 'Books updated from Dropbox';
        dismissMessageAfter(3000);
      } catch (err: any) {
        error.value = err.message || 'Failed to refresh books';
        console.error('[Books] Error reloading from Dropbox:', err);
      }
      emit('files-refreshed');
    }
  }
);

onMounted(async () => {
  try {
    await loadBooksFromDropbox();
    restoreFormFromHash();
  } catch (err: any) {
    console.error(err);
    error.value = err.message || 'Failed to load books';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.book-list-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(--bg-primary);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
}

h1 {
  color: var(--accent-primary);
  margin: 0;
  font-size: 1.8rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.add-btn {
  background-color: var(--accent-primary);
  color: var(--bg-primary);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  font-size: 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-btn:hover {
  opacity: 0.9;
}

.logout-btn {
  background-color: transparent;
  border: 1px solid var(--accent-primary);
  color: var(--accent-primary);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.logout-btn:hover {
  background-color: var(--accent-primary);
  color: var(--bg-primary);
}

.content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.loading {
  color: var(--text-secondary);
}

.error {
  color: var(--warning);
}

.empty {
  color: var(--text-secondary);
}

.table-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 1.5rem;
}

.controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
}

.filters-toggle-btn {
  display: none;
  background-color: var(--accent-primary);
  color: var(--bg-primary);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  font-size: 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.filters-toggle-btn:hover {
  opacity: 0.9;
}

.filters-toggle-btn.active {
  background-color: var(--accent-secondary);
}

.filters-collapsible {
  display: none;
  width: 100%;
}

.filters-desktop {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 1rem;
}

.search-input::placeholder {
  color: var(--text-secondary);
}

/* Hide browser's native clear button */
.search-input::-webkit-search-cancel-button {
  display: none;
}

.search-input::-webkit-search-decoration {
  display: none;
}

.clear-search-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s;
  flex-shrink: 0;
}

.clear-search-btn:hover {
  color: var(--text-primary);
}

.row-count {
  color: #fff;
  font-size: 0.9rem;
  white-space: nowrap;
  min-width: 5.5rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.row-count-filtered {
  color: var(--accent-primary);
}

.row-count-separator {
  color: var(--text-secondary);
  margin: 0 0.4rem;
}

.filters {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 0.9rem;
  user-select: none;
}

.checkbox-label input {
  cursor: pointer;
}

.table-scroll {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 4px;
}

.books-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--bg-secondary);
  font-size: 0.95rem;
}

.books-table thead {
  background-color: var(--bg-secondary);
  border-bottom: 2px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.books-table th {
  padding: 1rem;
  text-align: left;
  color: var(--accent-primary);
  font-weight: 600;
  user-select: none;
}

.books-table th.sortable {
  cursor: pointer;
}

.header-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-indicator {
  font-size: 0.7rem;
  opacity: 0.7;
}

.books-table tbody tr {
  border-bottom: 1px solid var(--border);
  transition: background-color 0.15s;
  cursor: pointer;
}

.books-table tbody tr.audiobook {
  background-color: rgba(33, 150, 243, 0.15);
}

.books-table tbody tr.audiobook:hover {
  background-color: rgba(33, 150, 243, 0.28);
}

.books-table tbody tr:not(.audiobook):hover {
  background-color: var(--bg-hover);
}

.books-table tbody tr:last-child {
  border-bottom: none;
}

.books-table td {
  padding: 1rem;
  color: var(--text-primary);
}

.duration-cell,
.pages-cell,
.boolean-cell {
  text-align: center;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.badge.audiobook {
  background-color: rgba(0, 217, 255, 0.2);
  color: var(--accent-primary);
}

.badge.dnf {
  background-color: rgba(255, 107, 107, 0.2);
  color: var(--warning);
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
}

.action-btn {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.3rem 0.4rem;
  cursor: pointer;
  font-size: 1rem;
  color: var(--accent-primary);
  opacity: 0.7;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.action-btn:hover {
  opacity: 1;
  background-color: var(--bg-hover);
}

.delete-btn {
  color: var(--warning);
}

.toast-notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem 1.5rem;
  border-radius: 4px;
  font-weight: 500;
  z-index: 300;
  animation: slideDown 0.3s ease-out;
  max-width: 90%;
}

@keyframes slideDown {
  from {
    transform: translateX(-50%) translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

.toast-notification.success {
  background-color: rgba(81, 207, 102, 0.9);
  color: #fff;
  box-shadow: 0 4px 12px rgba(81, 207, 102, 0.3);
}

.toast-notification.delete {
  background-color: rgba(255, 107, 107, 0.9);
  color: #fff;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.undo-btn {
  background-color: rgba(255, 255, 255, 0.2);
  border: 1px solid #fff;
  color: #fff;
  padding: 0.4rem 0.8rem;
  border-radius: 3px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: background-color 0.15s;
}

.undo-btn:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .search-bar {
    flex-direction: row;
    width: 100%;
  }

  .search-input {
    flex: 1;
  }

  .filters-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .filters-desktop {
    display: none;
  }

  .filters-collapsible {
    display: flex;
    width: 100%;
  }

  .row-count {
    display: block;
    text-align: right;
  }
}
</style>
