export interface ManifestAssetItem {
  id: string;
  src: string;
}

export interface AssetManifest {
  images: ManifestAssetItem[];
  audio: ManifestAssetItem[];
}

export interface LoadedResources {
  images: Map<string, HTMLImageElement>;
  audio: Map<string, string>;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  delay = 500
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) {
        throw new Error('Client error ' + String(response.status) + ' for ' + url);
      }
      throw new Error('Server error ' + String(response.status) + ' for ' + url);
    }
    return response;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (err.name === 'AbortError') {
      throw err;
    }
    if (retries <= 0 || err.message.includes('Client error')) {
      throw err;
    }
    const jitter = Math.random() * 200;
    const nextDelay = delay * 2 + jitter;
    await new Promise<void>((resolve) => setTimeout(resolve, nextDelay));
    return fetchWithRetry(url, options, retries - 1, nextDelay);
  }
}

export async function loadJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetchWithRetry(url, { signal });
  return response.json() as Promise<T>;
}

export async function loadImage(url: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const abortHandler = (): void => {
      img.src = '';
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (signal) {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    img.onload = (): void => {
      if (signal) signal.removeEventListener('abort', abortHandler);
      resolve(img);
    };

    img.onerror = (): void => {
      if (signal) signal.removeEventListener('abort', abortHandler);
      reject(new Error('Failed to load image: ' + url));
    };

    img.src = url;
  });
}

export async function loadAudio(
  url: string,
  _audioCtx?: AudioContext,
  signal?: AbortSignal
): Promise<string> {
  await fetchWithRetry(url, { signal });
  return url;
}

export async function loadAll(
  manifestUrl: string,
  audioCtx: AudioContext | undefined,
  onProgress?: () => void,
  signal?: AbortSignal
): Promise<LoadedResources> {
  const manifest = await loadJson<AssetManifest>(manifestUrl, signal);
  const resources: LoadedResources = {
    images: new Map<string, HTMLImageElement>(),
    audio: new Map<string, string>()
  };

  const imageTasks = manifest.images.map(async (item): Promise<void> => {
    const img = await loadImage(item.src, signal);
    resources.images.set(item.id, img);
    onProgress?.();
  });

  const audioTasks = manifest.audio.map(async (item): Promise<void> => {
    const buffer = await loadAudio(item.src, audioCtx, signal);
    resources.audio.set(item.id, buffer);
    onProgress?.();
  });

  await Promise.all([...imageTasks, ...audioTasks]);
  return resources;
}