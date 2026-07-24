<template>
  <div class="format-pill" :title="formatLabel">
    <component :is="icon" :size="18" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { BookOpenText, Music, Smartphone } from '@lucide/vue';
import type { BookFormat } from '../types';

const props = defineProps<{
  format: BookFormat;
}>();

const formatConfig: Record<BookFormat, { icon: any; label: string }> = {
  print: { icon: BookOpenText, label: 'Print' },
  audio: { icon: Music, label: 'Audio' },
  ebook: { icon: Smartphone, label: 'E-Book' },
};

const icon = computed(() => formatConfig[props.format].icon);
const formatLabel = computed(() => formatConfig[props.format].label);
</script>

<style scoped>
.format-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.6rem;
  color: var(--text-secondary);
  cursor: default;
  transition: color 0.15s;
  flex-shrink: 0;
  border-radius: 12px;
  vertical-align: middle;
}

.format-pill:hover {
  color: var(--text-primary);
}
</style>
