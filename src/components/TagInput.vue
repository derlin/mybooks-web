<template>
  <div class="tag-input" :class="{ 'tag-input--disabled': disabled }">
    <div v-if="modelValue.length > 0" class="tag-input__selected">
      <TagPill
        v-for="tag in modelValue"
        :key="tag"
        :tag="tag"
        interactive
        removable
        :disabled="disabled"
        @interact="removeTag(tag)"
        @remove="removeTag(tag)"
      />
    </div>
    <input
      ref="inputEl"
      v-model="inputValue"
      type="text"
      class="tag-input__field"
      :placeholder="placeholder"
      :disabled="disabled"
      @keydown="handleKeydown"
      @focus="showDropdown = true"
      @click="showDropdown = true"
      @blur="scheduleDropdownClose"
      @input="showDropdown = true"
    />
    <button
      v-if="inputValue"
      type="button"
      class="tag-input__add-btn"
      :disabled="disabled"
      @click="addTag(inputValue)"
      aria-label="Add tag"
    >
      +
    </button>
    <div v-show="showDropdown && (inputValue || filteredTags.length > 0)" class="tag-input__dropdown">
      <div v-if="filteredTags.length === 0 && inputValue" class="tag-input__option tag-input__option--new">
        Press + or type space to create "<strong>{{ inputValue }}</strong>"
      </div>
      <button
        v-for="tag in filteredTags"
        :key="tag"
        type="button"
        class="tag-input__option"
        :class="{ 'tag-input__option--duplicate': modelValue.includes(tag) }"
        @click="addTag(tag)"
      >
        {{ tag }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { validateTag, normalizeTag } from '@/utils/tags';
import { useToast } from '@/composables/useToast';
import TagPill from './TagPill.vue';

const props = defineProps<{
  modelValue: string[];
  allTags: string[];
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [tags: string[]];
}>();

const inputValue = ref('');
const showDropdown = ref(false);
const inputEl = ref<HTMLInputElement>();
const toast = useToast();

const filteredTags = computed(() => {
  if (!inputValue.value) return props.allTags.filter(tag => !props.modelValue.includes(tag));

  const lower = inputValue.value.toLowerCase();
  return props.allTags.filter(
    tag => tag.toLowerCase().includes(lower) && !props.modelValue.includes(tag)
  );
});

function addTag(tag: string) {
  const normalized = normalizeTag(tag);
  const validation = validateTag(normalized);

  if (!validation.isValid) {
    toast.showError(validation.error!);
    return;
  }

  if (props.modelValue.includes(normalized)) {
    return;
  }

  if (props.maxTags && props.modelValue.length >= props.maxTags) {
    toast.showError(`Maximum ${props.maxTags} tags allowed`);
    return;
  }

  emit('update:modelValue', [...props.modelValue, normalized]);
  inputValue.value = '';
  showDropdown.value = true;
  inputEl.value?.focus();
}

function removeTag(tag: string) {
  emit('update:modelValue', props.modelValue.filter(t => t !== tag));
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    if (inputValue.value.trim()) {
      addTag(inputValue.value);
    }
  } else if (event.key === 'Backspace' && !inputValue.value && props.modelValue.length > 0) {
    event.preventDefault();
    removeTag(props.modelValue[props.modelValue.length - 1]);
  } else if (event.key === 'Escape') {
    showDropdown.value = false;
  }
}

function scheduleDropdownClose() {
  // Delay close to allow click handlers to fire
  setTimeout(() => {
    showDropdown.value = false;
  }, 200);
}
</script>

<style scoped>
.tag-input {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.5rem;
  background: var(--bg-secondary);
  transition: border-color 0.2s;
}

.tag-input:focus-within {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(0, 217, 255, 0.1);
}

.tag-input--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--bg-hover);
}

.tag-input__selected {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-input__field {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-primary);
  height: 32px;
  font-size: 0.9rem;
  min-width: 100px;
  padding: 0.25rem 0;
  outline: none;
}

.tag-input__field:disabled {
  cursor: not-allowed;
}

.tag-input__field::placeholder {
  color: var(--text-secondary);
}

.tag-input__dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1000;
  border: 1px solid var(--border);
  border-top: none;
  background: var(--bg-secondary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
}

.tag-input__option {
  display: block;
  width: 100%;
  padding: 0.75rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.15s;
}

.tag-input__option:hover {
  background: var(--accent-light);
  color: var(--text-primary);
}

.tag-input__option--new {
  cursor: default;
  color: var(--text-tertiary);
  font-size: 0.8125rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.tag-input__option--new strong {
  color: var(--text-primary);
}

.tag-input__option--duplicate {
  opacity: 0.4;
  cursor: not-allowed;
}

.tag-input__add-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: var(--accent-primary);
  color: white;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s;
}

.tag-input__add-btn:hover {
  background: var(--accent-dark);
}

.tag-input__add-btn:active {
  transform: scale(0.95);
}

.tag-input__add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
