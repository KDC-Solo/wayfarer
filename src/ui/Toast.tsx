import { useEffect } from 'react';

export type ToastTone = 'success' | 'error';

export interface ToastMessage {
  text: string;
  tone: ToastTone;
}

/**
 * Confirmation the player can actually see. Status used to be a line of
 * small text in the page footer — below the fold on most screens, and it
 * never cleared, so it read as page furniture rather than a response to
 * what you just did.
 *
 * Successes dismiss themselves; errors stay until acknowledged, because
 * an import that failed is something you need to act on.
 */
export function Toast({ message, onDismiss }: { message: ToastMessage | null; onDismiss: () => void }) {
  const autoDismiss = message?.tone === 'success';

  useEffect(() => {
    if (!message || !autoDismiss) return;
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [message, autoDismiss, onDismiss]);

  if (!message) return null;

  return (
    <div className={`toast toast-${message.tone}`} role="status" aria-live="polite">
      <span aria-hidden="true">{message.tone === 'success' ? '✓' : '!'}</span>
      <p>{message.text}</p>
      <button className="ghost" onClick={onDismiss} aria-label="Dismiss message">
        ✕
      </button>
    </div>
  );
}
