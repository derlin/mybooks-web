<template>
  <div v-if="!isEditFormOpen" class="book-list-container">
    <div class="header">
      <img src="@/assets/logo.svg" alt="MyBooks" class="logo logo-header" />
      <div class="header-actions">
        <button @click="cycleViewMode" class="view-mode-btn" :title="`Switch view (currently: ${getViewModeLabel(viewPreference)})`">
          {{ getViewModeLabel(viewPreference) }}
        </button>
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
              v-model="filters.query"
              type="text"
              placeholder="Search books..."
              class="search-input"
              @keydown="handleSearchKeyboard"
              @keyup="handleSearchKeyboard"
            />
            <button
              v-if="filters.query"
              type="button"
              class="clear-search-btn"
              @click="
                filters.query = '';
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
            :search-fields-filter="filters.searchField"
            :audiobook-filter="filters.audiobook"
            :dnf-filter="filters.dnf"
            @update:search-fields-filter="filters.searchField = $event"
            @update:audiobook-filter="filters.audiobook = $event"
            @update:dnf-filter="filters.dnf = $event"
          />
        </div>
        <div v-else class="filters-desktop">
          <BookFilters
            :search-fields-filter="filters.searchField"
            :audiobook-filter="filters.audiobook"
            :dnf-filter="filters.dnf"
            @update:search-fields-filter="filters.searchField = $event"
            @update:audiobook-filter="filters.audiobook = $event"
            @update:dnf-filter="filters.dnf = $event"
          />
        </div>
        <span class="row-count"
          ><span class="row-count-filtered">{{ filteredAndSortedBooks.length }}</span>
          <span class="row-count-separator">/</span>
          {{ books.length }}</span
        >
      </div>

      <BookViewTable
        v-if="currentViewType === 'table'"
        :books="filteredAndSortedBooks"
        :current-sort="currentSort"
        :pending-undo="pendingUndo"
        :selected-book-key="selectedBook?._key"
        @toggle-sort="toggleSort"
        @open-drawer="openDrawer"
        @open-edit="openEditForm"
        @delete="deleteBook"
      />

      <BookViewCard
        v-else
        :books="filteredAndSortedBooks"
        :current-sort="currentSort"
        :selected-book-key="selectedBook?._key"
        @toggle-sort="handleCardSort"
        @open-drawer="openDrawer"
      />
    </div>

    <DetailsDrawer
      v-if="selectedBook"
      :book="selectedBook"
      :isOpen="drawerOpen"
      @close="closeDrawer"
      @edit="openEditForm(selectedBook)"
      @delete="
        deleteBook(selectedBook);
        closeDrawer();
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
import { useBookManager } from '../composables/useBookManager';
import { Storage } from '../utils/storage';
import BookFilters from './BookFilters.vue';
import BookViewTable from './BookViewTable.vue';
import BookViewCard from './BookViewCard.vue';
import DetailsDrawer from './DetailsDrawer.vue';
import EditForm from './EditForm.vue';

type ViewPreference = 'default' | 'cards' | 'table';

const props = defineProps<{
  booksProvider: BooksProvider;
  filesChanged?: boolean;
  viewType?: 'table' | 'cards' | 'auto';
}>();
const emit = defineEmits(['logout', 'files-refreshed']);

const storage = new Storage({ silentFail: true });

const viewPreference = ref<ViewPreference>(
  (storage.load('viewPreference') as ViewPreference) || 'default'
);

const currentViewType = computed<'table' | 'cards'>(() => {
  if (viewPreference.value !== 'default') return viewPreference.value;
  return window.innerWidth <= 768 ? 'cards' : 'table';
});

const getViewModeLabel = (mode: ViewPreference): string => {
  const labels: Record<ViewPreference, string> = {
    default: 'Auto',
    cards: 'List',
    table: 'Table',
  };
  return labels[mode];
};

const cycleViewMode = () => {
  const modes: ViewPreference[] = ['default', 'cards', 'table'];
  const nextIndex = (modes.indexOf(viewPreference.value) + 1) % modes.length;
  viewPreference.value = modes[nextIndex];
  storage.save('viewPreference', viewPreference.value);
};

// Initialize the book manager composable
const {
  books,
  loading,
  error,
  filters,
  currentSort,
  selectedBook,
  isEditFormOpen,
  isSaving,
  filteredAndSortedBooks,
  toggleSort,
  openEditForm,
  openNewBook,
  closeForm,
  deleteBook,
  handleEditSave,
  init,
} = useBookManager(props.booksProvider, computed(() => props.filesChanged));

// View-specific state
const drawerOpen = ref(false);
const filtersOpen = ref(false);
const searchInput = ref<HTMLInputElement | null>(null);

const handleSearchKeyboard = (keyboardEvent: KeyboardEvent) => {
  if (keyboardEvent.key === 'Enter' || keyboardEvent.keyCode === 13) {
    searchInput.value?.blur();
  }
};

const openDrawer = (book: Book) => {
  if (selectedBook.value?._key === book._key) {
    closeDrawer();
  } else {
    selectedBook.value = book;
    drawerOpen.value = true;
  }
};

const closeDrawer = () => {
  drawerOpen.value = false;
  selectedBook.value = null;
};

const handleCardSort = (sortId: string, desc: boolean) => {
  currentSort.value = { id: sortId, desc };
};

watch(
  () => props.filesChanged,
  () => {
    if (props.filesChanged) {
      emit('files-refreshed');
    }
  }
);

watch(
  () => isEditFormOpen.value,
  (open) => {
    if (open) {
      drawerOpen.value = false;
    }
  }
);

onMounted(async () => {
  await init();
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

.view-mode-btn {
  background-color: var(--bg-primary);
  color: var(--accent-primary);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: opacity 0.15s;
  min-width: 100px;
  text-align: right;
}

.view-mode-btn:hover {
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
}

.controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
  padding: 1.5rem 1.5rem 0 1.5rem;
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
  color: var(--text-secondary);
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
