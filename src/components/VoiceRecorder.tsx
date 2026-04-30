import { useState, useRef, useEffect } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

interface Props {
  onChange: (blob: Blob | null) => void;
}

export const VoiceRecorder = ({ onChange }: Props) => {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: "audio/webm" });
        setBlob(b);
        onChange(b);
        if (url) URL.revokeObjectURL(url);
        setUrl(URL.createObjectURL(b));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      console.error("mic error", e);
      alert("Microphone access denied.");
    }
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
  };

  const remove = () => {
    setBlob(null);
    onChange(null);
    if (url) URL.revokeObjectURL(url);
    setUrl(null);
    setSeconds(0);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-5">
      {!blob && !recording && (
        <button
          type="button"
          onClick={start}
          className="inline-flex items-center gap-3 rounded-full bg-primary text-primary-foreground px-5 py-3 font-medium hover:bg-primary-deep transition-colors"
        >
          <Mic className="h-4 w-4" />
          {t("booking.voice.start")}
        </button>
      )}

      {recording && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={stop}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive text-destructive-foreground recording-pulse"
            aria-label="Stop"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
          <div>
            <div className="text-sm font-medium text-foreground">
              {t("booking.voice.recording")}
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">{fmt(seconds)}</div>
          </div>
        </div>
      )}

      {blob && !recording && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {url && <audio src={url} controls className="w-full sm:w-auto" />}
          <button
            type="button"
            onClick={remove}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("booking.voice.delete")}
          </button>
        </div>
      )}
    </div>
  );
};
