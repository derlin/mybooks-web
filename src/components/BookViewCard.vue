<template>
  <div class="card-list-wrapper">
    <div class="sort-section">
      <SortDropdown :model-value="currentSort" @update:model-value="handleSortChange" />
    </div>

    <div class="cards-container">
      <div
        v-for="book in books"
        :key="book._key"
        class="card"
        :class="{ audiobook: book.meta?.duration, selected: book._key === selectedBookKey }"
        @click="openDrawer(book)"
      >
        <div class="card-content">
          <div class="card-main">
            <div class="card-title">{{ book.title }}</div>
            <p class="card-author">{{ book.author || '—' }}</p>
          </div>
          <div class="card-side">
            <span v-if="book.date" class="card-date">{{ book.date }}</span>
            <div class="card-pills">
              <div v-if="book.dnf" class="badge dnf">DNF</div>
              <div v-if="book.meta?.pages" class="pill pages">{{ book.meta.pages }} <span>p</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Book } from '../types';
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

const handleSortChange = (newSort: { id: string; desc: boolean }) => {
  emit('toggle-sort', newSort.id, newSort.desc);
};

const openDrawer = (book: Book) => {
  emit('open-drawer', book);
};
</script>

<style scoped>
.card-list-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
  max-width: 768px;
  padding: 0 0.5rem;
  margin: auto;
}

@media (max-width: 768px) {
	.card-list-wrapper {
        margin: -3rem auto 0;
	}
}

.sort-section {
  flex-shrink: 0;
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}

.cards-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.card {
  display: flex;
  width: 100%;
  padding: 0.8rem;
  background-color: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.15s;
}

.card.audiobook {
    background-color: var(--bg-audiobook);
}

.card.audiobook:hover {
  border-color: rgba(33, 150, 243, 0.8);
}

.card-content {
  display: flex;
  width: 100%;
  justify-content: space-between;
  gap: 1rem;
}

.card-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.card-title {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.3;
  word-break: break-word;
  font-weight: 500;
}

.card-author {
  margin: 0;
  color: var(--text-secondary);
  font-weight: 500;
}

.card-side {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-shrink: 0;
  align-items: flex-end;
}

.card-date {
  font-size: 0.9rem;
  color: var(--accent-primary);
  font-weight: 500;
  white-space: nowrap;
}

.card-pills {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge.dnf {
  background-color: rgba(255, 107, 107, 0.2);
  color: var(--warning);
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: var(--border);
  color: var(--text-primary);
}

.pill span {
  opacity: 0.7;
}

.card.selected {
  background-color: var(--bg-hover);
  border-left: 3px solid var(--accent-primary);
}
</style>
