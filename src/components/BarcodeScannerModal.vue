<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-dialog" @click.stop>
      <div class="modal-header">
        <h2>Scan ISBN</h2>
        <div class="modal-header-actions">
          <button
            v-if="torchAvailable"
            type="button"
            class="btn-icon-only"
            :class="{ 'is-active': torchOn }"
            :aria-pressed="torchOn"
            aria-label="Toggle torch"
            title="Toggle torch"
            @click="toggleTorch"
          >
            <Flashlight :size="20" />
          </button>
          <button type="button" class="btn-icon-only" @click="close" aria-label="Close">
            <X :size="20" />
          </button>
        </div>
      </div>

      <div class="modal-body">
        <div v-if="error" class="error-banner">
          {{ error }}
        </div>

        <div class="scanner-stage">
          <!-- playsinline keeps iOS from taking the video fullscreen. -->
          <video ref="videoEl" class="scanner-video" playsinline muted></video>
          <div v-if="!error" class="scanner-reticle"></div>
          <div v-if="starting" class="scanner-overlay">
            <span class="spinner"></span>
            <span>Starting camera</span>
          </div>
        </div>

        <p class="scanner-hint">Point the camera at the barcode on the back cover.</p>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-outline btn-dimmed btn-icon-text" @click="close">
          <X :size="18" />
          <span>Cancel</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Flashlight, X } from '@lucide/vue';
import { nextTick, onUnmounted, ref, watch } from 'vue';
import { useEscapeKey } from '../composables/useEscapeKey';
import {
  cameraErrorMessage,
  hasTorch,
  scanForIsbn,
  setTorch,
  startCamera,
  stopCamera,
} from '../utils/barcode-scanner';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['close', 'scanned']);

const videoEl = ref<HTMLVideoElement | null>(null);
const starting = ref(false);
const error = ref<string | null>(null);
const torchAvailable = ref(false);
const torchOn = ref(false);

let stream: MediaStream | null = null;
let controller: AbortController | null = null;

// The camera keeps recording until every track is stopped, so teardown has to
// run on every exit path: success, cancel, Escape, error and unmount.
const teardown = () => {
  controller?.abort();
  controller = null;
  stopCamera(stream, videoEl.value);
  stream = null;
  torchAvailable.value = false;
  torchOn.value = false;
  starting.value = false;
};

const close = () => {
  teardown();
  emit('close');
};

const start = async () => {
  error.value = null;
  starting.value = true;

  try {
    // The <video> only exists once the v-if has rendered.
    await nextTick();
    if (!props.isOpen || !videoEl.value) return;

    stream = await startCamera(videoEl.value);
    torchAvailable.value = hasTorch(stream);
    starting.value = false;

    controller = new AbortController();
    const isbn = await scanForIsbn(videoEl.value, { signal: controller.signal });

    teardown();
    emit('scanned', isbn);
    emit('close');
  } catch (err: any) {
    if (err?.name === 'AbortError') return;
    console.error('[Scanner] Failed to scan barcode', err);
    error.value = cameraErrorMessage(err);
    teardown();
  }
};

const toggleTorch = () => {
  torchOn.value = !torchOn.value;
  setTorch(stream, torchOn.value);
};

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      void start();
    } else {
      teardown();
    }
  },
  { immediate: true }
);

useEscapeKey(close, () => props.isOpen);
onUnmounted(teardown);
</script>

<style scoped>
.modal-header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-icon-only.is-active {
  color: var(--accent-primary);
  background-color: var(--bg-secondary);
}

.scanner-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background-color: #000;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}

.scanner-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* A barcode-shaped guide: wide and short, matching how an EAN-13 sits on a cover. */
.scanner-reticle {
  position: absolute;
  inset: 30% 10%;
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 4px;
  pointer-events: none;
}

.scanner-reticle::after {
  content: '';
  position: absolute;
  inset: 50% 0 auto 0;
  border-top: 2px solid var(--accent-primary);
}

.scanner-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  background-color: var(--bg-primary);
}

.scanner-hint {
  margin: 0.75rem 0 0 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-align: center;
}
</style>
