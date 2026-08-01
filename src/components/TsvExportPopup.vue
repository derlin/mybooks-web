<template>
  <div class="tsv-popup modal-overlay" @click.self="close">
    <div class="tsv-popup__card">
      <div class="tsv-popup__header">
        <h3 class="tsv-popup__title">Download TSV</h3>
        <button class="btn-icon-only" @click="close" type="button" aria-label="Close">
          <X :size="20" />
        </button>
      </div>

      <div class="tsv-popup__content">
        <div class="tsv-popup__section">
          <div class="tsv-popup__section-header">
            <span class="tsv-popup__label">Columns</span>
            <div class="tsv-popup__bulk">
              <button type="button" class="tsv-popup__link" @click="selectAll">All</button>
              <button type="button" class="tsv-popup__link" @click="selectNone">None</button>
            </div>
          </div>
          <div class="tsv-popup__columns">
            <label v-for="col in columns" :key="col.id" class="tsv-popup__checkbox">
              <input type="checkbox" :value="col.id" v-model="selectedIds" />
              <span>{{ col.label }}</span>
            </label>
          </div>
        </div>

        <div class="tsv-popup__section tsv-popup__sort">
          <div class="tsv-popup__field">
            <span class="tsv-popup__label">Sort by</span>
            <select v-model="sortBy" class="tsv-popup__select">
              <option v-for="col in sortableColumns" :key="col.id" :value="col.id">
                {{ col.label }}
              </option>
            </select>
          </div>
          <div class="tsv-popup__field">
            <span class="tsv-popup__label">Order</span>
            <select v-model="sortDesc" class="tsv-popup__select">
              <option :value="true">Descending</option>
              <option :value="false">Ascending</option>
            </select>
          </div>
        </div>

        <label class="tsv-popup__checkbox tsv-popup__save">
          <input type="checkbox" v-model="save" />
          <span>Remember this selection</span>
        </label>
      </div>

      <div class="tsv-popup__footer">
        <button type="button" class="btn btn-outline btn-dimmed" @click="close">Cancel</button>
        <button
          type="button"
          class="btn btn-solid btn-primary btn-icon-text"
          :disabled="!selectedColumns.length"
          @click="handleExport"
        >
          <Download :size="18" />
          <span>Download</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { X, Download } from '@lucide/vue';
import type { TsvColumn } from '../utils/tsv-export';

const props = defineProps<{
  columns: TsvColumn[];
  initialSelectedIds: string[];
  initialSortBy: string;
  initialSortDesc: boolean;
  initialSave: boolean;
}>();

const emit = defineEmits<{
  export: [payload: { columns: TsvColumn[]; sortBy: string; sortDesc: boolean; save: boolean }];
  close: [];
}>();

// Only real book fields can be sorted (reuses sortBooks upstream); tags and the
// expanded link columns are export-only.
const sortableColumns = computed(() =>
  props.columns.filter((c) => c.id !== 'tags' && !c.id.startsWith('links.'))
);

const availableIds = new Set(props.columns.map((c) => c.id));
const selectedIds = ref<string[]>(props.initialSelectedIds.filter((id) => availableIds.has(id)));

const sortableIds = new Set(sortableColumns.value.map((c) => c.id));
const sortBy = ref(
  sortableIds.has(props.initialSortBy)
    ? props.initialSortBy
    : sortableColumns.value[0]?.id ?? ''
);
const sortDesc = ref(props.initialSortDesc);
const save = ref(props.initialSave);

// Preserve the columns' natural order regardless of check order.
const selectedColumns = computed(() =>
  props.columns.filter((c) => selectedIds.value.includes(c.id))
);

const selectAll = () => {
  selectedIds.value = props.columns.map((c) => c.id);
};
const selectNone = () => {
  selectedIds.value = [];
};

const handleExport = () => {
  if (!selectedColumns.value.length) return;
  emit('export', {
    columns: selectedColumns.value,
    sortBy: sortBy.value,
    sortDesc: sortDesc.value,
    save: save.value,
  });
};

const close = () => emit('close');
</script>

<style scoped>
.tsv-popup {
  z-index: 2000;
  backdrop-filter: blur(2px);
}

.tsv-popup__card {
  background: var(--bg-primary);
  border-radius: 12px;
  max-width: 440px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.2s ease;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

.tsv-popup__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.tsv-popup__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.tsv-popup__content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  overflow-y: auto;
}

.tsv-popup__section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tsv-popup__section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tsv-popup__label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tsv-popup__bulk {
  display: flex;
  gap: 0.75rem;
}

.tsv-popup__link {
  background: none;
  border: none;
  color: var(--accent-primary);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0;
}

.tsv-popup__link:hover {
  text-decoration: underline;
}

.tsv-popup__columns {
  columns: 2;
  column-gap: 1rem;
}

.tsv-popup__checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 1em;
  color: var(--text-primary);
  /* Multi-column flows top-to-bottom, so a column is read straight down. */
  break-inside: avoid;
  padding: 0.25rem 0;
}

.tsv-popup__checkbox input[type='checkbox'] {
  cursor: pointer;
  margin: 0;
  width: auto;
}

.tsv-popup__sort {
  flex-direction: row;
  gap: 1rem;
}

.tsv-popup__field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.tsv-popup__select {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.6rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem;
  width: 100%;
}

.tsv-popup__select:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--focus-ring);
}

.tsv-popup__save {
  padding-top: 0.25rem;
}

.tsv-popup__footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border);
  background: var(--bg-primary);
  border-radius: 0 0 12px 12px;
}

@media (max-width: 480px) {
  .tsv-popup__columns {
    columns: 1;
  }
}
</style>
