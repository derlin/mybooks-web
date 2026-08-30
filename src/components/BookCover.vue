<template>
  <div
    class="book-cover"
    :class="{ 'is-loading': isLoading, 'is-fake': !currentSrc }"
    :style="{ '--cover-font-scale': fontScale }"
  >
    <!-- Keyed by src so switching books swaps the element instead of patching it,
         otherwise the browser keeps painting the previous cover until the new one decodes. -->
    <img
      v-if="currentSrc"
      :key="currentSrc"
      :src="currentSrc"
      :alt="title"
      loading="lazy"
      decoding="async"
      @load="isLoading = false"
      @error="nextCandidate"
    />
    <span v-else class="book-cover-title">{{ title }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { coverCandidates } from '../utils/covers';

const props = withDefaults(
  defineProps<{
    title: string;
    coverImage?: string | null;
    isbn?: string | null;
    width?: number;
  }>(),
  {
    coverImage: null,
    isbn: null,
    width: undefined,
  }
);

const candidates = computed(() => coverCandidates(props.coverImage, props.isbn, { width: props.width }));

const index = ref(0);
const isLoading = ref(candidates.value.length > 0);

watch(candidates, (newCandidates) => {
  index.value = 0;
  isLoading.value = newCandidates.length > 0;
});

const currentSrc = computed(() => candidates.value[index.value]);

const nextCandidate = () => {
  index.value++;
  isLoading.value = index.value < candidates.value.length;
};

const fontScale = computed(() => {
  const length = props.title.length;
  if (length <= 15) return 16;
  if (length <= 30) return 12;
  if (length <= 60) return 9;
  return 7;
});
</script>

<style scoped>
/* Size is set by the parent through the inherited --cover-width property. */
.book-cover {
  width: var(--cover-width, 110px);
  flex-shrink: 0;
  aspect-ratio: 2 / 3;
  border-radius: 4px;
  overflow: hidden;
  container-type: inline-size;
}

.book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 1;
  transition: opacity 0.2s ease-in;
}

.book-cover.is-loading img {
  opacity: 0;
}

.book-cover.is-loading,
.book-cover.is-fake {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  box-sizing: border-box;
}

.book-cover.is-loading {
  background-image: linear-gradient(90deg, transparent, var(--bg-hover), transparent);
  background-size: 200% 100%;
  animation: coverShimmer 1.2s ease-in-out infinite;
}

@keyframes coverShimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

.book-cover.is-fake {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}

.book-cover-title {
  font-size: calc(var(--cover-font-scale) * 1cqi);
  text-align: center;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
