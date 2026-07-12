<template>
  <span class="pill rating" :style="{ backgroundColor }">
    {{ rating }}
  </span>
</template>

<style scoped>
.pill.rating {
  font-weight: 600;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { useTheme } from '../composables/useTheme';

const props = defineProps<{
  rating: number;
}>();

const { theme } = useTheme();

const isDarkMode = computed(() => {
  return (
    theme.value === 'dark' ||
    (theme.value === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
});

const backgroundColor = computed(() => {
  const hue = (props.rating / 5) * 120; // 0° red → 120° green
  const lightness = isDarkMode.value ? 30 : 90;
  return `hsl(${hue}, 70%, ${lightness}%)`;
});
</script>
