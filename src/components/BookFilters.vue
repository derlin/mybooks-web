<template>
  <div class="filters-wrapper">
    <div class="filters-row--main">
      <div class="filters-row--search">
        <div class="search-input-wrapper">
          <input
            ref="searchInput"
            v-model="localSearchQuery"
            type="text"
            placeholder="Search books..."
            class="search-input"
            @keydown="handleSearchKeyboard"
            @keyup="handleSearchKeyboard"
          />
          <button
            v-if="localSearchQuery"
            type="button"
            class="clear-search-btn"
            @click="clearSearch"
            title="Clear search"
          >
            <X :size="18" />
          </button>
        </div>
        <button
          type="button"
          class="btn-icon-only btn-solid btn-secondary filters-toggle-btn"
          :class="{ active: filtersOpen }"
          @click="filtersOpen = !filtersOpen"
          title="Toggle filters"
        >
          <ListFilter :size="24" :stroke-width="2" />
        </button>
      </div>

      <div class="filters-row--desktop">
        <select v-model="localSearchFieldsFilter" class="filter-select">
          <option value="">Anywhere</option>
          <option value="title">In title</option>
          <option value="author">In author</option>
          <option value="title+author">In title+author</option>
          <option value="date">In date</option>
          <option value="notes">In notes</option>
        </select>
        <div class="filters">
          <div class="filter-group">
            <label>Format:</label>
            <select v-model="localFormatFilter" class="filter-select">
              <option value="">All</option>
              <option value="print">Print</option>
              <option value="audio">Audio</option>
              <option value="ebook">Ebook</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Status:</label>
            <select v-model="localDnfFilter" class="filter-select">
              <option value="">All</option>
              <option value="finished">Done</option>
              <option value="dnf">DNF</option>
            </select>
          </div>
          <div class="filter-group filter-group--rating">
            <label>Rating:</label>
            <select v-model="localRatingOperator" class="filter-select filter-select--compact" @change="validateRatingFilter">
              <option value="eq">=</option>
              <option value="lt">&lt;</option>
              <option value="gt">&gt;</option>
            </select>
            <input
              v-model.number="localRatingValue"
              type="number"
              placeholder="0-5"
              class="filter-select filter-select--rating-input"
              min="0"
              max="5"
              step="0.1"
              @change="validateRatingFilter"
            />
          </div>
        </div>
      </div>

      <span class="row-count"
        ><span class="row-count-filtered">{{ filteredCount }}</span>
        <span class="row-count-separator">/</span>
        {{ totalCount }}</span
      >
    </div>

    <div v-if="filtersOpen" class="filters-row--mobile">
      <select v-model="localSearchFieldsFilter" class="filter-select">
        <option value="">Search: anywhere</option>
        <option value="title">Search: in title</option>
        <option value="author">Search: in author</option>
        <option value="title+author">Search: in title + author</option>
        <option value="date">Search: in date</option>
        <option value="notes">Search: in notes</option>
      </select>
      <div class="filter-group filter-group--rating-mobile">
        <label>Rating:</label>
        <div class="rating-input-group">
          <select v-model="localRatingOperator" class="filter-select filter-select--compact" @change="validateRatingFilter">
            <option value="eq">=</option>
            <option value="lt">&lt;</option>
            <option value="gt">&gt;</option>
          </select>
          <input
            v-model.number="localRatingValue"
            type="number"
            placeholder="0-5"
            class="filter-select filter-select--rating-input"
            min="0"
            max="5"
            step="0.1"
            @change="validateRatingFilter"
          />
        </div>
      </div>
      <div class="filters">
        <div class="filter-group">
          <label>Format:</label>
          <select v-model="localFormatFilter" class="filter-select">
              <option value="">All</option>
              <option value="print">Print</option>
              <option value="audio">Audio</option>
              <option value="ebook">Ebook</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status:</label>
          <select v-model="localDnfFilter" class="filter-select">
            <option value="">All</option>
            <option value="finished">Done</option>
            <option value="dnf">DNF</option>
          </select>
        </div>
      </div>
    </div>

    <div class="filter-group filter-group--tags" :class="{ 'filter-group--tags-mobile-hidden': !filtersOpen }">
      <label>Tags:</label>
      <TagInput
        v-model="localTagsFilter"
        :all-tags="allTags"
        placeholder="Filter by tags..."
        :allow-new="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { X, ListFilter } from '@lucide/vue';
import type { FilterState } from '@/utils/filtering';
import { isValidRating } from '@/utils/helpers';
import TagInput from './TagInput.vue';

const props = defineProps<{
  filters: FilterState;
  allTags: string[];
  filteredCount: number;
  totalCount: number;
}>();

const emit = defineEmits<{
  'update:filters': [FilterState];
}>();

const searchInput = ref<HTMLInputElement | null>(null);
const filtersOpen = ref(false);
const localRatingOperator = ref<'eq' | 'lt' | 'gt'>('gt');
const localRatingValue = ref<number | null>(null);

const updateFilter = (field: keyof FilterState, value: any) => {
  emit('update:filters', { ...props.filters, [field]: value });
};

const localSearchQuery = computed({
  get: () => props.filters.searchQuery,
  set: (value) => updateFilter('searchQuery', value),
});

const localSearchFieldsFilter = computed({
  get: () => props.filters.searchField,
  set: (value) => updateFilter('searchField', value),
});

const localFormatFilter = computed({
  get: () => props.filters.formatFilter,
  set: (value) => updateFilter('formatFilter', value),
});

const localDnfFilter = computed({
  get: () => props.filters.dnfFilter,
  set: (value) => updateFilter('dnfFilter', value),
});

const localTagsFilter = computed({
  get: () => props.filters.tags,
  set: (value) => updateFilter('tags', value),
});

const handleSearchKeyboard = (keyboardEvent: KeyboardEvent) => {
  if (keyboardEvent.key === 'Enter' || keyboardEvent.keyCode === 13) {
    searchInput.value?.blur();
  }
};

const clearSearch = () => {
  localSearchQuery.value = '';
  searchInput.value?.blur();
};

const validateRatingFilter = () => {
  const operator = localRatingOperator.value as 'eq' | 'lt' | 'gt';
  const value = localRatingValue.value;

  if (value === null || value === undefined || !isValidRating(value)) {
    updateFilter('ratingFilter', null);
    return;
  }

  const finalValue = Math.round(value * 10) / 10;
  localRatingValue.value = finalValue;

  updateFilter('ratingFilter', {
    operator: operator,
    value: finalValue,
  });
};

const initializeRatingFromProps = () => {
  if (props.filters.ratingFilter) {
    localRatingOperator.value = props.filters.ratingFilter.operator;
    localRatingValue.value = props.filters.ratingFilter.value;
  } else {
    localRatingOperator.value = 'gt';
    localRatingValue.value = null;
  }
};

initializeRatingFromProps();
</script>

<style scoped>
.filters-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.filters-row--main {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.filters-row--search {
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

.filters-toggle-btn {
  display: none;
}

.filters-toggle-btn.active {
  background-color: var(--accent-primary) !important;
}

.filters-row--desktop {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-shrink: 0;
}

.filters-row--mobile {
  display: none;
  flex-direction: column;
  gap: 1rem;
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

.filter-group--tags {
  width: 100%;
}

.filter-group label {
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
}

.filter-group--rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

.filter-select--compact {
  padding: 0.5rem 0.5rem;
  min-width: 50px;
}

.filter-select--rating-input {
  padding: 0.5rem 0.75rem;
  width: 65px;
  cursor: text;
}

.filter-select:hover {
  border-color: var(--accent-primary);
}

.filter-select:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.row-count {
  color: var(--text-secondary);
  font-size: 0.9rem;
  white-space: nowrap;
  min-width: 5.5rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.row-count-filtered {
  color: var(--accent-primary);
}

.row-count-separator {
  color: var(--text-secondary);
  margin: 0 0.4rem;
}

@media (max-width: 768px) {
  .filters-row--main {
    flex-direction: column;
    width: 100%;
  }

  .filters-row--search {
    flex-direction: row;
    width: 100%;
  }

  .filters-row--desktop {
    display: none;
  }

  .filters-row--mobile {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .filters-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .filters {
    flex-direction: row;
    flex-wrap: wrap;
    width: 100%;
  }

  .filter-group {
    flex: 1;
    min-width: 150px;
  }

  .filter-group--rating-mobile {
    width: 100%;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .rating-input-group {
    display: flex;
    gap: 0.5rem;
    flex: 1;
  }

  .filter-group--tags {
    width: 100%;
  }

  .filter-group--tags-mobile-hidden {
    display: none;
  }

  .filter-select {
    width: 100%;
  }

  .filter-select--compact {
    width: auto;
    min-width: 50px;
  }

  .filter-select--rating-input {
    flex: 1;
    width: auto;
  }
}
</style>
