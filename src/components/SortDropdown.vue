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
      class="sort-direction-btn"
      :title="modelValue.desc ? 'Descending' : 'Ascending'"
      @click="toggleDirection"
    >
      {{ modelValue.desc ? '↓' : '↑' }}
    </button>
  </div>
</template>

<script setup lang="ts">
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

.sort-direction-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.15s;
}

.sort-direction-btn:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.sort-direction-btn:focus {
  outline: none;
  border-color: var(--accent-primary);
}
</style>
