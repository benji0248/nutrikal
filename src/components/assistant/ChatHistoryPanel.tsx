import { useCallback, useEffect, useRef } from 'react';
import { MessageSquarePlus, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useChatStore } from '../../store/useChatStore';
import { formatDayFull, parseDate } from '../../utils/dateHelpers';

interface ChatHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatConversationWhen(iso: string): string {
  const d = parseDate(iso.slice(0, 10));
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const msgKey = iso.slice(0, 10);
  if (msgKey === todayKey) {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
  return formatDayFull(d);
}

function conversationLabel(title: string | null, preview: string): string {
  if (title?.trim()) return title.trim();
  if (preview.trim()) {
    const t = preview.trim();
    return t.length > 48 ? `${t.slice(0, 47)}…` : t;
  }
  return 'Conversación';
}

export function ChatHistoryPanel({ isOpen, onClose }: ChatHistoryPanelProps) {
  const conversationId = useChatStore((s) => s.conversationId);
  const summaries = useChatStore((s) => s.conversationSummaries);
  const hasMore = useChatStore((s) => s.hasMoreConversations);
  const isLoading = useChatStore((s) => s.isLoadingConversations);
  const loadConversationList = useChatStore((s) => s.loadConversationList);
  const openConversation = useChatStore((s) => s.openConversation);
  const startNewConversation = useChatStore((s) => s.startNewConversation);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    void loadConversationList(true);
  }, [isOpen, loadConversationList]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || isLoading || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
      void loadConversationList(false);
    }
  }, [hasMore, isLoading, loadConversationList]);

  const handleOpen = useCallback(
    async (id: string) => {
      if (id === conversationId) {
        onClose();
        return;
      }
      await openConversation(id);
      onClose();
    },
    [conversationId, onClose, openConversation],
  );

  const handleNew = useCallback(async () => {
    await startNewConversation();
    onClose();
  }, [onClose, startNewConversation]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Conversaciones">
      <button
        type="button"
        className="absolute inset-0 bg-[#191c17]/40 backdrop-blur-sm"
        aria-label="Cerrar historial"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 bottom-0 flex w-full max-w-sm flex-col bg-[#f8faf1] shadow-[-12px_0_40px_rgba(25,28,23,0.12)]">
        <header className="flex items-center justify-between border-b border-[#bfcaba]/30 px-5 py-4">
          <h2 className="font-heading text-lg font-bold text-[#191c17]">Conversaciones</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#707a6c] hover:bg-[#226046]/10 hover:text-[#226046]"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </header>

        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => void handleNew()}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#226046] px-4 py-3 font-body text-sm font-semibold text-white transition active:scale-[0.98]"
          >
            <MessageSquarePlus size={18} />
            Nueva conversación
          </button>
        </div>

        <div
          ref={listRef}
          onScroll={handleListScroll}
          className="flex-1 overflow-y-auto px-3 pb-6"
        >
          {summaries.length === 0 && !isLoading && (
            <p className="px-2 py-8 text-center font-body text-sm text-[#707a6c]">
              Todavía no hay conversaciones guardadas.
            </p>
          )}

          <ul className="space-y-1">
            {summaries.map((item) => {
              const active = item.id === conversationId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void handleOpen(item.id)}
                    className={`w-full rounded-xl px-3 py-3 text-left transition ${
                      active
                        ? 'bg-[#226046]/12 ring-1 ring-[#226046]/25'
                        : 'hover:bg-white/70'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-body text-sm font-semibold text-[#191c17] line-clamp-1">
                        {conversationLabel(item.title, item.preview)}
                      </span>
                      <span className="shrink-0 font-body text-[11px] text-[#707a6c]">
                        {formatConversationWhen(item.updatedAt)}
                      </span>
                    </div>
                    {item.preview && (
                      <p className="mt-1 font-body text-xs text-[#707a6c] line-clamp-2">
                        {item.preview}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {isLoading && (
            <p className="py-4 text-center font-body text-xs text-[#707a6c]">Cargando…</p>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
