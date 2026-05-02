import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isInStandaloneMode(): boolean {
  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

function isMobile(): boolean {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function usePWAInstall() {
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(
    () => !!localStorage.getItem('ciclo_install_dismissed')
  );

  useEffect(() => {
    // On iOS (no beforeinstallprompt), show manual guide if mobile + not standalone
    if (isIOS() && !isInStandaloneMode() && !isDismissed) {
      setShowIOSGuide(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Hide banner if already installed (appinstalled event)
    const installedHandler = () => {
      setIsInstallable(false);
      setShowIOSGuide(false);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [isDismissed]);

  const triggerInstall = async () => {
    if (!installPromptEvent) return;
    await installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setInstallPromptEvent(null);
    }
  };

  const dismiss = () => {
    localStorage.setItem('ciclo_install_dismissed', '1');
    setIsDismissed(true);
    setShowIOSGuide(false);
    setIsInstallable(false);
  };

  return {
    // Android/Chrome: native prompt available
    isInstallable: isInstallable && !isDismissed,
    triggerInstall,
    // iOS: show manual instructions
    showIOSGuide: showIOSGuide && !isDismissed,
    isMobile: isMobile(),
    dismiss,
  };
}
