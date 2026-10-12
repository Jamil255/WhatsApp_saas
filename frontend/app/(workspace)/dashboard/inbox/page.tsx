'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock3,
  FileText,
  Film,
  Images,
  ImageIcon,
  Inbox,
  Loader2,
  Mic,
  Music2,
  Paperclip,
  Pause,
  Play,
  Search,
  Send,
  Smile,
  Square,
  Sticker,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import {
  DashboardError,
  DashboardLoading,
  EmptyState,
} from '@/components/dashboard-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch, apiFetchBlob } from '@/lib/api';
import {
  type InboxMessage,
  queryKeys,
  useInbox,
  useSessionStatus,
} from '@/lib/queries';
import { cn } from '@/lib/utils';

const RESTRICTION_KEY = 'nexora_inbox_send_restriction';
const QUICK_EMOJIS = [
  '😀',
  '😂',
  '😍',
  '👍',
  '🙏',
  '🎉',
  '❤️',
  '🔥',
  '✅',
  '👋',
  '😊',
  '💯',
];

const time = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

type MediaType = 'image' | 'video' | 'document' | 'audio' | 'gif' | 'sticker';

type UploadType = MediaType | 'voice';

type SendRestriction = {
  code: string;
  message: string;
  until: number;
};

type ComposerNotice = {
  title: string;
  message: string;
};

function isHttpUrl(value: string) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function formatRemaining(seconds: number) {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    return `${hours}h${minutes ? ` ${minutes}m` : ''}`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}m ${remainder}s`;
  }
  return `${seconds}s`;
}

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function useMessageMedia(item: InboxMessage) {
  const [privateUrl, setPrivateUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setFailed(false);
    setPrivateUrl(null);
    if (!item.media?.endpoint) return;

    apiFetchBlob(item.media.endpoint)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPrivateUrl(objectUrl);
      })
      .catch(() => active && setFailed(true));

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, item.media?.endpoint]);

  return {
    url: privateUrl || item.media?.url || null,
    loading: Boolean(item.media?.endpoint && !privateUrl && !failed),
    failed,
  };
}

function VoiceBubble({
  url,
  duration,
  loading,
}: {
  url: string | null;
  duration: number;
  loading: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [actualDuration, setActualDuration] = useState(duration || 0);
  const [playbackError, setPlaybackError] = useState(false);
  const progress = actualDuration
    ? Math.min(100, (current / actualDuration) * 100)
    : 0;

  return (
    <div className="flex min-w-[220px] items-center gap-3 py-0.5 sm:min-w-[260px]">
      <button
        type="button"
        disabled={!url || loading}
        onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (audio.paused) {
            setPlaybackError(false);
            void audio.play().catch(() => {
              setPlaying(false);
              setPlaybackError(true);
            });
          } else audio.pause();
        }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="relative flex h-6 items-center gap-[3px] overflow-hidden">
          {Array.from({ length: 31 }, (_, index) => {
            const height = 5 + ((index * 7 + 3) % 15);
            const active = index / 30 <= progress / 100;
            return (
              <span
                key={index}
                className={cn(
                  'w-[2px] shrink-0 rounded-full transition-colors',
                  active ? 'bg-emerald-600' : 'bg-slate-300',
                )}
                style={{ height }}
              />
            );
          })}
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[10px] opacity-70">
          <span className={cn(playbackError && 'font-semibold text-red-600')}>
            {playbackError
              ? 'Unable to play'
              : formatDuration(playing || current ? current : actualDuration)}
          </span>
          <Mic className="h-3 w-3" />
        </div>
      </div>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onCanPlay={() => setPlaybackError(false)}
          onError={() => {
            setPlaying(false);
            setPlaybackError(true);
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setCurrent(0);
          }}
          onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) =>
            setActualDuration(
              Number.isFinite(event.currentTarget.duration)
                ? event.currentTarget.duration
                : duration,
            )
          }
          className="hidden"
        />
      )}
    </div>
  );
}

function MessageContent({ item }: { item: InboxMessage }) {
  const { url, loading, failed } = useMessageMedia(item);

  if (item.type === 'voice') {
    return (
      <VoiceBubble
        url={url}
        loading={loading}
        duration={item.media?.durationSeconds || 0}
      />
    );
  }

  if (item.type === 'image' && url) {
    return (
      <div className="space-y-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="block overflow-hidden rounded-xl bg-black/5"
        >
          <img
            src={url}
            alt={item.body || 'WhatsApp image'}
            className="mx-auto max-h-[270px] w-auto max-w-full object-contain"
          />
        </a>
        {item.body && (
          <p className="whitespace-pre-wrap break-words px-1 text-left">
            {item.body}
          </p>
        )}
      </div>
    );
  }

  if ((item.type === 'video' || item.type === 'gif') && url) {
    return (
      <div className="space-y-2">
        <video
          controls
          autoPlay={item.type === 'gif'}
          loop={item.type === 'gif'}
          muted={item.type === 'gif'}
          playsInline
          preload="metadata"
          src={url}
          className="max-h-[270px] max-w-full rounded-xl bg-black"
        />
        {item.body && (
          <p className="whitespace-pre-wrap break-words px-1 text-left">
            {item.body}
          </p>
        )}
      </div>
    );
  }

  if (item.type === 'audio' && url) {
    return (
      <div className="space-y-2">
        <audio controls preload="metadata" src={url} className="max-w-full" />
        {item.body && (
          <p className="whitespace-pre-wrap break-words text-left">
            {item.body}
          </p>
        )}
      </div>
    );
  }

  if (item.type === 'sticker' && url) {
    return (
      <img
        src={url}
        alt="WhatsApp sticker"
        className="h-auto max-h-40 w-auto max-w-40 object-contain"
      />
    );
  }

  if (item.type === 'document' && url) {
    return (
      <div className="space-y-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-2 rounded-lg border border-current/20 bg-white/10 px-3 py-2.5"
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span className="max-w-64 truncate">
            {item.media?.fileName || 'Open document'}
          </span>
        </a>
        {item.body && (
          <p className="whitespace-pre-wrap break-words text-left">
            {item.body}
          </p>
        )}
      </div>
    );
  }

  if (!['text', 'otp', 'template'].includes(item.type)) {
    const Icon =
      item.type === 'image'
        ? ImageIcon
        : item.type === 'video'
          ? Film
          : item.type === 'audio'
            ? Music2
            : FileText;
    return (
      <div className="space-y-2">
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {loading
            ? `Loading ${item.type}...`
            : `${item.type} attachment${url && !failed ? '' : ' · unavailable'}`}
        </span>
        {item.body && !item.body.startsWith('[') && (
          <p className="whitespace-pre-wrap break-words text-left">
            {item.body}
          </p>
        )}
      </div>
    );
  }

  return (
    <p className="whitespace-pre-wrap break-words text-left">
      {item.body || `${item.type} message`}
    </p>
  );
}

function DeliveryState({ item }: { item: InboxMessage }) {
  if (item.status === 'queued' || item.status === 'processing') {
    return (
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Sending" />
    );
  }
  if (item.status === 'failed') {
    return (
      <AlertCircle className="h-3.5 w-3.5 text-red-500" aria-label="Failed" />
    );
  }
  if (item.status === 'sent') {
    return <Check className="h-3.5 w-3.5" aria-label="Sent" />;
  }
  return (
    <CheckCheck
      className={cn(
        'h-3.5 w-3.5',
        item.status === 'read' ? 'text-blue-500' : 'text-emerald-600',
      )}
      aria-label={item.status === 'read' ? 'Read' : 'Delivered'}
    />
  );
}

export default function InboxPage() {
  const queryClient = useQueryClient();
  const inbox = useInbox();
  const session = useSessionStatus();
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartedRef = useRef(0);
  const discardRecordingRef = useRef(false);
  const [selectedPhone, setSelectedPhone] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [caption, setCaption] = useState('');
  const [filename, setFilename] = useState('');
  const [mediaSource, setMediaSource] = useState<'upload' | 'url'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [restriction, setRestriction] = useState<SendRestriction | null>(null);
  const [notice, setNotice] = useState<ComposerNotice | null>(null);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setRecordingSeconds(
        Math.max(
          1,
          Math.floor((Date.now() - recordingStartedRef.current) / 1000),
        ),
      );
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    if (!voiceBlob) {
      setVoicePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(voiceBlob);
    setVoicePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [voiceBlob]);

  useEffect(
    () => () => {
      if (recorderRef.current?.state === 'recording')
        recorderRef.current.stop();
      recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RESTRICTION_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as SendRestriction;
      if (parsed.until > Date.now()) setRestriction(parsed);
      else window.localStorage.removeItem(RESTRICTION_KEY);
    } catch {
      window.localStorage.removeItem(RESTRICTION_KEY);
    }
  }, []);

  useEffect(() => {
    if (!restriction) return;
    const update = () => {
      const now = Date.now();
      setClock(now);
      if (restriction.until <= now) {
        setRestriction(null);
        window.localStorage.removeItem(RESTRICTION_KEY);
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [restriction]);

  useEffect(() => {
    if (
      inbox.data?.[0] &&
      !inbox.data.some((item) => item.phone === selectedPhone)
    ) {
      setSelectedPhone(inbox.data[0].phone);
    }
  }, [inbox.data, selectedPhone]);

  const conversations = useMemo(
    () =>
      (inbox.data || []).filter(
        (item) =>
          item.phone.toLowerCase().includes(search.toLowerCase()) ||
          (item.lastMessage || '').toLowerCase().includes(search.toLowerCase()),
      ),
    [inbox.data, search],
  );

  const conversation =
    (inbox.data || []).find((item) => item.phone === selectedPhone) ||
    conversations[0];

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    window.requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight;
    });
  }, [conversation?.phone, conversation?.messages.length]);

  const remainingSeconds = restriction
    ? Math.max(0, Math.ceil((restriction.until - clock) / 1000))
    : 0;
  const sendingRestricted = remainingSeconds > 0;
  const connected = session.data?.status === 'connected';

  function handleSendError(error: unknown) {
    if (error instanceof ApiError && error.status === 429) {
      const retryValue = Number(error.details?.retryAfterSeconds);
      const retryAfterSeconds =
        Number.isFinite(retryValue) && retryValue > 0 ? retryValue : 60;
      const nextRestriction: SendRestriction = {
        code: error.code || 'RATE_LIMIT_EXCEEDED',
        message: error.message,
        until: Date.now() + retryAfterSeconds * 1000,
      };
      setRestriction(nextRestriction);
      setClock(Date.now());
      setNotice(null);
      window.localStorage.setItem(
        RESTRICTION_KEY,
        JSON.stringify(nextRestriction),
      );
      return;
    }

    setNotice({
      title: 'Message not sent',
      message:
        error instanceof Error
          ? error.message
          : 'Unable to send this message. Please try again.',
    });
  }

  function resetMediaComposer() {
    setMediaOpen(false);
    setMediaUrl('');
    setCaption('');
    setFilename('');
    setMediaType('image');
    setMediaSource('upload');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (stickerInputRef.current) stickerInputRef.current.value = '';
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setNotice({
        title: 'Voice recording is unavailable',
        message: 'Use a current Chrome, Edge, Firefox, or Safari browser.',
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/webm',
      ].find((mime) => MediaRecorder.isTypeSupported(mime));
      const recorder = new MediaRecorder(
        stream,
        preferred ? { mimeType: preferred } : undefined,
      );
      recorderRef.current = recorder;
      recorderStreamRef.current = stream;
      recordedChunksRef.current = [];
      discardRecordingRef.current = false;
      recordingStartedRef.current = Date.now();
      setRecordingSeconds(0);
      setVoiceBlob(null);
      setNotice(null);
      recorder.ondataavailable = (event) => {
        if (event.data.size) recordedChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const duration = Math.max(
          1,
          Math.ceil((Date.now() - recordingStartedRef.current) / 1000),
        );
        if (!discardRecordingRef.current && recordedChunksRef.current.length) {
          setVoiceBlob(
            new Blob(recordedChunksRef.current, {
              type: recorder.mimeType || 'audio/webm',
            }),
          );
          setVoiceDuration(duration);
        }
        stream.getTracks().forEach((track) => track.stop());
        recorderStreamRef.current = null;
        setRecording(false);
      };
      recorder.start(250);
      setRecording(true);
    } catch (error) {
      setNotice({
        title: 'Microphone access is required',
        message:
          error instanceof Error
            ? error.message
            : 'Allow microphone access in the browser and try again.',
      });
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  function cancelRecording() {
    discardRecordingRef.current = true;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    else setRecording(false);
    setVoiceBlob(null);
    setRecordingSeconds(0);
  }

  const send = useMutation({
    mutationFn: () =>
      apiFetch('/dashboard/inbox/send', {
        method: 'POST',
        body: JSON.stringify({
          to: conversation?.phone,
          body: message.trim(),
          messageType: 'text',
        }),
      }),
    onMutate: () => setNotice(null),
    onSuccess: async () => {
      setMessage('');
      await queryClient.refetchQueries({
        queryKey: queryKeys.inbox,
        type: 'active',
      });
    },
    onError: handleSendError,
  });

  const sendMedia = useMutation({
    mutationFn: () =>
      apiFetch('/dashboard/inbox/send-media', {
        method: 'POST',
        body: JSON.stringify({
          to: conversation?.phone,
          mediaUrl: mediaUrl.trim(),
          mediaType,
          caption: caption.trim() || undefined,
          filename: filename.trim() || undefined,
        }),
      }),
    onMutate: () => setNotice(null),
    onSuccess: async () => {
      resetMediaComposer();
      await queryClient.refetchQueries({
        queryKey: queryKeys.inbox,
        type: 'active',
      });
    },
    onError: handleSendError,
  });

  const sendUpload = useMutation({
    mutationFn: ({
      file,
      type,
      duration,
      uploadCaption,
    }: {
      file: File;
      type: UploadType;
      duration?: number;
      uploadCaption?: string;
    }) => {
      const form = new FormData();
      form.append('to', conversation?.phone || '');
      form.append('mediaType', type);
      form.append('file', file);
      if (duration) form.append('durationSeconds', String(duration));
      if (uploadCaption?.trim()) form.append('caption', uploadCaption.trim());
      return apiFetch('/dashboard/inbox/send-upload', {
        method: 'POST',
        body: form,
      });
    },
    onMutate: () => setNotice(null),
    onSuccess: async () => {
      resetMediaComposer();
      setVoiceBlob(null);
      setVoiceDuration(0);
      setRecordingSeconds(0);
      await queryClient.refetchQueries({
        queryKey: queryKeys.inbox,
        type: 'active',
      });
    },
    onError: handleSendError,
  });

  const canSendText = Boolean(
    message.trim() &&
    conversation &&
    connected &&
    !send.isPending &&
    !sendingRestricted,
  );
  const canSendMedia = Boolean(
    conversation &&
    (mediaSource === 'upload' ? selectedFile : isHttpUrl(mediaUrl)) &&
    connected &&
    !sendMedia.isPending &&
    !sendUpload.isPending &&
    !sendingRestricted,
  );

  if (inbox.isLoading) return <DashboardLoading />;
  if (inbox.isError || !inbox.data) {
    return (
      <DashboardError
        message={
          inbox.error instanceof Error
            ? inbox.error.message
            : 'Inbox API is unavailable.'
        }
        onRetry={() => inbox.refetch()}
      />
    );
  }

  return (
    <div className="flex h-[calc(100svh-80px)] min-h-[560px] flex-col lg:h-[calc(100svh-112px)]">
      {!inbox.data.length ? (
        <EmptyState
          icon={Inbox}
          title="Your inbox is empty"
          description="Inbound and outbound conversations will appear after messages start flowing."
        />
      ) : (
        <div className="grid min-h-0 flex-1 grid-rows-[220px_minmax(0,1fr)] overflow-hidden rounded-2xl border bg-white shadow-soft lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-1">
          <aside className="flex min-h-0 flex-col border-b bg-white lg:border-b-0 lg:border-r">
            <div className="shrink-0 border-b bg-white p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search phone or message"
                  className="pl-9"
                />
              </div>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">
                {conversations.length} conversation
                {conversations.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {conversations.length ? (
                conversations.map((item) => (
                  <button
                    key={item.phone}
                    type="button"
                    onClick={() => setSelectedPhone(item.phone)}
                    className={cn(
                      'flex w-full gap-3 border-b p-4 text-left transition',
                      conversation?.phone === item.phone
                        ? 'bg-emerald-50/80'
                        : 'hover:bg-slate-50',
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-primary">
                      {item.phone.slice(-2)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold text-ink">
                          {item.phone}
                        </span>
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {time(item.lastAt)}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                        {item.lastMessage || 'Media or template message'}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-6 text-center">
                  <p className="text-xs font-semibold text-ink">
                    No matching conversations
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Try a different phone number or message.
                  </p>
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col bg-[#fbfdfc]">
            <header className="flex h-[68px] shrink-0 items-center justify-between border-b bg-white px-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-primary">
                  {conversation?.phone.slice(-2)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">
                    {conversation?.phone}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {conversation?.messages.length || 0} recent messages
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0">
                WhatsApp
              </Badge>
            </header>

            <div
              ref={messagesViewportRef}
              className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6"
              style={{
                backgroundColor: '#f3f0e9',
                backgroundImage:
                  'radial-gradient(circle at 18px 18px, rgba(15,118,87,.045) 1.25px, transparent 1.5px)',
                backgroundSize: '36px 36px',
              }}
            >
              {conversation?.messages.map((item) => {
                const outbound = item.direction === 'outbound';
                const visualMedia = [
                  'image',
                  'video',
                  'gif',
                  'sticker',
                ].includes(item.type);
                return (
                  <div
                    key={item.id}
                    className={cn('flex', outbound && 'justify-end')}
                  >
                    <div
                      className={cn(
                        'max-w-[86%] sm:max-w-[min(75%,34rem)]',
                        outbound && 'text-right',
                      )}
                    >
                      <div
                        className={cn(
                          'break-words rounded-2xl text-xs leading-5 shadow-sm',
                          visualMedia ? 'p-2' : 'px-4 py-2.5',
                          outbound
                            ? 'rounded-br-md bg-[#d9fdd3] text-slate-800'
                            : 'rounded-bl-md border border-black/5 bg-white text-slate-700',
                        )}
                      >
                        <MessageContent item={item} />
                      </div>
                      <div
                        className={cn(
                          'mt-1 flex items-center gap-1 text-[10px] text-slate-400',
                          outbound && 'justify-end',
                        )}
                      >
                        <span>{time(item.createdAt)}</span>
                        {outbound && <DeliveryState item={item} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="shrink-0 border-t bg-white p-3 sm:p-4">
              {sendingRestricted && restriction && (
                <div
                  role="status"
                  className="mb-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-amber-950"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <Clock3 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold">
                        {restriction.code === 'DAILY_LIMIT_EXCEEDED'
                          ? 'Daily sending limit reached'
                          : 'Sending temporarily paused'}
                      </p>
                      <span className="rounded-md bg-amber-100 px-2 py-1 font-mono text-[10px] font-bold text-amber-800">
                        {formatRemaining(remainingSeconds)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-amber-800">
                      {restriction.message} Your draft is safe. Sending will
                      unlock automatically when the limit resets.
                    </p>
                  </div>
                </div>
              )}

              {notice && !sendingRestricted && (
                <div
                  role="alert"
                  className="mb-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-red-900"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold">{notice.title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-red-700">
                      {notice.message}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotice(null)}
                    className="rounded-md p-1 text-red-500 hover:bg-red-100"
                    aria-label="Dismiss error"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {!connected && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
                  <WifiOff className="h-3.5 w-3.5" />
                  Reconnect WhatsApp before sending a reply.
                </div>
              )}

              {emojiOpen && !recording && !voiceBlob && (
                <div className="mb-2 flex max-w-xs flex-wrap gap-1 rounded-xl border bg-white p-2 shadow-lg">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setMessage((value) => `${value}${emoji}`)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-slate-100"
                      aria-label={`Insert ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const type: MediaType = file.type.startsWith('image/')
                    ? 'image'
                    : file.type.startsWith('video/')
                      ? 'video'
                      : file.type.startsWith('audio/')
                        ? 'audio'
                        : 'document';
                  setSelectedFile(file);
                  setMediaType(type);
                  setMediaSource('upload');
                  setMediaOpen(true);
                }}
              />
              <input
                ref={stickerInputRef}
                type="file"
                className="hidden"
                accept="image/webp,.webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setSelectedFile(file);
                  setMediaType('sticker');
                  setMediaSource('upload');
                  setMediaOpen(true);
                }}
              />

              <div
                className={cn(
                  'flex min-h-14 items-end gap-1 rounded-2xl border bg-[#f7f9fa] p-2 shadow-sm transition focus-within:border-emerald-300 focus-within:bg-white',
                  sendingRestricted && 'border-amber-200 bg-amber-50/40',
                  recording && 'border-red-200 bg-red-50',
                )}
              >
                {recording ? (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={cancelRecording}
                      className="shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                      title="Discard recording"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="flex min-h-10 flex-1 items-center gap-3 px-2">
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                      <span className="font-mono text-sm font-semibold text-red-700">
                        {formatDuration(recordingSeconds)}
                      </span>
                      <span className="text-xs text-slate-500">
                        Recording voice message…
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      onClick={stopRecording}
                      className="shrink-0 rounded-full bg-red-600 hover:bg-red-700"
                      title="Stop recording"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </Button>
                  </>
                ) : voiceBlob && voicePreviewUrl ? (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setVoiceBlob(null);
                        setVoiceDuration(0);
                      }}
                      className="shrink-0 text-red-600 hover:bg-red-50"
                      title="Delete voice message"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <audio
                      controls
                      src={voicePreviewUrl}
                      className="h-10 min-w-0 flex-1"
                    />
                    <Button
                      size="icon"
                      disabled={
                        !connected || sendingRestricted || sendUpload.isPending
                      }
                      onClick={() => {
                        const extension = voiceBlob.type.includes('ogg')
                          ? 'ogg'
                          : 'webm';
                        sendUpload.mutate({
                          file: new File(
                            [voiceBlob],
                            `voice-${Date.now()}.${extension}`,
                            {
                              type: voiceBlob.type || 'audio/webm',
                            },
                          ),
                          type: 'voice',
                          duration: voiceDuration,
                        });
                      }}
                      className="shrink-0 rounded-full"
                      title="Send voice message"
                    >
                      {sendUpload.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setEmojiOpen((open) => !open)}
                      className="shrink-0 text-slate-500"
                      title="Emoji"
                    >
                      <Smile className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={
                        !conversation || !connected || sendingRestricted
                      }
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 text-slate-500"
                      title="Attach a file"
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={
                        !conversation || !connected || sendingRestricted
                      }
                      onClick={() => stickerInputRef.current?.click()}
                      className="hidden shrink-0 text-slate-500 sm:inline-flex"
                      title="Send WebP sticker"
                    >
                      <Sticker className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={
                        !conversation || !connected || sendingRestricted
                      }
                      onClick={() => {
                        setMediaType('gif');
                        setMediaSource('url');
                        setSelectedFile(null);
                        setMediaOpen(true);
                      }}
                      className="hidden shrink-0 text-slate-500 sm:inline-flex"
                      title="Send GIF"
                    >
                      <Images className="h-5 w-5" />
                    </Button>
                    <Textarea
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      onKeyDown={(event) => {
                        if (
                          event.key === 'Enter' &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          if (canSendText) send.mutate();
                        }
                      }}
                      placeholder={
                        sendingRestricted
                          ? 'Your draft is safe until sending unlocks'
                          : 'Type a message'
                      }
                      className="min-h-[42px] max-h-28 flex-1 resize-none border-0 bg-transparent py-2.5 shadow-none focus:ring-0"
                    />
                    {message.trim() ? (
                      <Button
                        size="icon"
                        disabled={!canSendText}
                        onClick={() => send.mutate()}
                        className="shrink-0 rounded-full"
                        title="Send message"
                      >
                        {send.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="icon"
                        disabled={
                          !conversation || !connected || sendingRestricted
                        }
                        onClick={startRecording}
                        className="shrink-0 rounded-full"
                        title="Record voice message"
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
              <p className="mt-2 px-1 text-[10px] text-muted-foreground">
                Enter to send · Shift + Enter for a new line · Attachments up to
                20 MB
              </p>
            </div>
          </section>
        </div>
      )}

      <Dialog
        open={mediaOpen}
        onOpenChange={(open) => {
          if (sendMedia.isPending || sendUpload.isPending) return;
          if (open) setMediaOpen(true);
          else resetMediaComposer();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send media</DialogTitle>
            <DialogDescription>
              Upload a private file, sticker, or WhatsApp-compatible GIF. You
              can also send media from a public HTTPS URL.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {sendingRestricted && restriction && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                Sending is paused for {formatRemaining(remainingSeconds)}. You
                can prepare this media now and send it when the limit resets.
              </div>
            )}
            <label className="grid gap-2 text-sm font-medium">
              Media type
              <select
                value={mediaType}
                onChange={(event) => {
                  setMediaType(event.target.value as MediaType);
                  setSelectedFile(null);
                }}
                className="h-10 rounded-md border bg-white px-3 text-sm font-normal"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="document">Document</option>
                <option value="audio">Audio</option>
                <option value="gif">GIF animation (MP4)</option>
                <option value="sticker">Sticker (WebP)</option>
              </select>
            </label>
            <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMediaSource('upload')}
                className={cn(
                  'rounded-md px-3 py-2 text-xs font-semibold transition',
                  mediaSource === 'upload'
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-slate-500',
                )}
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setMediaSource('url')}
                className={cn(
                  'rounded-md px-3 py-2 text-xs font-semibold transition',
                  mediaSource === 'url'
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-slate-500',
                )}
              >
                Public URL
              </button>
            </div>

            {mediaSource === 'upload' ? (
              <label className="grid gap-2 text-sm font-medium">
                File
                <Input
                  type="file"
                  accept={
                    mediaType === 'sticker'
                      ? 'image/webp,.webp'
                      : mediaType === 'gif'
                        ? 'video/mp4,.mp4'
                        : mediaType === 'image'
                          ? 'image/*'
                          : mediaType === 'video'
                            ? 'video/*'
                            : mediaType === 'audio'
                              ? 'audio/*'
                              : undefined
                  }
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] || null)
                  }
                />
                {selectedFile && (
                  <span className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2 text-xs font-normal text-slate-600">
                    <span className="truncate">{selectedFile.name}</span>
                    <span className="shrink-0 pl-3">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </span>
                )}
              </label>
            ) : (
              <label className="grid gap-2 text-sm font-medium">
                Public media URL
                <Input
                  value={mediaUrl}
                  onChange={(event) => setMediaUrl(event.target.value)}
                  placeholder={
                    mediaType === 'gif'
                      ? 'https://cdn.example.com/animation.mp4'
                      : 'https://cdn.example.com/file'
                  }
                />
                {mediaUrl && !isHttpUrl(mediaUrl) && (
                  <span className="text-xs font-normal text-red-600">
                    Enter a valid HTTP or HTTPS URL.
                  </span>
                )}
              </label>
            )}
            {mediaType === 'document' && mediaSource === 'url' && (
              <label className="grid gap-2 text-sm font-medium">
                Filename
                <span className="text-xs font-normal text-muted-foreground">
                  Optional
                </span>
                <Input
                  value={filename}
                  onChange={(event) => setFilename(event.target.value)}
                  placeholder="report.pdf"
                />
              </label>
            )}
            <label className="grid gap-2 text-sm font-medium">
              Caption
              <span className="text-xs font-normal text-muted-foreground">
                Optional
              </span>
              <Textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Add a short message"
              />
            </label>
            {(sendMedia.isError || sendUpload.isError) &&
              !sendingRestricted && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {sendUpload.error instanceof Error
                    ? sendUpload.error.message
                    : sendMedia.error instanceof Error
                      ? sendMedia.error.message
                      : 'Unable to send media.'}
                </div>
              )}
            <p className="rounded-lg border bg-slate-50 p-3 text-xs leading-5 text-muted-foreground">
              {mediaType === 'gif'
                ? 'WhatsApp GIF playback uses an MP4 file. Upload or link to MP4 for reliable delivery.'
                : mediaType === 'sticker'
                  ? 'Stickers must be WebP. Files are private and only available to authenticated workspace users.'
                  : 'Uploaded files are private and only available to authenticated workspace users.'}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={sendMedia.isPending || sendUpload.isPending}
              onClick={resetMediaComposer}
            >
              Cancel
            </Button>
            <Button
              disabled={!canSendMedia}
              onClick={() => {
                if (mediaSource === 'upload' && selectedFile) {
                  sendUpload.mutate({
                    file: selectedFile,
                    type: mediaType,
                    uploadCaption: caption,
                  });
                } else {
                  sendMedia.mutate();
                }
              }}
            >
              {sendMedia.isPending || sendUpload.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : sendingRestricted ? (
                <>
                  <Clock3 className="mr-2 h-4 w-4" />
                  Wait {formatRemaining(remainingSeconds)}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send media
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
