<template>
  <span class="pill rating" :style="{ backgroundColor, color }">
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
import { ratingColor, ratingTextColor } from '../utils/rating';

const props = defineProps<{
  rating: number;
}>();

const { isDark } = useTheme();

const backgroundColor = computed(() => ratingColor(props.rating, isDark.value));
const color = computed(() => ratingTextColor(props.rating, isDark.value));
</script>
