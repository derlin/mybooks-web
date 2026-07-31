<template>
  <div class="tag-input">
    <div v-if="modelValue.length > 0" class="tag-input__selected">
      <TagPill
        v-for="tag in modelValue"
        :key="tag"
        :tag="tag"
        interactive
        removable
        @interact="removeTag(tag)"
        @remove="removeTag(tag)"
      />
    </div>
    <input
      ref="inputEl"
      v-model="inputValue"
      type="text"
      class="tag-input__field"
      autocapitalize="off"
      autocorrect="off"
      :placeholder="placeholder"
      @focus="showDropdown = true"
      @click="showDropdown = true"
      @blur="scheduleDropdownClose"
      @keydown="handleBackspaceKeydown"
      @input="showDropdown = true; handleTextInput($event)"
    />
    <button
      v-if="inputValue && allowNew"
      type="button"
      class="tag-input__add-btn"
      :disabled="modelValue.includes(inputValue)"
      @click="addTag(inputValue)"
      aria-label="Add tag"
    >
      +
    </button>
    <div v-show="showDropdown && (inputValue || filteredTags.length > 0)" class="tag-input__dropdown">
      <div v-if="allowNew && filteredTags.length === 0 && inputValue" class="tag-input__option tag-input__option--new">
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
import { TagsUtil } from '@/utils/tags';
import { useToast } from '@/composables/useToast';
import TagPill from './TagPill.vue';

const props = defineProps<{
  modelValue: string[];
  allTags: string[];
  placeholder?: string;
  allowNew?: boolean;
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
  const normalized = TagsUtil.normalize(tag);
  const validation = TagsUtil.validate(normalized);

  if (!validation.isValid) {
    toast.showError(validation.error!);
    return;
  }

  if (props.modelValue.includes(normalized)) {
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

function handleBackspaceKeydown(event: KeyboardEvent) {
  // IMPORTANT: on mobile, keyboardEvents for regular chars and punctuation all show
  // as unidentified, with charCode 229 so we need to use @input. However, for backspace,
  // InputEvent deleteContentBackward doesn't fire if the input is empty.
  // We thus need both KeyboardEvent (backspace), and InputEvent (insertText)
  if (event.key === 'Backspace' && !inputValue.value && props.modelValue.length > 0) {
    event.preventDefault();
    removeTag(props.modelValue[props.modelValue.length - 1]);
  }
}

function handleTextInput(event: InputEvent) {
  // IMPORTANT: as explained in handleBackspaceKeydown, InputEvent is the only one
  // that can be trusted on mobile for regular characters. However, it does't fire
  // inputType == "deleteContentBackward" (backspace) if the input is empty.
  console.log(event.data, event.inputType, event);
  if (event.inputType == 'insertText' && event.data === ' ') {
    event.preventDefault();
    inputValue.value = inputValue.value.trim();
    if (props.allowNew && inputValue.value) {
      addTag(inputValue.value);
    }
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
  box-shadow: 0 0 0 2px var(--focus-ring);
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
  background: var(--bg-hover);
  color: var(--text-primary);
}

.tag-input__option--new {
  cursor: default;
  color: var(--text-secondary);
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
  transition: opacity 0.15s;
}

.tag-input__add-btn:hover {
  opacity: 0.85;
}

.tag-input__add-btn:active {
  transform: scale(0.95);
}

.tag-input__add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
