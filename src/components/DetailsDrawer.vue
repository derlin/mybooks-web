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
        <button class="btn-icon-only" @click="close" title="Close">
          <X :size="20" />
        </button>
      </div>

      <div class="drawer-content">
        <div class="header-section">
          <div class="info-prose">
            by <span class="highlight">{{ book.author }}</span>
          </div>
          <div v-if="book.date_published" class="info-prose">First published on {{ formatDate(book.date_published) }}</div>
          <div class="info-prose">Read on {{ formatDate(book.date_read) }}</div>

          <div v-if="book.tags?.length" class="tags-section">
            <div class="tags-container">
              <TagPill
                v-for="tag in book.tags"
                :key="tag"
                :tag="tag"
                interactive
                @interact="handleTagClick(tag)"
              />
            </div>
          </div>

          <div class="attributes">
            <FormatPill :format="book.format" />
            <RatingPill v-if="book.rating !== null && book.rating !== undefined" :rating="book.rating" />
            <span v-if="book.pages" class="pill"> {{ book.pages }} pages </span>
            <span v-if="book.duration" class="pill">
              {{ formatDuration(book.duration) }}
            </span>
            <span v-if="book.isbn" class="pill isbn-pill" @click="copyISBN" title="Click to copy">ISBN: {{ book.isbn }}</span>
            <span v-if="book.dnf" class="pill dnf">DNF</span>
          </div>
        </div>

        <div class="actions-section">
          <button class="btn-outline btn-secondary btn-icon-text" @click="openLink(googleUrlFor(props.book))" title="Search on Google">
            <Search :size="18" />
            <span>Google</span>
          </button>
          <button
            v-for="[key, link] in Object.entries(book.links || {})"
            :key="key"
            class="btn-outline btn-secondary btn-icon-text"
            @click="openLink(link.url)"
            :title="`Open in ${key}`"
          >
            <ExternalLink :size="18" />
            <span>{{ key.charAt(0).toUpperCase() + key.slice(1) }}</span>
          </button>
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
          <button class="btn-outline btn-warning btn-icon-text" @click="$emit('delete')">
            <Trash2 :size="18" />
            <span>Delete</span>
          </button>
          <button class="btn-solid btn-primary btn-icon-text" @click="$emit('edit')">
            <Pencil :size="18" />
            <span>Edit Book</span>
          </button>
        </div>
        <button class="btn-outline btn-dimmed btn-icon-text" @click="close">
          <ArrowLeft :size="18" />
          <span>Close</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { X, Trash2, Pencil, ArrowLeft, Search, ExternalLink } from '@lucide/vue';
import type { Book } from '../types';
import { useDrag } from '../composables/useDrag';
import { useToast } from '../composables/useToast';
import { formatDate, formatDuration, googleUrlFor } from '../utils/helpers';
import TagPill from './TagPill.vue';
import FormatPill from './FormatPill.vue';
import RatingPill from './RatingPill.vue';

const props = defineProps<{
  book: Book;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
  edit: [];
  delete: [];
  'open-tag-popup': [tag: string];
}>();

const handleTagClick = (tag: string) => {
  emit('open-tag-popup', tag);
};

const { showInfo } = useToast();
const { dragOffset, handleTouchStart, handleTouchMove, handleTouchEnd } = useDrag(() => close(), 70);

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) {
      dragOffset.value = 0;
    }
  }
);

const openLink = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

const copyISBN = async () => {
  if (props.book.isbn) {
    await navigator.clipboard.writeText(props.book.isbn);
    showInfo('ISBN copied to clipboard', undefined, 2000);
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

.attributes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.tags-section {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pill.dnf {
  background-color: var(--warning-bg);
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

.actions-row button,
.drawer-footer > button {
  padding: 0.75rem;
  border-radius: 4px;
}

.actions-row button {
  flex: 1;
  font-size: 0.9rem;
}

.drawer-footer > button {
  width: 100%;
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
