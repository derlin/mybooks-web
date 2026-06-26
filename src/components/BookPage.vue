<template>
  <div v-if="!isEditFormOpen" class="book-list-container">
    <div class="header">
      <img src="@/assets/logo.svg" alt="MyBooks" class="logo logo-header" />
      <div class="header-actions">
        <button @click="cycleViewMode" class="view-mode-btn" :title="`Switch view (currently: ${getViewModeLabel(viewPreference)})`">
          {{ getViewModeLabel(viewPreference) }}
        </button>
        <button @click="openNewBook" class="btn-icon-only btn-solid btn-primary" title="Add new book">
          <Plus :size="24" :strokeWidth="4" />
        </button>
        <div ref="menuContainer" class="menu-container">
          <button
            @click="menuOpen = !menuOpen"
            class="btn-icon-only btn-outline btn-dimmed"
            aria-haspopup="menu"
            :aria-expanded="menuOpen"
            title="Menu"
          >
            <MoreVertical :size="24" :stroke-width="2" />
          </button>
          <div v-if="menuOpen" class="menu-dropdown" role="menu">
            <div class="menu-section">
              <div class="menu-header">Theme</div>
              <label class="menu-radio">
                <input type="radio" v-model="theme" value="auto" @change="applyTheme('auto')" />
                Auto
              </label>
              <label class="menu-radio">
                <input type="radio" v-model="theme" value="light" @change="applyTheme('light')" />
                Light
              </label>
              <label class="menu-radio">
                <input type="radio" v-model="theme" value="dark" @change="applyTheme('dark')" />
                Dark
              </label>
            </div>
            <div class="menu-section">
              <div class="menu-header">Actions</div>
              <button @click="downloadJson" class="menu-item" role="menuitem">Download JSON</button>
              <button @click="emit('logout')" class="menu-item menu-item-danger" role="menuitem">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="content">
      <p class="loader"></p>
    </div>

    <div v-else-if="error" class="content">
      <p class="error">{{ error }}</p>
    </div>

    <div v-else-if="!books || books.length === 0" class="empty-state">
      <BookOpenText :size="80" :strokeWidth="1.5" class="empty-state-icon" />
      <div>
        <h2 class="empty-state-title">Welcome to MyBooks!</h2>
        <p class="empty-state-text">Start building your collection by adding your first book.</p>
      </div>
      <button @click="openNewBook" class="btn-solid btn-primary btn-icon-text">
        <Plus :size="24" :strokeWidth="4" />
        <span>Add Your First Book</span>
      </button>
    </div>

    <div v-else class="table-wrapper">
      <div class="controls">
        <BookFilters
          :search-query="filters.query"
          :search-fields-filter="filters.searchField"
          :audiobook-filter="filters.audiobook"
          :dnf-filter="filters.dnf"
          :tags-filter="filters.tags"
          :all-tags="getTagsFromAllBooks(books)"
          :filtered-count="filteredAndSortedBooks.length"
          :total-count="books.length"
          @update:search-query="filters.query = $event"
          @update:search-fields-filter="filters.searchField = $event"
          @update:audiobook-filter="filters.audiobook = $event"
          @update:dnf-filter="filters.dnf = $event"
          @update:tags-filter="filters.tags = $event"
        />
      </div>

      <BookViewTable
        v-if="currentViewType === 'table'"
        :books="filteredAndSortedBooks"
        :all-books="books"
        :current-sort="currentSort"
        :selected-book-key="selectedBook?._key"
        @toggle-sort="toggleSort"
        @open-drawer="openDrawer"
        @open-edit="openEditForm"
        @delete="deleteBook"
        @open-tag-popup="openTagPopup"
      />

      <BookViewCard
        v-else
        :books="filteredAndSortedBooks"
        :all-books="books"
        :current-sort="currentSort"
        :selected-book-key="selectedBook?._key"
        @toggle-sort="handleCardSort"
        @open-drawer="openDrawer"
        @open-tag-popup="openTagPopup"
      />
    </div>

    <DetailsDrawer
      v-if="selectedBook"
      :book="selectedBook"
      :isOpen="drawerOpen"
      :all-books="books"
      @close="closeDrawer"
      @edit="openEditForm(selectedBook)"
      @delete="
        deleteBook(selectedBook);
        closeDrawer();
      "
      @open-tag-popup="openTagPopup"
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

  <!-- Tag Popup -->
  <TagBulkOperationsPopup
    v-if="activePopup"
    :tag="activePopup.tag"
    :all-books="activePopup.allBooks"
    @action="handleTagPopupAction"
    @close="activePopup = null"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Plus, MoreVertical, BookOpenText } from '@lucide/vue';
import type { BooksProvider } from '../services/booksProvider';
import type { Book } from '../types';
import { useBookManager } from '../composables/useBookManager';
import { useTheme } from '../composables/useTheme';
import { Storage } from '../utils/storage';
import { getTagsFromAllBooks } from '../utils/tags';
import type { TagPopupAction } from '../composables/useTagPopup';
import BookFilters from './BookFilters.vue';
import BookViewTable from './BookViewTable.vue';
import BookViewCard from './BookViewCard.vue';
import DetailsDrawer from './DetailsDrawer.vue';
import EditForm from './EditForm.vue';
import TagBulkOperationsPopup from './TagBulkOperationsPopup.vue';

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

// Theme management
const { theme, applyTheme } = useTheme();

// Tag popup
const activePopup = ref<{ tag: string; allBooks: Book[] } | null>(null);

// Menu state
const menuOpen = ref(false);

const downloadJson = () => {
  const serialized = JSON.stringify(props.booksProvider.serializeBooks(books.value), null, 2);
  const url = URL.createObjectURL(new Blob([serialized], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mybooks.json';
  a.click();
  URL.revokeObjectURL(url);
  menuOpen.value = false;
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
  renameTagAcrossAllBooks,
  deleteTagFromAllBooks,
  init,
} = useBookManager(props.booksProvider, computed(() => props.filesChanged));

// View-specific state
const drawerOpen = ref(false);
const menuContainer = ref<HTMLDivElement | null>(null);

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

const openTagPopup = (tag: string) => {
  activePopup.value = { tag, allBooks: books.value };
};

const handleTagPopupAction = async (action: TagPopupAction) => {
  if (action.type === 'filter') {
    if (!filters.value.tags.includes(action.oldTag)) {
      filters.value.tags.push(action.oldTag);
    }
  } else if (action.type === 'rename' && action.newTag) {
    await renameTagAcrossAllBooks(action.oldTag, action.newTag);
  } else if (action.type === 'delete') {
    await deleteTagFromAllBooks(action.oldTag);
  }
  activePopup.value = null;
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

const handleClickOutside = (e: MouseEvent) => {
  if (menuOpen.value && menuContainer.value && !menuContainer.value.contains(e.target as Node)) {
    menuOpen.value = false;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
};

onMounted(async () => {
  await init();
  document.addEventListener('click', handleClickOutside, true);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true);
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
  aspect-ratio: 1;
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
  color: var(--text-primary);
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

.menu-container {
  position: relative;
}

.menu-btn {
  background-color: var(--text-secondary);
  color: var(--bg-primary);
  border: none;
  width: 40px;
  aspect-ratio: 1;
  border-radius: 4px;
  font-size: 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.menu-btn:hover {
  opacity: 0.9;
}

.menu-dropdown {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 0.5rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  min-width: 180px;
  box-shadow: 0 2px 8px var(--shadow);
  z-index: 110;
}

.menu-section {
  padding: 0;
  margin-bottom: 1rem;
}

.menu-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.menu-header {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  padding: 0.75rem 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.menu-radio {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.menu-radio:hover {
  background-color: var(--bg-hover);
}

.menu-radio input[type="radio"] {
  cursor: pointer;
  margin: 0;
  padding: 0;
  width: auto;
  border: none;
  background: none;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.15s;
}

.menu-item:hover {
  background-color: var(--bg-hover);
}

.menu-item-danger {
  color: var(--warning);
}

.menu-item-danger:hover {
  background-color: rgba(211, 47, 47, 0.1);
}

.content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.loading {
  color: var(--text-primary);
  font-size: 1.1rem;
}

.error {
  color: var(--warning);
}

.empty {
  color: var(--text-secondary);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 2rem;
  text-align: center;
}

.empty-state-icon {
  color: var(--accent-secondary);
}

.empty-state-title {
  margin: 0;
  font-size: 1.8rem;
  color: var(--text-primary);
  font-weight: 600;
}

.empty-state-text {
  margin: 1rem 0;
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
  padding: 1.5rem 1.5rem 0 1.5rem;
}

@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
