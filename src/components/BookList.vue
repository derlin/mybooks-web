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
        <button @click="$emit('logout')" class="logout-btn">Logout</button>
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
            <input v-model="globalFilter" type="text" placeholder="Search books..." class="search-input" />
            <button v-if="globalFilter" class="clear-search-btn" @click="globalFilter = ''" title="Clear search">
              ✕
            </button>
          </div>
          <button
            class="filters-toggle-btn"
            :class="{ active: filtersOpen }"
            @click="filtersOpen = !filtersOpen"
            title="Toggle filters"
          >
            ☰
          </button>
        </div>
        <div v-if="filtersOpen" class="filters-collapsible">
          <select v-model="searchFieldsFilter" class="filter-select">
            <option value="anything">Search: Anything</option>
            <option value="title">Search: Title</option>
            <option value="author">Search: Author</option>
            <option value="title+author">Search: Title + Author</option>
            <option value="date">Search: Date</option>
            <option value="notes">Search: Notes</option>
          </select>
          <div class="filters">
            <div class="filter-group">
              <label>Format:</label>
              <select v-model="audiobookFilter" class="filter-select">
                <option value="all">All</option>
                <option value="audiobook">Audiobook</option>
                <option value="paper">Paper</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Status:</label>
              <select v-model="dnfFilter" class="filter-select">
                <option value="all">All</option>
                <option value="finished">Finished</option>
                <option value="dnf">DNF</option>
              </select>
            </div>
          </div>
        </div>
        <div v-else class="filters-desktop">
          <select v-model="searchFieldsFilter" class="filter-select">
            <option value="anything">Search: Anything</option>
            <option value="title">Search: Title</option>
            <option value="author">Search: Author</option>
            <option value="title+author">Search: Title + Author</option>
            <option value="date">Search: Date</option>
            <option value="notes">Search: Notes</option>
          </select>
          <div class="filters">
            <div class="filter-group">
              <label>Format:</label>
              <select v-model="audiobookFilter" class="filter-select">
                <option value="all">All</option>
                <option value="audiobook">Audiobook</option>
                <option value="paper">Paper</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Status:</label>
              <select v-model="dnfFilter" class="filter-select">
                <option value="all">All</option>
                <option value="finished">Finished</option>
                <option value="dnf">DNF</option>
              </select>
            </div>
          </div>
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
    :key="`${selectedBook?._key}-${isNewBook}`"
    :book="selectedBook"
    :isNewBook="isNewBook"
    :allBooks="books"
    :errorMessage="error"
    :isSaving="isSaving"
    @save="handleEditSave"
    @cancel="editFormOpen = false"
  />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { downloadBooks, uploadBooks } from '../services/dropbox';
import DetailsDrawer from './DetailsDrawer.vue';
import EditForm from './EditForm.vue';

defineEmits(['logout']);

const books = ref([]);
const loading = ref(true);
const error = ref(null);
const globalFilter = ref('');
const dnfFilter = ref('all'); // 'all', 'dnf', 'finished'
const audiobookFilter = ref('all'); // 'all', 'audiobook', 'paper'
const searchFieldsFilter = ref('anything'); // 'anything', 'title', 'author', 'title+author', 'date', 'notes'
const filtersOpen = ref(false);
const sorting = ref([{ id: 'date', desc: true }]);
const selectedBook = ref(null);
const drawerOpen = ref(false);
const editFormOpen = ref(false);
const isNewBook = ref(false);
const successMessage = ref(null);
const undoData = ref(null);
const undoTimeout = ref(null);
const isSaving = ref(false);

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
  let filtered = books.value;

  // Apply DNF filter
  if (dnfFilter.value === 'dnf') {
    filtered = filtered.filter((b) => b.dnf);
  } else if (dnfFilter.value === 'finished') {
    filtered = filtered.filter((b) => !b.dnf);
  }

  // Apply format filter
  if (audiobookFilter.value === 'audiobook') {
    filtered = filtered.filter((b) => b.meta?.duration);
  } else if (audiobookFilter.value === 'paper') {
    filtered = filtered.filter((b) => !b.meta?.duration);
  }

  if (globalFilter.value) {
    const query = globalFilter.value.toLowerCase();
    filtered = filtered.filter((b) => {
      switch (searchFieldsFilter.value) {
        case 'title':
          return b.title?.toLowerCase().includes(query);
        case 'author':
          return b.author?.toLowerCase().includes(query);
        case 'title+author':
          return b.title?.toLowerCase().includes(query) || b.author?.toLowerCase().includes(query);
        case 'date':
          return b.date?.toLowerCase().includes(query);
        case 'notes':
          return b.notes?.toLowerCase().includes(query);
        case 'anything':
        default:
          return (
            b.title?.toLowerCase().includes(query) ||
            b.author?.toLowerCase().includes(query) ||
            b.date?.toLowerCase().includes(query) ||
            b.notes?.toLowerCase().includes(query)
          );
      }
    });
  }

  if (sorting.value.length > 0) {
    const { id, desc } = sorting.value[0];
    filtered = [...filtered].sort((a, b) => {
      if (id === 'date') {
        const aDigits = extractDateNumbers(a.date);
        const bDigits = extractDateNumbers(b.date);
        const aNum = parseInt(aDigits) || 0;
        const bNum = parseInt(bDigits) || 0;

        if (aNum !== bNum) {
          return desc ? bNum - aNum : aNum - bNum;
        }
        const aTitle = a.title?.toLowerCase() || '';
        const bTitle = b.title?.toLowerCase() || '';
        return aTitle.localeCompare(bTitle);
      }

      if (id === 'pages') {
        const aPages = a.meta?.pages || 0;
        const bPages = b.meta?.pages || 0;

        if (aPages !== bPages) {
          return desc ? bPages - aPages : aPages - bPages;
        }
        return 0;
      }

      if (id === 'duration') {
        const aDuration = a.meta?.duration || 0;
        const bDuration = b.meta?.duration || 0;

        if (aDuration !== bDuration) {
          return desc ? bDuration - aDuration : aDuration - bDuration;
        }
        return 0;
      }

      let aVal = a[id];
      let bVal = b[id];

      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return desc ? 1 : -1;
      if (aVal > bVal) return desc ? -1 : 1;
      return 0;
    });
  }

  return filtered;
});

const extractDateNumbers = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.replace(/\D/g, '');
};

const formatDuration = (minutes) => {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
};

const toggleSort = (columnId) => {
  if (sorting.value[0]?.id === columnId) {
    sorting.value[0].desc = !sorting.value[0].desc;
  } else {
    sorting.value = [{ id: columnId, desc: false }];
  }
};

const openDrawer = (book) => {
  if (selectedBook.value?._key === book._key) {
    drawerOpen.value = !drawerOpen.value;
  } else {
    selectedBook.value = book;
    drawerOpen.value = true;
  }
};

const openEditForm = (book) => {
  selectedBook.value = book;
  isNewBook.value = false;
  editFormOpen.value = true;
};

const openNewBook = () => {
  selectedBook.value = null;
  isNewBook.value = true;
  editFormOpen.value = true;
};

const deleteBook = async (book) => {
  try {
    const booksCopy = {
      ...Object.fromEntries(books.value.map((b) => [b._key, { ...b }])),
    };

    // Store for undo
    undoData.value = {
      key: book._key,
      book: booksCopy[book._key],
    };

    // Remove from local state
    delete booksCopy[book._key];
    books.value = books.value.filter((b) => b._key !== book._key);

    // Upload to Dropbox
    await uploadBooks(booksCopy);

    // Show delete toast with undo button
    successMessage.value = 'deleted';

    // Clear any existing undo timeout
    if (undoTimeout.value) {
      clearTimeout(undoTimeout.value);
    }

    // Auto-undo after 5 seconds if not manually undone
    undoTimeout.value = setTimeout(() => {
      undoData.value = null;
      successMessage.value = null;
    }, 5000);
  } catch (err) {
    error.value = err.message || 'Failed to delete book';
    // Restore local state on error
    books.value.push(undoData.value.book);
    undoData.value = null;
  }
};

const undoDelete = async () => {
  if (!undoData.value) return;

  try {
    const booksCopy = {
      ...Object.fromEntries(books.value.map((b) => [b._key, { ...b }])),
    };

    // Restore book
    booksCopy[undoData.value.key] = undoData.value.book;
    books.value.push({
      ...undoData.value.book,
      _key: undoData.value.key,
    });

    // Upload to Dropbox
    await uploadBooks(booksCopy);

    // Clear undo
    if (undoTimeout.value) {
      clearTimeout(undoTimeout.value);
    }
    undoData.value = null;
    successMessage.value = 'Book restored';

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    error.value = err.message || 'Failed to restore book';
  }
};

const normalizeTitle = (title) => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const handleEditSave = async (editedBook) => {
  isSaving.value = true;
  try {
    const booksCopy = {
      ...Object.fromEntries(books.value.map((b) => [b._key, { ...b }])),
    };

    const key = isNewBook.value ? normalizeTitle(editedBook.title) : selectedBook.value._key;

    // Remove old key if renaming
    if (!isNewBook.value && selectedBook.value._key !== key) {
      delete booksCopy[selectedBook.value._key];
    }

    booksCopy[key] = {
      title: editedBook.title,
      author: editedBook.author,
      date: editedBook.date,
      dnf: editedBook.dnf,
      notes: editedBook.notes,
      meta: {
        pages: editedBook.meta.pages,
        duration: editedBook.meta.duration,
        GoodreadsID: editedBook.meta.GoodreadsID,
        ISBN: editedBook.meta.ISBN,
        pubDate: editedBook.meta.pubDate,
      },
    };

    await uploadBooks(booksCopy);

    if (isNewBook.value) {
      books.value.push({
        ...booksCopy[key],
        _key: key,
      });
    } else {
      const bookIndex = books.value.findIndex((b) => b._key === selectedBook.value._key);
      if (bookIndex >= 0) {
        // Update the existing book object in place to maintain reactivity
        Object.assign(books.value[bookIndex], {
          ...booksCopy[key],
          _key: key,
        });
      }
    }

    error.value = null;
    successMessage.value = isNewBook.value ? 'Book added successfully' : 'Book saved successfully';
    editFormOpen.value = false;

    // Auto-dismiss success message after 3 seconds
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
  } catch (err) {
    error.value = err.message || 'Failed to save book';
  } finally {
    isSaving.value = false;
  }
};

onMounted(async () => {
  try {
    const data = await downloadBooks();
    books.value = Object.entries(data).map(([key, book]) => ({
      ...book,
      _key: key,
    }));
  } catch (err) {
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
  flex-direction: column;
  gap: 1rem;
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

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-group label {
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.15s;
}

.filter-select:hover {
  border-color: var(--accent-primary);
}

.filter-select:focus {
  outline: none;
  border-color: var(--accent-primary);
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
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }

  .filters {
    flex-direction: column;
    width: 100%;
  }

  .filter-group {
    width: 100%;
  }

  .filter-select {
    width: 100%;
  }

  .row-count {
    display: block;
    text-align: right;
  }
}
</style>
