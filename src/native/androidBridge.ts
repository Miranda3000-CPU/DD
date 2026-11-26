export interface AndroidBridgeResponse<T = unknown> {
  id: string;
  ok: boolean;
  data?: T;
  error?: string;
}

interface AndroidWebMessageBridge {
  postMessage(message: string): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<string>) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent<string>) => void): void;
}

declare global {
  interface Window {
    ddAndroid?: AndroidWebMessageBridge;
  }
}

let sequence = 0;

export function isAndroidWebView(): boolean {
  return typeof window !== 'undefined' && typeof window.ddAndroid?.postMessage === 'function';
}

export function requestAndroid<T = unknown>(
  action: string,
  payload: Record<string, unknown> = {},
  timeoutMs = 20_000,
): Promise<T> {
  const bridge = typeof window !== 'undefined' ? window.ddAndroid : undefined;
  if (!bridge) return Promise.reject(new Error('Ponte Android indisponível.'));

  const id = `dd-${Date.now()}-${sequence++}`;

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      bridge.removeEventListener('message', onMessage);
      callback();
    };

    const onMessage = (event: MessageEvent<string>) => {
      let response: AndroidBridgeResponse<T>;
      try {
        response = JSON.parse(String(event.data)) as AndroidBridgeResponse<T>;
      } catch {
        return;
      }
      if (response.id !== id) return;
      finish(() => {
        if (response.ok) resolve(response.data as T);
        else reject(new Error(response.error || 'A operação Android não foi concluída.'));
      });
    };

    const timeout = window.setTimeout(() => {
      finish(() => reject(new Error('O Android não respondeu à solicitação.')));
    }, timeoutMs);

    bridge.addEventListener('message', onMessage);
    try {
      bridge.postMessage(JSON.stringify({ id, action, payload }));
    } catch (error) {
      finish(() =>
        reject(error instanceof Error ? error : new Error('Falha ao comunicar com Android.')),
      );
    }
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isAndroidWebView()) {
    const result = await requestAndroid<{ granted: boolean }>('requestNotificationPermission');
    return result.granted;
  }

  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export async function setAndroidNotificationsEnabled(enabled: boolean): Promise<void> {
  if (!isAndroidWebView()) return;
  await requestAndroid('setNotificationsEnabled', { enabled });
}

export async function setAndroidDailyReminder(
  enabled: boolean,
  hour = 6,
  minute = 0,
): Promise<void> {
  if (!isAndroidWebView()) return;
  await requestAndroid('setDailyReminder', { enabled, hour, minute });
}

export async function scheduleAndroidCyclePrediction(nextPeriodDate: string | null): Promise<void> {
  if (!isAndroidWebView()) return;
  await requestAndroid('scheduleCyclePrediction', { nextPeriodDate });
}

export async function showAndroidNotification(title: string, body: string): Promise<void> {
  if (!isAndroidWebView()) return;
  await requestAndroid('showNotification', { title, body });
}

export async function testNotification(): Promise<void> {
  if (isAndroidWebView()) {
    await requestAndroid<{ shown: boolean }>('testNotification');
    return;
  }
  if (!('Notification' in window)) throw new Error('Este navegador não suporta notificações.');
  const permission =
    Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permissão para notificações não concedida.');
  new Notification('DD • Diário Dela 🌷', {
    body: 'Esta é uma notificação de teste. A integração está funcionando.',
    icon: '/pwa-192x192.svg',
  });
}

export async function selectAndroidBackupFile(): Promise<File | null> {
  if (!isAndroidWebView()) return null;
  const selected = await requestAndroid<{ filename: string; base64: string }>(
    'selectBackupFile',
    {},
    120_000,
  );
  const binary = atob(selected.base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new File([bytes], selected.filename || 'diario-dela-backup', {
    type: 'application/octet-stream',
  });
}

export async function downloadBackup(blob: Blob, filename: string): Promise<void> {
  if (!isAndroidWebView()) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    return;
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível preparar o arquivo de backup.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  await requestAndroid(
    'saveFile',
    {
      filename,
      mimeType: blob.type || 'application/octet-stream',
      base64,
    },
    120_000,
  );
}
