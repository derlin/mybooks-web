<template>
  <div v-if="isOpen" class="drawer-overlay">
    <div
      class="drawer"
      :style="{ transform: `translateX(${dragOffset}px)` }"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div class="drawer-header">
        <h2>{{ book.title }}</h2>
        <button class="close-btn" @click="close" title="Close">✕</button>
      </div>

      <div class="drawer-content">
        <div class="header-section">
          <div class="info-prose">
            by <span class="highlight">{{ book.author || '—' }}</span>
          </div>
          <div v-if="book.meta?.pubDate" class="info-prose">First published on {{ formatDate(book.meta.pubDate) }}</div>
          <div class="info-prose">Read on {{ formatDate(book.date) }}</div>

          <div v-if="hasAttributes" class="attributes">
            <span v-if="book.meta?.pages" class="pill"> {{ book.meta.pages }} pages </span>
            <span v-if="book.meta?.duration" class="pill">
              {{ formatDuration(book.meta.duration) }}
            </span>
            <span v-if="book.meta?.ISBN" class="pill isbn-pill" @click="copyISBN" title="Click to copy">ISBN: {{ book.meta.ISBN }}</span>
            <span v-if="book.dnf" class="pill dnf">DNF</span>
          </div>
        </div>

        <div class="actions-section">
          <button class="google-search-btn" @click="openGoogleSearch">🔍 Google</button>
          <button v-if="book.meta?.GoodreadsID" class="goodreads-link-btn" @click="openGoodreadsLink">↗ Goodreads</button>
        </div>

        <div class="notes-section">
          <h3>Notes</h3>
          <div class="notes-wrapper">
            <div class="notes-content">
              {{ book.notes || '(no notes)' }}
            </div>
          </div>
        </div>

      </div>

      <div class="drawer-footer">
        <div class="actions-row">
          <button class="delete-button" @click="$emit('delete')">Delete</button>
          <button class="edit-button" @click="$emit('edit')">Edit Book</button>
        </div>
        <button class="back-button" @click="close">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Book } from '../types';
import { useDrag } from '../composables/useDrag';
import { formatDate, formatDuration } from '../utils/formatting';
import { googleUrlFor } from '../utils/books';

const props = defineProps<{
  book: Book;
  isOpen: boolean;
}>();

const emit = defineEmits(['close', 'edit', 'delete']);


const { dragOffset, handleTouchStart, handleTouchMove, handleTouchEnd } = useDrag(() => close(), 70);

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) {
      dragOffset.value = 0;
    }
  }
);

const hasAttributes = computed(() => {
  return props.book.meta?.pages || props.book.meta?.duration || props.book.meta?.ISBN || props.book.dnf;
});

const openGoodreadsLink = () => {
  if (props.book.meta?.GoodreadsID) {
    const url = `https://www.goodreads.com/book/show/${props.book.meta.GoodreadsID}`;
    window.open(url, '_blank');
  }
};

const openGoogleSearch = () => {
  const url = googleUrlFor(props.book);
  window.open(url, '_blank');
};

const copyISBN = async () => {
  if (props.book.meta?.ISBN) {
    await navigator.clipboard.writeText(props.book.meta.ISBN);
  }
};

const close = () => {
  emit('close');
};
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 400px;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.2), transparent);
  z-index: 100;
  pointer-events: none;
}

@keyframes slideLeft {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.drawer {
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  width: 500px;
  background-color: var(--bg-primary);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  animation: slideLeft 0.15s ease-out;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.3);
  z-index: 101;
  pointer-events: auto;
  transition: transform 0.25s ease-out;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 1rem;
}

.drawer-header h2 {
  margin: 0;
  color: var(--accent-primary);
  font-size: 1.2rem;
  line-height: 1.4;
  word-break: break-word;
  flex: 1;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition:
    background-color 0.15s,
    color 0.15s;
  flex-shrink: 0;
}

.close-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.drawer-content {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.header-section {
  margin-bottom: 1.25rem;
  flex-shrink: 0;
}

.actions-section {
  margin-bottom: 1.25rem;
  flex-shrink: 0;
  display: flex;
  gap: 0.5rem;
}

.info-prose {
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
  font-weight: 500;
}

.info-prose .highlight {
  font-weight: 700;
}

.attributes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.pill {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
}

.pill.dnf {
  background-color: rgba(255, 107, 107, 0.15);
  border-color: var(--warning);
  color: var(--warning);
}

.pill.isbn-pill {
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.pill.isbn-pill:hover {
  background-color: var(--accent-secondary);
  border-color: var(--accent-secondary);
  color: var(--bg-primary);
}

.notes-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin-bottom: 1.5rem;
  flex: 1;
}

.notes-section h3 {
  margin: 0 0 1rem 0;
  color: var(--accent-primary);
  font-size: 1rem;
  flex-shrink: 0;
}

.notes-wrapper {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.notes-content {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1rem 0.5rem;
  color: var(--text-primary);
  line-height: 1.3;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.drawer-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.actions-row {
  display: flex;
  gap: 0.5rem;
}

.delete-button {
  flex: 1;
  padding: 0.75rem;
  background-color: var(--warning);
  color: var(--bg-primary);
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.delete-button:hover {
  opacity: 0.9;
}

.edit-button {
  flex: 1;
  padding: 0.75rem;
  background-color: var(--accent-primary);
  color: var(--bg-primary);
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.edit-button:hover {
  opacity: 0.9;
}

.back-button {
  width: 100%;
  padding: 0.75rem;
  background-color: transparent;
  border: 1px solid var(--accent-primary);
  color: var(--accent-primary);
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.back-button:hover {
  background-color: var(--accent-primary);
  color: var(--bg-primary);
}

.google-search-btn {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background-color: transparent;
  color: var(--accent-secondary);
  border: 1px solid var(--accent-secondary);
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.9rem;
}

.google-search-btn:hover {
  background-color: var(--accent-secondary);
  color: var(--bg-primary);
}

.goodreads-link-btn {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background-color: transparent;
  color: var(--accent-secondary);
  border: 1px solid var(--accent-secondary);
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.9rem;
}

.goodreads-link-btn:hover {
  background-color: var(--accent-secondary);
  color: var(--bg-primary);
}

@media (max-width: 600px) {
  .drawer-overlay {
    right: 0;
  }

  .drawer {
    width: 100%;
  }
}
</style>
