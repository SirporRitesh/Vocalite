// src/utils/service-worker.ts
// Service Worker registration and TTS model precaching utilities

interface CacheStatus {
  staticAssets: number;
  ttsModels: number;
  totalSize: number;
}

class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported = false;

  constructor() {
    this.isSupported = 'serviceWorker' in navigator;
  }

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  /**
   * Register the service worker
   */
  async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[SW Manager] Service Worker not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[SW Manager] Service Worker registered successfully');

      // Handle service worker updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW Manager] New service worker available, page refresh recommended');
              // You could show a notification to the user here
            }
          });
        }
      });

      return true;
    } catch (error) {
      console.error('[SW Manager] Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * Check if service worker is registered and active
   */
  isActive(): boolean {
    return this.registration?.active !== null;
  }

  /**
   * Manually trigger caching of a TTS model
   */
  async cacheModel(modelUrl: string): Promise<boolean> {
    if (!this.registration || !this.registration.active) {
      console.warn('[SW Manager] Service Worker not active, cannot cache model');
      return false;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        const { success } = event.data;
        resolve(success);
      };

      this.registration!.active!.postMessage(
        { type: 'CACHE_TTS_MODEL', modelUrl },
        [messageChannel.port2]
      );
    });
  }

  /**
   * Get cache status information
   */
  async getCacheStatus(): Promise<CacheStatus | null> {
    if (!this.registration || !this.registration.active) {
      return null;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.registration!.active!.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      );
    });
  }

  /**
   * Preload all TTS models for offline use
   */
  async preloadTTSModels(): Promise<{ successful: string[], failed: string[] }> {
    const models = [
      '/models/tts/en_US-lessac-medium.onnx',
      '/models/tts/en_US-lessac-medium.onnx.json'
    ];

    const successful: string[] = [];
    const failed: string[] = [];

    console.log('[SW Manager] Starting TTS model preloading...');

    for (const model of models) {
      try {
        const success = await this.cacheModel(model);
        if (success) {
          successful.push(model);
          console.log(`[SW Manager] Successfully cached: ${model}`);
        } else {
          failed.push(model);
          console.warn(`[SW Manager] Failed to cache: ${model}`);
        }
      } catch (error) {
        failed.push(model);
        console.error(`[SW Manager] Error caching ${model}:`, error);
      }
    }

    console.log(`[SW Manager] Preloading complete: ${successful.length} successful, ${failed.length} failed`);
    return { successful, failed };
  }

  /**
   * Check if TTS models are available offline
   */
  async areModelsAvailableOffline(): Promise<boolean> {
    const status = await this.getCacheStatus();
    return status ? status.ttsModels > 0 : false;
  }
}

// Export singleton instance
export const swManager = ServiceWorkerManager.getInstance();

// Auto-register service worker
export const initializeServiceWorker = async (): Promise<boolean> => {
  const registered = await swManager.register();
  
  if (registered) {
    // Wait a bit for service worker to activate, then preload models
    setTimeout(async () => {
      try {
        await swManager.preloadTTSModels();
      } catch (error) {
        console.warn('[SW Manager] Model preloading failed:', error);
      }
    }, 1000);
  }
  
  return registered;
};

export default ServiceWorkerManager;
