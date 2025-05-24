
# Cross-Platform Mobile Optimization

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

Universal optimization strategies that work across both iOS and Android platforms.

## Asset Optimization

### Image Optimization
```typescript
// Universal image optimization
export function useResponsiveImages() {
  const [supportsWebP, setSupportsWebP] = useState(false);
  
  useEffect(() => {
    const webp = new Image();
    webp.onload = webp.onerror = () => {
      setSupportsWebP(webp.height === 2);
    };
    webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  }, []);
  
  const getOptimizedImageUrl = (src: string, width: number) => {
    const ext = supportsWebP ? 'webp' : 'jpg';
    return `${src}?w=${width}&f=${ext}&q=80`;
  };
  
  return { getOptimizedImageUrl, supportsWebP };
}
```

### Lazy Loading
```typescript
// Universal lazy loading with Intersection Observer
export function useLazyLoading(threshold = 0.1) {
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (!ref) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    
    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, threshold]);
  
  return [setRef, isVisible] as const;
}
```

## Network Optimization

### Request Batching
```typescript
// Universal request batching
class RequestBatcher {
  private queue: Array<{
    url: string;
    options?: RequestInit;
    resolve: (data: any) => void;
    reject: (error: Error) => void;
  }> = [];
  
  private timeoutId: NodeJS.Timeout | null = null;
  
  add<T>(url: string, options?: RequestInit): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, options, resolve, reject });
      
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
      
      this.timeoutId = setTimeout(() => this.flush(), 50);
    });
  }
  
  private async flush() {
    const batch = [...this.queue];
    this.queue = [];
    
    try {
      const responses = await Promise.allSettled(
        batch.map(req => fetch(req.url, req.options))
      );
      
      responses.forEach((response, index) => {
        const request = batch[index];
        if (response.status === 'fulfilled') {
          response.value.json().then(request.resolve).catch(request.reject);
        } else {
          request.reject(response.reason);
        }
      });
    } catch (error) {
      batch.forEach(req => req.reject(error as Error));
    }
  }
}
```

## Device Capability Detection

### Feature Detection
```typescript
// Universal feature detection
export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState({
    touchSupport: false,
    connectionType: 'unknown',
    batteryAPI: false,
    serviceWorker: false,
    webPush: false
  });
  
  useEffect(() => {
    setCapabilities({
      touchSupport: 'ontouchstart' in window,
      connectionType: (navigator as any).connection?.effectiveType || 'unknown',
      batteryAPI: 'getBattery' in navigator,
      serviceWorker: 'serviceWorker' in navigator,
      webPush: 'PushManager' in window
    });
  }, []);
  
  return capabilities;
}
```

## Related Documentation

- **[IOS_OPTIMIZATION.md](IOS_OPTIMIZATION.md)**: iOS-specific optimizations
- **[ANDROID_OPTIMIZATION.md](ANDROID_OPTIMIZATION.md)**: Android-specific optimizations
- **[../PLATFORM_OPTIMIZATION.md](../PLATFORM_OPTIMIZATION.md)**: Platform optimization overview

## Version History

- **1.0.0**: Extracted from PLATFORM_OPTIMIZATION.md for focused cross-platform guidance (2025-05-23)
