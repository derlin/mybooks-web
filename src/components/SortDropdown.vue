<template>
  <div class="sort-wrapper">
    <label for="sort-select" class="sort-label">Sort by:</label>
    <select
      id="sort-select"
      :value="modelValue.id"
      @change="handleFieldChange"
      class="sort-select"
    >
      <option value="title">Title</option>
      <option value="author">Author</option>
      <option value="date">Date</option>
      <option value="pages">Pages</option>
      <option value="duration">Duration</option>
    </select>
    <button
      class="btn-icon-only btn-outline btn-dimmed"
      :title="modelValue.desc ? 'Descending' : 'Ascending'"
      @click="toggleDirection"
    >
      <ArrowDown v-if="modelValue.desc" :size="20" :stroke-width="2" />
      <ArrowUp v-else :size="20" :stroke-width="2" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, ArrowUp } from '@lucide/vue';

const props = defineProps<{
  modelValue: { id: string; desc: boolean };
}>();

const emit = defineEmits<{
  'update:modelValue': [{ id: string; desc: boolean }];
}>();

const handleFieldChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const id = target.value;
  emit('update:modelValue', { id, desc: props.modelValue.desc });
};

const toggleDirection = () => {
  emit('update:modelValue', {
    id: props.modelValue.id,
    desc: !props.modelValue.desc,
  });
};
</script>

<style scoped>
.sort-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-label {
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
}

.sort-select {
  padding: 0.5rem 0.75rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.15s;
}

.sort-select:hover {
  border-color: var(--accent-primary);
}

.sort-select:focus {
  outline: none;
  border-color: var(--accent-primary);
}

</style>
