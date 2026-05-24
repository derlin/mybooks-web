<template>
  <div v-if="isOpen" class="drawer-overlay">
    <div class="drawer">
      <div class="drawer-header">
        <h2>{{ book.title }}</h2>
        <button class="close-btn" @click="close" title="Close">✕</button>
      </div>

      <div class="drawer-content">
        <div class="header-section">
          <div class="meta-row">
            <span class="label">Author:</span>
            <span class="value">{{ book.author || '—' }}</span>
          </div>
          <div class="meta-row">
            <span class="label">Date:</span>
            <span class="value">{{ book.date || '—' }}</span>
          </div>
          <div v-if="book.meta?.duration" class="meta-row">
            <span class="label">Duration:</span>
            <span class="value">{{ formatDuration(book.meta.duration) }}</span>
          </div>
          <div v-if="book.meta?.pages" class="meta-row">
            <span class="label">Pages:</span>
            <span class="value">{{ book.meta.pages }}</span>
          </div>
          <div v-if="book.dnf" class="meta-row">
            <span class="label">Status:</span>
            <span class="value dnf-badge">DNF</span>
          </div>
        </div>

        <div class="notes-section">
          <h3>Notes</h3>
          <div class="notes-content">
            {{ book.notes || '(no notes)' }}
          </div>
        </div>

        <div v-if="hasMetadata" class="metadata-section">
          <button class="collapsible-header" @click="metaOpen = !metaOpen">
            <span>Metadata</span>
            <span class="toggle-icon">{{ metaOpen ? '▼' : '▶' }}</span>
          </button>
          <div v-show="metaOpen" class="metadata-content">
            <div v-if="book.meta?.GoodreadsID" class="meta-row">
              <span class="label">Goodreads ID:</span>
              <span class="value">{{ book.meta.GoodreadsID }}</span>
            </div>
            <div v-if="book.meta?.ISBN" class="meta-row">
              <span class="label">ISBN:</span>
              <span class="value">{{ book.meta.ISBN }}</span>
            </div>
            <div v-if="book.meta?.pubDate" class="meta-row">
              <span class="label">Publication Date:</span>
              <span class="value">{{ book.meta.pubDate }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer-footer">
        <button class="back-button" @click="close">Close</button>
        <button class="edit-button" @click="$emit('edit')">Edit Book</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  book: {
    type: Object,
    required: true,
  },
  isOpen: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['close', 'edit']);

const metaOpen = ref(false);

const hasMetadata = computed(() => {
  const meta = props.book.meta;
  return meta && (meta.GoodreadsID || meta.ISBN || meta.pubDate);
});

const formatDuration = (minutes) => {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}:00`;
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
  width: 400px;
  background-color: var(--bg-primary);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  animation: slideLeft 0.15s ease-out;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.3);
  z-index: 101;
  pointer-events: auto;
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
  overflow-y: auto;
  padding: 1.5rem;
}

.header-section {
  margin-bottom: 2rem;
}

.meta-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  align-items: flex-start;
}

.label {
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 120px;
  flex-shrink: 0;
}

.value {
  color: var(--text-primary);
  word-break: break-word;
  flex: 1;
}

.dnf-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background-color: rgba(255, 107, 107, 0.2);
  color: var(--warning);
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.notes-section {
  margin-bottom: 2rem;
}

.notes-section h3 {
  margin: 0 0 1rem 0;
  color: var(--accent-primary);
  font-size: 1rem;
}

.notes-content {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1rem;
  color: var(--text-primary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 300px;
  overflow-y: auto;
  font-size: 0.9rem;
}

.metadata-section {
  margin-bottom: 1rem;
}

.collapsible-header {
  width: 100%;
  background: none;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1rem;
  color: var(--accent-primary);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.15s;
}

.collapsible-header:hover {
  background-color: var(--bg-secondary);
}

.toggle-icon {
  font-size: 0.75rem;
  opacity: 0.7;
}

.metadata-content {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 4px 4px;
  padding: 1rem;
}

.metadata-content .meta-row {
  margin-bottom: 0.5rem;
}

.drawer-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.edit-button {
  width: 100%;
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
  margin-bottom: 0.5rem;
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

@media (max-width: 600px) {
  .drawer-overlay {
    right: 0;
  }

  .drawer {
    width: 100%;
  }
}
</style>
