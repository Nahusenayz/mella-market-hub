import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export function useVoiceCall(requestId: string, userId: string, otherUserId: string) {
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');
  const [error, setError] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callStatusRef = useRef(callStatus);
  callStatusRef.current = callStatus;

  const cleanup = useCallback(() => {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => { t.stop(); t.enabled = false; });
      localStreamRef.current = null;
    }
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.srcObject = null; audioRef.current = null; }
  }, []);

  const getMediaStream = useCallback(async () => {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      setError('Microphone access denied. Allow microphone permissions to call.');
      return null;
    }
  }, []);

  const setupPC = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection(STUN_SERVERS);
    pcRef.current = pc;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = (event) => {
      if (!audioRef.current) {
        audioRef.current = document.createElement('audio');
        audioRef.current.autoplay = true;
      }
      audioRef.current.srcObject = event.streams[0];
      audioRef.current.play().catch(() => {});
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({ type: 'broadcast', event: 'ice', payload: { ...event.candidate.toJSON(), from: userId } });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setCallStatus('ended');
        cleanup();
      }
    };

    return pc;
  }, [cleanup]);

  const setupChannel = useCallback(async () => {
    const channel = supabase.channel(`call-${requestId}`, { broadcast: { ack: true } } as any);

    channel.on('broadcast', { event: 'call_accepted' }, async ({ payload }: any) => {
      if (payload?.from === userId) return;
      if (callStatusRef.current === 'connected' || callStatusRef.current === 'ended') return;
      console.log('📞 Call accepted by responder, sending offer...');
      const stream = await getMediaStream();
      if (!stream) return;
      const pc = setupPC(stream);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channel.send({ type: 'broadcast', event: 'offer', payload: { ...pc.localDescription, from: userId } });
        setCallStatus('connected');
      } catch { setError('Failed to create offer'); }
    });

    channel.on('broadcast', { event: 'call_declined' }, ({ payload }: any) => {
      if (payload?.from === userId) return;
      console.log('📞 Call declined by responder');
      setError('Call declined by responder');
      setCallStatus('ended');
      cleanup();
    });

    channel.on('broadcast', { event: 'offer' }, async ({ payload }: any) => {
      if (payload?.from === userId) return;
      if (callStatusRef.current === 'connected' || callStatusRef.current === 'ended') return;
      setCallStatus('ringing');
      const stream = await getMediaStream();
      if (!stream) return;
      const pc = setupPC(stream);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({ type: 'broadcast', event: 'answer', payload: { ...pc.localDescription, from: userId } });
        setCallStatus('connected');
      } catch { setError('Connection failed'); }
    });

    channel.on('broadcast', { event: 'answer' }, async ({ payload }: any) => {
      if (payload?.from === userId || !pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload));
        setCallStatus('connected');
      } catch { setError('Connection failed'); }
    });

    channel.on('broadcast', { event: 'ice' }, async ({ payload }: any) => {
      if (payload?.from === userId || !pcRef.current) return;
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(payload)); } catch {}
    });

    channel.on('broadcast', { event: 'end' }, () => {
      setCallStatus('ended');
      cleanup();
    });

    return new Promise<typeof channel>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve(channel);
        else if (status === 'CHANNEL_ERROR') reject(new Error('Channel error'));
      });
    });
  }, [requestId, getMediaStream, setupPC, cleanup]);

  const startCall = useCallback(async () => {
    setError(null);
    try {
      const channel = await setupChannel();
      channelRef.current = channel;
      setCallStatus('calling');
      channel.send({ type: 'broadcast', event: 'call_request', payload: { from: userId } });
      console.log('📞 Call request sent to responder');
    } catch (e: any) {
      setError(e.message || 'Call failed');
      setCallStatus('idle');
    }
  }, [setupChannel]);

  const endCall = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'end' }).catch(() => {});
    }
    setCallStatus('ended');
    cleanup();
  }, [cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { callStatus, error, startCall, endCall };
}
