<template>
  <div class="tag-popup" @click.self="close">
    <div class="tag-popup__card">
      <div class="tag-popup__header">
        <h3 class="tag-popup__title">
          {{ screenTitle }}
        </h3>
        <button class="tag-popup__close" @click="close" type="button" aria-label="Close">
          ✕
        </button>
      </div>

      <div class="tag-popup__content">
        <!-- Menu Screen -->
        <div v-if="screen === 'menu'">
          <p class="tag-popup__subtitle">Tag {{ tag }} matches <span class="highlight">{{ bookCount }}</span> book{{ bookCount !== 1 ? 's' : '' }}</p>
          <div class="tag-popup__actions menu">
            <button class="btn btn-outline btn-primary btn-icon-text" @click="handleFilter">
              <ListFilter :size="18" />
              <span>Filter</span>
            </button>
            <button class="btn btn-outline btn-secondary btn-icon-text" @click="screen = 'rename'">
              <Pencil :size="18" />
              <span>Rename</span>
            </button>
            <button class="btn btn-outline btn-warning btn-icon-text" @click="screen = 'delete'">
              <Trash2 :size="18" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        <!-- Rename Screen -->
        <div v-else-if="screen === 'rename'">
          <input
            ref="renameInputEl"
            v-model="newTagName"
            type="text"
            class="tag-popup__input"
            @keydown.enter="handleRename"
            @keydown.escape="screen = 'menu'"
          />
          <p v-if="error" class="tag-popup__error">{{ error }}</p>
          <div class="tag-popup__actions edit">
              <button type="button" class="btn-outline btn-dimmed btn-icon-text" @click="screen = 'menu'">
                <ArrowLeft :size="18" />
                <span>Back</span>
              </button>
            <button
              class="btn btn-solid btn-icon-text"
              :class="hasConflict ? 'btn-warning' : 'btn-primary'"
              @click="handleRename"
            >
              <Check :size="18" />
              <span>{{ hasConflict ? 'Merge' : 'Save' }}</span>
            </button>
          </div>
        </div>

        <!-- Delete Screen -->
        <div v-else-if="screen === 'delete'">
          <p class="tag-popup__warning">
            You have <strong>{{ bookCount }} book{{ bookCount !== 1 ? 's' : '' }}</strong> with
            this tag.<br/>Are you sure?
          </p>
          <div class="tag-popup__actions delete">
            <button type="button" class="btn-outline btn-dimmed btn-icon-text" @click="screen = 'menu'">
              <ArrowLeft :size="18" />
              <span>Back</span>
            </button>
            <button class="btn btn-solid btn-warning btn-icon-text" @click="handleDelete">
              <Trash2 :size="18" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import type { Book } from '@/types';
import { ArrowLeft, ListFilter, Pencil, Trash2, Check } from '@lucide/vue';
import { validateTag, tagExists } from '@/utils/tags';
import type { TagPopupAction } from '@/composables/useTagPopup';

const props = defineProps<{
  tag: string;
  allBooks: Book[];
}>();

const emit = defineEmits<{
  action: [action: TagPopupAction];
  close: [];
}>();

type Screen = 'menu' | 'rename' | 'delete';

const screen = ref<Screen>('menu');
const newTagName = ref(props.tag);
const error = ref('');
const renameInputEl = ref<HTMLInputElement>();

const bookCount = computed(() => {
  return props.allBooks.filter((book) => book.tags?.includes(props.tag)).length;
});

const hasConflict = computed(() => {
  if (screen.value !== 'rename' || !newTagName.value || newTagName.value === props.tag) {
    return false;
  }
  const validation = validateTag(newTagName.value);
  if (!validation.isValid) return false;
  return tagExists(newTagName.value, props.allBooks);
});

const screenTitle = computed(() => {
  switch (screen.value) {
    case 'menu':
      return props.tag;
    case 'rename':
      return 'Rename tag';
    case 'delete':
      return 'Delete tag';
  }
});

function handleFilter() {
  emit('action', { type: 'filter', oldTag: props.tag });
  emit('close');
}

function handleRename() {
  const validation = validateTag(newTagName.value);

  if (!validation.isValid) {
    error.value = validation.error!;
    return;
  }

  if (newTagName.value === props.tag) {
    error.value = 'New tag is the same as current tag';
    return;
  }

  error.value = '';
  emit('action', { type: 'rename', oldTag: props.tag, newTag: newTagName.value });
  emit('close');
}

function handleDelete() {
  emit('action', { type: 'delete', oldTag: props.tag });
  emit('close');
}

function close() {
  emit('close');
}

// Focus rename input when switching to rename screen
import { watch } from 'vue';
watch(
  () => screen.value,
  async (newScreen) => {
    if (newScreen === 'rename') {
      await nextTick();
      renameInputEl.value?.select();
    }
  }
);
</script>

<style scoped>
.tag-popup {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.tag-popup__card {
  background: var(--bg-primary);
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.2s ease;
  display: flex;
  flex-direction: column;
}

@keyframes slideUp {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.tag-popup__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.tag-popup__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.tag-popup__close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}

.tag-popup__close:hover {
  color: var(--text-primary);
}

.tag-popup__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
}

.tag-popup__subtitle {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0 0 1rem 0;
}

.tag-popup__warning {
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.tag-popup__warning strong {
  color: var(--text-primary);
  font-weight: 600;
}

.tag-popup__input {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.75rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem;
  width: 100%;
  transition: border-color 0.2s;
}

.tag-popup__input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(0, 217, 255, 0.1);
}

.tag-popup__error {
  color: var(--warning);
  font-size: 0.8125rem;
  margin: -0.5rem 0 0 0;
}

.tag-popup__actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.tag-popup__actions .btn {
  flex: 1;
}

@media (max-width: 768px) {


  .tag-popup__actions.menu {
      flex-direction: column;
  }
}
</style>
