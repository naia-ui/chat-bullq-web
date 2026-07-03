'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, Mic, Trash2, Square, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAudioRecorder } from '../hooks/use-audio-recorder';

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  onSendAudio?: (blob: Blob) => Promise<void>;
  onSendFile?: (file: File, caption?: string) => Promise<void>;
  disabled?: boolean;
}

// Espelha o whitelist do backend (UploadsService.ALLOWED_MEDIA_MIME) — o
// accept é só UX; a validação real acontece no upload.
const FILE_ACCEPT = [
  'image/*',
  'video/*',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.zip',
].join(',');

export function ChatInput({ onSend, onSendAudio, onSendFile, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSendingAudio, setIsSendingAudio] = useState(false);
  const [isSendingFile, setIsSendingFile] = useState(false);
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorder = useAudioRecorder();

  // Preview da imagem colada; revoga o objectURL em toda troca/descarte/unmount.
  useEffect(() => {
    if (!pastedImage) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pastedImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pastedImage]);

  const handleSubmit = useCallback(async () => {
    // Envio da imagem colada (com legenda opcional vinda do textarea).
    if (pastedImage) {
      if (isSendingFile || !onSendFile) return;
      setIsSendingFile(true);
      try {
        await onSendFile(pastedImage, text.trim() || undefined);
        setPastedImage(null);
        setText('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message || err?.message || 'Erro ao enviar imagem',
        );
      } finally {
        setIsSendingFile(false);
      }
      return;
    }
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    try {
      await onSend(trimmed);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSending(false);
    }
  }, [pastedImage, text, isSending, isSendingFile, onSend, onSendFile]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items || !onSendFile) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          e.preventDefault(); // evita colar o "path" como texto
          // Prints vêm sem nome útil ("image.png"); dá um nome único p/ o upload.
          const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
          const named =
            file.name && file.name !== 'image.png'
              ? file
              : new File([file], `pasted-${Date.now()}.${ext}`, { type: file.type });
          setPastedImage(named);
          return; // usa só a primeira imagem
        }
      }
      // sem imagem no clipboard → deixa o paste de texto normal seguir
    },
    [onSendFile],
  );

  const discardImage = () => setPastedImage(null); // useEffect revoga a URL

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleSendAudio = useCallback(async () => {
    if (!recorder.blob || !onSendAudio) return;
    setIsSendingAudio(true);
    try {
      await onSendAudio(recorder.blob);
      recorder.reset();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Erro ao enviar áudio',
      );
    } finally {
      setIsSendingAudio(false);
    }
  }, [recorder, onSendAudio]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Limpa o value pra permitir reenviar o MESMO arquivo em seguida —
      // sem isso o onChange não dispara na segunda escolha.
      e.target.value = '';
      if (!file || !onSendFile) return;
      setIsSendingFile(true);
      try {
        await onSendFile(file);
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message || err?.message || 'Erro ao enviar arquivo',
        );
      } finally {
        setIsSendingFile(false);
      }
    },
    [onSendFile],
  );

  const formatElapsed = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (disabled) {
    return (
      <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50">
        Conversa encerrada — reabra para enviar mensagens
      </div>
    );
  }

  // RECORDING MODE: shows a big bar with a pulsing red dot and the timer.
  if (recorder.state === 'recording') {
    return (
      <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/40 dark:bg-red-500/10">
          <button
            onClick={recorder.cancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20"
            aria-label="Cancelar gravação"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="flex flex-1 items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="font-medium tabular-nums">{formatElapsed(recorder.elapsedMs)}</span>
            <span className="text-xs opacity-70">Gravando…</span>
          </div>
          <button
            onClick={recorder.stop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600"
            aria-label="Parar gravação"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // PREVIEW MODE: the recording finished, user can listen/discard/send.
  if (recorder.state === 'stopped' && recorder.blob) {
    const audioSrc = URL.createObjectURL(recorder.blob);
    return (
      <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900">
          <button
            onClick={recorder.cancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
            aria-label="Descartar áudio"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <audio
            controls
            src={audioSrc}
            className="h-9 flex-1 min-w-0"
          />
          <button
            onClick={handleSendAudio}
            disabled={isSendingAudio}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            aria-label="Enviar áudio"
          >
            {isSendingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </button>
        </div>
        {recorder.error && (
          <p className="mt-1 text-xs text-red-500">{recorder.error}</p>
        )}
      </div>
    );
  }

  // IDLE MODE: text input + mic button.
  const canRecord = !!onSendAudio;
  const showMic = canRecord && !text.trim() && !pastedImage;

  return (
    <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      {pastedImage && previewUrl && (
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900">
          <img
            src={previewUrl}
            alt="Imagem colada"
            className="h-16 w-16 rounded-lg object-cover"
          />
          <span className="flex-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {pastedImage.name}
          </span>
          <button
            type="button"
            onClick={discardImage}
            disabled={isSendingFile}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-red-500 disabled:opacity-50 dark:hover:bg-zinc-800"
            aria-label="Descartar imagem"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_ACCEPT}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!onSendFile || isSendingFile}
          className="mb-1 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800"
          aria-label="Anexar arquivo"
        >
          {isSendingFile ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onPaste={handlePaste}
          placeholder={pastedImage ? 'Adicione uma legenda...' : 'Digite uma mensagem...'}
          rows={1}
          className="max-h-40 min-h-[40px] flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {showMic ? (
          <button
            onClick={recorder.start}
            type="button"
            className="mb-1 rounded-lg bg-zinc-100 p-2.5 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            aria-label="Gravar áudio"
          >
            <Mic className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={(!text.trim() && !pastedImage) || isSending || isSendingFile}
            className="mb-1 rounded-lg bg-primary p-2.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            aria-label="Enviar mensagem"
          >
            {isSending || isSendingFile ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      {recorder.error && (
        <p className="mt-1.5 text-xs text-red-500">{recorder.error}</p>
      )}
    </div>
  );
}
