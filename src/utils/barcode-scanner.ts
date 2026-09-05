import { isIsbn13 } from './isbn';

// Chrome (desktop and Android) ships a native BarcodeDetector; Safari, every
// iOS browser and Firefox do not. The ponyfill is a ZXing-C++ WebAssembly build
// with the same API, imported lazily so browsers with the native detector never
// download the ~1MB of wasm.
type BarcodeDetectorConstructor = typeof import('barcode-detector/ponyfill').BarcodeDetector;
type BarcodeDetectorInstance = InstanceType<BarcodeDetectorConstructor>;

let detectorClass: Promise<BarcodeDetectorConstructor> | null = null;

const loadDetectorClass = async (): Promise<BarcodeDetectorConstructor> => {
  const native = (globalThis as any).BarcodeDetector as BarcodeDetectorConstructor | undefined;
  if (native) {
    try {
      // Present but format-poor is possible, so ask rather than assume.
      if ((await native.getSupportedFormats()).includes('ean_13')) return native;
    } catch {
      // Fall through to the ponyfill.
    }
  }
  return (await import('barcode-detector/ponyfill')).BarcodeDetector;
};

/** Cached: the wasm compile is worth paying for only once per session. */
const getDetectorClass = (): Promise<BarcodeDetectorConstructor> => {
  detectorClass ??= loadDetectorClass().catch((err) => {
    // Don't cache a failed load, so a flaky network can be retried.
    detectorClass = null;
    throw err;
  });
  return detectorClass;
};

export const startCamera = async (video: HTMLVideoElement): Promise<MediaStream> => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      // A 1D barcode needs horizontal pixels across the bars: at the default
      // 640x480 an EAN-13 on a book held at arm's length usually fails to read.
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  });
  video.srcObject = stream;
  await video.play();
  return stream;
};

export const stopCamera = (stream: MediaStream | null, video: HTMLVideoElement | null): void => {
  for (const track of stream?.getTracks() ?? []) {
    track.stop();
  }
  if (video) video.srcObject = null;
};

export const hasTorch = (stream: MediaStream | null): boolean => {
  const track = stream?.getVideoTracks()[0];
  return Boolean((track?.getCapabilities?.() as any)?.torch);
};

export const setTorch = (stream: MediaStream | null, on: boolean): void => {
  const track = stream?.getVideoTracks()[0];
  if (!track) return;
  track.applyConstraints({ advanced: [{ torch: on }] } as any).catch(() => {
    // Torch is best-effort: some devices advertise it and still refuse.
  });
};

/** Human-readable reason a camera could not be opened. */
export const cameraErrorMessage = (err: any): string => {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access was denied. Allow it in your browser settings and try again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera found on this device.';
    case 'NotReadableError':
      return 'The camera is already in use by another application.';
    default:
      return err?.message ?? 'Could not start the camera.';
  }
};

export interface ScanOptions {
  signal?: AbortSignal;
  /**
   * Identical reads required before accepting a result. A blurry frame can
   * decode into a different, checksum-valid ISBN, and confirming costs a few
   * frames at most.
   */
  confirmations?: number;
}

/**
 * Resolves with the first ISBN read `confirmations` times in a row. Rejects with
 * an AbortError when `signal` fires. The caller owns the stream: this only reads
 * frames, it never stops the camera.
 */
export const scanForIsbn = async (video: HTMLVideoElement, options: ScanOptions = {}): Promise<string> => {
  const { signal, confirmations = 2 } = options;
  const DetectorClass = await getDetectorClass();
  const detector: BarcodeDetectorInstance = new DetectorClass({ formats: ['ean_13'] });

  return new Promise<string>((resolve, reject) => {
    let lastValue: string | null = null;
    let streak = 0;
    let stopped = false;

    const onAbort = () => {
      stopped = true;
      reject(new DOMException('Scan aborted', 'AbortError'));
    };

    const finish = (value: string) => {
      stopped = true;
      signal?.removeEventListener('abort', onAbort);
      resolve(value);
    };

    if (signal?.aborted) return onAbort();
    signal?.addEventListener('abort', onAbort, { once: true });

    const scheduleNext = () => {
      if (stopped) return;
      // requestVideoFrameCallback ties detection to real frames instead of a
      // timer, so we never decode the same frame twice.
      if (video.requestVideoFrameCallback) {
        video.requestVideoFrameCallback(() => void tick());
      } else {
        setTimeout(() => void tick(), 100);
      }
    };

    const tick = async () => {
      if (stopped) return;
      try {
        for (const barcode of await detector.detect(video)) {
          if (!isIsbn13(barcode.rawValue)) continue;
          streak = barcode.rawValue === lastValue ? streak + 1 : 1;
          lastValue = barcode.rawValue;
          if (streak >= confirmations) return finish(barcode.rawValue);
        }
      } catch {
        // detect() throws while the video has no decodable frame yet; keep going.
      }
      scheduleNext();
    };

    scheduleNext();
  });
};
