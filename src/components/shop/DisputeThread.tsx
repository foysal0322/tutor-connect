'use client';

import { useState, useTransition } from 'react';
import { Send } from 'lucide-react';
import { postDisputeMessage } from '@/app/(member)/shop/disputes/actions';
import styles from './DisputeThread.module.css';

export interface DisputeMessage {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  isOwn: boolean;
  authorRole: 'buyer' | 'seller' | 'admin';
}

interface Props {
  disputeId: string;
  initialMessages: DisputeMessage[];
  canPost: boolean;
}

export default function DisputeThread({
  disputeId,
  initialMessages,
  canPost,
}: Props) {
  const [messages, setMessages] = useState<DisputeMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [, startTransition] = useTransition();

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setError('');
    setSending(true);
    const optimistic: DisputeMessage = {
      id: `pending-${Date.now()}`,
      authorId: 'me',
      body: draft.trim(),
      createdAt: new Date().toISOString(),
      isOwn: true,
      authorRole: 'buyer',
    };
    setMessages((m) => [...m, optimistic]);
    const body = draft.trim();
    setDraft('');

    startTransition(async () => {
      const fd = new FormData();
      fd.set('disputeId', disputeId);
      fd.set('body', body);
      const res = await postDisputeMessage(fd);
      setSending(false);
      if (!res.ok) {
        setError(res.error);
        setMessages((m) => m.filter((x) => x.id !== optimistic.id));
        setDraft(body);
      }
    });
  }

  return (
    <div className={styles.wrap}>
      <div
        className={styles.thread}
        aria-live='polite'
        aria-label='Dispute messages'
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`${styles.message} ${m.isOwn ? styles.own : ''}`}
          >
            <div className={styles.meta}>
              <span className={styles.role}>{m.authorRole}</span>
              <span className={styles.time}>
                {new Date(m.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div className={styles.body}>{m.body}</div>
          </div>
        ))}
      </div>

      {canPost && (
        <form onSubmit={send} className={styles.form}>
          {error && <div role='alert' className={styles.error}>{error}</div>}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder='Type your reply…'
            rows={3}
            maxLength={2000}
            className={styles.textarea}
            disabled={sending}
          />
          <button
            type='submit'
            className={styles.sendBtn}
            disabled={sending || !draft.trim()}
          >
            <Send size={14} aria-hidden='true' />
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>
      )}
    </div>
  );
}
