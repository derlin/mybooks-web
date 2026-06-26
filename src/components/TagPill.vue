<template>
  <div
    class="tag-pill"
    :class="{ 'tag-pill--disabled': disabled, 'tag-pill--interactive': interactive }"
    @click.stop="interactive && $emit('interact')"
  >
    <span class="tag-pill__text">{{ tag }}</span>
    <button
      v-if="removable"
      class="tag-pill__remove"
      @click.stop="$emit('remove')"
      type="button"
      aria-label="Remove tag"
    >
      ×
    </button>
  </div>
</template>

<script setup lang="ts">

defineProps<{
  tag: string;
  interactive?: boolean;
  removable?: boolean;
  disabled?: boolean;
}>();

defineEmits<{
  interact: [];
  remove: [];
}>();
</script>

<style scoped>
.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.15rem 0.55rem;
  border-radius: 12px;
  background: var(--tag-pill);
  color: var(--text-primary);
  font-size: 0.9rem;
  white-space: nowrap;
}

.tag-pill--interactive {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.tag-pill--interactive:hover:not(.tag-pill--disabled) {
  background: var(--tag-pill-hover);
}

.tag-pill--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tag-pill__text {
  font-weight: 500;
}

.tag-pill__remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 1.1rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.15s ease;
  line-height: 1;
}

.tag-pill__remove:hover {
  opacity: 1;
}

.tag-pill__remove:active {
  transform: scale(0.95);
}
</style>
