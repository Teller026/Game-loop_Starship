async function fetchWithRetry(url, options = {}, retries = 3, delay = 500) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error ${response.status} for ${url}`);
      }
      throw new Error(`Server error ${response.status} for ${url}`);
    }
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    if (retries <= 0 || error.message.includes('Client error')) {
      throw error;
    }
    const jitter = Math.random() * 200;
    const nextDelay = delay * 2 + jitter;
    await new Promise((resolve) => setTimeout(resolve, nextDelay));
    return fetchWithRetry(url, options, retries - 1, nextDelay);
  }
}

export async function loadJson(url, signal) {
  const response = await fetchWithRetry(url, { signal });
  return response.json();
}

export async function loadImage(url, signal) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const abortHandler = () => {
      img.src = '';
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (signal) {
      if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    img.onload = () => {
      if (signal) signal.removeEventListener('abort', abortHandler);
      resolve(img);
    };

    img.onerror = () => {
      if (signal) signal.removeEventListener('abort', abortHandler);
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.src = url;
  });
}
export async function loadAudio(url, audioCtx, signal) {
  const response = await fetchWithRetry(url, { signal });
  return url;
}

export async function loadAll(manifestUrl, audioCtx, onProgress, signal) {
  const manifest = await loadJson(manifestUrl, signal);
  const resources = { images: new Map(), audio: new Map() };

  const imageTasks = manifest.images.map(async (item) => {
    const img = await loadImage(item.src, signal);
    resources.images.set(item.id, img);
    onProgress?.();
  });

  const audioTasks = manifest.audio.map(async (item) => {
    const buffer = await loadAudio(item.src, audioCtx, signal);
    resources.audio.set(item.id, buffer);
    onProgress?.();
  });

  await Promise.all([...imageTasks, ...audioTasks]);
  return resources;
}