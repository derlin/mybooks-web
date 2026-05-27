<template>
  <div class="filters-wrapper">
    <select v-model="localSearchFieldsFilter" class="filter-select">
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
        <select v-model="localAudiobookFilter" class="filter-select">
          <option value="all">All</option>
          <option value="audiobook">Audiobook</option>
          <option value="paper">Paper</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Status:</label>
        <select v-model="localDnfFilter" class="filter-select">
          <option value="all">All</option>
          <option value="finished">Finished</option>
          <option value="dnf">DNF</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  searchFieldsFilter: {
    type: String,
    required: true,
  },
  audiobookFilter: {
    type: String,
    required: true,
  },
  dnfFilter: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['update:searchFieldsFilter', 'update:audiobookFilter', 'update:dnfFilter']);

const localSearchFieldsFilter = computed({
  get: () => props.searchFieldsFilter,
  set: (value) => emit('update:searchFieldsFilter', value),
});

const localAudiobookFilter = computed({
  get: () => props.audiobookFilter,
  set: (value) => emit('update:audiobookFilter', value),
});

const localDnfFilter = computed({
  get: () => props.dnfFilter,
  set: (value) => emit('update:dnfFilter', value),
});
</script>

<style scoped>
.filters-wrapper {
  display: flex;
  gap: 1rem;
  align-items: center;
  width: 100%;
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

@media (max-width: 768px) {
  .filters-wrapper {
    flex-direction: column;
    gap: 1rem;
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
}
</style>
