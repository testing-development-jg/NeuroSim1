import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useVoice() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef(false);

  const speak = useCallback(async (
    text: string,
    onSpeakingChange?: (speaking: boolean) => void
  ) => {
    if (isSpeakingRef.current) {
      audioRef.current?.pause();
      isSpeakingRef.current = false;
    }

    if (!text || text.length < 3) return;

    onSpeakingChange?.(true);
    isSpeakingRef.current = true;

    try {
      const { data, error } = await supabase.functions.invoke('voice-narration', {
        body: { text: text.substring(0, 300) }
      });

      if (error) throw error;

      if (data?.audioBase64) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          isSpeakingRef.current = false;
          onSpeakingChange?.(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          isSpeakingRef.current = false;
          onSpeakingChange?.(false);
        };

        try {
          await audio.play();
        } catch (playErr) {
          // Autoplay blocked by browser policy — fail silently
          console.warn('Audio autoplay blocked:', playErr);
          isSpeakingRef.current = false;
          onSpeakingChange?.(false);
        }
      } else {
        onSpeakingChange?.(false);
        isSpeakingRef.current = false;
      }
    } catch {
      onSpeakingChange?.(false);
      isSpeakingRef.current = false;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    isSpeakingRef.current = false;
  }, []);

  return { speak, stopSpeaking };
}
