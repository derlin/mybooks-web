<template>
  <div class="grid-list-wrapper">
    <div class="sort-section">
      <SortDropdown :model-value="currentSort" @update:model-value="handleSortChange" />
    </div>

    <div class="grid-container">
      <div
        v-for="book in books"
        :key="book._key"
        class="tile"
        :class="{ selected: book._key === selectedBookKey }"
        :style="{ borderColor: tileBorderColor(book), '--cover-width': '100%' }"
        :title="`${book.title} - ${book.author}`"
        tabindex="0"
        role="button"
        @click="openDrawer(book)"
        @keydown.enter.prevent="openDrawer(book)"
        @keydown.space.prevent="openDrawer(book)"
      >
        <div v-if="book.dnf" class="dnf-marker">DNF</div>
        <BookCover :title="book.title" :cover-image="book.cover_image" :isbn="book.isbn" :width="240" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '../composables/useTheme';
import type { Book } from '../types';
import { ratingColor } from '../utils/rating';
import BookCover from './BookCover.vue';
import SortDropdown from './SortDropdown.vue';

defineProps<{
  books: Book[];
  currentSort: { id: string; desc: boolean };
  selectedBookKey?: string;
}>();

const emit = defineEmits<{
  'toggle-sort': [sortId: string, desc: boolean];
  'open-drawer': [book: Book];
}>();

const { isDark } = useTheme();

const tileBorderColor = (book: Book): string => {
  if (book.rating === null || book.rating === undefined) return 'var(--border)';
  return ratingColor(book.rating, isDark.value);
};

const handleSortChange = (newSort: { id: string; desc: boolean }) => {
  emit('toggle-sort', newSort.id, newSort.desc);
};

const openDrawer = (book: Book) => {
  emit('open-drawer', book);
};
</script>

<style scoped>
.grid-list-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
}

.sort-section {
  flex-shrink: 0;
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}

.grid-container {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  /* Without this, a partially filled grid stretches its row tracks to fill the
     scroll area and the tiles grow with them. */
  align-content: start;
  gap: 0.75rem;
  padding: 1rem;
}

.tile {
  position: relative;
  border-style: solid;
  border-width: 0 0 9px 0;
  border-color: var(--border);
  border-radius: 4px;
  cursor: pointer;
  content-visibility: auto;
  contain-intrinsic-size: auto 180px;
}

.tile.selected,
.tile:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.dnf-marker {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  padding: 0.15rem 0.4rem;
  background-color: var(--warning-bg);
  color: var(--warning);
  font-size: 0.65rem;
  font-weight: 600;
  border-bottom-left-radius: 4px;
}
</style>
