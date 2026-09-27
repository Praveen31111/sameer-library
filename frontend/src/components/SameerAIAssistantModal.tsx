import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import {
  useAudioRecorder,
  createAudioPlayer,
  AudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest, API_URL } from '../services/api';

const { width } = Dimensions.get('window');

export interface SameerAIMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  actionType?: 'BOOK_SEAT' | 'PAY_DUES' | 'CONTACT' | 'GENERAL';
  timestamp: string;
}

interface SameerAIAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  mode?: 'PUBLIC' | 'STUDENT' | 'ADMIN';
  studentName?: string;
  onActionClick?: (action: string) => void;
}

export const SameerAIAssistantModal: React.FC<SameerAIAssistantModalProps> = ({
  visible,
  onClose,
  mode = 'PUBLIC',
  studentName,
  onActionClick,
}) => {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<SameerAIMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [handsFreeMode, setHandsFreeMode] = useState(true);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recordingTimeoutRef = useRef<any>(null);
  const activeAudioPlayerRef = useRef<AudioPlayer | null>(null);
  const handsFreeModeRef = useRef(true);
  const visibleRef = useRef(visible);
  const isProcessingVoiceRef = useRef(false);
  const autoListenTimerRef = useRef<any>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    handsFreeModeRef.current = handsFreeMode;
  }, [handsFreeMode]);

  useEffect(() => {
    visibleRef.current = visible;
    if (!visible) {
      if (autoListenTimerRef.current) {
        clearTimeout(autoListenTimerRef.current);
        autoListenTimerRef.current = null;
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      if (recorder.isRecording) {
        try {
          recorder.stop();
        } catch (e) {}
      }
      if (activeAudioPlayerRef.current) {
        try {
          activeAudioPlayerRef.current.pause();
          activeAudioPlayerRef.current.remove();
        } catch (e) {}
        activeAudioPlayerRef.current = null;
      }
      Speech.stop();
      setIsSpeaking(false);
      setIsRecording(false);
      isProcessingVoiceRef.current = false;
    }
  }, [visible]);

  // Sound wave bar animations
  const wave1 = useRef(new Animated.Value(10)).current;
  const wave2 = useRef(new Animated.Value(24)).current;
  const wave3 = useRef(new Animated.Value(38)).current;
  const wave4 = useRef(new Animated.Value(20)).current;
  const wave5 = useRef(new Animated.Value(12)).current;

  // Pulsing orb animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Welcome Greeting based on mode
  useEffect(() => {
    if (visible && messages.length === 0) {
      let welcomeText = '';
      if (mode === 'ADMIN') {
        welcomeText = `Namaste Admin Sir! Main Sameer AI hoon. Aap mujhse kisi bhi student ke dues, active admissions, vacant seats ya aaj ki attendance audit ke bare me puch sakte hain.`;
      } else if (mode === 'STUDENT') {
        welcomeText = `Namaste ${studentName ? studentName + ' ji' : ''}! Main Sameer AI hoon. Aap apni seat, pending dues, Wi-Fi details, attendance ya library rules ke bare me mujhse puch sakte hain.`;
      } else {
        welcomeText = `Namaste! Sameer Library me aapka swagat hai! Main Sameer AI hoon. Aap monthly fees, discount offers, AC rooms, vacant seats ya library timing ke bare me kuch bhi puch sakte hain.`;
      }

      const initialMsg: SameerAIMessage = {
        id: 'msg-welcome',
        sender: 'ai',
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      };
      setMessages([initialMsg]);

      // Speak welcome message if not muted
      if (!voiceMuted) {
        speakText(welcomeText);
      }
    }
  }, [visible]);

  // Voice wave loop animation when AI is speaking, thinking, or recording
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (isSpeaking || isThinking || isRecording) {
      const createWave = (val: Animated.Value, minH: number, maxH: number, duration: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(val, { toValue: maxH, duration, useNativeDriver: false }),
            Animated.timing(val, { toValue: minH, duration, useNativeDriver: false }),
          ])
        );
      };

      animLoop = Animated.parallel([
        createWave(wave1, 8, isRecording ? 36 : 30, 240),
        createWave(wave2, 12, isRecording ? 48 : 42, 220),
        createWave(wave3, 16, isRecording ? 54 : 50, 260),
        createWave(wave4, 10, isRecording ? 40 : 36, 230),
        createWave(wave5, 6, isRecording ? 30 : 26, 250),
      ]);
      animLoop.start();
    } else {
      Animated.parallel([
        Animated.timing(wave1, { toValue: 10, duration: 200, useNativeDriver: false }),
        Animated.timing(wave2, { toValue: 18, duration: 200, useNativeDriver: false }),
        Animated.timing(wave3, { toValue: 24, duration: 200, useNativeDriver: false }),
        Animated.timing(wave4, { toValue: 16, duration: 200, useNativeDriver: false }),
        Animated.timing(wave5, { toValue: 10, duration: 200, useNativeDriver: false }),
      ]).start();
    }

    return () => {
      animLoop?.stop();
    };
  }, [isSpeaking, isThinking, isRecording]);

  // Stop speech and recording when modal closes
  const handleClose = async () => {
    visibleRef.current = false;
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    Speech.stop();
    setIsSpeaking(false);
    if (recorder.isRecording) {
      try {
        await recorder.stop();
      } catch (e) {}
    }
    if (activeAudioPlayerRef.current) {
      try {
        activeAudioPlayerRef.current.pause();
        activeAudioPlayerRef.current.remove();
      } catch (e) {}
      activeAudioPlayerRef.current = null;
    }
    setIsRecording(false);
    isProcessingVoiceRef.current = false;
    onClose();
  };

  // Speak AI Text using Cloned Real Voice (or fallback to native TTS)
  const speakText = async (text: string, onSpeechFinished?: () => void, directAudioUrl?: string) => {
    try {
      if (voiceMuted) {
        onSpeechFinished?.();
        return;
      }
      await Speech.stop();
      if (activeAudioPlayerRef.current) {
        try {
          activeAudioPlayerRef.current.pause();
          activeAudioPlayerRef.current.remove();
        } catch (e) {}
        activeAudioPlayerRef.current = null;
      }

      setIsSpeaking(true);
      const speechContent = text.replace(/[\*\#\_]/g, '').trim();

      // 1. Instant single-roundtrip audio playback if directAudioUrl provided by backend
      if (directAudioUrl) {
        try {
          let audioPlayUri = directAudioUrl;
          if (directAudioUrl.startsWith('data:audio')) {
            const base64Data = directAudioUrl.split(',')[1] || directAudioUrl;
            const tempFile = `${FileSystem.cacheDirectory}sameer_director_${Date.now()}.mp3`;
            await FileSystem.writeAsStringAsync(tempFile, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            audioPlayUri = tempFile;
          } else if (!directAudioUrl.startsWith('http')) {
            const baseUrl = API_URL.replace(/\/api\/?$/, '');
            audioPlayUri = `${baseUrl}${directAudioUrl}`;
          }

          const player = createAudioPlayer(audioPlayUri);
          activeAudioPlayerRef.current = player;

          (player as any).addListener('playbackStatusUpdate', (status: any) => {
            if (status?.didJustFinish) {
              setIsSpeaking(false);
              try { player.remove(); } catch (e) {}
              activeAudioPlayerRef.current = null;
              onSpeechFinished?.();
            }
          });

          player.play();
          return;
        } catch (directPlayErr) {
          console.warn('Direct audio play issue, trying backend fetch fallback:', directPlayErr);
        }
      }

      // 2. Secondary fallback to /ai/voice if directAudioUrl wasn't included
      try {
        const voiceRes = await apiRequest('/ai/voice', {
          method: 'POST',
          body: JSON.stringify({ text: speechContent, language: 'hi' }),
        });

        if (voiceRes?.success && voiceRes?.audioUrl && !voiceRes.fallbackTts) {
          let audioPlayUri = voiceRes.audioUrl;
          if (voiceRes.audioUrl.startsWith('data:audio')) {
            const base64Data = voiceRes.audioUrl.split(',')[1] || voiceRes.audioUrl;
            const tempFile = `${FileSystem.cacheDirectory}sameer_director_${Date.now()}.mp3`;
            await FileSystem.writeAsStringAsync(tempFile, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            audioPlayUri = tempFile;
          } else if (!voiceRes.audioUrl.startsWith('http')) {
            const baseUrl = API_URL.replace(/\/api\/?$/, '');
            audioPlayUri = `${baseUrl}${voiceRes.audioUrl}`;
          }

          const player = createAudioPlayer(audioPlayUri);
          activeAudioPlayerRef.current = player;

          (player as any).addListener('playbackStatusUpdate', (status: any) => {
            if (status?.didJustFinish) {
              setIsSpeaking(false);
              try { player.remove(); } catch (e) {}
              activeAudioPlayerRef.current = null;
              onSpeechFinished?.();
            }
          });

          player.play();
          return;
        }
      } catch (voiceFetchErr) {
        console.warn('Voice clone fetch note, using local TTS:', voiceFetchErr);
      }

      // 3. Seamless local TTS fallback
      Speech.speak(speechContent, {
        language: 'hi-IN',
        pitch: 1.0,
        rate: 0.95,
        onDone: () => {
          setIsSpeaking(false);
          onSpeechFinished?.();
        },
        onStopped: () => {
          setIsSpeaking(false);
        },
        onError: () => {
          setIsSpeaking(false);
          onSpeechFinished?.();
        },
      });
    } catch (e) {
      console.warn('Speech playback warning:', e);
      setIsSpeaking(false);
      onSpeechFinished?.();
    }
  };

  // Start Voice Recording from Phone Microphone with live silence detection
  const startVoiceRecording = async () => {
    try {
      if (isThinking || isProcessingVoiceRef.current || !visibleRef.current) return;
      if (isSpeaking) {
        Speech.stop();
        setIsSpeaking(false);
      }

      if (autoListenTimerRef.current) {
        clearTimeout(autoListenTimerRef.current);
        autoListenTimerRef.current = null;
      }

      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        alert('Microphone permission zaruri hai bolkar sawal puchne ke liye.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);

      // Comfortable 6.5 seconds safety window so student can speak without being rushed
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = setTimeout(() => {
        if (!isProcessingVoiceRef.current) {
          stopVoiceRecording();
        }
      }, 6500);
    } catch (e) {
      console.error('Audio recording start failed:', e);
      setIsRecording(false);
    }
  };

  // Stop Voice Recording and Send to Gemini
  const stopVoiceRecording = async () => {
    if (isProcessingVoiceRef.current) return;
    isProcessingVoiceRef.current = true;

    try {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }

      setIsRecording(false);
      try {
        await recorder.stop();
      } catch (e) {}
      const uri = recorder.uri;

      if (!uri) {
        isProcessingVoiceRef.current = false;
        return;
      }

      setIsThinking(true);

      let base64Audio = '';
      try {
        const audioFile = new File(uri);
        base64Audio = await audioFile.base64();
      } catch (fileErr) {
        base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType?.Base64 || 'base64',
        });
      }

      if (!base64Audio) {
        throw new Error('Recorded audio could not be converted to base64');
      }

      const ext = uri.split('.').pop()?.toLowerCase();
      let detectedMime = 'audio/m4a';
      if (ext === 'mp4') detectedMime = 'audio/mp4';
      else if (ext === 'aac') detectedMime = 'audio/aac';
      else if (ext === 'wav') detectedMime = 'audio/wav';
      else if (ext === '3gp' || ext === '3gpp') detectedMime = 'audio/3gpp';

      const res = await apiRequest('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: detectedMime,
          mode,
          wantVoice: !voiceMuted,
          conversationHistory: messages.slice(-4).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            content: m.text,
          })),
        }),
      });

      const userTranscript = res.userTranscript || 'Aapka aawaz sandesh';
      const userMsg: SameerAIMessage = {
        id: `user-voice-${Date.now()}`,
        sender: 'user',
        text: `🎙️ "${userTranscript}"`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      };

      const aiReply = res.reply || 'Namaste! Sameer Library me aapka swagat hai.';
      const aiMsg: SameerAIMessage = {
        id: `ai-voice-${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        actionType: res.actionType || 'GENERAL',
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      };

      setMessages((prev) => [...prev, userMsg, aiMsg]);

      if (res?.suggestedQuestions && Array.isArray(res.suggestedQuestions) && res.suggestedQuestions.length > 0) {
        setActiveSuggestions(res.suggestedQuestions);
      }

      // Automatically speak the response using directAudioUrl from chat response (0 extra round-trip network delays!)
      speakText(
        aiReply,
        () => {
          if (handsFreeModeRef.current && visibleRef.current) {
            autoListenTimerRef.current = setTimeout(() => {
              startVoiceRecording();
            }, 600);
          }
        },
        res?.audioUrl
      );
    } catch (err: any) {
      console.warn('Voice send error:', err);
      const errorMsg: SameerAIMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: 'Aapki aawaz theek se sunai nahi di. Kripya dobara boliye ya quick chip par tap karein.',
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      };
      setMessages((prev) => [...prev, errorMsg]);

      // Retry auto-listen if in hands-free mode
      if (handsFreeModeRef.current && visibleRef.current) {
        autoListenTimerRef.current = setTimeout(() => {
          startVoiceRecording();
        }, 1200);
      }
    } finally {
      setIsThinking(false);
      isProcessingVoiceRef.current = false;
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  // Send Query to Backend Gemini AI
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isThinking) return;

    setInputText('');

    const userMsg: SameerAIMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await apiRequest('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: query,
          mode,
          wantVoice: !voiceMuted,
          conversationHistory: messages.slice(-4).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            content: m.text,
          })),
        }),
      });

      const aiReply = res.reply || `Namaste! Sameer Library me aapka swagat hai. Kripya apna sawal dobara puchiye.`;
      const aiMsg: SameerAIMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        actionType: res.actionType || 'GENERAL',
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (res?.suggestedQuestions && Array.isArray(res.suggestedQuestions) && res.suggestedQuestions.length > 0) {
        setActiveSuggestions(res.suggestedQuestions);
      }

      speakText(aiReply, undefined, res?.audioUrl);
    } catch (err: any) {
      console.error('AI chat query error:', err);
      const errorMsg: SameerAIMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: `Kshama karein, network issue ki wajah se abhi jawab nahi mil paya. Aap library timing, fees ya rules ke bare me dobara puch sakte hain.`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  // Quick action suggestions based on user mode
  const defaultSuggestions =
    mode === 'ADMIN'
      ? [
          '📊 Kitne students enrolled hain?',
          '💰 Total pending dues kitne hain?',
          '🪑 Kitni seats khali hain?',
          '⏰ Aaj attendance kitne bachho ki lagi?',
        ]
      : mode === 'STUDENT'
      ? [
          '🪑 Meri seat number konsi hai?',
          '💵 Mera kitna due payment baki hai?',
          '📶 Wi-Fi password kya hai?',
          '🚻 Washroom facility kaisa hai?',
          '📜 Library rules kya hain?',
        ]
      : [
          '💰 Fees kitni hai?',
          '🪑 Seat availability?',
          '🕒 Timings & Shifts?',
          '🚻 Toilet & facilities?',
          '🔒 CCTV & Privacy safe hai?',
          '☕ Food & Chai rules?',
        ];

  const [activeSuggestions, setActiveSuggestions] = useState<string[]>(defaultSuggestions);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.headerAuraOrb}>
                <Ionicons name="sparkles" size={16} color="#ffffff" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.headerTitle}>Sameer AI</Text>
                  <View style={styles.activeTag}>
                    <Text style={styles.activeTagText}>24x7 Voice</Text>
                  </View>
                </View>
                <Text style={styles.headerSubtitle}>
                  {mode === 'ADMIN'
                    ? 'Owner Intelligence & Audit'
                    : mode === 'STUDENT'
                    ? 'Student Personal Study Sathi'
                    : 'Library Assistant & Admission Guide'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Hands-Free Live Call Toggle */}
              <TouchableOpacity
                onPress={() => {
                  const nextVal = !handsFreeMode;
                  setHandsFreeMode(nextVal);
                  if (!nextVal && autoListenTimerRef.current) {
                    clearTimeout(autoListenTimerRef.current);
                    autoListenTimerRef.current = null;
                  }
                }}
                style={[styles.handsFreeHeaderBtn, handsFreeMode && styles.handsFreeHeaderBtnActive]}
              >
                <Ionicons
                  name={handsFreeMode ? 'infinite' : 'radio-button-off'}
                  size={14}
                  color={handsFreeMode ? '#34d399' : '#94a3b8'}
                />
                <Text style={[styles.handsFreeHeaderText, handsFreeMode && styles.handsFreeHeaderTextActive]}>
                  {handsFreeMode ? 'Auto-Voice' : 'Manual'}
                </Text>
              </TouchableOpacity>

              {/* Mute/Unmute Speech Toggle */}
              <TouchableOpacity
                onPress={() => {
                  if (!voiceMuted) {
                    Speech.stop();
                    setIsSpeaking(false);
                  }
                  setVoiceMuted(!voiceMuted);
                }}
                style={[styles.iconButton, voiceMuted && { backgroundColor: '#ef4444' }]}
              >
                <Ionicons
                  name={voiceMuted ? 'volume-mute' : 'volume-high'}
                  size={18}
                  color="#ffffff"
                />
              </TouchableOpacity>

              {/* Close Button */}
              <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Holographic Voice Visualizer Bar */}
          <View style={[styles.visualizerBar, isRecording && styles.visualizerBarRecording]}>
            <View style={styles.visualizerLeft}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isRecording ? '#ef4444' : isSpeaking ? '#10b981' : isThinking ? '#f59e0b' : '#38bdf8' },
                ]}
              />
              <Text style={[styles.visualizerStatusText, isRecording && { color: '#fca5a5', fontWeight: '700' }]}>
                {isRecording
                  ? '🎙️ Sun raha hoon... Boliye (Rukte hi ya Mic dabate hi turant jawab)'
                  : isSpeaking
                  ? '🔊 Sameer AI bol raha hai...'
                  : isThinking
                  ? '⚡ Sameer AI turant jawab la raha hai...'
                  : (handsFreeMode ? '🔄 Auto-Voice ON: Bolna shuru karein' : 'Puchiye ya Mic dabakar boliye')}
              </Text>
            </View>

            {/* 5-Bar Dancing Sound Wave */}
            <View style={styles.soundWaveWrapper}>
              <Animated.View style={[styles.soundBar, { height: wave1 }, isRecording && { backgroundColor: '#ef4444' }]} />
              <Animated.View style={[styles.soundBar, { height: wave2 }, isRecording && { backgroundColor: '#f87171' }]} />
              <Animated.View style={[styles.soundBar, { height: wave3, backgroundColor: isRecording ? '#ef4444' : '#38bdf8' }]} />
              <Animated.View style={[styles.soundBar, { height: wave4 }, isRecording && { backgroundColor: '#f87171' }]} />
              <Animated.View style={[styles.soundBar, { height: wave5 }, isRecording && { backgroundColor: '#ef4444' }]} />
            </View>
          </View>

          {/* Chat Messages List */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((item) => {
              const isAi = item.sender === 'ai';
              return (
                <View
                  key={item.id}
                  style={[styles.messageBubbleWrapper, isAi ? styles.aiWrapper : styles.userWrapper]}
                >
                  {isAi && (
                    <View style={styles.aiAvatar}>
                      <Ionicons name="sparkles" size={13} color="#ffffff" />
                    </View>
                  )}

                  <View style={[styles.messageBubble, isAi ? styles.aiBubble : styles.userBubble]}>
                    <Text style={[styles.messageText, isAi ? styles.aiMessageText : styles.userMessageText]}>
                      {item.text}
                    </Text>

                    <View style={styles.bubbleFooter}>
                      <Text style={styles.bubbleTime}>{item.timestamp}</Text>

                      {/* Replay Voice Button on AI messages */}
                      {isAi && (
                        <TouchableOpacity
                          onPress={() => speakText(item.text)}
                          style={styles.replayButton}
                        >
                          <Ionicons name="volume-medium" size={14} color="#059669" />
                          <Text style={styles.replayText}>Suniye</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Quick CTAs if suggested by AI */}
                    {isAi && item.actionType === 'BOOK_SEAT' && (
                      <TouchableOpacity
                        onPress={() => {
                          handleClose();
                          onActionClick?.('BOOK_SEAT');
                        }}
                        style={styles.actionButton}
                      >
                        <Ionicons name="bookmark" size={14} color="#ffffff" />
                        <Text style={styles.actionButtonText}>🪑 Seat Book Karein</Text>
                      </TouchableOpacity>
                    )}

                    {isAi && item.actionType === 'PAY_DUES' && (
                      <TouchableOpacity
                        onPress={() => {
                          handleClose();
                          onActionClick?.('PAY_DUES');
                        }}
                        style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
                      >
                        <Ionicons name="card" size={14} color="#ffffff" />
                        <Text style={styles.actionButtonText}>💳 Dues Dekhein / Pay Karein</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {isThinking && (
              <View style={[styles.messageBubbleWrapper, styles.aiWrapper]}>
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={13} color="#ffffff" />
                </View>
                <View style={[styles.messageBubble, styles.aiBubble, { paddingVertical: 14 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#059669" />
                    <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>
                      Sameer AI jankari fetch kar raha hai...
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Quick Question Suggestion Chips */}
          <View style={styles.quickChipsWrapper}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>
                Aur kuch jaan-na hai? 😄
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {activeSuggestions.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSendMessage(q)}
                  disabled={isThinking}
                  style={styles.quickChip}
                >
                  <Text style={styles.quickChipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Hands-Free Live Call Helper Banner */}
          {handsFreeMode && (
            <View style={styles.handsFreeLiveNotice}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <View style={[styles.pulseLiveDot, isRecording && { backgroundColor: '#ef4444' }]} />
                <Text style={styles.handsFreeLiveText}>
                  {isRecording
                    ? '🎙️ Sun raha hoon... Bolte rahiye (Rukne par turant answer milega)'
                    : isThinking
                    ? '⚡ Jawab taiyar ho raha hai...'
                    : isSpeaking
                    ? '🔊 Sameer AI bol raha hai... (Khatam hote hi fir sunega)'
                    : '🔄 Hands-Free Call ON: Mic dabayein aur lagatar baat karein'}
                </Text>
              </View>
            </View>
          )}

          {/* Input Bar with Voice Mic & Text Input */}
          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            {/* Mic Record Button */}
            <TouchableOpacity
              onPress={() => {
                if (isRecording) {
                  stopVoiceRecording();
                } else {
                  setHandsFreeMode(true);
                  startVoiceRecording();
                }
              }}
              disabled={isThinking}
              activeOpacity={0.8}
              style={[
                styles.micButton,
                handsFreeMode && styles.micButtonHandsFree,
                isRecording && styles.micButtonRecording,
                isThinking && { opacity: 0.5 },
              ]}
            >
              <Ionicons
                name={isRecording ? 'stop-circle' : 'mic'}
                size={isRecording ? 24 : 21}
                color="#ffffff"
              />
            </TouchableOpacity>

            <TextInput
              style={[styles.textInput, isRecording && { borderColor: '#ef4444', borderWidth: 1 }]}
              placeholder={
                isRecording
                  ? '🎙️ Sun raha hoon... (Mic dabakar turant bhejein)'
                  : isSpeaking
                  ? '🔊 Sameer AI bol raha hai...'
                  : handsFreeMode
                  ? '🔄 Bolna shuru karein ya type karein...'
                  : 'Sawal type karein ya Mic dabayein...'
              }
              placeholderTextColor={isRecording ? '#ef4444' : '#94a3b8'}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSendMessage()}
              returnKeyType="send"
              editable={!isThinking && !isRecording}
            />

            <TouchableOpacity
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || isThinking || isRecording}
              style={[
                styles.sendButton,
                (!inputText.trim() || isThinking || isRecording) && { backgroundColor: '#cbd5e1' },
              ]}
            >
              <Ionicons name="arrow-up" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// Standalone Floating Sameer AI Orb Button
export const FloatingSameerAIOrb: React.FC<{
  onPress: () => void;
  label?: string;
}> = ({ onPress, label = 'Sameer AI' }) => {
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const bottomOffset = 68 + Math.max(insets.bottom, 10);

  return (
    <Animated.View style={[styles.floatingOrbContainer, { bottom: bottomOffset, transform: [{ scale: pulseAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={styles.floatingOrbBtn}
      >
        <View style={styles.floatingOrbInnerGlow}>
          <Ionicons name="sparkles" size={17} color="#ffffff" />
        </View>
        <Text style={styles.floatingOrbText}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '84%',
    display: 'flex',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerAuraOrb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  activeTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  activeTagText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  handsFreeHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  handsFreeHeaderBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  handsFreeHeaderText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  handsFreeHeaderTextActive: {
    color: '#34d399',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualizerBar: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  visualizerBarRecording: {
    backgroundColor: '#450a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#dc2626',
  },
  visualizerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  visualizerStatusText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  soundWaveWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
  },
  soundBar: {
    width: 3,
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  chatScroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  chatContent: {
    padding: 16,
    gap: 12,
  },
  messageBubbleWrapper: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  aiWrapper: {
    justifyContent: 'flex-start',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  aiBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderTopLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#059669',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  aiMessageText: {
    color: '#0f172a',
    fontWeight: '500',
  },
  userMessageText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 10,
  },
  bubbleTime: {
    fontSize: 10,
    color: '#94a3b8',
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  replayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  actionButton: {
    marginTop: 10,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  quickChipsWrapper: {
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickChip: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  handsFreeLiveNotice: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  pulseLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
  },
  handsFreeLiveText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  micButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#38bdf8',
  },
  micButtonHandsFree: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b',
    shadowColor: '#10b981',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  micButtonRecording: {
    backgroundColor: '#ef4444',
    borderColor: '#fca5a5',
    transform: [{ scale: 1.08 }],
    shadowColor: '#ef4444',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingOrbContainer: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    zIndex: 999,
  },
  floatingOrbBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingOrbInnerGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingOrbText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
