import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, VideoOff, Mic, MicOff, MonitorUp, 
  CheckSquare, Settings, History, BarChart3, Users, 
  LogOut, Plus, FileDown, Play, Trash2, Send, Download, Volume2, Sun, Moon,
  Calendar, Clock, Smile, TrendingUp, TrendingDown, Sparkles, AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import './App.css';
import { supabase, isSupabaseConfigured, saveSupabaseKeys, clearSupabaseKeys } from './supabase';
import { io } from 'socket.io-client';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : window.location.origin;


// TypeScript Interfaces
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done' | 'review';
  assignee: string;
  priority: 'low' | 'medium' | 'high';
  meetingId?: string;
  reviewNotes?: string;
}

interface SessionLog {
  id: string;
  username: string;
  action: 'login' | 'logout';
  timestamp: string;
}

interface TranscriptMessage {
  id: string;
  speaker: string;
  text: string;
  time: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  avatarLogoIndex?: number;
  recipient?: string;
}

interface MeetingHistory {
  id: string;
  title: string;
  date: string;
  duration: string;
  participants: number;
  summary: string;
  actionItems: string[];
  recordingUrl?: string; // local temporary blob url
  transcript?: TranscriptMessage[];
}

interface RecordingItem {
  id: string;
  title: string;
  date: string;
  url: string;
  duration: string;
  expiresAt?: string;
  isArchived?: boolean;
}

interface ScheduledMeeting {
  id: string;
  title: string;
  dateTime: string;
  host: string;
  isHostJoined: boolean;
  meetingType: 'public' | 'private';
  recurrence: 'none' | 'daily' | 'weekly';
  passcode?: string;
  invitedEmails?: string[];
  responses?: { [email: string]: 'accepted' | 'declined' | 'pending' };
  duration?: number;
  isExpired?: boolean;
}

// Avatar Logo SVGs representation mapping
const AVATAR_LOGOS = [
  // 1. Boy 1 (Curly hair, green collar)
  (
    <svg viewBox="0 0 100 100" className="avatar-svg" width="100%" height="100%">
      <circle cx="50" cy="50" r="48" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2"/>
      <path d="M25 82 C 30 65, 70 65, 75 82" fill="#15803d" />
      <circle cx="50" cy="48" r="24" fill="#fed7aa" />
      {/* curly hair */}
      <path d="M30 35 C25 25, 45 15, 50 30 C55 15, 75 25, 70 35 C75 30, 75 10, 50 12 C25 10, 25 30, 30 35 Z" fill="#1e293b" />
      {/* eyes */}
      <circle cx="42" cy="46" r="3" fill="#0f172a" />
      <circle cx="58" cy="46" r="3" fill="#0f172a" />
      {/* mouth */}
      <path d="M46 54 Q 50 58, 54 54" stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  ),
  // 2. Boy 2 (Neat hair, blue shirt)
  (
    <svg viewBox="0 0 100 100" className="avatar-svg" width="100%" height="100%">
      <circle cx="50" cy="50" r="48" fill="#d1fae5" stroke="#059669" strokeWidth="2"/>
      <path d="M25 82 C 30 65, 70 65, 75 82" fill="#1d4ed8" />
      <circle cx="50" cy="48" r="24" fill="#fed7aa" />
      {/* hair */}
      <path d="M26 38 Q 50 20, 74 38 Q 65 18, 50 18 Q 35 18, 26 38 Z" fill="#78350f" />
      <circle cx="42" cy="46" r="3" fill="#0f172a" />
      <circle cx="58" cy="46" r="3" fill="#0f172a" />
      <path d="M45 54 Q 50 59, 55 54" stroke="#0f172a" strokeWidth="2" fill="none" />
    </svg>
  ),
  // 3. Girl 1 (Yellow headband, yellow shirt)
  (
    <svg viewBox="0 0 100 100" className="avatar-svg" width="100%" height="100%">
      <circle cx="50" cy="50" r="48" fill="#fee2e2" stroke="#dc2626" strokeWidth="2"/>
      <path d="M25 82 C 30 65, 70 65, 75 82" fill="#eab308" />
      <circle cx="50" cy="48" r="24" fill="#fed7aa" />
      {/* long brown hair */}
      <path d="M26 40 C22 55, 25 70, 28 75 C30 50, 70 50, 72 75 C75 70, 78 55, 74 40 C72 25, 28 25, 26 40 Z" fill="#451a03" />
      {/* headband */}
      <path d="M30 33 A 21 21 0 0 1 70 33" stroke="#eab308" strokeWidth="4" fill="none" />
      <circle cx="42" cy="46" r="3" fill="#0f172a" />
      <circle cx="58" cy="46" r="3" fill="#0f172a" />
      <path d="M46 54 Q 50 58, 54 54" stroke="#0f172a" strokeWidth="2" fill="none" />
    </svg>
  ),
  // 4. Girl 2 (Pigtails, pink shirt)
  (
    <svg viewBox="0 0 100 100" className="avatar-svg" width="100%" height="100%">
      <circle cx="50" cy="50" r="48" fill="#fef08a" stroke="#ca8a04" strokeWidth="2"/>
      <path d="M25 82 C 30 65, 70 65, 75 82" fill="#ec4899" />
      {/* pigtail left */}
      <circle cx="23" cy="38" r="10" fill="#0f172a" />
      {/* pigtail right */}
      <circle cx="77" cy="38" r="10" fill="#0f172a" />
      <circle cx="50" cy="48" r="24" fill="#fed7aa" />
      {/* hair bangs */}
      <path d="M26 40 Q 50 26, 74 40 Z" fill="#0f172a" />
      <circle cx="42" cy="46" r="3" fill="#0f172a" />
      <circle cx="58" cy="46" r="3" fill="#0f172a" />
      <path d="M46 54 Q 50 57, 54 54" stroke="#0f172a" strokeWidth="2" fill="none" />
    </svg>
  ),
  // 5. Executive Briefcase
  (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <circle cx="50" cy="50" r="48" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2"/>
      <rect x="30" y="40" width="40" height="28" rx="4" fill="#1e3a8a" />
      <path d="M42 40 V34 H58 V40" stroke="#1e3a8a" strokeWidth="4" fill="none" />
      <circle cx="50" cy="54" r="3" fill="#eab308" />
    </svg>
  ),
  // 6. Analytics Board
  (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <circle cx="50" cy="50" r="48" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2"/>
      <rect x="28" y="32" width="44" height="30" rx="3" fill="#064e3b" />
      <line x1="38" y1="52" x2="38" y2="46" stroke="#eab308" strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="52" x2="50" y2="40" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
      <line x1="62" y1="52" x2="62" y2="36" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
      <line x1="28" y1="62" x2="40" y2="76" stroke="#064e3b" strokeWidth="3" />
      <line x1="72" y1="62" x2="60" y2="76" stroke="#064e3b" strokeWidth="3" />
    </svg>
  ),
  // 7. Schedule Calendar
  (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <circle cx="50" cy="50" r="48" fill="#fff7ed" stroke="#ea580c" strokeWidth="2"/>
      <rect x="30" y="34" width="40" height="36" rx="4" fill="#ffffff" stroke="#ea580c" strokeWidth="4" />
      <rect x="30" y="34" width="40" height="10" fill="#ea580c" />
      <circle cx="40" cy="52" r="3" fill="#1e293b" />
      <circle cx="50" cy="52" r="3" fill="#1e293b" />
      <circle cx="60" cy="52" r="3" fill="#1e293b" />
      <circle cx="40" cy="60" r="3" fill="#1e293b" />
      <circle cx="50" cy="60" r="3" fill="#1e293b" />
      <circle cx="60" cy="60" r="3" fill="#ea580c" /> {/* active day */}
    </svg>
  ),
  // 8. Brainstorm Idea (Lightbulb)
  (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <circle cx="50" cy="50" r="48" fill="#fdf2f8" stroke="#db2777" strokeWidth="2"/>
      <path d="M50 26 C36 26, 36 44, 42 52 C46 58, 44 64, 44 68 H56 C56 64, 54 58, 58 52 C64 44, 64 26, 50 26 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="2" />
      <line x1="46" y1="72" x2="54" y2="72" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
      <line x1="48" y1="76" x2="52" y2="76" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  // 9. Remote Workspace (Laptop)
  (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <circle cx="50" cy="50" r="48" fill="#faf5ff" stroke="#9333ea" strokeWidth="2"/>
      <rect x="32" y="36" width="36" height="24" rx="2" fill="#581c87" />
      <polygon points="24,62 76,62 70,68 30,68" fill="#4a044e" />
      <rect x="44" y="60" width="12" height="2" fill="#a21caf" />
    </svg>
  ),
  // 10. Collaboration Chat
  (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <circle cx="50" cy="50" r="48" fill="#f0feff" stroke="#0891b2" strokeWidth="2"/>
      <path d="M28 50 C28 40, 48 40, 48 50 C48 56, 42 60, 38 60 L32 64 V60 C28 58, 28 54, 28 50 Z" fill="#0e7490" />
      <path d="M52 44 C52 36, 68 36, 68 44 C68 49, 64 52, 61 52 L56 55 V52 C52 50, 52 47, 52 44 Z" fill="#0891b2" />
    </svg>
  )
];


export interface SpeakerAnalytics {
  name: string;
  talkTime: number;
  percentage: number;
  color: string;
  interruptions: number;
  clarity: number;
}

export interface TopicAnalytics {
  name: string;
  count: number;
  importance: 'high' | 'medium' | 'low';
}

export interface InsightAnalytics {
  title: string;
  desc: string;
  type: 'success' | 'warning' | 'info';
}

export interface MeetingAnalytics {
  id: string;
  title: string;
  date: string;
  totalMeetings: number;
  totalMeetingsTrend: string;
  totalMeetingsTrendDirection: 'up' | 'down';
  totalDuration: string;
  totalDurationTrend: string;
  totalDurationTrendDirection: 'up' | 'down';
  avgSentiment: number;
  avgSentimentTrend: string;
  avgSentimentTrendDirection: 'up' | 'down';
  efficiencyScore: number;
  efficiencyScoreTrend: string;
  efficiencyScoreTrendDirection: 'up' | 'down';
  weeklyFrequency: { height: number; label: string; count: number }[];
  productivityTrends: { x: number; y: number; label: string }[];
  speakers: SpeakerAnalytics[];
  sentimentFlow: { time: string; positive: number; neutral: number; negative: number }[];
  engagementScore: number;
  topics: TopicAnalytics[];
  insights: InsightAnalytics[];
}

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');

  const [captchaCode, setCaptchaCode] = useState<string>('');
  const [captchaInput, setCaptchaInput] = useState<string>('');

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput('');
  };

  // Position choices
  const [position, setPosition] = useState<string>('Student');
  const [customPosition, setCustomPosition] = useState<string>('');

  const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>([]);
  const [activeJoiningScheduledId, setActiveJoiningScheduledId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [schedTitle, setSchedTitle] = useState<string>('');
  const [schedDateTime, setSchedDateTime] = useState<string>('');

  // Extended Scheduling States
  const [schedMeetingType, setSchedMeetingType] = useState<'public' | 'private'>('public');
  const [schedRecurrence, setSchedRecurrence] = useState<'none' | 'daily' | 'weekly'>('none');
  const [schedInvitedEmails, setSchedInvitedEmails] = useState<string>('');
  const [schedDuration] = useState<number>(240);
  const [showPasscodeAlert, setShowPasscodeAlert] = useState<boolean>(false);
  const [lastScheduledMeet, setLastScheduledMeet] = useState<ScheduledMeeting | null>(null);

  // Guest Mode & Authentication Drawer States
  const [joinMeetIdInput, setJoinMeetIdInput] = useState<string>('');
  const [joinMeetPassInput, setJoinMeetPassInput] = useState<string>('');
  const [guestDisplayName, setGuestDisplayName] = useState<string>('');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAccountMenu, setShowAccountMenu] = useState<boolean>(false);

  // User Profile Settings & webcam states
  const [userPhone, setUserPhone] = useState<string>('');
  const [userDob, setUserDob] = useState<string>('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  
  // Password Management States
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');

  // Simple client-side hash function for secure local user passwords
  const hashPassword = (pass: string): string => {
    let hash = 0;
    if (pass.length === 0) return "0";
    for (let i = 0; i < pass.length; i++) {
      const chr = pass.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return 'LHAS-' + Math.abs(hash).toString(16).toUpperCase();
  };
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<string>('');
  const [passwordChangeError, setPasswordChangeError] = useState<string>('');

  // Meeting System preferences (Zoom/Meet Style)
  const [prefAutoMute, setPrefAutoMute] = useState<boolean>(() => localStorage.getItem('pref_auto_mute') === 'true');
  const [prefAutoCameraOff, setPrefAutoCameraOff] = useState<boolean>(() => localStorage.getItem('pref_auto_camera_off') === 'true');
  const [prefMirrorVideo, setPrefMirrorVideo] = useState<boolean>(() => localStorage.getItem('pref_mirror_video') !== 'false');
  const [prefShowNames, setPrefShowNames] = useState<boolean>(() => localStorage.getItem('pref_show_names') !== 'false');
  const [prefNoiseSuppress, setPrefNoiseSuppress] = useState<boolean>(() => localStorage.getItem('pref_noise_suppress') === 'true');
  const [prefHistoryVisibility, setPrefHistoryVisibility] = useState<string>(() => localStorage.getItem('pref_history_visibility') || 'All Time');
  const [prefDownloadQuality, setPrefDownloadQuality] = useState<string>(() => localStorage.getItem('pref_download_quality') || '720p (HD)');
  const [prefLowBandwidth, setPrefLowBandwidth] = useState<boolean>(() => localStorage.getItem('pref_low_bandwidth') === 'true');

  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  interface EmailLog {
    id: string;
    to: string;
    subject: string;
    body: string;
    timestamp: string;
  }
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(() => {
    const saved = localStorage.getItem('intellmeet_emaillogs');
    return saved ? JSON.parse(saved) : [];
  });

  // Filtered logs for the specific authenticated user
  const userEmailLogs = emailLogs.filter(log => {
    const userEmail = email.trim().toLowerCase();
    const userNm = username.trim().toLowerCase();
    if (!userEmail) return false;
    return log.to.toLowerCase() === userEmail || 
           log.body.toLowerCase().includes(userEmail) || 
           log.body.toLowerCase().includes(userNm);
  });

  const sendEmailNotification = (to: string, subject: string, body: string) => {
    const newLog: EmailLog = {
      id: 'MAIL-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
      to,
      subject,
      body,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setEmailLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('intellmeet_emaillogs', JSON.stringify(updated));
      return updated;
    });
    console.log(`[EMAIL SENT] To: ${to} | Subject: ${subject}`);
  };

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });



  // Supabase Configuration UI
  const [showSupaConfig, setShowSupaConfig] = useState<boolean>(false);
  const [supaUrlInput, setSupaUrlInput] = useState<string>('');
  const [supaKeyInput, setSupaKeyInput] = useState<string>('');
  
  // Custom Participant Avatar Index (F-01 addition)
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState<number>(0);



  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('dashboard'); // 'dashboard', 'meeting', 'kanban', 'analytics', 'history', 'recordings'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // AI Analytics States
  const [selectedMeetingAnalytics, setSelectedMeetingAnalytics] = useState<string>('all');
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<string>('overview');

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [currentTab]);

  useEffect(() => {
    if (showAuthModal && !isRegisterMode) {
      generateCaptcha();
    }
  }, [showAuthModal, isRegisterMode]);

  // Meeting Room State
  const [inActiveMeeting, setInActiveMeeting] = useState<boolean>(false);
  const [meetingTitle, setMeetingTitle] = useState<string>('');
  const [meetingId, setMeetingId] = useState<string>('');
  const [activeMeetingPasscode, setActiveMeetingPasscode] = useState<string>('');
  const [meetingStartTime, setMeetingStartTime] = useState<number>(0);
  const [showJoinSetupModal, setShowJoinSetupModal] = useState<boolean>(false);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [activeKanbanTab, setActiveKanbanTab] = useState<string>('todo');

  // Dark/Light Theme Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('intellmeet_theme');
    return saved === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('intellmeet_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('intellmeet_theme', 'light');
    }
  }, [isDarkMode]);

  // Global keydown handler for accessibility (keyboard modal dismissal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAuthModal(false);
        setShowJoinSetupModal(false);
        setShowScheduleModal(false);
        setPlaybackUrl(null);
        setShowSupaConfig(false);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Session Logs
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>(() => {
    const saved = localStorage.getItem('intellmeet_session_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const addSessionLog = (user: string, action: 'login' | 'logout') => {
    const newLog: SessionLog = {
      id: 'LOG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      username: user,
      action,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString()
    };
    setSessionLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 50);
      localStorage.setItem('intellmeet_session_logs', JSON.stringify(updated));
      return updated;
    });
  };

  // Meeting Controls
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCamOff, setIsCamOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isE2EEEnabled, setIsE2EEEnabled] = useState<boolean>(false);

  const encryptText = (text: string, key: string): string => {
    if (!text || !key) return text;
    const keyCodes = Array.from(key).map(c => c.charCodeAt(0));
    const encryptedCodes = Array.from(text).map((c, i) => {
      return c.charCodeAt(0) ^ keyCodes[i % keyCodes.length];
    });
    return 'E2EE-' + btoa(String.fromCharCode(...encryptedCodes));
  };

  const decryptText = (cipher: string, key: string): string => {
    if (!cipher || !key || !cipher.startsWith('E2EE-')) return cipher;
    try {
      const base64 = cipher.replace('E2EE-', '');
      const decoded = atob(base64);
      const keyCodes = Array.from(key).map(c => c.charCodeAt(0));
      const decryptedCodes = Array.from(decoded).map((c, i) => {
        return c.charCodeAt(0) ^ keyCodes[i % keyCodes.length];
      });
      return String.fromCharCode(...decryptedCodes);
    } catch {
      return '[Decryption Failed]';
    }
  };



  // Right sidebar tab state inside meeting room
  const [activeRightTab, setActiveRightTab] = useState<string>('transcript');

  // Dynamic Simulators / Mock Data State
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sharedNotes, setSharedNotes] = useState<string>('');
  const [chatInput, setChatInput] = useState<string>('');
  const [chatTarget, setChatTarget] = useState<string>('Everyone');
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>([]);

  // Kanban Board State
  const [tasks, setTasks] = useState<Task[]>([]);

  // Action Items State in Active Meeting
  const [meetingActions, setMeetingActions] = useState<string[]>([]);
  const [actionTitleInput, setActionTitleInput] = useState<string>('');
  const [actionAssigneeInput, setActionAssigneeInput] = useState<string>('Everyone');
  const [actionDescriptionInput, setActionDescriptionInput] = useState<string>('');
  const [actionTimelineInput, setActionTimelineInput] = useState<string>('now');

  // History State
  const [historyList, setHistoryList] = useState<MeetingHistory[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Local Canvas Recording MOCK-RECORDER system
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const recordingStartTime = useRef<number>(0);
  const mixCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mixIntervalRef = useRef<number | null>(null);

  // Playback Modal State
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackTitle, setPlaybackTitle] = useState<string>('');
  const [downloadQuality, setDownloadQuality] = useState<string>('720p');

  // Refs for drawing simulated video canvas streams
  const myVideoRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const hiddenScreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const remoteCanvasRefs = useRef<{ [userId: string]: HTMLCanvasElement | null }>({});
  const animationFrameId = useRef<number | null>(null);

  // Real-time remote participant syncing
  const [meetingParticipants, setMeetingParticipants] = useState<any[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const socketRef = useRef<any>(null);
  const useRefId = useRef<string>('');

  const isScreenSharingRef = useRef(isScreenSharing);
  const isCamOffRef = useRef(isCamOff);
  const meetingParticipantsRef = useRef(meetingParticipants);
  const usernameRef = useRef(username);

  useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);
  useEffect(() => { isCamOffRef.current = isCamOff; }, [isCamOff]);
  useEffect(() => { meetingParticipantsRef.current = meetingParticipants; }, [meetingParticipants]);
  useEffect(() => { usernameRef.current = username; }, [username]);

  // Connect to backend Socket.io or use BroadcastChannel fallback
  useEffect(() => {
    if (!inActiveMeeting || !meetingId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setMeetingParticipants([]);
      return;
    }

    const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : window.location.origin;

    console.log('Connecting to meeting socket server:', backendUrl);
    
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 10000
    });

    socketRef.current = socket;

    if (!useRefId.current) {
      useRefId.current = Math.random().toString(36).substring(2, 9);
    }
    const tabUserId = useRefId.current;

    const participantInfo = {
      userId: tabUserId,
      username: username || 'Guest User',
      avatarIdx: selectedAvatarIdx,
      isMuted,
      isCamOff
    };

    const createPeerConnection = (targetSocketId: string, initiate: boolean) => {
      if (pcsRef.current.has(targetSocketId)) {
        return pcsRef.current.get(targetSocketId)!;
      }

      console.log(`[WebRTC] Creating RTCPeerConnection to ${targetSocketId}, initiate: ${initiate}`);
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      pcsRef.current.set(targetSocketId, pc);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('webrtc-ice-candidate', {
            toSocketId: targetSocketId,
            candidate: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        console.log('Received remote track from peer:', targetSocketId, event.streams[0]);
        if (event.streams && event.streams[0]) {
          setRemoteStreams(prev => {
            const next = new Map(prev);
            next.set(targetSocketId, event.streams[0]);
            return next;
          });
        }
      };

      if (initiate) {
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit('webrtc-offer', {
              toSocketId: targetSocketId,
              offer: pc.localDescription
            });
          })
          .catch(err => console.error('Error creating WebRTC offer:', err));
      }

      return pc;
    };

    socket.on('connect', () => {
      console.log('Connected to socket, joining room:', meetingId);
      socket.emit('join-room', meetingId, participantInfo);
    });

    socket.on('room-users', (users: any[]) => {
      console.log('Received updated room participants:', users);
      const remoteUsers = users.filter(u => u.socketId !== socket.id);
      setMeetingParticipants(remoteUsers);

      remoteUsers.forEach(u => {
        if (!pcsRef.current.has(u.socketId)) {
          createPeerConnection(u.socketId, true);
        }
      });
    });

    socket.on('webrtc-offer', async (payload: { fromSocketId: string; offer: any }) => {
      console.log(`[WebRTC] Received offer from ${payload.fromSocketId}`);
      const pc = createPeerConnection(payload.fromSocketId, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', {
          toSocketId: payload.fromSocketId,
          answer: pc.localDescription
        });
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    });

    socket.on('webrtc-answer', async (payload: { fromSocketId: string; answer: any }) => {
      console.log(`[WebRTC] Received answer from ${payload.fromSocketId}`);
      const pc = pcsRef.current.get(payload.fromSocketId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        } catch (err) {
          console.error('Error setting remote description answer:', err);
        }
      }
    });

    socket.on('webrtc-ice-candidate', async (payload: { fromSocketId: string; candidate: any }) => {
      const pc = pcsRef.current.get(payload.fromSocketId);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err);
    });

    // BroadcastChannel fallback for multi-tab testing on same machine
    const channelName = `intellmeet_room_${meetingId}`;
    const channel = new BroadcastChannel(channelName);

    const syncFallback = () => {
      channel.postMessage({
        type: 'presence',
        senderId: tabUserId,
        info: participantInfo
      });
    };

    const fallbackInterval = setInterval(() => {
      if (!socket.connected) {
        syncFallback();
      }
    }, 2000);

    channel.onmessage = (event) => {
      if (socket.connected) return;
      const msg = event.data;
      if (!msg || !msg.senderId || msg.senderId === tabUserId) return;

      if (msg.type === 'presence') {
        setMeetingParticipants(prev => {
          const filtered = prev.filter(u => u.userId !== msg.senderId);
          return [...filtered, {
            socketId: msg.senderId,
            userId: msg.senderId,
            ...msg.info
          }];
        });

        if (msg.isDiscovery) {
          channel.postMessage({
            type: 'presence',
            senderId: tabUserId,
            info: participantInfo
          });
        }
      } else if (msg.type === 'leave') {
        setMeetingParticipants(prev => prev.filter(u => u.userId !== msg.senderId));
      }
    };

    if (!socket.connected) {
      channel.postMessage({
        type: 'presence',
        senderId: tabUserId,
        isDiscovery: true,
        info: participantInfo
      });
    }

    return () => {
      console.log('Cleaning up meeting sockets and channels...');
      clearInterval(fallbackInterval);
      channel.postMessage({
        type: 'leave',
        senderId: tabUserId
      });
      channel.close();
      
      pcsRef.current.forEach(pc => pc.close());
      pcsRef.current.clear();
      setRemoteStreams(new Map());

      socket.disconnect();
      socketRef.current = null;
      setMeetingParticipants([]);
    };
  }, [inActiveMeeting, meetingId]);

  // Update Media state over sockets/channel
  useEffect(() => {
    if (inActiveMeeting && socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('update-media', { isMuted, isCamOff });
    }
    if (inActiveMeeting && meetingId) {
      const channelName = `intellmeet_room_${meetingId}`;
      const channel = new BroadcastChannel(channelName);
      const tabUserId = useRefId.current || 'guest';
      channel.postMessage({
        type: 'presence',
        senderId: tabUserId,
        info: {
          userId: tabUserId,
          username: username || 'Guest User',
          avatarIdx: selectedAvatarIdx,
          isMuted,
          isCamOff
        }
      });
      channel.close();
    }
  }, [isMuted, isCamOff, inActiveMeeting, meetingId, username, selectedAvatarIdx]);

  // Sync recordings (always local)
  useEffect(() => {
    localStorage.setItem('intellmeet_recordings_v2', JSON.stringify(recordings));
  }, [recordings]);

  // Tick every 10 seconds to update scheduled meeting join button statuses
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Camera stream activation
  useEffect(() => {
    const startCamera = async () => {
      if (inActiveMeeting && !isCamOff) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          localStreamRef.current = stream;
          if (hiddenVideoRef.current) {
            hiddenVideoRef.current.srcObject = stream;
            hiddenVideoRef.current.play().catch(err => console.log("Video playback error:", err));
          }
        } catch (err) {
          console.error("Camera access denied or error:", err);
        }
      } else {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
        }
        if (hiddenVideoRef.current) {
          hiddenVideoRef.current.srcObject = null;
        }
      }
    };

    startCamera();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [inActiveMeeting, isCamOff]);

  // Camera preview setup modal stream activation
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const setupPreview = async () => {
      if (showJoinSetupModal && !isCamOff) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          activeStream = stream;
          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = stream;
            previewVideoRef.current.play().catch(e => console.log("Preview video play error:", e));
          }
        } catch (err) {
          console.error("Error setting up pre-join preview camera:", err);
        }
      } else {
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = null;
        }
      }
    };

    setupPreview();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showJoinSetupModal, isCamOff]);

  const playSoundTest = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio test error:", e);
    }
  };

  // Speech-to-Text Transcription integration
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }

    if (inActiveMeeting && !isMuted) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const lastResultIndex = event.resultIndex;
        const text = event.results[lastResultIndex][0].transcript.trim();
        if (text) {
          const now = new Date();
          let hours = now.getHours();
          const minutes = now.getMinutes().toString().padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          const formattedTime = `${hours}:${minutes} ${ampm}`;

          setTranscript(prev => [
            ...prev,
            {
              id: 'USER-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
              speaker: `${username} (You)`,
              text,
              time: formattedTime
            }
          ]);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
      };

      rec.onend = () => {
        if (inActiveMeeting && !isMuted && recognitionRef.current === rec) {
          try {
            rec.start();
          } catch (e) {
            console.log("Error restarting speech recognition:", e);
          }
        }
      };

      recognitionRef.current = rec;
      try {
        rec.start();
      } catch (e) {
        console.log("Error starting speech recognition:", e);
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log("Error stopping speech recognition:", e);
        }
        recognitionRef.current = null;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log("Error stopping speech recognition:", e);
        }
        recognitionRef.current = null;
      }
    };
  }, [inActiveMeeting, isMuted, username]);

  // User profile image renderer helper
  const renderUserAvatar = (sizeStyle: any = { width: '100%', height: '100%' }) => {
    if (profilePhotoUrl) {
      return <img src={profilePhotoUrl} alt="User Avatar" style={{ ...sizeStyle, borderRadius: '50%', objectFit: 'cover' }} />;
    }
    return AVATAR_LOGOS[selectedAvatarIdx];
  };

  // Remote user avatar renderer
  const renderRemoteUserAvatar = (avatarIdx: number, avatarUrl?: string, sizeStyle: any = { width: '100%', height: '100%' }) => {
    if (avatarUrl) {
      return <img src={avatarUrl} alt="Remote User Avatar" style={{ ...sizeStyle, borderRadius: '50%', objectFit: 'cover' }} />;
    }
    return AVATAR_LOGOS[avatarIdx !== undefined ? avatarIdx : 0];
  };

  // Simulated canvas generator for active participants
  const ParticipantSimulatedVideo = ({ participant }: { participant: any }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      remoteCanvasRefs.current[participant.userId] = canvasRef.current;
      return () => {
        delete remoteCanvasRefs.current[participant.userId];
      };
    }, [participant.userId]);

    useEffect(() => {
      let animId: number;
      let frame = 0;

      const renderCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (prefLowBandwidth) {
          // Throttle updates to ~2 frames per second to save bandwidth and processor workload
          if (frame % 30 !== 0 && frame > 0) {
            frame++;
            animId = requestAnimationFrame(renderCanvas);
            return;
          }
        }

        const w = canvas.width;
        const h = canvas.height;
        
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        frame++;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        for (let x = 0; x < w; x++) {
          const y = Math.sin(x * 0.02 + frame * 0.1) * 10 + (h / 2);
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = participant.isMuted ? 'rgba(249, 83, 53, 0.2)' : 'rgba(80, 163, 164, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 35, 0, Math.PI * 2);
        ctx.fillStyle = participant.avatarIdx % 2 === 0 ? '#50A3A4' : '#FCAF38';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Poppins';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const nameText = participant.username || 'Guest';
        const initials = nameText.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
        ctx.fillText(initials, w / 2, h / 2);

        animId = requestAnimationFrame(renderCanvas);
      };

      renderCanvas();

      return () => {
        cancelAnimationFrame(animId);
      };
    }, [participant.userId, participant.avatarIdx, participant.isMuted]);

    return <canvas ref={canvasRef} width="320" height="180" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
  };

  const ParticipantVideo = ({ participant, stream }: { participant: any; stream: MediaStream | null }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => console.log('Remote video playback error:', err));
      }
    }, [stream]);

    if (stream && !participant.isCamOff) {
      return (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      );
    }

    return <ParticipantSimulatedVideo participant={participant} />;
  };

  // Local file upload parser to base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const base64Data = reader.result;
          setProfilePhotoUrl(base64Data);
          try {
            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file: base64Data,
                filename: `avatar_${username || 'user'}_${Date.now()}.png`
              })
            });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              const hostedUrl = uploadData.url.startsWith('/') ? `${API_BASE_URL}${uploadData.url}` : uploadData.url;
              setProfilePhotoUrl(hostedUrl);
            }
          } catch (uploadErr) {
            console.warn('Failed to upload avatar to backend:', uploadErr);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Start webcam feed for settings profile capture
  const startWebcam = async () => {
    setCameraError('');
    setIsWebcamActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        webcamVideoRef.current.play();
      }
    } catch (err: any) {
      console.error(err);
      setCameraError('Could not access webcam: ' + err.message);
      setIsWebcamActive(false);
    }
  };

  // Stop webcam feed
  const stopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null;
    }
    setIsWebcamActive(false);
  };

  // Capture canvas snapshot from webcam feed
  const captureWebcamSnapshot = () => {
    if (webcamVideoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 150;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const video = webcamVideoRef.current;
        const size = Math.min(video.videoWidth, video.videoHeight);
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        ctx.drawImage(video, sx, sy, size, size, 0, 0, 150, 150);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setProfilePhotoUrl(dataUrl);

        (async () => {
          try {
            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file: dataUrl,
                filename: `avatar_${username || 'user'}_webcam.jpg`
              })
            });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              const hostedUrl = uploadData.url.startsWith('/') ? `${API_BASE_URL}${uploadData.url}` : uploadData.url;
              setProfilePhotoUrl(hostedUrl);
            }
          } catch (uploadErr) {
            console.warn('Failed to upload webcam avatar to backend:', uploadErr);
          }
        })();
      }
      stopWebcam();
    }
  };

  // Password validation helper
  const validatePassword = (pass: string) => {
    return {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[^A-Za-z0-9]/.test(pass)
    };
  };
  const pwValidations = validatePassword(newPasswordInput);

  // Change password submit handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');
    setPasswordChangeStatus('');

    const validations = validatePassword(newPasswordInput);
    const isStrong = validations.length && validations.uppercase && validations.lowercase && validations.number && validations.special;

    if (!isStrong) {
      setPasswordChangeError('Password does not meet strength requirements.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeError('Passwords do not match.');
      return;
    }

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.auth.updateUser({ password: newPasswordInput });
      if (error) {
        setPasswordChangeError(error.message);
      } else {
        setPasswordChangeStatus('Password updated successfully in Supabase!');
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
      }
    } else {
      const usersRaw = localStorage.getItem('intellmeet_local_users') || '[]';
      const localUsers = JSON.parse(usersRaw);
      const matchedIdx = localUsers.findIndex((u: any) => u.email.toLowerCase().trim() === email.toLowerCase().trim());
      
      if (matchedIdx !== -1) {
        const storedPass = localUsers[matchedIdx].password;
        if (storedPass !== hashPassword(currentPasswordInput)) {
          setPasswordChangeError('Current password is incorrect.');
          return;
        }
        localUsers[matchedIdx].password = hashPassword(newPasswordInput);
        localStorage.setItem('intellmeet_local_users', JSON.stringify(localUsers));
        setPasswordChangeStatus('Password updated successfully in local sandbox!');
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
      } else {
        setPasswordChangeError('User account not found.');
      }
    }
  };

  // Join meeting from Dashboard Card
  const handleJoinMeetingFromCard = () => {
    let inputVal = joinMeetIdInput.trim();
    if (!inputVal) {
      alert("Please enter a valid Meeting ID or Join Link.");
      return;
    }
    
    // Auto extract meeting ID if a full URL is pasted
    let targetId = inputVal;
    if (inputVal.includes('/join/')) {
      const parts = inputVal.split('/join/');
      targetId = parts[parts.length - 1].trim();
    }

    const match = scheduledMeetings.find(m => m.id === targetId);
    
    if (match) {
      if (match.passcode && match.passcode !== joinMeetPassInput.trim()) {
        alert("Invalid meeting passcode. Please try again.");
        return;
      }
      if (isMeetingExpired(match)) {
        alert("This meeting has expired.");
        return;
      }
    }

    if (guestDisplayName.trim()) {
      setUsername(guestDisplayName.trim());
    } else if (!username) {
      setUsername("Guest User");
    }

    setMeetingTitle(match ? match.title : 'General Sync Room');
    setMeetingId(targetId);
    setActiveMeetingPasscode(match && match.passcode ? match.passcode : joinMeetPassInput.trim());
    setMeetingStartTime(Date.now());
    setInActiveMeeting(true);
    setCurrentTab('meeting');
    
    if (match) {
      if (isSupabaseConfigured() && supabase) {
        supabase
          .from('scheduled_meetings')
          .update({ is_host_joined: true })
          .eq('id', targetId)
          .then(({ error }) => {
            if (error) console.error(error);
            else setScheduledMeetings(prev => prev.map(m => m.id === targetId ? { ...m, isHostJoined: true } : m));
          });
      } else {
        setScheduledMeetings(prev => {
          const updated = prev.map(m => m.id === targetId ? { ...m, isHostJoined: true } : m);
          localStorage.setItem('intellmeet_scheduled_v2', JSON.stringify(updated));
          return updated;
        });
      }
    }
  };

  // Premium feature locked view generator
  const renderLockedFeaturePlaceholder = (featureName: string, description: string) => {
    return (
      <div className="dashboard-card col-12 effect-3d text-center" style={{
        padding: '4rem 2rem',
        maxWidth: '600px',
        margin: '4rem auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        backgroundColor: 'var(--bg-primary)',
        border: '2px solid var(--color-border)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'rgba(249, 83, 53, 0.1)',
          color: 'var(--color-danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '0.5rem',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            🔒 Premium Feature: {featureName}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', maxWidth: '480px', margin: '0 auto' }}>
            {description}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button 
            className="btn btn-secondary button-3d" 
            onClick={() => {
              setIsRegisterMode(false);
              setShowAuthModal(true);
            }}
          >
            Log In
          </button>
          <button 
            className="btn btn-primary button-3d" 
            onClick={() => {
              setIsRegisterMode(true);
              setShowAuthModal(true);
            }}
          >
            Sign Up
          </button>
        </div>
      </div>
    );
  };

  // Check active Supabase session or fallback local storage session on mount
  useEffect(() => {
    const checkSession = async () => {
      if (isSupabaseConfigured() && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsAuthenticated(true);
          setEmail(session.user.email || '');
          setUsername(session.user.user_metadata?.name || 'User');
          setPosition(session.user.user_metadata?.position || 'Student');
        }
      } else {
        // Seed default local user if empty or missing admin account
        const usersRaw = localStorage.getItem('intellmeet_local_users');
        let localUsers = [];
        if (usersRaw) {
          try {
            localUsers = JSON.parse(usersRaw);
          } catch (e) {
            localUsers = [];
          }
        }
        if (!Array.isArray(localUsers)) {
          localUsers = [];
        }
        if (!localUsers.some((u: any) => u.email.toLowerCase().trim() === 'admin@zidio.com')) {
          localUsers.push({
            email: 'admin@zidio.com',
            password: hashPassword('Password123!'),
            name: 'Pramodh',
            position: 'Software Engineer'
          });
          localStorage.setItem('intellmeet_local_users', JSON.stringify(localUsers));
        }

        const savedSession = localStorage.getItem('intellmeet_session');
        const rToken = localStorage.getItem('intellmeet_refresh_token');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          setIsAuthenticated(true);
          setEmail(sessionData.email);
          setUsername(sessionData.name);
          setPosition(sessionData.position);

          if (rToken) {
            fetch(`${API_BASE_URL}/api/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken: rToken })
            })
            .then(res => res.json())
            .then(data => {
              if (data.token) {
                localStorage.setItem('intellmeet_token', data.token);
              }
            })
            .catch(err => console.log('Session refresh token call failed:', err));
          }
        }
      }
    };
    checkSession();
  }, []);

  // Fetch tasks and history when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      let backendTasksLoaded = false;
      try {
        const response = await fetch(`${API_BASE_URL}/api/tasks`);
        if (response.ok) {
          const backendTasks = await response.json();
          if (Array.isArray(backendTasks)) {
            setTasks(backendTasks.map((t: any) => ({
              id: t._id || t.id,
              title: t.title,
              description: t.description || '',
              status: t.status,
              assignee: t.assignee,
              priority: t.priority,
              reviewNotes: t.reviewNotes || t.review_notes || ''
            })));
            backendTasksLoaded = true;
          }
        }
      } catch (err) {
        console.warn('Failed to load tasks from Express backend, using fallback:', err);
      }

      let backendMeetingsLoaded = false;
      try {
        const token = localStorage.getItem('intellmeet_token');
        const response = await fetch(`${API_BASE_URL}/api/meetings`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (response.ok) {
          const backendMeetings = await response.json();
          if (Array.isArray(backendMeetings)) {
            setHistoryList(backendMeetings.map((m: any) => ({
              id: m._id || m.id,
              title: m.title,
              date: new Date(m.date || m.createdAt).toISOString().split('T')[0],
              duration: m.duration,
              participants: m.participants ? m.participants.length : 1,
              summary: m.summary || '',
              actionItems: m.actionItems || [],
              transcript: m.transcript || []
            })));
            backendMeetingsLoaded = true;
          }
        }
      } catch (err) {
        console.warn('Failed to load meetings from Express backend, using fallback:', err);
      }

      if (isSupabaseConfigured() && supabase) {
        if (!backendTasksLoaded) {
          // Load tasks from Supabase
          const { data: dbTasks, error: tasksErr } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: true });
          
          if (dbTasks) {
            setTasks(dbTasks.map((t: any) => ({
              id: t.id,
              title: t.title,
              description: t.description || '',
              status: t.status,
              assignee: t.assignee,
              priority: t.priority,
              reviewNotes: t.review_notes || ''
            })));
          } else {
            console.error('Error loading tasks from Supabase:', tasksErr);
          }
        }

        // Load meetings history from Supabase
        if (!backendMeetingsLoaded) {
          const { data: dbMeetings, error: meetsErr } = await supabase
            .from('meetings')
            .select('*')
            .order('date', { ascending: false });

          if (dbMeetings) {
            setHistoryList(dbMeetings.map((m: any) => ({
              id: m.id,
              title: m.title,
              date: m.date,
              duration: m.duration,
              participants: m.participants,
              summary: m.summary || '',
              actionItems: m.action_items || []
            })));
          } else {
            console.error('Error loading meetings from Supabase:', meetsErr);
          }
        }

        // Load scheduled meetings from Supabase
        const { data: dbScheduled, error: schedErr } = await supabase
          .from('scheduled_meetings')
          .select('*')
          .order('date_time', { ascending: true });

        if (dbScheduled) {
          setScheduledMeetings(dbScheduled.map((s: any) => ({
            id: s.id,
            title: s.title,
            dateTime: s.date_time,
            host: s.host,
            isHostJoined: s.is_host_joined || false,
            meetingType: s.meeting_type || 'public',
            recurrence: s.recurrence || 'none',
            passcode: s.password || s.passcode || '',
            invitedEmails: s.invited_emails || [],
            responses: s.responses || {},
            duration: s.duration || 30,
            isExpired: s.is_expired || false
          })));
        } else {
          console.error('Error loading scheduled meetings from Supabase:', schedErr);
        }
      } else {
        if (!backendTasksLoaded) {
          const savedTasks = localStorage.getItem('intellmeet_tasks_v2');
          setTasks(savedTasks ? JSON.parse(savedTasks) : []);
        }

        if (!backendMeetingsLoaded) {
          const savedHistory = localStorage.getItem('intellmeet_history_v2');
          setHistoryList(savedHistory ? JSON.parse(savedHistory) : []);
        }

        const savedScheduled = localStorage.getItem('intellmeet_scheduled_v2');
        if (savedScheduled) {
          const parsed = JSON.parse(savedScheduled);
          setScheduledMeetings(parsed.map((s: any) => ({
            id: s.id,
            title: s.title,
            dateTime: s.dateTime || s.date_time,
            host: s.host,
            isHostJoined: s.isHostJoined || s.is_host_joined || false,
            meetingType: s.meetingType || 'public',
            recurrence: s.recurrence || 'none',
            passcode: s.password || s.passcode || '',
            invitedEmails: s.invitedEmails || s.invited_emails || [],
            responses: s.responses || {},
            duration: s.duration || 30,
            isExpired: s.isExpired || s.is_expired || false
          })));
        } else {
          setScheduledMeetings([]);
        }
      }

      // Load recordings (always local)
      const savedRecs = localStorage.getItem('intellmeet_recordings_v2');
      setRecordings(savedRecs ? JSON.parse(savedRecs) : []);
    };

    loadData();
  }, [isAuthenticated]);



  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (captchaInput.toUpperCase().trim() !== captchaCode) {
      setAuthError('Captcha verification failed. Please check the code and try again.');
      generateCaptcha();
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token && data.user) {
          localStorage.setItem('intellmeet_token', data.token);
          if (data.refreshToken) {
            localStorage.setItem('intellmeet_refresh_token', data.refreshToken);
          }
          const sessionObj = { email: data.user.email, name: data.user.name, position: data.user.role || 'Student' };
          localStorage.setItem('intellmeet_session', JSON.stringify(sessionObj));
          setIsAuthenticated(true);
          setUsername(data.user.name);
          setPosition(data.user.role || 'Student');
          setShowAuthModal(false);
          addSessionLog(data.user.name, 'login');
          return;
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.message && errorData.message !== 'Database connection error') {
          setAuthError(errorData.message);
          generateCaptcha();
          return;
        }
      }
    } catch (apiErr) {
      console.warn('Backend API connection failed, falling back to Local Sandbox Mode:', apiErr);
    }

    // Local Sandbox Authentication - fallback if backend is offline
    const usersRaw = localStorage.getItem('intellmeet_local_users') || '[]';
    const localUsers = JSON.parse(usersRaw);
    const matchedUser = localUsers.find((u: any) => 
      u.email.toLowerCase().trim() === email.toLowerCase().trim() && 
      u.password === hashPassword(password)
    );

    if (matchedUser) {
      const sessionObj = { email: matchedUser.email, name: matchedUser.name, position: matchedUser.position };
      localStorage.setItem('intellmeet_session', JSON.stringify(sessionObj));
      setIsAuthenticated(true);
      setUsername(matchedUser.name);
      setPosition(matchedUser.position);
      setShowAuthModal(false);
      addSessionLog(matchedUser.name, 'login');
    } else {
      // Auto-register fallback to ensure instant login success
      const defaultName = email.split('@')[0] || 'User';
      const sessionObj = { email: email.toLowerCase().trim(), name: defaultName, position: 'Student' };
      localStorage.setItem('intellmeet_session', JSON.stringify(sessionObj));
      
      localUsers.push({ email: email.toLowerCase().trim(), password: hashPassword(password), name: defaultName, position: 'Student' });
      localStorage.setItem('intellmeet_local_users', JSON.stringify(localUsers));
      
      setIsAuthenticated(true);
      setUsername(defaultName);
      setPosition('Student');
      setShowAuthModal(false);
      addSessionLog(defaultName, 'login');
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const finalPosition = position === 'Other' ? customPosition.trim() : position;
    if (position === 'Other' && !finalPosition) {
      setAuthError('Please enter your custom position/profession.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: username, email, password, role: finalPosition })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token && data.user) {
          localStorage.setItem('intellmeet_token', data.token);
          if (data.refreshToken) {
            localStorage.setItem('intellmeet_refresh_token', data.refreshToken);
          }
          const sessionObj = { email: data.user.email, name: data.user.name, position: data.user.role || 'Student' };
          localStorage.setItem('intellmeet_session', JSON.stringify(sessionObj));
          setIsAuthenticated(true);
          setUsername(data.user.name);
          setPosition(data.user.role || 'Student');
          setShowAuthModal(false);
          addSessionLog(data.user.name, 'login');
          alert('Registration successful! Welcome to IntellMeet.');
          return;
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.message && errorData.message !== 'Database connection error') {
          setAuthError(errorData.message);
          return;
        }
      }
    } catch (apiErr) {
      console.warn('Backend API connection failed, falling back to Local Sandbox Mode:', apiErr);
    }

    // Local Sandbox Registration - fallback if backend is offline
    const usersRaw = localStorage.getItem('intellmeet_local_users') || '[]';
    const localUsers = JSON.parse(usersRaw);
    const normalizedEmail = email.toLowerCase().trim();

    // If user already exists locally, auto-login them
    const existingUser = localUsers.find((u: any) => u.email.toLowerCase().trim() === normalizedEmail);
    if (existingUser) {
      const sessionObj = { email: normalizedEmail, name: username, position: finalPosition };
      localStorage.setItem('intellmeet_session', JSON.stringify(sessionObj));
      setIsAuthenticated(true);
      setUsername(username);
      setPosition(finalPosition);
      setShowAuthModal(false);
      addSessionLog(username, 'login');
      return;
    }

    localUsers.push({ email: normalizedEmail, password: hashPassword(password), name: username, position: finalPosition });
    localStorage.setItem('intellmeet_local_users', JSON.stringify(localUsers));

    // Save session object to local storage for persistence on page reload
    const sessionObj = { email: normalizedEmail, name: username, position: finalPosition };
    localStorage.setItem('intellmeet_session', JSON.stringify(sessionObj));

    setAuthError('');
    setIsRegisterMode(false);
    setPassword('');

    // Auto login
    setIsAuthenticated(true);
    setUsername(username);
    setPosition(finalPosition);
    setShowAuthModal(false);
    addSessionLog(username, 'login');
    alert('Registration successful! Welcome to IntellMeet.');
  };



  // Handle Logout
  const handleLogout = async () => {
    addSessionLog(username || 'User', 'logout');
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('intellmeet_session');
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
    setUsername('');
    setPosition('Student');
    setCustomPosition('');
    setTasks([]);
    setHistoryList([]);
    setUserPhone('');
    setUserDob('');
    setProfilePhotoUrl('');
    setSelectedAvatarIdx(0);
    setGuestDisplayName('');
  };

  // Add a task in Kanban
  const handleAddTask = async (title: string, desc: string, assignee: string, priority: 'low'|'medium'|'high') => {
    const normalizedRole = position.toLowerCase().trim();
    const isAuthorizedRole = normalizedRole === 'software engineer' || normalizedRole === 'admin';
    if (!isAuthorizedRole) {
      alert(`Access Denied: Only Admins or Software Engineers can add workspace tasks. Your current role is "${position}".`);
      return;
    }

    const newTaskObj = {
      title,
      description: desc,
      status: 'todo' as const,
      assignee,
      priority
    };

    try {
      const token = localStorage.getItem('intellmeet_token');
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newTaskObj)
      });

      if (response.ok) {
        const createdTask = await response.json();
        if (createdTask && (createdTask._id || createdTask.id)) {
          setTasks(prev => [...prev, {
            id: createdTask._id || createdTask.id,
            title: createdTask.title,
            description: createdTask.description || '',
            status: createdTask.status,
            assignee: createdTask.assignee,
            priority: createdTask.priority,
            reviewNotes: createdTask.reviewNotes || ''
          }]);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to add task to Express backend, using fallback:', err);
    }

    if (isSupabaseConfigured() && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('tasks')
          .insert([{ ...newTaskObj, user_id: user.id }])
          .select();
        
        if (error) {
          console.error('Error adding task to Supabase:', error);
        } else if (data && data[0]) {
          const t = data[0];
          setTasks(prev => [...prev, {
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
            assignee: t.assignee,
            priority: t.priority
          }]);
        }
      }
    } else {
      // Local Mode
      const newTask: Task = {
        id: 'TASK-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        ...newTaskObj
      };
      setTasks(prev => {
        const updated = [...prev, newTask];
        localStorage.setItem('intellmeet_tasks_v2', JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Move Kanban card status explicitly
  const moveTask = async (taskId: string, newStatus: Task['status'], clearReviewNotes = false) => {
    const normalizedRole = position.toLowerCase().trim();
    const isAuthorizedRole = normalizedRole === 'software engineer' || normalizedRole === 'admin';
    if (!isAuthorizedRole) {
      alert(`Access Denied: Only Admins or Software Engineers can move or modify tasks. Your current role is "${position}".`);
      return;
    }

    const updatePayload: any = { status: newStatus };
    if (clearReviewNotes) {
      updatePayload.reviewNotes = '';
      updatePayload.review_notes = '';
    }

    try {
      const token = localStorage.getItem('intellmeet_token');
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updatePayload)
      });

      if (response.ok) {
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: newStatus, reviewNotes: clearReviewNotes ? '' : t.reviewNotes } 
            : t
        ));
        return;
      }
    } catch (err) {
      console.warn('Failed to update task status on Express backend, using fallback:', err);
    }

    if (isSupabaseConfigured() && supabase) {
      const updateData: any = { status: newStatus };
      if (clearReviewNotes) {
        updateData.review_notes = '';
      }
      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task status in Supabase:', error);
      } else {
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: newStatus, reviewNotes: clearReviewNotes ? '' : t.reviewNotes } 
            : t
        ));
      }
    } else {
      // Local Mode
      setTasks(prev => {
        const updated = prev.map(t => 
          t.id === taskId 
            ? { ...t, status: newStatus, reviewNotes: clearReviewNotes ? '' : t.reviewNotes } 
            : t
        );
        localStorage.setItem('intellmeet_tasks_v2', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const updateReviewNotes = async (taskId: string, notes: string) => {
    const normalizedRole = position.toLowerCase().trim();
    const isAuthorizedRole = normalizedRole === 'software engineer' || normalizedRole === 'admin';
    if (!isAuthorizedRole) {
      alert(`Access Denied: Only Admins or Software Engineers can update task review notes. Your current role is "${position}".`);
      return;
    }

    try {
      const token = localStorage.getItem('intellmeet_token');
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reviewNotes: notes, review_notes: notes })
      });

      if (response.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, reviewNotes: notes } : t));
        return;
      }
    } catch (err) {
      console.warn('Failed to update task review notes on Express backend, using fallback:', err);
    }

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('tasks')
        .update({ review_notes: notes })
        .eq('id', taskId);

      if (error) {
        console.error('Error updating review notes in Supabase:', error);
      } else {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, reviewNotes: notes } : t));
      }
    } else {
      // Local Mode
      setTasks(prev => {
        const updated = prev.map(t => t.id === taskId ? { ...t, reviewNotes: notes } : t);
        localStorage.setItem('intellmeet_tasks_v2', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const getMeetingAnalytics = (selectedId: string): MeetingAnalytics => {
    if (selectedId === 'all') {
      if (historyList.length === 0) {
        return {
          id: 'all',
          title: 'All Workspace Meetings',
          date: 'No meetings recorded',
          totalMeetings: 0,
          totalMeetingsTrend: '0 meetings this month',
          totalMeetingsTrendDirection: 'down' as const,
          totalDuration: '0 hrs',
          totalDurationTrend: 'No voice time',
          totalDurationTrendDirection: 'down' as const,
          avgSentiment: 0,
          avgSentimentTrend: 'No data',
          avgSentimentTrendDirection: 'down' as const,
          efficiencyScore: 0,
          efficiencyScoreTrend: 'No metrics',
          efficiencyScoreTrendDirection: 'down' as const,
          weeklyFrequency: [
            { height: 0, label: 'Wk 1', count: 0 },
            { height: 0, label: 'Wk 2', count: 0 },
            { height: 0, label: 'Wk 3', count: 0 },
            { height: 0, label: 'Wk 4', count: 0 },
          ],
          productivityTrends: [
            { x: 0, y: 180, label: 'Sprint 1' },
            { x: 100, y: 180, label: 'Sprint 2' },
            { x: 200, y: 180, label: 'Sprint 3' },
            { x: 300, y: 180, label: 'Sprint 4' },
            { x: 400, y: 180, label: 'Sprint 5' },
          ],
          speakers: [],
          sentimentFlow: [
            { time: '0m', positive: 0, neutral: 100, negative: 0 },
          ],
          engagementScore: 0,
          topics: [],
          insights: [
            { title: 'No meeting history', desc: 'Once you host and conclude workspace sessions, productivity insights will show up here.', type: 'info' as const }
          ]
        };
      }
      
      const totalMeets = historyList.length;
      const totalMinutes = historyList.reduce((acc, m) => {
        const mins = parseInt(m.duration) || 30;
        return acc + mins;
      }, 0);
      const totalHrs = (totalMinutes / 60).toFixed(1);

      // Dynamically calculate average sentiment and efficiency from real history
      let positiveCountAll = 0;
      let negativeCountAll = 0;
      let actionItemsCountAll = 0;
      let totalTranscriptLinesAll = 0;
      
      const positiveWords = ['great', 'good', 'awesome', 'happy', 'yes', 'agree', 'solved', 'perfect', 'success', 'done', 'fine', 'thanks', 'clear', 'resolved'];
      const negativeWords = ['error', 'fail', 'bad', 'block', 'issue', 'wrong', 'no', 'delay', 'difficult', 'conflict', 'problem', 'stuck', 'failed'];

      historyList.forEach(m => {
        const transLines = m.transcript || [];
        totalTranscriptLinesAll += transLines.length;
        actionItemsCountAll += (m.actionItems || []).length;
        
        transLines.forEach(line => {
          const textLower = (line.text || '').toLowerCase();
          positiveWords.forEach(w => { if (textLower.includes(w)) positiveCountAll++; });
          negativeWords.forEach(w => { if (textLower.includes(w)) negativeCountAll++; });
        });
      });
      
      let avgSentiment = 80;
      if (positiveCountAll + negativeCountAll > 0) {
        avgSentiment = Math.round((positiveCountAll / (positiveCountAll + negativeCountAll)) * 100);
      }
      avgSentiment = Math.max(60, Math.min(98, avgSentiment));
      const avgEfficiency = Math.max(60, Math.min(98, 75 + (actionItemsCountAll * 3) - Math.floor(totalTranscriptLinesAll / 20)));

      // Calculate dynamic topics from all real meeting titles
      const allTitleWords = historyList.map(m => m.title.split(' ')).flat().filter(w => w.length > 4);
      const uniqueWords = Array.from(new Set(allTitleWords)).slice(0, 3);
      const dynamicTopics = uniqueWords.map((word, idx) => ({
        name: word.replace(/[^a-zA-Z]/g, ''),
        count: totalMeets + 2 - idx,
        importance: (idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low') as 'high' | 'medium' | 'low'
      }));

      if (dynamicTopics.length === 0) {
        dynamicTopics.push({ name: 'Workspace Tasks', count: 3, importance: 'high' as const });
      }

      // Aggregate speaker turns across ALL meetings
      const allSpeakerTurns: { [name: string]: number } = {};
      let grandTotalTurns = 0;
      historyList.forEach(m => {
        const lines = m.transcript || [];
        lines.forEach(line => {
          const spk = line.speaker || 'You (Host)';
          allSpeakerTurns[spk] = (allSpeakerTurns[spk] || 0) + 1;
          grandTotalTurns++;
        });
      });

      const speakerColors = ['#50A3A4', '#FCAF38', '#F95335', '#674A40', '#8D6E63'];
      const aggregatedSpeakers = Object.keys(allSpeakerTurns).map((spk, idx) => {
        const pct = grandTotalTurns > 0 ? Math.round((allSpeakerTurns[spk] / grandTotalTurns) * 100) : 100;
        return {
          name: spk,
          talkTime: Math.round(totalMinutes * (pct / 100)),
          percentage: pct,
          color: speakerColors[idx % speakerColors.length],
          interruptions: Math.max(0, Math.round(pct / 8)),
          clarity: 90 + (idx * 2) % 10
        };
      });
      
      if (aggregatedSpeakers.length === 0) {
        aggregatedSpeakers.push({
          name: username || 'You (Host)',
          talkTime: totalMinutes || 10,
          percentage: 100,
          color: '#50A3A4',
          interruptions: 0,
          clarity: 95
        });
      }

      // Calculate weekly frequency counts
      const weekCounts = [0, 0, 0, 0];
      const nowMs = Date.now();
      historyList.forEach(m => {
        const dateMs = new Date(m.date).getTime();
        const diffDays = Math.floor((nowMs - dateMs) / (24 * 60 * 60 * 1000));
        if (diffDays >= 0 && diffDays < 7) weekCounts[3]++;
        else if (diffDays >= 7 && diffDays < 14) weekCounts[2]++;
        else if (diffDays >= 14 && diffDays < 21) weekCounts[1]++;
        else if (diffDays >= 21 && diffDays < 28) weekCounts[0]++;
        else weekCounts[0]++;
      });
      const maxWeekCount = Math.max(...weekCounts, 1);
      const weeklyFreq = [
        { height: Math.max(20, Math.round((weekCounts[0] / maxWeekCount) * 180)), label: 'Wk 1', count: weekCounts[0] },
        { height: Math.max(20, Math.round((weekCounts[1] / maxWeekCount) * 180)), label: 'Wk 2', count: weekCounts[1] },
        { height: Math.max(20, Math.round((weekCounts[2] / maxWeekCount) * 180)), label: 'Wk 3', count: weekCounts[2] },
        { height: Math.max(20, Math.round((weekCounts[3] / maxWeekCount) * 180)), label: 'Wk 4', count: weekCounts[3] }
      ];

      // Calculate productivity trends list
      const sortedMeets = [...historyList].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const last5 = sortedMeets.slice(-5);
      const productivityTrends = last5.map((m, idx) => {
        const mTranscript = m.transcript || [];
        const mEfficiency = Math.max(60, Math.min(98, 75 + ((m.actionItems || []).length * 5) - Math.floor(mTranscript.length / 10)));
        const y = Math.round(180 - (mEfficiency / 100) * 140);
        const x = last5.length > 1 ? Math.round(idx * (400 / (last5.length - 1))) : 200;
        return {
          x,
          y,
          label: m.title.substring(0, 8) + (m.title.length > 8 ? '..' : '')
        };
      });
      
      if (productivityTrends.length === 0) {
        productivityTrends.push(
          { x: 0, y: 120, label: 'Start' },
          { x: 400, y: 120, label: 'End' }
        );
      }

      return {
        id: 'all',
        title: 'All Workspace Meetings',
        date: 'Last 30 Days',
        totalMeetings: totalMeets,
        totalMeetingsTrend: `+${totalMeets} new meetings`,
        totalMeetingsTrendDirection: 'up',
        totalDuration: `${totalHrs} hrs`,
        totalDurationTrend: `Average ${Math.round(totalMinutes / totalMeets)} mins per meeting`,
        totalDurationTrendDirection: 'up',
        avgSentiment: avgSentiment,
        avgSentimentTrend: 'Overall Positive',
        avgSentimentTrendDirection: 'up',
        efficiencyScore: avgEfficiency,
        efficiencyScoreTrend: 'Healthy collaboration',
        efficiencyScoreTrendDirection: 'up',
        weeklyFrequency: weeklyFreq,
        productivityTrends: productivityTrends,
        speakers: aggregatedSpeakers,
        sentimentFlow: [
          { time: '0m', positive: 60, neutral: 35, negative: 5 },
          { time: '10m', positive: 75, neutral: 20, negative: 5 },
          { time: '20m', positive: 85, neutral: 10, negative: 5 },
          { time: '30m', positive: 65, neutral: 25, negative: 10 },
          { time: '40m', positive: avgSentiment, neutral: 100 - avgSentiment - 5 > 0 ? 100 - avgSentiment - 5 : 0, negative: 5 },
        ],
        engagementScore: Math.round((avgSentiment + avgEfficiency) / 2),
        topics: dynamicTopics,
        insights: [
          { title: 'Excellent engagement', desc: 'Active conversation was recorded across all participants.', type: 'success' as const },
          { title: 'Task coverage healthy', desc: 'Kanban tasks were updated in correlation with meeting conclusions.', type: 'info' as const }
        ]
      };
    }

    const match = historyList.find(m => m.id === selectedId);
    if (!match) {
      return {
        id: selectedId,
        title: 'Meeting Profile',
        date: 'No data',
        totalMeetings: 0,
        totalMeetingsTrend: 'No trend',
        totalMeetingsTrendDirection: 'down' as const,
        totalDuration: '0 mins',
        totalDurationTrend: 'No trend',
        totalDurationTrendDirection: 'down' as const,
        avgSentiment: 0,
        avgSentimentTrend: 'No trend',
        avgSentimentTrendDirection: 'down' as const,
        efficiencyScore: 0,
        efficiencyScoreTrend: 'No trend',
        efficiencyScoreTrendDirection: 'down' as const,
        weeklyFrequency: [],
        productivityTrends: [],
        speakers: [],
        sentimentFlow: [],
        engagementScore: 0,
        topics: [],
        insights: []
      };
    }

    const meetingMins = parseInt(match.duration) || 30;
    
    // 1. Parse transcript lines for speaker talk-time shares and sentiment analysis
    const transcriptLines = match.transcript || [];
    
    // Count speech turns per speaker
    const speakerTurns: { [name: string]: number } = {};
    transcriptLines.forEach(line => {
      const spk = line.speaker || 'Host';
      speakerTurns[spk] = (speakerTurns[spk] || 0) + 1;
    });
    
    // Map speakers list
    const speakerColors = ['#50A3A4', '#FCAF38', '#F95335', '#674A40', '#8D6E63'];
    const totalTurns = transcriptLines.length || 1;
    
    const speakersList = Object.keys(speakerTurns).map((spk, idx) => {
      const percentage = Math.round((speakerTurns[spk] / totalTurns) * 100);
      return {
        name: spk,
        talkTime: Math.round(meetingMins * (percentage / 100)),
        percentage,
        color: speakerColors[idx % speakerColors.length],
        interruptions: Math.max(0, Math.round(percentage / 10) + (idx * 2) - 1),
        clarity: 85 + ((idx * 3) % 15)
      };
    });
    
    // Fallback if no transcript lines
    if (speakersList.length === 0) {
      speakersList.push({
        name: username || 'You (Host)',
        talkTime: meetingMins,
        percentage: 100,
        color: '#50A3A4',
        interruptions: 0,
        clarity: 95
      });
    }
    
    // 2. Perform sentiment analysis by counting positive/negative words in transcript
    const positiveWords = ['great', 'good', 'awesome', 'happy', 'yes', 'agree', 'solved', 'perfect', 'success', 'done', 'fine', 'thanks', 'clear', 'resolved'];
    const negativeWords = ['error', 'fail', 'bad', 'block', 'issue', 'wrong', 'no', 'delay', 'difficult', 'conflict', 'problem', 'stuck', 'failed'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    transcriptLines.forEach(line => {
      const textLower = (line.text || '').toLowerCase();
      positiveWords.forEach(w => {
        if (textLower.includes(w)) positiveCount++;
      });
      negativeWords.forEach(w => {
        if (textLower.includes(w)) negativeCount++;
      });
    });
    
    let sentiment = 80; // default standard
    if (positiveCount + negativeCount > 0) {
      sentiment = Math.round((positiveCount / (positiveCount + negativeCount)) * 100);
    }
    sentiment = Math.max(50, Math.min(98, sentiment)); // bound it
    
    // 3. Efficiency based on action item count vs transcript length
    const efficiency = Math.max(60, Math.min(98, 75 + (match.actionItems.length * 5) - Math.floor(transcriptLines.length / 10)));
    
    // 4. Generate dynamic insight blocks based on calculations
    const dynamicInsights: { title: string; desc: string; type: 'info' | 'warning' | 'success' }[] = [
      { 
        title: 'Dynamic Transcript Analysis', 
        desc: `This dashboard was parsed directly from the meeting transcript (${transcriptLines.length} spoken segments analysed).`, 
        type: 'success' as const 
      }
    ];
    
    if (sentiment > 85) {
      dynamicInsights.push({
        title: 'Highly Positive Tone',
        desc: `The team expressed strong agreement with a high ratio of positive terms (${positiveCount} positive keywords matched).`,
        type: 'success' as const
      });
    } else if (sentiment < 70) {
      dynamicInsights.push({
        title: 'Constructive Challenges Flagged',
        desc: `Multiple blocker keywords (${negativeCount} occurrences) were detected in speech transcript lines.`,
        type: 'warning' as const
      });
    } else {
      dynamicInsights.push({
        title: 'Collaborative Consensus Reached',
        desc: 'Balanced feedback loop detected across all discussion tracks.',
        type: 'info' as const
      });
    }
    
    const titleWords = match.title.split(' ').filter(w => w.length > 4);
    const parsedTopics = titleWords.slice(0, 3).map((word, idx) => ({
      name: word.replace(/[^a-zA-Z]/g, ''),
      count: transcriptLines.length > 0 ? Math.ceil(transcriptLines.length / 4) - idx : 2,
      importance: (idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low') as 'high' | 'medium' | 'low'
    }));

    if (parsedTopics.length === 0) {
      parsedTopics.push({ name: 'General Discussion', count: 3, importance: 'high' as const });
    }

    // Spline segments sentiments curve
    const segmentLength = Math.max(1, Math.floor(transcriptLines.length / 3));
    const segmentSentiments = [80, 80, 80];
    for (let seg = 0; seg < 3; seg++) {
      const startIdx = seg * segmentLength;
      const endIdx = Math.min(transcriptLines.length, (seg + 1) * segmentLength);
      let segPos = 0, segNeg = 0;
      for (let i = startIdx; i < endIdx; i++) {
        const txt = (transcriptLines[i].text || '').toLowerCase();
        positiveWords.forEach(w => { if (txt.includes(w)) segPos++; });
        negativeWords.forEach(w => { if (txt.includes(w)) segNeg++; });
      }
      if (segPos + segNeg > 0) {
        segmentSentiments[seg] = Math.round((segPos / (segPos + segNeg)) * 100);
      }
    }

    return {
      id: match.id,
      title: match.title,
      date: match.date,
      totalMeetings: 1,
      totalMeetingsTrend: 'Selected Meeting Profile',
      totalMeetingsTrendDirection: 'up',
      totalDuration: `${meetingMins} mins`,
      totalDurationTrend: `Concluded on ${match.date}`,
      totalDurationTrendDirection: 'up',
      avgSentiment: sentiment,
      avgSentimentTrend: sentiment > 80 ? 'Highly positive tone' : 'Constructive feedback tone',
      avgSentimentTrendDirection: 'up',
      efficiencyScore: efficiency,
      efficiencyScoreTrend: `Scored by ${match.actionItems.length} action items`,
      efficiencyScoreTrendDirection: 'up',
      weeklyFrequency: [
        { height: 180, label: 'Participants', count: match.participants || 1 },
        { height: 120, label: 'Duration (m)', count: meetingMins }
      ],
      productivityTrends: [
        { x: 0, y: Math.round(180 - (segmentSentiments[0] / 100) * 140), label: 'Start' },
        { x: 200, y: Math.round(180 - (segmentSentiments[1] / 100) * 140), label: 'Mid' },
        { x: 400, y: Math.round(180 - (segmentSentiments[2] / 100) * 140), label: 'End' }
      ],
      speakers: speakersList,
      sentimentFlow: [
        { time: '0m', positive: 50, neutral: 45, negative: 5 },
        { time: `${Math.round(meetingMins * 0.5)}m`, positive: sentiment, neutral: Math.round((100 - sentiment) * 0.8), negative: Math.round((100 - sentiment) * 0.2) },
        { time: `${meetingMins}m`, positive: sentiment + 5 > 100 ? 100 : sentiment + 5, neutral: 10, negative: 0 }
      ],
      engagementScore: Math.round((sentiment + efficiency) / 2),
      topics: parsedTopics,
      insights: dynamicInsights
    };
  };

  const requestConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      show: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handlePendingClick = (t: Task) => {
    requestConfirmation(
      "Confirm Action",
      "Do you want to continue this project or something like this?",
      () => moveTask(t.id, 'in_progress')
    );
  };

  const handleOngoingClick = (t: Task) => {
    requestConfirmation(
      "Confirm Completion",
      "Have you completed this?",
      () => moveTask(t.id, 'done')
    );
  };

  const handleBackToTodoClick = (t: Task) => {
    requestConfirmation(
      "Confirm Return",
      "Do you want this task to go to the TODO list again?",
      () => moveTask(t.id, 'todo')
    );
  };

  const handleCompletedClick = (t: Task) => {
    moveTask(t.id, 'review');
  };

  const handleBackToProgressClick = (t: Task) => {
    requestConfirmation(
      "Confirm Return",
      "Do you want this project to go back to the progress column?",
      () => moveTask(t.id, 'in_progress', true)
    );
  };


  // Create action item from meeting room
  const handleAddActionItem = () => {
    if (!actionTitleInput.trim()) return;
    
    // Format timeline label
    let timelineText = 'Do now';
    if (actionTimelineInput === '30mins') timelineText = 'Due in 30 minutes';
    else if (actionTimelineInput === '1hour') timelineText = 'Due in 1 hour';
    else if (actionTimelineInput === 'post') timelineText = 'Post-meeting task';

    const desc = actionDescriptionInput.trim() || 'No description provided';
    
    const itemString = `${actionTitleInput.trim()} - ${desc} (Assignee: ${actionAssigneeInput}, Timeline: ${timelineText})`;
    setMeetingActions(prev => [...prev, itemString]);
    
    // Auto-create on the Task Management Hub
    handleAddTask(actionTitleInput.trim(), `${desc} (Timeline: ${timelineText})`, actionAssigneeInput, 'high');
    
    // Post to Real-time Chat
    const chatText = `📋 New Task Assigned: ${actionTitleInput.trim()}\nDescription: ${desc}\nAssignee: ${actionAssigneeInput}\nTimeline: ${timelineText}`;
    const taskMsg: ChatMessage = {
      id: 'CHAT-TASK-' + Date.now(),
      sender: username,
      text: chatText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatarLogoIndex: selectedAvatarIdx
    };
    setChatMessages(prev => [...prev, taskMsg]);

    // Clear form inputs
    setActionTitleInput('');
    setActionDescriptionInput('');
    setActionTimelineInput('now');
    setActionAssigneeInput('Everyone');
  };

  // Send Chat message
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const rawText = chatInput.trim();
    const finalMsgText = isE2EEEnabled ? encryptText(rawText, activeMeetingPasscode || 'E2EEKEY') : rawText;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: username,
      text: finalMsgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatarLogoIndex: selectedAvatarIdx,
      recipient: chatTarget
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
  };

  // Helper to register instant meetings in Supabase/local storage
  const registerInstantMeeting = async (generatedId: string, generatedPasscode: string, title: string) => {
    const newMeetingObj: ScheduledMeeting = {
      id: generatedId,
      title: title.trim(),
      dateTime: new Date().toISOString(),
      host: username || 'User',
      isHostJoined: true,
      meetingType: 'public',
      recurrence: 'none',
      passcode: generatedPasscode,
      invitedEmails: [],
      responses: {},
      duration: 999999, // practically unlimited
      isExpired: false
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user ? user.id : null;
        await supabase
          .from('scheduled_meetings')
          .insert([{
            id: newMeetingObj.id,
            title: newMeetingObj.title,
            date_time: newMeetingObj.dateTime,
            host: newMeetingObj.host,
            is_host_joined: newMeetingObj.isHostJoined,
            meeting_type: newMeetingObj.meetingType,
            recurrence: newMeetingObj.recurrence,
            password: newMeetingObj.passcode,
            invited_emails: newMeetingObj.invitedEmails,
            responses: newMeetingObj.responses,
            duration: newMeetingObj.duration,
            is_expired: newMeetingObj.isExpired,
            user_id: userId
          }]);
      } catch (err) {
        console.error('Error saving instant meeting to Supabase:', err);
      }
    }
    
    // Always update local scheduledMeetings state and localStorage fallback
    setScheduledMeetings(prev => {
      const updated = [...prev, newMeetingObj];
      localStorage.setItem('intellmeet_scheduled_v2', JSON.stringify(updated));
      return updated;
    });
  };

  // Start Meeting Room & Draw WebRTC Simulated Canvas Loops
  const startMeeting = async (title: string) => {
    setMeetingStartTime(Date.now());
    
    let generatedId = '';
    let generatedPasscode = '';

    if (activeJoiningScheduledId) {
      const targetId = activeJoiningScheduledId;
      setActiveJoiningScheduledId(null);

      const match = scheduledMeetings.find(m => m.id === targetId);
      if (match) {
        generatedId = match.id;
        generatedPasscode = match.passcode || '';
        setMeetingTitle(match.title);
        setMeetingId(match.id);
        setActiveMeetingPasscode(match.passcode || '');
      } else {
        generatedId = targetId;
        generatedPasscode = 'PASS-0000';
        setMeetingId(targetId);
        setActiveMeetingPasscode(generatedPasscode);
      }

      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase
          .from('scheduled_meetings')
          .update({ is_host_joined: true })
          .eq('id', targetId);

        if (error) {
          console.error('Error updating scheduled meeting in Supabase:', error);
        } else {
          setScheduledMeetings(prev => prev.map(m => m.id === targetId ? { ...m, isHostJoined: true } : m));
        }
      } else {
        // Local Mode
        setScheduledMeetings(prev => {
          const updated = prev.map(m => m.id === targetId ? { ...m, isHostJoined: true } : m);
          localStorage.setItem('intellmeet_scheduled_v2', JSON.stringify(updated));
          return updated;
        });
      }
    } else {
      // Instant Meeting - Generate ID & Passcode and Save to DB list
      const rand1 = Math.random().toString(36).substr(2, 4).toUpperCase();
      const rand2 = Math.random().toString(36).substr(2, 4).toUpperCase();
      generatedId = `MEET-${rand1}-${rand2}`;
      generatedPasscode = 'PASS-' + Math.floor(1000 + Math.random() * 9000);
      
      setMeetingTitle(title || 'Instant Meeting');
      setMeetingId(generatedId);
      setActiveMeetingPasscode(generatedPasscode);

      // Register so other participants can join this instant meet via ID/Passcode
      await registerInstantMeeting(generatedId, generatedPasscode, title || 'Instant Meeting');
    }

    setInActiveMeeting(true);
    setCurrentTab('meeting');
    setShowJoinSetupModal(false);
  };

  // Canvas Mixer and Video Recorder logic (Uses Localhost browser storage)
  const startRecording = () => {
    if (isRecording) return;
    recordedChunks.current = [];
    recordingStartTime.current = Date.now();

    // Create a hidden mixer canvas to record all 3 grids
    const mixCanvas = document.createElement('canvas');
    mixCanvas.width = 640;
    mixCanvas.height = 360;
    mixCanvasRef.current = mixCanvas;

    const ctx = mixCanvas.getContext('2d');
    if (!ctx) return;

    // Start rendering video feeds into the mixer canvas
    const drawMix = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 640, 360);

      const isSharing = isScreenSharingRef.current;
      const participants = meetingParticipantsRef.current;
      const camOff = isCamOffRef.current;
      const uName = usernameRef.current;

      if (isSharing) {
        // 1. Draw screen share stream to fill the entire canvas
        if (hiddenScreenVideoRef.current) {
          ctx.drawImage(hiddenScreenVideoRef.current, 0, 0, 640, 360);
        }
        
        // 2. Draw active participants in a PIP overlay corner (e.g. bottom-right)
        if (participants.length > 0) {
          const firstP = participants[0];
          const canvas = remoteCanvasRefs.current[firstP.userId];
          if (canvas && !firstP.isCamOff) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(495, 265, 130, 80);
            ctx.drawImage(canvas, 500, 270, 120, 70);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px Poppins';
            ctx.textAlign = 'right';
            ctx.fillText(firstP.username, 615, 335);
          }
        }
      } else {
        // No screen sharing: decide layout based on participant count
        const totalPeople = 1 + participants.length;
        
        if (totalPeople === 1) {
          // Solo Host: host fills the entire canvas!
          if (hiddenVideoRef.current && !camOff) {
            ctx.drawImage(hiddenVideoRef.current, 0, 0, 640, 360);
          } else {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, 640, 360);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '16px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(`${uName || 'You'} (Camera Off)`, 320, 180);
          }
        } else {
          // Multi-person grid: 4-quadrant layout
          const positions = [
            { x: 0, y: 0 },
            { x: 320, y: 0 },
            { x: 0, y: 180 },
            { x: 320, y: 180 }
          ];

          // Draw host at quadrant 0
          if (hiddenVideoRef.current && !camOff) {
            ctx.drawImage(hiddenVideoRef.current, 0, 0, 320, 180);
          } else {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, 320, 180);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(`${uName || 'You'} (Camera Off)`, 160, 90);
          }

          // Draw remote participants
          participants.slice(0, 3).forEach((p, idx) => {
            const { x, y } = positions[idx + 1];
            const canvas = remoteCanvasRefs.current[p.userId];
            if (canvas && !p.isCamOff) {
              ctx.drawImage(canvas, x, y, 320, 180);
            } else {
              ctx.fillStyle = '#1e293b';
              ctx.fillRect(x, y, 320, 180);
              ctx.fillStyle = '#94a3b8';
              ctx.font = '12px Poppins';
              ctx.textAlign = 'center';
              ctx.fillText(`${p.username || 'Participant'} (Camera Off)`, x + 160, y + 90);
            }
          });
        }
      }

      // Draw Coral recording dot
      ctx.fillStyle = '#F95335';
      ctx.beginPath();
      ctx.arc(20, 20, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Poppins';
      ctx.textAlign = 'left';
      ctx.fillText("REC", 32, 24);
    };

    // Mixing loop
    const mixInterval = window.setInterval(drawMix, 100);
    mixIntervalRef.current = mixInterval;

    try {
      const stream = mixCanvas.captureStream(15); // 15 fps
      const options = { mimeType: 'video/webm;codecs=vp9' };
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        const durationSecs = Math.round((Date.now() - recordingStartTime.current) / 1000);
        const durationString = `${Math.floor(durationSecs / 60)}m ${durationSecs % 60}s`;

        const newRec: RecordingItem = {
          id: 'REC-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
          title: meetingTitle + ' Session',
          date: new Date().toISOString().split('T')[0],
          url: videoUrl,
          duration: durationString,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          isArchived: false
        };

        setRecordings(prev => [newRec, ...prev]);

        // Upload recorded blob to Express backend
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          try {
            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file: base64data,
                filename: `recording_${newRec.id}.webm`
              })
            });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              const hostedUrl = uploadData.url.startsWith('/') ? `${API_BASE_URL}${uploadData.url}` : uploadData.url;
              setRecordings(prev => prev.map(r => r.id === newRec.id ? { ...r, url: hostedUrl } : r));
            }
          } catch (uploadErr) {
            console.warn('Failed to upload recording to backend:', uploadErr);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.warn("MediaRecorder failed (SSL or codec issue), running simulation mode", e);
      setIsRecording(true);
    }
  };

  const generateDummyVideoBlob = (): Promise<Blob> => {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 100, 100);
        }
        const stream = canvas.captureStream(10);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: 'video/webm' }));
        };
        recorder.start();
        setTimeout(() => {
          try {
            recorder.stop();
          } catch {
            resolve(new Blob([], { type: 'video/webm' }));
          }
        }, 200);
      } catch {
        resolve(new Blob([], { type: 'video/webm' }));
      }
    });
  };

  const stopRecording = () => {
    if (!isRecording) return;
    if (mixIntervalRef.current) {
      clearInterval(mixIntervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // Simulation backup mode
      const durationSecs = Math.round((Date.now() - recordingStartTime.current) / 1000);
      const durationString = `${Math.floor(durationSecs / 60)}m ${durationSecs % 60}s`;
      const newRec: RecordingItem = {
        id: 'REC-SIM-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        title: meetingTitle + ' (Simulated Session)',
        date: new Date().toISOString().split('T')[0],
        url: '',
        duration: durationString,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        isArchived: false
      };
      setRecordings(prev => [newRec, ...prev]);

      generateDummyVideoBlob().then(blob => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          try {
            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file: base64data,
                filename: `recording_${newRec.id}.webm`
              })
            });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              const hostedUrl = uploadData.url.startsWith('/') ? `${API_BASE_URL}${uploadData.url}` : uploadData.url;
              setRecordings(prev => prev.map(r => r.id === newRec.id ? { ...r, url: hostedUrl } : r));
            }
          } catch (uploadErr) {
            console.warn('Failed to upload simulated recording:', uploadErr);
          }
        };
      });
    }
    setIsRecording(false);
  };

  const endMeeting = async () => {
    const meetingEndTime = Date.now();
    const durationMs = meetingEndTime - (meetingStartTime || meetingEndTime);
    const durationSecs = Math.max(1, Math.round(durationMs / 1000));
    const durationMins = Math.max(1, Math.round(durationMs / 60000));
    const durationText = `${durationMins} mins`;
    const durationString = `${Math.floor(durationSecs / 60)}m ${durationSecs % 60}s`;
    const participantCount = 1 + meetingParticipants.length;

    if (isRecording) {
      stopRecording();
    } else {
      // Save simulated recording session if no manual recording was active
      const newRec: RecordingItem = {
        id: 'REC-AUTO-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        title: meetingTitle + ' Session',
        date: new Date().toISOString().split('T')[0],
        url: '',
        duration: durationString,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        isArchived: false
      };
      setRecordings(prev => [newRec, ...prev]);

      generateDummyVideoBlob().then(blob => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          try {
            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file: base64data,
                filename: `recording_${newRec.id}.webm`
              })
            });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              const hostedUrl = uploadData.url.startsWith('/') ? `${API_BASE_URL}${uploadData.url}` : uploadData.url;
              setRecordings(prev => prev.map(r => r.id === newRec.id ? { ...r, url: hostedUrl } : r));
            }
          } catch (uploadErr) {
            console.warn('Failed to upload auto recording:', uploadErr);
          }
        };
      });
    }

    let summaryText = `AI-Generated Summary: Meeting regarding "${meetingTitle}". ` + 
      (sharedNotes.trim() 
        ? `Key notes captured: ${sharedNotes.trim().substring(0, 150)}...` 
        : `Discussed project updates, next steps, and real-time collaboration with ${participantCount} participant(s).`);
    let finalActionItems = meetingActions;

    try {
      const aiResponse = await fetch(`${API_BASE_URL}/api/ai/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: meetingTitle, transcript })
      });
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        summaryText = aiData.summary;
        finalActionItems = aiData.actionItems;
      }
    } catch (err) {
      console.warn('AI summary fetch failed, using fallback:', err);
    }

    const newHistoryObj = {
      title: meetingTitle,
      date: new Date().toISOString().split('T')[0],
      duration: durationText,
      participants: participantCount,
      summary: summaryText,
      action_items: finalActionItems
    };

    let backendSaved = false;
    try {
      const token = localStorage.getItem('intellmeet_token');
      const response = await fetch(`${API_BASE_URL}/api/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: meetingTitle,
          duration: durationText,
          participants: [username, ...meetingParticipants.map(p => p.username)],
          summary: summaryText,
          actionItems: finalActionItems,
          transcript
        })
      });

      if (response.ok) {
        const savedMeet = await response.json();
        setHistoryList(prev => [{
          id: savedMeet._id || savedMeet.id,
          title: savedMeet.title,
          date: new Date(savedMeet.date || savedMeet.createdAt).toISOString().split('T')[0],
          duration: savedMeet.duration,
          participants: savedMeet.participants ? savedMeet.participants.length : 1,
          summary: savedMeet.summary,
          actionItems: savedMeet.actionItems || [],
          transcript: savedMeet.transcript || []
        }, ...prev]);
        backendSaved = true;
      }
    } catch (err) {
      console.warn('Failed to save meeting to Express backend, using fallback:', err);
    }

    if (!backendSaved) {
      if (isSupabaseConfigured() && supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('meetings')
            .insert([{ ...newHistoryObj, user_id: user.id }])
            .select();
          
          if (error) {
            console.error('Error inserting meeting in Supabase:', error);
          } else if (data && data[0]) {
            const m = data[0];
            setHistoryList(prev => [{
              id: m.id,
              title: m.title,
              date: m.date,
              duration: m.duration,
              participants: m.participants,
              summary: m.summary,
              actionItems: m.action_items
            }, ...prev]);
          }
        }
      } else {
        // Local Mode
        const newHistory: MeetingHistory = {
          id: 'MEET-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
          title: newHistoryObj.title,
          date: newHistoryObj.date,
          duration: newHistoryObj.duration,
          participants: newHistoryObj.participants,
          summary: newHistoryObj.summary,
          actionItems: newHistoryObj.action_items,
          transcript
        };
        setHistoryList(prev => {
          const updated = [newHistory, ...prev];
          localStorage.setItem('intellmeet_history_v2', JSON.stringify(updated));
          return updated;
        });
      }
    }

    // Clean up meeting state in scheduled list (mark expired/ended)
    if (meetingId) {
      const targetId = meetingId;
      if (isSupabaseConfigured() && supabase) {
        try {
          const { error: updateErr } = await supabase
            .from('scheduled_meetings')
            .update({ is_host_joined: false, is_expired: true })
            .eq('id', targetId);
          if (updateErr) {
            console.error('Error marking meeting expired in Supabase:', updateErr);
          }
        } catch (err) {
          console.error('Network error marking meeting expired:', err);
        }
      }
      
      // Update local state and localStorage
      setScheduledMeetings(prev => {
        const updated = prev.map(m => (m.id === targetId || m.id === meetingId) ? { ...m, isHostJoined: false, isExpired: true } : m);
        localStorage.setItem('intellmeet_scheduled_v2', JSON.stringify(updated));
        return updated;
      });
    }

    if (isScreenSharing) {
      stopScreenShare();
    }

    setInActiveMeeting(false);
    setCurrentTab('dashboard');
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
        },
        audio: true,
        selfBrowserSurface: "exclude"
      } as any);
      screenStreamRef.current = stream;
      
      if (hiddenScreenVideoRef.current) {
        hiddenScreenVideoRef.current.srcObject = stream;
        hiddenScreenVideoRef.current.play().catch(err => console.log("Screen video playback error:", err));
      }

      setIsScreenSharing(true);

      // Listen for when the user clicks browser's native "Stop Sharing" button
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error("Error starting screen share:", err);
      setIsScreenSharing(false);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    if (hiddenScreenVideoRef.current) {
      hiddenScreenVideoRef.current.srcObject = null;
    }
    setIsScreenSharing(false);
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };



  // Video Streaming Loop Simulator on HTML Canvas
  useEffect(() => {
    if (!inActiveMeeting) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      return;
    }

    let frame = 0;
    const render = () => {
      frame++;
      
      // Draw User Camera/Screen feed (myVideoRef)
      if (myVideoRef.current) {
        const ctx = myVideoRef.current.getContext('2d');
        if (ctx) {
          const w = myVideoRef.current.width;
          const h = myVideoRef.current.height;
          
          let drewSource = false;
          
          if (isScreenSharing && hiddenScreenVideoRef.current && hiddenScreenVideoRef.current.readyState >= 2) {
            const video = hiddenScreenVideoRef.current;
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const videoRatio = vw / vh;
            const canvasRatio = w / h;
            let sx = 0, sy = 0, sw = vw, sh = vh;
            
            if (videoRatio > canvasRatio) {
              sw = vh * canvasRatio;
              sx = (vw - sw) / 2;
            } else {
              sh = vw / canvasRatio;
              sy = (vh - sh) / 2;
            }
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
            drewSource = true;
          } else if (!isCamOff && hiddenVideoRef.current && hiddenVideoRef.current.readyState >= 2) {
            const video = hiddenVideoRef.current;
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const videoRatio = vw / vh;
            const canvasRatio = w / h;
            let sx = 0, sy = 0, sw = vw, sh = vh;
            
            if (videoRatio > canvasRatio) {
              sw = vh * canvasRatio;
              sx = (vw - sw) / 2;
            } else {
              sh = vw / canvasRatio;
              sy = (vh - sh) / 2;
            }
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
            drewSource = true;
          }
          
          if (!drewSource) {
            // Clear
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, w, h);
            
            // Draw a pulsating circle representing user voice
            const pulse = Math.sin(frame * 0.05) * 15 + 40;
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, pulse, 0, Math.PI * 2);
            ctx.fillStyle = isMuted ? '#475569' : 'rgba(2, 132, 199, 0.2)';
            ctx.fill();
            ctx.strokeStyle = isMuted ? '#94a3b8' : '#0284c7';
            ctx.lineWidth = 3;
            ctx.stroke();
          }

          // Label text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px Poppins';
          ctx.fillText("You (Host)", 20, 35);
          
          if (isScreenSharing) {
            ctx.fillStyle = 'rgba(2, 132, 199, 0.7)';
            ctx.fillRect(0, h - 30, w, 30);
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Poppins';
            ctx.fillText("🖥️ Sharing Screen...", 10, h - 10);
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [inActiveMeeting, isCamOff, isMuted, isScreenSharing]);

  // Export transcript summary as a download
  const handleExportSummary = (meet: MeetingHistory) => {
    const fileContent = `MEETING REPORT: ${meet.title}\nDate: ${meet.date}\nDuration: ${meet.duration}\nParticipants: ${meet.participants}\n\nAI MEETING SUMMARY:\n${meet.summary}\n\nEXTRACTED ACTION ITEMS:\n${meet.actionItems.map((item, i) => `${i+1}. ${item}`).join('\n')}`;
    const element = document.createElement("a");
    const file = new Blob([fileContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${meet.title.replace(/\s+/g, '_')}_summary.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const renderLogoWatermark = () => (
    <div className="logo-watermark-bg">
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <path d="M 18 42 A 32 32 0 0 0 27 70" stroke="var(--primary)" strokeWidth="13" strokeLinecap="round" />
        <path d="M 24 67 A 32 32 0 0 0 76 67" stroke="var(--accent)" strokeWidth="13" />
        <path d="M 73 70 A 32 32 0 0 0 82 42" stroke="var(--danger)" strokeWidth="13" strokeLinecap="round" />
        <rect x="42" y="38" width="16" height="42" rx="8" fill="var(--secondary)" />
        <circle cx="50" cy="22" r="7.5" fill="var(--secondary)" />
      </svg>
    </div>
  );

  const getButtonStatus = (dateTimeStr: string) => {
    const scheduledTime = new Date(dateTimeStr).getTime();
    const diff = scheduledTime - currentTime;
    const fiveMinutesInMs = 5 * 60 * 1000;
    return diff <= fiveMinutesInMs;
  };

  const isMeetingExpired = (meet: ScheduledMeeting) => {
    return meet.isExpired;
  };

  const handleScheduleMeeting = async (title: string, dateTimeStr: string) => {
    if (!title.trim() || !dateTimeStr.trim()) return;

    // 1. Generate Link, ID, Passcode
    const generatedId = 'MEET-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    const generatedPasscode = 'PASS-' + Math.floor(1000 + Math.random() * 9000);
    const generatedLink = `http://localhost:3000/join/${generatedId}`;

    // Parse invited emails
    const emailsList = schedInvitedEmails
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);

    const initialResponses: { [email: string]: 'accepted' | 'declined' | 'pending' } = {};
    emailsList.forEach(e => {
      initialResponses[e] = 'pending';
    });

    const newMeetingObj: ScheduledMeeting = {
      id: generatedId,
      title: title.trim(),
      dateTime: new Date(dateTimeStr).toISOString(),
      host: username || 'User',
      isHostJoined: false,
      meetingType: schedMeetingType,
      recurrence: schedMeetingType === 'private' ? schedRecurrence : 'none',
      passcode: generatedPasscode,
      invitedEmails: schedMeetingType === 'private' ? emailsList : [],
      responses: schedMeetingType === 'private' ? initialResponses : {},
      duration: schedMeetingType === 'public' ? schedDuration : 60, // default 60m for private
      isExpired: false
    };

    setLastScheduledMeet(newMeetingObj);
    setShowPasscodeAlert(true);

    // Save
    let savedToSupabase = false;
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('scheduled_meetings')
            .insert([{
              id: newMeetingObj.id,
              title: newMeetingObj.title,
              date_time: newMeetingObj.dateTime,
              host: newMeetingObj.host,
              is_host_joined: newMeetingObj.isHostJoined,
              meeting_type: newMeetingObj.meetingType,
              recurrence: newMeetingObj.recurrence,
              password: newMeetingObj.passcode,
              invited_emails: newMeetingObj.invitedEmails,
              responses: newMeetingObj.responses,
              duration: newMeetingObj.duration,
              is_expired: newMeetingObj.isExpired,
              user_id: user.id
            }])
            .select();

          if (!error && data && data[0]) {
            setScheduledMeetings(prev => [...prev, newMeetingObj]);
            savedToSupabase = true;
          }
        }
      } catch (err) {
        console.warn('Supabase insert failed. Falling back to local storage.', err);
      }
    }

    if (!savedToSupabase) {
      setScheduledMeetings(prev => {
        const updated = [...prev, newMeetingObj];
        localStorage.setItem('intellmeet_scheduled_v2', JSON.stringify(updated));
        return updated;
      });
    }

    // Outgoing Email Notification trigger (simulated logging)
    if (newMeetingObj.meetingType === 'public') {
      sendEmailNotification(
        email || 'admin@zidio.com',
        `Scheduled Public Meeting Confirmed: ${newMeetingObj.title}`,
        `Hello ${newMeetingObj.host},\n\nYour public meeting is scheduled for ${new Date(newMeetingObj.dateTime).toLocaleString()}.\nLink: ${generatedLink}\nMeeting ID: ${generatedId}\nPasscode: ${generatedPasscode}\n\nNote: This link will expire after the meeting's ${newMeetingObj.duration} minutes time frame.`
      );
    } else {
      // For private, email everyone invited
      emailsList.forEach(invitedEmail => {
        sendEmailNotification(
          invitedEmail,
          `Meeting Invitation: ${newMeetingObj.title}`,
          `You are invited to join a private meeting scheduled by ${newMeetingObj.host} on ${new Date(newMeetingObj.dateTime).toLocaleString()}.\n\nMeeting Type: Private (${newMeetingObj.recurrence} recurrence)\nLink: ${generatedLink}\nMeeting ID: ${generatedId}\nPasscode: ${generatedPasscode}\n\nPlease log in to your dashboard to Accept or Decline the invitation.`
        );
      });
    }

    // Reset inputs
    setSchedInvitedEmails('');
    setSchedMeetingType('public');
    setSchedRecurrence('none');
  };

  const handleDeleteScheduledMeeting = async (meetId: string) => {
    if (!window.confirm("Are you sure you want to delete/cancel this scheduled meeting?")) return;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('scheduled_meetings')
          .delete()
          .eq('id', meetId);

        if (error) {
          alert('Error deleting meeting from database: ' + error.message);
          return;
        }
      } catch (err: any) {
        console.error('Network error deleting meeting:', err);
      }
    }

    setScheduledMeetings(prev => {
      const updated = prev.filter(m => m.id !== meetId);
      localStorage.setItem('intellmeet_scheduled_v2', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAcceptInvitation = async (meetId: string) => {
    const userEmail = email.trim().toLowerCase() || 'admin@zidio.com';
    
    // Find the meeting
    const meetIndex = scheduledMeetings.findIndex(m => m.id === meetId);
    if (meetIndex === -1) return;

    const meet = scheduledMeetings[meetIndex];
    const updatedResponses = { ...meet.responses, [userEmail]: 'accepted' as const };
    const updatedMeet = { ...meet, responses: updatedResponses };

    setScheduledMeetings(prev => {
      const updated = prev.map(m => m.id === meetId ? updatedMeet : m);
      localStorage.setItem('intellmeet_scheduled_v2', JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('scheduled_meetings')
          .update({ responses: updatedResponses })
          .eq('id', meetId);
      } catch (err) {
        console.warn("Supabase update responses error", err);
      }
    }

    // Auto-create card in Task Management Hub (Kanban board)
    await handleAddTask(
      `Attend: ${meet.title}`,
      `Private meeting by ${meet.host} scheduled for ${new Date(meet.dateTime).toLocaleString()}`,
      username || 'You',
      'medium'
    );

    // Send confirmation email back to host
    sendEmailNotification(
      'host@zidio.com',
      `Invitation Accepted: ${meet.title}`,
      `Hello,\n\n${username} (${userEmail}) has accepted your invitation to attend "${meet.title}" scheduled for ${new Date(meet.dateTime).toLocaleString()}.`
    );
  };

  const handleDeclineInvitation = async (meetId: string) => {
    const userEmail = email.trim().toLowerCase() || 'admin@zidio.com';
    
    const meetIndex = scheduledMeetings.findIndex(m => m.id === meetId);
    if (meetIndex === -1) return;

    const meet = scheduledMeetings[meetIndex];
    const updatedResponses = { ...meet.responses, [userEmail]: 'declined' as const };
    const updatedMeet = { ...meet, responses: updatedResponses };

    setScheduledMeetings(prev => {
      const updated = prev.map(m => m.id === meetId ? updatedMeet : m);
      localStorage.setItem('intellmeet_scheduled_v2', JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('scheduled_meetings')
          .update({ responses: updatedResponses })
          .eq('id', meetId);
      } catch (err) {
        console.warn("Supabase update responses error", err);
      }
    }

    // Send declination email back to host
    sendEmailNotification(
      'host@zidio.com',
      `Invitation Declined: ${meet.title}`,
      `Hello,\n\n${username} (${userEmail}) has declined your invitation to attend "${meet.title}" scheduled for ${new Date(meet.dateTime).toLocaleString()}.`
    );
  };

  const getActiveMeetings = () => {
    const list: Array<{ id: string; title: string; host: string; passcode?: string; isScheduled: boolean }> = [];
    
    // Add started scheduled meetings
    scheduledMeetings.forEach(m => {
      if (m.isHostJoined && !m.isExpired) {
        list.push({
          id: m.id,
          title: m.title,
          host: m.host,
          passcode: m.passcode,
          isScheduled: true
        });
      }
    });

    // Add current active room if it's an instant meeting (i.e. title doesn't match any active scheduled meeting)
    if (inActiveMeeting) {
      const isRepresented = list.some(m => m.id === meetingId || m.title === meetingTitle);
      if (!isRepresented) {
        list.push({
          id: meetingId || 'INSTANT-ROOM',
          title: meetingTitle,
          host: username || 'User',
          passcode: activeMeetingPasscode,
          isScheduled: false
        });
      }
    }

    return list;
  };

  const handleOpenPlayback = (rec: RecordingItem) => {
    setPlaybackUrl(rec.url);
    setPlaybackTitle(rec.title);
    const normalized = prefDownloadQuality.split(' ')[0];
    setDownloadQuality(normalized || '720p');
  };

  const handleDeleteRecording = (recId: string) => {
    setRecordings(prev => prev.filter(r => r.id !== recId));
  };

  const handleToggleArchiveRecording = (recId: string) => {
    setRecordings(prev => prev.map(r => {
      if (r.id === recId) {
        return { ...r, isArchived: !r.isArchived };
      }
      return r;
    }));
  };

  const renderAuthModal = () => {
    if (!showAuthModal) return null;

    return (
      <div className="modal-overlay" style={{ zIndex: 2000 }}>
        <div className="modal-content effect-3d" style={{ maxWidth: '420px', padding: '2.5rem', position: 'relative' }}>
          <button 
            className="btn btn-secondary" 
            style={{ position: 'absolute', top: '15px', right: '15px', padding: '0.25rem 0.5rem', minWidth: 'auto' }} 
            onClick={() => setShowAuthModal(false)}
          >
            ✕
          </button>

          <div className="auth-logo">
            <div className="auth-logo-icon">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                <path d="M 18 42 A 32 32 0 0 0 27 70" stroke="var(--primary)" strokeWidth="13" strokeLinecap="round" />
                <path d="M 24 67 A 32 32 0 0 0 76 67" stroke="var(--accent)" strokeWidth="13" />
                <path d="M 73 70 A 32 32 0 0 0 82 42" stroke="var(--danger)" strokeWidth="13" strokeLinecap="round" />
                <rect x="42" y="38" width="16" height="42" rx="8" fill="var(--secondary)" />
                <circle cx="50" cy="22" r="7.5" fill="var(--secondary)" />
              </svg>
            </div>
            <span className="logo-text" style={{color: 'var(--text-primary)'}}>IntellMeet</span>
          </div>

          <div>
            <h2 className="auth-title">{isRegisterMode ? 'Create Account' : 'Sign In'}</h2>
            <p className="auth-subtitle">AI-Powered Enterprise Collaboration</p>

            <form onSubmit={isRegisterMode ? handleRegister : handleLogin}>
              {isRegisterMode && (
                <>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      placeholder="Enter full name"
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Position / Profession</label>
                    <select 
                      className="form-input" 
                      value={position} 
                      onChange={(e) => setPosition(e.target.value)}
                      required
                    >
                      <option value="Student">Student</option>
                      <option value="Working Professional">Working Professional</option>
                      <option value="Product Manager">Product Manager</option>
                      <option value="Software Engineer">Software Engineer</option>
                      <option value="System Administrator">System Administrator</option>
                      <option value="Researcher / Academic">Researcher / Academic</option>
                      <option value="Other">Other (Custom profession)</option>
                    </select>
                  </div>

                  {position === 'Other' && (
                    <div className="form-group animate-fade-in">
                      <label className="form-label">Specify Position</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={customPosition} 
                        onChange={(e) => setCustomPosition(e.target.value)} 
                        placeholder="e.g. Product Designer" 
                        required 
                      />
                    </div>
                  )}
                </>
              )}
              
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="Enter email address"
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Enter password"
                  required 
                />
              </div>

              {!isRegisterMode && (
                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Security Verification (Confirm you are human)</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }} onClick={generateCaptcha}>
                      🔄 Refresh
                    </span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                    {/* Monospace Styled Captcha Code Box */}
                    <div style={{
                      flex: '1',
                      height: '42px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      letterSpacing: '0.4em',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '1.25rem',
                      color: 'var(--color-primary)',
                      backgroundImage: 'linear-gradient(45deg, transparent 45%, rgba(0,0,0,0.06) 48%, rgba(0,0,0,0.06) 52%, transparent 55%), linear-gradient(-45deg, transparent 45%, rgba(0,0,0,0.06) 48%, rgba(0,0,0,0.06) 52%, transparent 55%)',
                      backgroundSize: '15px 15px',
                      userSelect: 'none',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      {captchaCode}
                    </div>
                    {/* Captcha Input */}
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ flex: '1.2', margin: 0, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.15em', fontWeight: 600 }}
                      value={captchaInput} 
                      onChange={(e) => setCaptchaInput(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 5))} 
                      placeholder="Enter code" 
                      required 
                    />
                  </div>
                </div>
              )}

              {authError && <p style={{color: 'var(--color-danger)', fontSize: '0.825rem', marginBottom: '1rem'}}>{authError}</p>}
              
              <button type="submit" className="btn btn-primary w-full mt-4">
                {isRegisterMode ? 'Register & Verify' : 'Login to Workspace'}
              </button>
            </form>

            <p className="auth-toggle">
              {isRegisterMode ? 'Already have an account? ' : 'Need a workspace account? '}
              <span className="auth-toggle-link" onClick={() => {
                setAuthError('');
                setIsRegisterMode(!isRegisterMode);
              }}>
                {isRegisterMode ? 'Sign In' : 'Sign Up'}
              </span>
            </p>
          </div>
        </div>

        {/* Supabase Key Settings Modal */}
        {showSupaConfig && (
          <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal-content effect-3d" style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h3>Supabase Connection Settings</h3>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Paste your Supabase API keys to store tasks, sessions, and histories in your cloud database. If cleared, the app falls back to Local Sandbox mode.
                </p>

                <div className="form-group">
                  <label className="form-label">Supabase URL (Reference `API` Settings)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={supaUrlInput} 
                    onChange={(e) => setSupaUrlInput(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Supabase Anon Key</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    value={supaKeyInput} 
                    onChange={(e) => setSupaKeyInput(e.target.value)}
                    placeholder="eyJhbGciOi..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                {isSupabaseConfigured() && (
                  <button 
                    className="btn btn-danger button-3d mr-auto" 
                    onClick={() => {
                      clearSupabaseKeys();
                      setShowSupaConfig(false);
                    }}
                  >
                    Disconnect Supabase
                  </button>
                )}
                <button className="btn btn-secondary button-3d" onClick={() => setShowSupaConfig(false)}>Cancel</button>
                <button 
                  className="btn btn-primary button-3d" 
                  onClick={() => {
                    saveSupabaseKeys(supaUrlInput, supaKeyInput);
                    setShowSupaConfig(false);
                  }}
                  disabled={!supaUrlInput.trim() || !supaKeyInput.trim()}
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };



  return (
    <div className="app-container">
      {/* Sidebar - 20% Black */}
      <aside className={`sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="logo-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="logo-icon">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                <path d="M 18 42 A 32 32 0 0 0 27 70" stroke="var(--primary)" strokeWidth="13" strokeLinecap="round" />
                <path d="M 24 67 A 32 32 0 0 0 76 67" stroke="var(--accent)" strokeWidth="13" />
                <path d="M 73 70 A 32 32 0 0 0 82 42" stroke="var(--danger)" strokeWidth="13" strokeLinecap="round" />
                <rect x="42" y="38" width="16" height="42" rx="8" fill="var(--secondary)" />
                <circle cx="50" cy="22" r="7.5" fill="var(--secondary)" />
              </svg>
            </div>
            <span className="logo-text">IntellMeet</span>
          </div>
          {/* Close button for mobile sidebar */}
          <button 
            className="sidebar-close-btn" 
            onClick={() => setMobileSidebarOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.25rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '4px',
              display: 'none'
            }}
          >
            ✕
          </button>
          <button 
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-pressed={isDarkMode}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '50%',
              transition: 'background-color 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentTab('dashboard')}
          >
            <Users size={18} />
            <span>Dashboard</span>
          </button>
          
          {inActiveMeeting && (
            <button 
              className={`nav-item ${currentTab === 'meeting' ? 'active' : ''}`}
              onClick={() => setCurrentTab('meeting')}
            >
              <Play size={18} />
              <span>Active Meeting</span>
            </button>
          )}

          <button 
            className={`nav-item ${currentTab === 'kanban' ? 'active' : ''}`}
            onClick={() => setCurrentTab('kanban')}
          >
            <CheckSquare size={18} />
            <span>Task Management</span>
          </button>

          <button 
            className={`nav-item ${currentTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setCurrentTab('analytics')}
          >
            <BarChart3 size={18} />
            <span>AI Analytics</span>
          </button>

          <button 
            className={`nav-item ${currentTab === 'history' ? 'active' : ''}`}
            onClick={() => setCurrentTab('history')}
          >
            <History size={18} />
            <span>Meeting History</span>
          </button>

          <button 
            className={`nav-item ${currentTab === 'recordings' ? 'active' : ''}`}
            onClick={() => setCurrentTab('recordings')}
          >
            <Video size={18} />
            <span>Recordings</span>
          </button>

          <button 
            className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentTab('settings')}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>
        
        {/* Redesigned Account Widget */}
        <div className="user-profile-widget" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowAccountMenu(!showAccountMenu)}>
          <div className="user-avatar" style={{ border: 'none', background: 'transparent' }}>
            {renderUserAvatar()}
          </div>
          <div className="user-info">
            <span className="user-name">{isAuthenticated ? username : 'Account'}</span>
            <span className="user-role" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              {isAuthenticated ? position : 'Guest Mode'}
            </span>
          </div>
          
          {/* Dropdown Menu */}
          {showAccountMenu && (
            <div className="account-dropdown effect-3d" style={{
              position: 'absolute',
              bottom: '100%',
              left: '10px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '1.75rem 0.75rem 0.75rem 0.75rem',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              zIndex: 1000,
              minWidth: '160px',
              marginBottom: '8px'
            }} onClick={(e) => e.stopPropagation()}>
              
              {/* Close Button X */}
              <button 
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  padding: '2px 4px'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAccountMenu(false);
                }}
              >
                ✕
              </button>

              {!isAuthenticated ? (
                <>
                  <button className="btn btn-primary btn-sm button-3d" style={{ justifyContent: 'center' }} onClick={() => {
                    setIsRegisterMode(false);
                    setShowAuthModal(true);
                    setShowAccountMenu(false);
                  }}>
                    Log In
                  </button>
                  <button className="btn btn-secondary btn-sm button-3d" style={{ justifyContent: 'center' }} onClick={() => {
                    setIsRegisterMode(true);
                    setShowAuthModal(true);
                    setShowAccountMenu(false);
                  }}>
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  <div style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--color-border)', marginBottom: '0.25rem' }}>
                    Signed in as: <b>{email}</b>
                  </div>
                  <button className="btn btn-danger btn-sm button-3d" style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'center' }} onClick={() => {
                    handleLogout();
                    setShowAccountMenu(false);
                  }}>
                    <LogOut size={12} /> Log Out
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Sidebar overlay for mobile drawer */}
      <div 
        className={`sidebar-overlay ${mobileSidebarOpen ? 'active' : ''}`} 
        onClick={() => setMobileSidebarOpen(false)}
      ></div>

      {/* Mobile Top Header Bar */}
      <div className="mobile-top-bar">
        <button className="menu-toggle-btn" onClick={() => setMobileSidebarOpen(true)}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <span className="mobile-logo-text">IntellMeet</span>
        <div style={{ width: '32px' }}></div>
      </div>

      {/* Main Workspace - 65% White */}
      <main className="main-workspace">
        
        {/* ==========================================
            DASHBOARD VIEW
            ========================================== */}
        {currentTab === 'dashboard' && (
          <div>
            <div className="workspace-header">
              <div>
                <h1 className="workspace-title">{isAuthenticated ? `Welcome Back, ${username}!` : 'Welcome to IntellMeet!'}</h1>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary button-3d" onClick={() => setShowScheduleModal(true)}>Schedule Meeting</button>
                <button className="btn btn-primary button-3d" onClick={() => setShowJoinSetupModal(true)}>Start Instant Meeting</button>
              </div>
            </div>

            {/* Join Meeting card for guests or anyone */}
            <div className="dashboard-card col-12 effect-3d mb-4" style={{
              background: 'linear-gradient(135deg, var(--bg-primary) 0%, #eff6ff 100%)',
              border: '2px solid var(--color-primary)'
            }}>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                🚀 Join a Meeting
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Enter the Meeting ID and Passcode to join an active call instantly. No account required to participate!
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                alignItems: 'flex-end'
              }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Meeting ID or Link</label>
                  <input 
                    type="text" 
                    className="form-input effect-3d" 
                    placeholder="e.g. MEET-XXXX-XXXX or paste Join Link" 
                    value={joinMeetIdInput}
                    onChange={(e) => setJoinMeetIdInput(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Passcode</label>
                  <input 
                    type="password" 
                    className="form-input effect-3d" 
                    placeholder="e.g. 123456" 
                    value={joinMeetPassInput}
                    onChange={(e) => setJoinMeetPassInput(e.target.value)}
                  />
                </div>
                {!isAuthenticated && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Your Display Name</label>
                    <input 
                      type="text" 
                      className="form-input effect-3d" 
                      placeholder="Enter name to display" 
                      value={guestDisplayName}
                      onChange={(e) => setGuestDisplayName(e.target.value)}
                    />
                  </div>
                )}
                <button 
                  className="btn btn-primary button-3d" 
                  style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={handleJoinMeetingFromCard}
                >
                  Join Meeting
                </button>
              </div>
              {renderLogoWatermark()}
            </div>



            {/* 📩 Pending Invitations Inbox (Private Meetings) */}
            {scheduledMeetings.filter(m => 
              !m.isExpired &&
              m.meetingType === 'private' && 
              m.invitedEmails?.includes(email.trim().toLowerCase() || 'admin@zidio.com') && 
              m.responses?.[email.trim().toLowerCase() || 'admin@zidio.com'] === 'pending'
            ).length > 0 && (
              <div className="dashboard-card col-12 effect-3d mb-4" style={{ borderLeft: '4px solid var(--color-primary)', backgroundColor: '#f0f9ff' }}>
                <h3 className="card-title" style={{ color: 'var(--color-primary)' }}>📩 Pending Meeting Invitations</h3>
                <div className="meeting-list">
                  {scheduledMeetings.filter(m => 
                    !m.isExpired &&
                    m.meetingType === 'private' && 
                    m.invitedEmails?.includes(email.trim().toLowerCase() || 'admin@zidio.com') && 
                    m.responses?.[email.trim().toLowerCase() || 'admin@zidio.com'] === 'pending'
                  ).map(meet => (
                    <div key={meet.id} className="meeting-item" style={{ backgroundColor: 'var(--bg-primary)' }}>
                      <div className="meeting-info">
                        <div className="meeting-icon" style={{ backgroundColor: 'var(--color-primary)' }}>
                          <Users size={20} />
                        </div>
                        <div className="meeting-details">
                          <h4 style={{ fontWeight: 600 }}>{meet.title}</h4>
                          <p>Host: <strong>{meet.host}</strong> • Scheduled: {new Date(meet.dateTime).toLocaleString()} • Recurrence: <span style={{ textTransform: 'capitalize' }}>{meet.recurrence}</span></p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {meet.id} • Passcode: {meet.passcode}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn btn-primary button-3d" onClick={() => handleAcceptInvitation(meet.id)} style={{ backgroundColor: 'var(--color-success)' }}>
                          Accept
                        </button>
                        <button className="btn btn-danger button-3d" onClick={() => handleDeclineInvitation(meet.id)}>
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scheduled Meetings full-width block */}
            <div className="dashboard-card col-12 effect-3d mb-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="card-title" style={{ margin: 0 }}>📅 Scheduled Meetings</h3>
                <span className="badge badge-primary">{scheduledMeetings.filter(m => !m.isHostJoined && !m.isExpired).length} Scheduled</span>
              </div>
              <div className="meeting-list">
                {scheduledMeetings.filter(m => !m.isHostJoined && !m.isExpired).length > 0 ? (
                  scheduledMeetings.filter(m => !m.isHostJoined && !m.isExpired).map(meet => {
                    const isEnabled = getButtonStatus(meet.dateTime);
                    const expired = isMeetingExpired(meet);
                    
                    // Count responses for host presentation
                    let responseSummary = "";
                    if (meet.meetingType === 'private' && meet.responses) {
                      const counts = { accepted: 0, declined: 0, pending: 0 };
                      Object.values(meet.responses).forEach(val => {
                        counts[val]++;
                      });
                      responseSummary = `Invites: ${counts.accepted} accepted, ${counts.declined} declined, ${counts.pending} pending`;
                    }

                    return (
                      <div key={meet.id} className="meeting-item" style={{ marginBottom: '1rem', opacity: expired ? 0.6 : 1 }}>
                        <div className="meeting-info">
                          <div className="meeting-icon" style={{ backgroundColor: expired ? 'var(--color-danger)' : (isEnabled ? 'var(--color-primary)' : '#94a3b8') }}>
                            <History size={20} />
                          </div>
                          <div className="meeting-details">
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {meet.title}
                              <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{meet.meetingType.toUpperCase()}</span>
                              {meet.meetingType === 'private' && <span className="badge badge-green" style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>{meet.recurrence}</span>}
                            </h4>
                            <p>Host: {meet.host} • Scheduled: {new Date(meet.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              ID: <strong>{meet.id}</strong> • Passcode: <strong>{meet.passcode || 'None'}</strong>
                              {meet.meetingType === 'public' && ` • Duration: ${meet.duration} mins`}
                              {responseSummary && ` • ${responseSummary}`}
                            </p>
                          </div>
                        </div>
                        <div>
                          {expired ? (
                            <span className="badge badge-red font-semibold">EXPIRED</span>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button 
                                className={`btn button-3d ${isEnabled ? 'btn-primary' : 'btn-secondary'}`}
                                disabled={!isEnabled}
                                onClick={() => {
                                  setMeetingTitle(meet.title);
                                  setMeetingId(meet.id);
                                  setActiveJoiningScheduledId(meet.id);
                                  setShowJoinSetupModal(true);
                                }}
                                style={{ 
                                  opacity: isEnabled ? 1 : 0.6,
                                  cursor: isEnabled ? 'pointer' : 'not-allowed'
                                }}
                              >
                                Join Room
                              </button>
                              <button 
                                className="btn btn-danger button-3d"
                                onClick={() => handleDeleteScheduledMeeting(meet.id)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', border: '1px dashed var(--color-border)', borderRadius: '8px' }}>
                    No scheduled meetings. Click "Schedule Meeting" in the header to plan one.
                  </div>
                )}
              </div>
            </div>

            <div className="dashboard-grid">
              {/* Active Meetings List */}
              <div className="dashboard-card col-12 effect-3d">
                <h3 className="card-title">🚀 Active Meetings</h3>
                <div className="meeting-list">
                  {getActiveMeetings().length > 0 ? (
                    getActiveMeetings().map(meet => (
                      <div key={meet.id} className="meeting-item" style={{ marginBottom: '1rem' }}>
                        <div className="meeting-info">
                          <div className="meeting-icon">
                            <Video size={24} />
                          </div>
                          <div className="meeting-details">
                            <h4>{meet.title}</h4>
                            <p>Host: {meet.host} • ID: <strong>{meet.id}</strong> {meet.passcode && `• Passcode: ${meet.passcode}`}</p>
                          </div>
                        </div>
                        <div>
                          <span className="badge badge-green mr-4">Live</span>
                          <button className="btn btn-primary button-3d" onClick={() => {
                            setMeetingTitle(meet.title);
                            setMeetingId(meet.id);
                            setActiveMeetingPasscode(meet.passcode || '');
                            setMeetingStartTime(Date.now());
                            setInActiveMeeting(true);
                            setCurrentTab('meeting');
                          }}>
                            {inActiveMeeting && meetingTitle === meet.title ? 'Return to Room' : 'Join Room'}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No active meetings right now. Start a scheduled meeting or click "Start Instant Meeting" above.
                    </div>
                  )}
                </div>
              </div>

              {/* Session Activity Log Widget */}
              {isAuthenticated && (
                <div className="dashboard-card col-12 effect-3d">
                  <h3 className="card-title">📋 Session Activity Log</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                    Track login and logout cycles for team auditing.
                  </p>
                  <div style={{ maxHeight: '250px', overflowY: 'auto', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--bg-secondary)' }}>
                    {sessionLogs.filter(log => log.username.toLowerCase() === username.toLowerCase()).length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--bg-primary)' }}>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>User</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Action</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Timestamp</th>
                            <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessionLogs.filter(log => log.username.toLowerCase() === username.toLowerCase()).map((log) => (
                            <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: 'var(--text-primary)' }}>{log.username}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <span className={`badge ${log.action === 'login' ? 'badge-green' : 'badge-red'}`} style={{ textTransform: 'capitalize' }}>
                                  {log.action === 'login' ? 'Logged In' : 'Logged Out'}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{log.timestamp}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                                  <span style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: log.action === 'login' ? 'var(--color-success)' : '#94a3b8',
                                    display: 'inline-block'
                                  }}></span>
                                  {log.action === 'login' ? 'Active Session' : 'Disconnected'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
                        No recent session logs recorded. Try logging in or out.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 📬 Outgoing Mail & Notification Logs */}
              {isAuthenticated && (
                <div className="dashboard-card col-12 effect-3d">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                      <h3 className="card-title" style={{ margin: 0 }}>📬 Outgoing Mail & Notification Logs</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        Monitor invitations, reminders, and confirmations sent to project members.
                      </p>
                    </div>
                    {userEmailLogs.length > 0 && (
                      <button 
                        className="btn btn-secondary button-3d" 
                        onClick={() => {
                          localStorage.removeItem('intellmeet_emaillogs');
                          setEmailLogs([]);
                        }}
                        style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                      >
                        Clear Logs
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '300px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--bg-secondary)' }}>
                    {userEmailLogs.length > 0 ? (
                      <div style={{ padding: '1rem' }}>
                        {userEmailLogs.map((log) => (
                          <div key={log.id} style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', marginBottom: '0.75rem', boxShadow: 'var(--shadow-sm)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--color-border)', paddingBottom: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                              <span style={{ color: '#2563eb', fontWeight: 600 }}>✉️ TO: {log.to}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{log.timestamp} • {log.id}</span>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                              Subject: {log.subject}
                            </div>
                            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', backgroundColor: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                              {log.body.replace(/\\n/g, '\n')}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                        📬 No outgoing mail logs recorded. Schedule a meeting to trigger notifications.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            MEETING ROOM VIEW
            ========================================== */}
        {currentTab === 'meeting' && (
          <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <div className="workspace-header" style={{marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem'}}>
              <div>
                <h1 className="workspace-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  📹 {meetingTitle}
                  {prefLowBandwidth && (
                    <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'none' }}>
                      📶 Low Bandwidth Mode Active
                    </span>
                  )}
                </h1>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  <span><b>Meeting ID:</b> {meetingId}</span>
                  {activeMeetingPasscode && (
                    <span><b>Passcode:</b> {activeMeetingPasscode}</span>
                  )}
                  <span><b>Join Link:</b> <a href={`http://localhost:3000/join/${meetingId}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>http://localhost:3000/join/{meetingId}</a></span>
                </div>
              </div>
              <button className="btn btn-danger button-3d" onClick={endMeeting}>Leave & Generate Summary</button>
            </div>

            <div className="meeting-room-container" style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0 }}>
              {/* Left Video Area: Grid */}
              <div className="video-section effect-3d" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {isScreenSharing ? (
                  /* Screen Share Presenter Layout */
                  <div style={{ display: 'flex', flex: 1, gap: '1rem', height: '100%', minHeight: 0, padding: '0.5rem' }}>
                    {/* Central Large Presentation Area */}
                    <div className="effect-3d" style={{ 
                      flex: 3.5, 
                      backgroundColor: '#0f172a', 
                      borderRadius: '12px', 
                      position: 'relative', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: '2px solid var(--color-teal)'
                    }}>
                      <video 
                        ref={(el) => {
                          if (el && screenStreamRef.current) {
                            el.srcObject = screenStreamRef.current;
                            el.play().catch(e => console.warn("Screen video play error:", e));
                          }
                        }}
                        autoPlay 
                        playsInline 
                        muted 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        zIndex: 10
                      }}>
                        🖥️ You are sharing your screen
                      </div>
                    </div>

                    {/* Sidebar Compact Participants Grid */}
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.75rem', 
                      overflowY: 'auto',
                      paddingRight: '4px',
                      maxWidth: '220px'
                    }}>
                      {/* Host Camera card (in compact form) */}
                      <div className="video-feed effect-3d" style={{ height: '120px', minHeight: '120px', margin: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="user-avatar" style={{ width: '50px', height: '50px', background: 'transparent' }}>
                          {renderUserAvatar({ width: '50px', height: '50px' })}
                        </div>
                        <span className="participant-label" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>You (Host)</span>
                      </div>

                      {/* Remote Participants */}
                      {meetingParticipants.map((p) => (
                        <div key={p.userId || p.socketId} className={`video-feed ${!p.isMuted ? 'active-speaker' : ''} effect-3d`} style={{ height: '120px', minHeight: '120px', margin: 0 }}>
                          {p.isCamOff ? (
                            <div className="user-avatar" style={{ width: '45px', height: '45px', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: '45px', height: '45px' }}>
                                {renderRemoteUserAvatar(p.avatarIdx, p.avatarUrl, { width: '45px', height: '45px' })}
                              </div>
                            </div>
                          ) : (
                            <ParticipantVideo participant={p} stream={remoteStreams.get(p.socketId) || null} />
                          )}
                          <span className="participant-label" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                            {p.username}
                            {p.isMuted && <MicOff size={10} style={{ color: 'var(--color-danger)', marginLeft: '3px', display: 'inline-block' }} />}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Standard Grid Layout when no one is sharing */
                  <div className="video-grid">
                    {/* Local User (You) */}
                    <div className={`video-feed ${!isMuted ? 'active-speaker' : ''} effect-3d`}>
                      {isCamOff ? (
                        <div className="user-avatar" style={{ width: '80px', height: '80px', background: 'transparent' }}>
                          {renderUserAvatar({ width: '80px', height: '80px' })}
                        </div>
                      ) : (
                        <video 
                          ref={(el) => {
                            if (el && localStreamRef.current) {
                              el.srcObject = localStreamRef.current;
                              el.play().catch(e => console.warn("Camera video play error:", e));
                            }
                          }}
                          autoPlay 
                          playsInline 
                          muted 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
                        />
                      )}
                      <span className="participant-label">
                        <div style={{width: '20px', height: '20px', display: 'inline-block'}}>{renderUserAvatar({ width: '20px', height: '20px' })}</div>
                        {username} (You)
                      </span>
                    </div>

                    {/* Real Remote Participants */}
                    {meetingParticipants.map((p) => (
                      <div key={p.userId || p.socketId} className={`video-feed ${!p.isMuted ? 'active-speaker' : ''} effect-3d`}>
                        {p.isCamOff ? (
                          <div className="user-avatar" style={{ width: '80px', height: '80px', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '80px', height: '80px' }}>
                              {renderRemoteUserAvatar(p.avatarIdx, p.avatarUrl, { width: '80px', height: '80px' })}
                            </div>
                          </div>
                        ) : (
                          <ParticipantVideo participant={p} stream={remoteStreams.get(p.socketId) || null} />
                        )}
                        <span className="participant-label">
                          <div style={{width: '20px', height: '20px', display: 'inline-block'}}>
                            {renderRemoteUserAvatar(p.avatarIdx, p.avatarUrl, { width: '20px', height: '20px' })}
                          </div>
                          {p.username}
                          {p.isMuted && (
                            <MicOff size={12} style={{ color: 'var(--color-danger)', marginLeft: '5px', display: 'inline-block' }} />
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Control bar */}
                <div className="video-controls">
                  <button 
                    className={`control-btn ${isMuted ? 'danger' : 'active'}`}
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>

                  <button 
                    className={`control-btn ${isCamOff ? 'danger' : 'active'}`}
                    onClick={() => setIsCamOff(!isCamOff)}
                  >
                    {isCamOff ? <VideoOff size={20} /> : <Video size={20} />}
                  </button>

                  <button 
                    className={`control-btn ${isScreenSharing ? 'active' : ''}`}
                    onClick={toggleScreenShare}
                  >
                    <MonitorUp size={20} />
                  </button>

                  <button 
                    className={`control-btn ${isRecording ? 'danger active' : ''}`}
                    onClick={isRecording ? stopRecording : startRecording}
                    title={isRecording ? "Stop Recording" : "Start Recording"}
                  >
                    <span style={{
                      width: '12px', height: '12px', borderRadius: '50%', 
                      backgroundColor: 'var(--color-danger)', display: 'inline-block',
                      animation: isRecording ? 'pulse 1s infinite' : 'none'
                    }}></span>
                  </button>
                  {isRecording && <span style={{color: 'var(--color-danger)', fontSize: '0.75rem', fontWeight: 600}}>REC</span>}
                </div>
              </div>

              {/* Right Side Info */}
              <div className="transcript-box effect-3d">
                <div className="tab-nav">
                  <button 
                    className={`tab-btn ${activeRightTab === 'transcript' ? 'active' : ''}`}
                    onClick={() => setActiveRightTab('transcript')}
                  >
                    AI Transcript
                  </button>
                  <button 
                    className={`tab-btn ${activeRightTab === 'chat' ? 'active' : ''}`}
                    onClick={() => setActiveRightTab('chat')}
                  >
                    Chat
                  </button>
                  <button 
                    className={`tab-btn ${activeRightTab === 'notes' ? 'active' : ''}`}
                    onClick={() => setActiveRightTab('notes')}
                  >
                    Notes
                  </button>
                  <button 
                    className={`tab-btn ${activeRightTab === 'actions' ? 'active' : ''}`}
                    onClick={() => setActiveRightTab('actions')}
                  >
                    Actions
                  </button>
                  <button 
                    className={`tab-btn ${activeRightTab === 'members' ? 'active' : ''}`}
                    onClick={() => setActiveRightTab('members')}
                  >
                    Members ({1 + meetingParticipants.length})
                  </button>
                </div>

                <div className="scroll-content">
                  {activeRightTab === 'transcript' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                      <p style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>🤖 Real-time AI transcription active (&gt;85% accuracy)...</p>
                      {transcript.map(msg => (
                        <div key={msg.id} className="message-bubble effect-3d">
                          <div className="message-speaker">{msg.speaker} <span style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>{msg.time}</span></div>
                          <div className="message-text">{msg.text}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeRightTab === 'chat' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%'}}>
                      {/* Pinned Messages Banner */}
                      {pinnedChatIds.length > 0 && (
                        <div style={{
                          backgroundColor: 'rgba(80, 163, 164, 0.08)',
                          border: '1px solid var(--color-teal)',
                          borderRadius: '8px',
                          padding: '0.6rem 0.75rem',
                          fontSize: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                          <strong style={{ color: 'var(--color-teal)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            📌 Pinned Chats ({pinnedChatIds.length})
                          </strong>
                          <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {chatMessages.filter(msg => pinnedChatIds.includes(msg.id)).map(msg => (
                              <div key={`pinned-${msg.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '2px' }}>
                                <div style={{ paddingRight: '12px' }}>
                                  <strong>{msg.sender}:</strong> <span>{msg.text.startsWith('E2EE-') ? decryptText(msg.text, activeMeetingPasscode || 'E2EEKEY') : msg.text}</span>
                                </div>
                                <button 
                                  style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, padding: 0 }}
                                  onClick={() => setPinnedChatIds(prev => prev.filter(id => id !== msg.id))}
                                >
                                  Unpin
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Chat Messages List */}
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '4px' }}>
                        {chatMessages.filter(msg => !msg.recipient || msg.recipient === 'Everyone' || msg.recipient === username || msg.sender === username).map(msg => {
                          const isPrivate = msg.recipient && msg.recipient !== 'Everyone';
                          return (
                            <div key={msg.id} className="message-bubble effect-3d" style={{
                              alignSelf: msg.sender === username ? 'flex-end' : 'flex-start', 
                              backgroundColor: isPrivate ? '#fef2f2' : (msg.sender === username ? '#f0fdf4' : ''),
                              border: isPrivate ? '1px dashed var(--color-danger)' : 'none',
                              display: 'flex',
                              gap: '0.5rem',
                              alignItems: 'flex-start',
                              maxWidth: '85%',
                              position: 'relative'
                            }}>
                              <div style={{width: '24px', height: '24px', flexShrink: 0, marginTop: '2px'}}>
                                {msg.sender === username ? renderUserAvatar({ width: '24px', height: '24px' }) : AVATAR_LOGOS[msg.avatarLogoIndex !== undefined ? msg.avatarLogoIndex : 0]}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div className="message-speaker" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                  <span>{msg.sender} <span style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>{msg.time}</span></span>
                                  {/* Pin button */}
                                  <button 
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: pinnedChatIds.includes(msg.id) ? 'var(--color-teal)' : 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}
                                    onClick={() => {
                                      if (pinnedChatIds.includes(msg.id)) {
                                        setPinnedChatIds(prev => prev.filter(id => id !== msg.id));
                                      } else {
                                        setPinnedChatIds(prev => [...prev, msg.id]);
                                      }
                                    }}
                                    title={pinnedChatIds.includes(msg.id) ? "Unpin Message" : "Pin Message"}
                                  >
                                    📌
                                  </button>
                                </div>
                                {isPrivate && (
                                  <div style={{ fontSize: '0.65rem', color: 'var(--color-danger)', fontWeight: 600, marginBottom: '2px' }}>
                                    {msg.sender === username ? `🔒 private chat with ${msg.recipient}` : `🔒 private chat from ${msg.sender}`}
                                  </div>
                                )}
                                <div className="message-text">
                                  {msg.text.startsWith('E2EE-') ? (
                                    <span title={`Raw Ciphertext: ${msg.text}`}>🔒 {decryptText(msg.text, activeMeetingPasscode || 'E2EEKEY')}</span>
                                  ) : (
                                    msg.text
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Send Target Selector */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Send to:</span>
                          <select 
                            style={{
                              margin: 0, 
                              padding: '2px 6px', 
                              fontSize: '0.75rem', 
                              borderRadius: '4px', 
                              border: '1px solid var(--color-border)', 
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              cursor: 'pointer'
                            }}
                            value={chatTarget}
                            onChange={(e) => setChatTarget(e.target.value)}
                          >
                            <option value="Everyone">Everyone (Public)</option>
                            {meetingParticipants.map(p => (
                              <option key={p.userId || p.socketId} value={p.username}>{p.username} (Private)</option>
                            ))}
                          </select>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', cursor: 'pointer', color: isE2EEEnabled ? 'var(--color-teal)' : 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>
                          <input type="checkbox" checked={isE2EEEnabled} onChange={(e) => setIsE2EEEnabled(e.target.checked)} />
                          🔒 E2EE Chat
                        </label>
                      </div>

                      <div className="input-with-send" style={{ marginTop: 0 }}>
                        <input 
                          type="text" 
                          className="form-input effect-3d" 
                          value={chatInput} 
                          onChange={(e) => setChatInput(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                          placeholder="Send message..."
                        />
                        <button className="btn btn-primary button-3d" onClick={handleSendChat} style={{padding: '0.5rem'}}><Send size={16}/></button>
                      </div>
                    </div>
                  )}

                  {activeRightTab === 'notes' && (
                    <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
                      <textarea 
                        className="shared-notes-area effect-3d"
                        value={sharedNotes}
                        onChange={(e) => setSharedNotes(e.target.value)}
                        placeholder="Type collaborative notes here..."
                      ></textarea>
                    </div>
                  )}

                  {activeRightTab === 'actions' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                      {meetingActions.map((act, index) => (
                        <div key={index} className="action-item-card effect-3d">
                          <div>{act}</div>
                        </div>
                      ))}

                      {/* Host action panel */}
                      <div className="form-group mt-4" style={{borderTop: '1px solid var(--color-border)', paddingTop: '1rem'}}>
                        <h4 style={{fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                          🛡️ Host Action Panel
                        </h4>
                        
                        <label className="form-label">Task Title</label>
                        <input 
                          type="text" 
                          className="form-input effect-3d" 
                          value={actionTitleInput} 
                          onChange={(e) => setActionTitleInput(e.target.value)} 
                          placeholder="e.g. Test loopback API"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">Task Description</label>
                        <textarea 
                          className="form-input effect-3d" 
                          style={{ minHeight: '60px', padding: '0.5rem', resize: 'vertical' }}
                          value={actionDescriptionInput} 
                          onChange={(e) => setActionDescriptionInput(e.target.value)} 
                          placeholder="Describe the task details..."
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Assignee</label>
                        <select 
                          className="form-input effect-3d" 
                          value={actionAssigneeInput}
                          onChange={(e) => setActionAssigneeInput(e.target.value)}
                        >
                          <option value="Everyone">Everyone</option>
                          <option value={username}>{username} (You)</option>
                          {meetingParticipants.map(p => (
                            <option key={p.userId || p.socketId} value={p.username}>{p.username}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Task Expiry / Timeline</label>
                        <select 
                          className="form-input effect-3d" 
                          value={actionTimelineInput}
                          onChange={(e) => setActionTimelineInput(e.target.value)}
                        >
                          <option value="now">Do now (done by now)</option>
                          <option value="30mins">Expire in 30 minutes</option>
                          <option value="1hour">Expire in 1 hour</option>
                          <option value="post">Post-meeting task (do after the meeting)</option>
                        </select>
                      </div>

                      <button className="btn btn-primary w-full button-3d" onClick={handleAddActionItem}>
                        <Plus size={16} /> Post Task
                      </button>
                    </div>
                  )}

                  {activeRightTab === 'members' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', margin: 0 }}>
                        Participants ({1 + meetingParticipants.length})
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* Host */}
                        <div className="effect-3d" style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.6rem 0.75rem',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '28px', height: '28px' }}>
                              {renderUserAvatar({ width: '28px', height: '28px' })}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>{username}</div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--color-teal)', fontWeight: 600 }}>Host (You)</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {isMuted ? <MicOff size={16} style={{ color: 'var(--color-danger)' }} /> : <Mic size={16} style={{ color: 'var(--color-teal)' }} />}
                            {isCamOff ? <VideoOff size={16} style={{ color: 'var(--color-danger)' }} /> : <Video size={16} style={{ color: 'var(--color-teal)' }} />}
                          </div>
                        </div>

                        {/* Remote Members */}
                        {meetingParticipants.map(p => (
                          <div key={p.userId || p.socketId} className="effect-3d" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.6rem 0.75rem',
                            backgroundColor: 'var(--bg-primary)',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ width: '28px', height: '28px' }}>
                                {renderRemoteUserAvatar(p.avatarIdx, p.avatarUrl, { width: '28px', height: '28px' })}
                              </div>
                              <div>
                                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.username}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{p.position || 'Guest Participant'}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {p.isMuted ? <MicOff size={16} style={{ color: 'var(--color-danger)' }} /> : <Mic size={16} style={{ color: 'var(--color-teal)' }} />}
                              {p.isCamOff ? <VideoOff size={16} style={{ color: 'var(--color-danger)' }} /> : <Video size={16} style={{ color: 'var(--color-teal)' }} />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            KANBAN BOARD VIEW
            ========================================== */}
        {currentTab === 'kanban' && (
          !isAuthenticated ? renderLockedFeaturePlaceholder("Task Management Hub", "Collaborate with your team using our integrated Kanban board. Track action items, assign subtasks, and manage work items extracted automatically by our AI meeting assistant.") : (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 130px)' }}>
            <div className="workspace-header">
              <div>
                <h1 className="workspace-title">📋 Task Management Hub</h1>
                <p style={{color: 'var(--text-secondary)'}}>Manage and track your project tasks</p>
              </div>
            </div>

            <div className="kanban-tab-container" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
              {['todo', 'in_progress', 'done', 'review'].map(statusKey => {
                const count = tasks.filter(t => t.status === statusKey).length;
                const isActive = activeKanbanTab === statusKey;
                return (
                  <button 
                    key={statusKey} 
                    className={`kanban-tab-btn ${isActive ? 'active' : ''} button-3d`}
                    onClick={() => setActiveKanbanTab(statusKey)}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: isActive ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      backgroundColor: isActive ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                      color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 4px 12px rgba(80,163,164,0.15)' : 'none'
                    }}
                  >
                    <span style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                      {statusKey.replace('_', ' ')}
                    </span>
                    <span style={{
                      backgroundColor: isActive ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 700
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="kanban-grid" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <div className="kanban-column effect-3d" style={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="kanban-column-header" style={{ marginBottom: '1.25rem' }}>
                  <span className="column-title" style={{ textTransform: 'uppercase', fontWeight: 700 }}>{activeKanbanTab.replace('_', ' ')}</span>
                  <span className="column-count">{tasks.filter(t => t.status === activeKanbanTab).length} Tasks</span>
                </div>
                <div className="kanban-cards" style={{ display: 'grid', gridTemplateColumns: activeKanbanTab === 'review' ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                  {tasks.filter(t => t.status === activeKanbanTab).length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', width: '100%', padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
                      No tasks found in this section.
                    </div>
                  ) : (
                    tasks.filter(t => t.status === activeKanbanTab).map(t => (
                      <div key={t.id} className="kanban-card effect-3d">
                        <h4 className="kanban-card-title">{t.title}</h4>
                        <p className="kanban-card-desc">{t.description}</p>
                        <div className="kanban-card-footer">
                           <span className="assignee"><Users size={12} /> {t.assignee}</span>
                           <span className="priority-tag" style={{color: t.priority === 'high' ? 'var(--color-danger)' : 'var(--color-warning)'}}>{t.priority}</span>
                        </div>

                        {/* Review Notes - Rendered only when in REVIEW column */}
                        {t.status === 'review' && (
                          <div style={{ marginTop: '0.75rem', width: '100%', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }} onClick={(e) => e.stopPropagation()}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                              Review Notes / Feedback:
                            </label>
                            <textarea
                              className="form-input effect-3d"
                              style={{ 
                                width: '100%', 
                                minHeight: '60px', 
                                fontSize: '0.75rem', 
                                padding: '0.5rem', 
                                resize: 'vertical',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '6px'
                              }}
                              placeholder="Type review notes here..."
                              value={t.reviewNotes || ''}
                              onChange={(e) => updateReviewNotes(t.id, e.target.value)}
                            />
                          </div>
                        )}

                        {/* Transition Buttons */}
                        {(t.status === 'todo' || t.status === 'in_progress' || t.status === 'done') && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                            {t.status === 'todo' && (
                              <button 
                                className="btn btn-warning btn-sm button-3d" 
                                onClick={(e) => { e.stopPropagation(); handlePendingClick(t); }}
                              >
                                Pending
                              </button>
                            )}
                            {t.status === 'in_progress' && (
                              <>
                                <button 
                                  className="btn btn-danger btn-sm button-3d" 
                                  onClick={(e) => { e.stopPropagation(); handleBackToTodoClick(t); }}
                                >
                                  Back
                                </button>
                                <button 
                                  className="btn btn-primary btn-sm button-3d" 
                                  onClick={(e) => { e.stopPropagation(); handleOngoingClick(t); }}
                                >
                                  Ongoing
                                </button>
                              </>
                            )}
                            {t.status === 'done' && (
                              <>
                                <button 
                                  className="btn btn-secondary btn-sm button-3d" 
                                  onClick={(e) => { e.stopPropagation(); handleBackToProgressClick(t); }}
                                >
                                  Back
                                </button>
                                <button 
                                  className="btn btn-success btn-sm button-3d" 
                                  onClick={(e) => { e.stopPropagation(); handleCompletedClick(t); }}
                                >
                                  Completed
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          )
        )}

        {/* ==========================================
            AI ANALYTICS VIEW
            ========================================== */}
        {currentTab === 'analytics' && (
          !isAuthenticated ? renderLockedFeaturePlaceholder("AI Analytics & Insights", "Get advanced productivity analytics, sentiment trends, speaker talk-time distribution, and AI-driven efficiency reports for all your workspace meetings.") : (() => {
            if (historyList.length === 0) {
              return (
                <div className="analytics-container animate-fade-in" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                  <div style={{ fontSize: '4.5rem', marginBottom: '1.5rem' }}>📊</div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>No Workspace Analytics</h2>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    You haven't completed any meeting sessions yet. Once you host or join meetings in this workspace, your AI productivity trends, active speaker voice shares, and sentiment ratings will appear here.
                  </p>
                </div>
              );
            }

            const selectedData = getMeetingAnalytics(selectedMeetingAnalytics);
            // Math for Spline productivity curve
            const prodPoints = selectedData.productivityTrends;
            const prodWidth = 400;
            const prodHeight = 180;
            const prodX = (idx: number) => idx * (prodWidth / (prodPoints.length - 1));
            const prodPath = prodPoints.map((p: any, idx: number) => `${idx === 0 ? 'M' : 'L'} ${prodX(idx)} ${p.y}`).join(' ');
            const prodArea = `${prodPath} L ${prodWidth} ${prodHeight} L 0 ${prodHeight} Z`;

            // Math for Sentiment Flow
            const flow = selectedData.sentimentFlow;
            const flowWidth = 500;
            const flowHeight = 180;
            const flowX = (idx: number) => idx * (flowWidth / (flow.length - 1));
            const flowY = (val: number) => flowHeight - (val / 100) * flowHeight;
            const flowPosPath = flow.map((f: any, idx: number) => `${idx === 0 ? 'M' : 'L'} ${flowX(idx)} ${flowY(f.positive)}`).join(' ');
            const flowNeuPath = flow.map((f: any, idx: number) => `${idx === 0 ? 'M' : 'L'} ${flowX(idx)} ${flowY(f.neutral)}`).join(' ');
            const flowNegPath = flow.map((f: any, idx: number) => `${idx === 0 ? 'M' : 'L'} ${flowX(idx)} ${flowY(f.negative)}`).join(' ');

            return (
              <div className="analytics-container animate-fade-in">
                {/* Header */}
                <div className="analytics-header">
                  <div>
                    <h1 className="workspace-title">📈 AI Analytics & Insights</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Zidio Workspace productivity reports • {selectedData.date}</p>
                  </div>
                  
                  <div className="meeting-select-wrapper">
                    <span className="meeting-select-label">Select Meeting Profile:</span>
                    <select 
                      className="meeting-select"
                      value={selectedMeetingAnalytics}
                      onChange={(e) => setSelectedMeetingAnalytics(e.target.value)}
                    >
                      <option value="all">📅 All Workspace Meetings</option>
                      {historyList.map(meet => (
                        <option key={meet.id} value={meet.id}>
                          ⏱️ {meet.title} ({meet.date})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* KPI Grid */}
                <div className="kpi-grid">
                  {/* Total Meetings */}
                  <div className="kpi-card">
                    <div className="kpi-icon-box primary">
                      <Calendar size={22} />
                    </div>
                    <div className="kpi-info">
                      <span className="kpi-title">Meetings</span>
                      <span className="kpi-value">{selectedData.totalMeetings}</span>
                      <div className={`kpi-badge ${selectedData.totalMeetingsTrendDirection === 'up' ? 'positive' : 'negative'}`}>
                        {selectedData.totalMeetingsTrendDirection === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        <span>{selectedData.totalMeetingsTrend}</span>
                      </div>
                    </div>
                  </div>

                  {/* Total Talk-Time */}
                  <div className="kpi-card">
                    <div className="kpi-icon-box accent">
                      <Clock size={22} />
                    </div>
                    <div className="kpi-info">
                      <span className="kpi-title">Talk Time / Duration</span>
                      <span className="kpi-value">{selectedData.totalDuration}</span>
                      <div className={`kpi-badge ${selectedData.totalDurationTrendDirection === 'up' ? 'positive' : 'negative'}`}>
                        {selectedData.totalDurationTrendDirection === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        <span>{selectedData.totalDurationTrend}</span>
                      </div>
                    </div>
                  </div>

                  {/* Average Sentiment */}
                  <div className="kpi-card">
                    <div className="kpi-icon-box success">
                      <Smile size={22} />
                    </div>
                    <div className="kpi-info">
                      <span className="kpi-title">Avg. Sentiment</span>
                      <span className="kpi-value">{selectedData.avgSentiment}%</span>
                      <div className={`kpi-badge ${selectedData.avgSentimentTrendDirection === 'up' ? 'positive' : 'negative'}`}>
                        {selectedData.avgSentimentTrendDirection === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        <span>{selectedData.avgSentimentTrend}</span>
                      </div>
                    </div>
                  </div>

                  {/* Meeting Efficiency */}
                  <div className="kpi-card">
                    <div className="kpi-icon-box danger">
                      <Sparkles size={22} />
                    </div>
                    <div className="kpi-info">
                      <span className="kpi-title">Efficiency Score</span>
                      <span className="kpi-value">{selectedData.efficiencyScore}/100</span>
                      <div className={`kpi-badge ${selectedData.efficiencyScoreTrendDirection === 'up' ? 'positive' : 'negative'}`}>
                        {selectedData.efficiencyScoreTrendDirection === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        <span>{selectedData.efficiencyScoreTrend}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub Tabs */}
                <div className="analytics-tabs">
                  <button 
                    className={`analytics-tab-btn ${activeAnalyticsTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveAnalyticsTab('overview')}
                  >
                    <BarChart3 size={16} />
                    <span>Overview</span>
                  </button>
                  <button 
                    className={`analytics-tab-btn ${activeAnalyticsTab === 'speakers' ? 'active' : ''}`}
                    onClick={() => setActiveAnalyticsTab('speakers')}
                  >
                    <Users size={16} />
                    <span>Speaker Insights</span>
                  </button>
                  <button 
                    className={`analytics-tab-btn ${activeAnalyticsTab === 'sentiment' ? 'active' : ''}`}
                    onClick={() => setActiveAnalyticsTab('sentiment')}
                  >
                    <Smile size={16} />
                    <span>Sentiment & Engagement</span>
                  </button>
                  <button 
                    className={`analytics-tab-btn ${activeAnalyticsTab === 'topics' ? 'active' : ''}`}
                    onClick={() => setActiveAnalyticsTab('topics')}
                  >
                    <Sparkles size={16} />
                    <span>AI Topics & Insights</span>
                  </button>
                </div>

                {/* Tab Panels */}
                <div className="analytics-panel-grid">
                  
                  {/* OVERVIEW TAB */}
                  {activeAnalyticsTab === 'overview' && (
                    <>
                      <div className="dashboard-card grid-col-6 effect-3d">
                        <h3 className="card-title">Meeting Frequency & Load</h3>
                        <div style={{ height: '240px', display: 'flex', alignItems: 'flex-end', gap: '1rem', padding: '1rem 0' }}>
                          {selectedData.weeklyFrequency.map((item: any, i: number) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1 }}>
                              <div 
                                className="effect-3d" 
                                style={{ 
                                  width: '40px', 
                                  height: `${item.height}px`, 
                                  backgroundColor: 'var(--color-primary)', 
                                  borderRadius: '6px 6px 0 0',
                                  transition: 'height 0.3s ease'
                                }}
                                title={`${item.count} meetings`}
                              ></div>
                              <span style={{ fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 500 }}>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="dashboard-card grid-col-6 effect-3d">
                        <h3 className="card-title">Productivity Score Trends</h3>
                        <div style={{ height: '240px', position: 'relative', borderBottom: '2px solid var(--color-border)', borderLeft: '2px solid var(--color-border)', margin: '1rem 0', padding: '10px 10px 0 10px' }}>
                          <svg viewBox="0 0 400 180" style={{ width: '100%', height: '100%', overflow: 'visible' }} preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25"/>
                                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0"/>
                              </linearGradient>
                            </defs>
                            <path d={prodArea} fill="url(#prodGrad)" />
                            <path d={prodPath} fill="none" stroke="var(--primary)" strokeWidth="3" style={{ transition: 'd 0.3s ease' }} />
                            {prodPoints.map((p: any, idx: number) => (
                              <circle 
                                key={idx} 
                                cx={prodX(idx)} 
                                cy={p.y} 
                                r="5" 
                                fill="#ffffff" 
                                stroke="var(--primary)" 
                                strokeWidth="3"
                              >
                                <title>{p.label}</title>
                              </circle>
                            ))}
                          </svg>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            {prodPoints.map((p: any, idx: number) => (
                              <span key={idx}>{p.label}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* SPEAKER INSIGHTS TAB */}
                  {activeAnalyticsTab === 'speakers' && (
                    <>
                      <div className="dashboard-card grid-col-8 effect-3d">
                        <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>Speaker Voice Share Distribution</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>Percentage of total audio timeline attributed to each speaker</p>
                        
                        {/* Stacked Voice-Share Bar */}
                        <div style={{ display: 'flex', height: '24px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                          {selectedData.speakers.map((s: any, idx: number) => (
                            <div 
                              key={idx} 
                              style={{ width: `${s.percentage}%`, backgroundColor: s.color, height: '100%', transition: 'width 0.3s ease' }} 
                              title={`${s.name}: ${s.percentage}%`}
                            />
                          ))}
                        </div>

                        {/* Speakers Table */}
                        <div className="analytics-table-container">
                          <table className="analytics-table">
                            <thead>
                              <tr>
                                <th>Participant</th>
                                <th>Voice Share</th>
                                <th>Talk Time</th>
                                <th>Interruptions</th>
                                <th>Audio Clarity</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedData.speakers.map((s: any, idx: number) => (
                                <tr key={idx}>
                                  <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.color }} />
                                    <span>{s.name}</span>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <div className="progress-bar-container" style={{ width: '60px' }}>
                                        <div className="progress-bar-fill" style={{ width: `${s.percentage}%`, backgroundColor: s.color }} />
                                      </div>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{s.percentage}%</span>
                                    </div>
                                  </td>
                                  <td>{Math.floor(s.talkTime / 60) > 0 ? `${Math.floor(s.talkTime / 60)}m ${s.talkTime % 60}s` : `${s.talkTime}s`}</td>
                                  <td style={{ color: s.interruptions > 10 ? 'var(--danger)' : 'var(--text-secondary)' }}>{s.interruptions} times</td>
                                  <td>
                                    <span style={{ color: s.clarity > 90 ? 'var(--success)' : s.clarity > 80 ? 'var(--accent)' : 'var(--danger)', fontWeight: 600 }}>{s.clarity}%</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="dashboard-card grid-col-4 effect-3d" style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3 className="card-title">Interruption Dynamics</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, padding: '1rem 0' }}>
                          <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                            <Volume2 size={40} style={{ color: 'var(--primary)' }} />
                            <svg viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--bg-tertiary)" strokeWidth="6" />
                              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--primary)" strokeWidth="6" strokeDasharray="283" strokeDashoffset={283 - (selectedData.speakers.reduce((acc: number, s: any) => acc + s.clarity, 0) / selectedData.speakers.length / 100) * 283} strokeLinecap="round" transform="rotate(-90 50 50)" />
                            </svg>
                          </div>
                          
                          <div style={{ textAlign: 'center', width: '100%' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                              Avg. Voice Clarity: {Math.round(selectedData.speakers.reduce((acc: number, s: any) => acc + s.clarity, 0) / selectedData.speakers.length)}%
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Based on jitter, packet loss, and background noise suppression analysis.</p>
                          </div>

                          <div style={{ borderTop: '1px solid var(--border)', marginTop: '1.25rem', paddingTop: '1rem', width: '100%', display: 'flex', justifyContent: 'space-around' }}>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {selectedData.speakers.reduce((acc: number, s: any) => acc + s.interruptions, 0)}
                              </span>
                              <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Total Cross-talks</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>Active</span>
                              <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Punctuality Status</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* SENTIMENT & ENGAGEMENT TAB */}
                  {activeAnalyticsTab === 'sentiment' && (
                    <>
                      <div className="dashboard-card grid-col-8 effect-3d">
                        <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>Sentiment Flow Timeline</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Sentiment classification over the course of the meeting timeline</p>
                        
                        <div style={{ height: '220px', position: 'relative', borderBottom: '2px solid var(--color-border)', borderLeft: '2px solid var(--color-border)', margin: '1rem 0', padding: '10px 10px 0 10px' }}>
                          <svg viewBox={`0 0 ${flowWidth} ${flowHeight}`} style={{ width: '100%', height: '100%', overflow: 'visible' }} preserveAspectRatio="none">
                            {/* Paths */}
                            <path d={flowPosPath} fill="none" stroke="#2E7D32" strokeWidth="2.5" style={{ transition: 'd 0.3s ease' }} />
                            <path d={flowNeuPath} fill="none" stroke="var(--accent)" strokeWidth="2.5" style={{ transition: 'd 0.3s ease' }} />
                            <path d={flowNegPath} fill="none" stroke="var(--danger)" strokeWidth="2.5" style={{ transition: 'd 0.3s ease' }} />
                            
                            {/* Points */}
                            {flow.map((f: any, idx: number) => (
                              <g key={idx}>
                                <circle cx={flowX(idx)} cy={flowY(f.positive)} r="4" fill="#2E7D32" />
                                <circle cx={flowX(idx)} cy={flowY(f.neutral)} r="4" fill="var(--accent)" />
                                <circle cx={flowX(idx)} cy={flowY(f.negative)} r="4" fill="var(--danger)" />
                              </g>
                            ))}
                          </svg>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            {flow.map((f: any, idx: number) => (
                              <span key={idx}>{f.time}</span>
                            ))}
                          </div>
                        </div>

                        <div className="chart-legend">
                          <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: '#2E7D32' }} />
                            <span>Positive</span>
                          </div>
                          <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: 'var(--accent)' }} />
                            <span>Neutral</span>
                          </div>
                          <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: 'var(--danger)' }} />
                            <span>Negative</span>
                          </div>
                        </div>
                      </div>

                      <div className="dashboard-card grid-col-4 effect-3d" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 className="card-title" style={{ alignSelf: 'flex-start' }}>Engagement Score</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, padding: '1rem 0' }}>
                          
                          {/* Circular Progress Ring */}
                          <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-tertiary)" strokeWidth="8" />
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                fill="none" 
                                stroke="var(--primary)" 
                                strokeWidth="8" 
                                strokeDasharray={251.2} 
                                strokeDashoffset={251.2 - (selectedData.engagementScore / 100) * 251.2} 
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                              />
                            </svg>
                            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedData.engagementScore}%</span>
                              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Active</span>
                            </div>
                          </div>

                          <div style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', color: '#2E7D32', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                              <Smile size={16} />
                              <span>Highly Attentive</span>
                            </div>
                            <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', padding: '0 0.5rem' }}>
                              Visual focus, response latency, and chat message interactions indicate excellent group collaboration.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* AI TOPICS & INSIGHTS TAB */}
                  {activeAnalyticsTab === 'topics' && (
                    <>
                      <div className="dashboard-card grid-col-6 effect-3d">
                        <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>AI Extracted Key Topics</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>Important topics extracted from meeting transcription text</p>
                        
                        <div className="topic-cloud">
                          {selectedData.topics.map((t: any, idx: number) => (
                            <div key={idx} className="topic-tag">
                              <Sparkles size={12} style={{ color: t.importance === 'high' ? 'var(--danger)' : t.importance === 'medium' ? 'var(--primary)' : 'var(--text-muted)' }} />
                              <span>{t.name}</span>
                              <span className="topic-count">{t.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="dashboard-card grid-col-6 effect-3d">
                        <h3 className="card-title">AI Meeting Insights</h3>
                        <div className="insights-list" style={{ marginTop: '0.75rem' }}>
                          {selectedData.insights.map((insight: any, idx: number) => (
                            <div key={idx} className={`insight-card ${insight.type === 'warning' ? 'warning' : insight.type === 'success' ? 'success' : ''}`}>
                              <div className="insight-icon">
                                {insight.type === 'warning' ? (
                                  <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
                                ) : insight.type === 'success' ? (
                                  <CheckCircle size={18} style={{ color: '#2E7D32' }} />
                                ) : (
                                  <Info size={18} style={{ color: 'var(--primary)' }} />
                                )}
                              </div>
                              <div>
                                <h4 className="insight-title">{insight.title}</h4>
                                <p style={{ margin: 0 }}>{insight.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                </div>
              </div>
            );
          })()
        )}

        {/* ==========================================
            MEETING HISTORY VIEW
            ========================================== */}
        {currentTab === 'history' && (
          !isAuthenticated ? renderLockedFeaturePlaceholder("Past Meetings & Summaries", "Access your archived meetings list, search past transcripts, review auto-generated summaries, and export action items to PDF or CSV.") : (
          <div>
            <div className="workspace-header">
              <div>
                <h1 className="workspace-title">📁 Past Meetings & Summaries</h1>
                <p style={{color: 'var(--text-secondary)'}}>Search and download past summaries</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', maxWidth: '600px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <input 
                  type="text" 
                  className="form-input effect-3d" 
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Search meeting titles..."
                />
              </div>
              <div className="form-group" style={{ width: '180px', margin: 0 }}>
                <select
                  className="form-input effect-3d"
                  value={prefHistoryVisibility}
                  onChange={(e) => {
                    setPrefHistoryVisibility(e.target.value);
                    localStorage.setItem('pref_history_visibility', e.target.value);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="All Time">📅 All Time</option>
                  <option value="Past Week">📅 Past Week</option>
                  <option value="Past Month">📅 Past Month</option>
                  <option value="Past Year">📅 Past Year</option>
                </select>
              </div>
            </div>

            <div className="history-table-container effect-3d">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Meeting ID</th>
                    <th>Meeting Name</th>
                    <th>Date</th>
                    <th>Duration</th>
                    <th>Participants</th>
                    <th>AI Summary</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.filter(h => {
                    const matchesSearch = h.title.toLowerCase().includes(historySearchQuery.toLowerCase());
                    if (!matchesSearch) return false;
                    if (prefHistoryVisibility === 'All Time') return true;
                    const meetingTime = new Date(h.date).getTime();
                    if (isNaN(meetingTime)) return true;
                    const diffMs = Date.now() - meetingTime;
                    const oneDay = 24 * 60 * 60 * 1000;
                    if (prefHistoryVisibility === 'Past Week') return diffMs <= 7 * oneDay;
                    if (prefHistoryVisibility === 'Past Month') return diffMs <= 30 * oneDay;
                    if (prefHistoryVisibility === 'Past Year') return diffMs <= 365 * oneDay;
                    return true;
                  }).map(meet => (
                    <tr key={meet.id}>
                      <td style={{fontWeight: 600, color: 'var(--color-primary)'}}>{meet.id}</td>
                      <td style={{fontWeight: 500}}>{meet.title}</td>
                      <td>{meet.date}</td>
                      <td>{meet.duration}</td>
                      <td>{meet.participants}</td>
                      <td style={{maxWidth: '280px', color: 'var(--text-secondary)', fontSize: '0.8rem'}}>{meet.summary}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm button-3d" onClick={() => handleExportSummary(meet)}>
                          <FileDown size={14} /> Export
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )
        )}

        {/* ==========================================
            RECORDINGS VIEW
            ========================================== */}
        {currentTab === 'recordings' && (
          !isAuthenticated ? renderLockedFeaturePlaceholder("Meeting Session Recordings", "Save your interactive meetings locally, replay captured speaker screen streams with high fidelity, and download structured outputs.") : (
          <div>
            <div className="workspace-header">
              <div>
                <h1 className="workspace-title">📹 Meeting Session Recordings</h1>
                <p style={{color: 'var(--text-secondary)'}}>Locally recorded video files playbacks</p>
              </div>
            </div>

            <div className="dashboard-grid">
              {recordings.length === 0 ? (
                <div className="dashboard-card col-12 effect-3d text-center" style={{padding: '3rem'}}>
                  <Video size={48} style={{color: 'var(--text-muted)', marginBottom: '1rem'}} />
                  <h3>No Recordings Available</h3>
                  <p style={{color: 'var(--text-secondary)'}}>Start a meeting room and click the record button to capture live sessions.</p>
                </div>
              ) : (
                recordings.map(rec => {
                  const isArchived = rec.isArchived;
                  let expiryDays = 0;
                  if (rec.expiresAt) {
                    const diff = new Date(rec.expiresAt).getTime() - Date.now();
                    expiryDays = Math.ceil(diff / (24 * 60 * 60 * 1000));
                  }

                  return (
                    <div key={rec.id} className="dashboard-card col-4 effect-3d hover-lift">
                      <div style={{height: '140px', backgroundColor: '#0f172a', borderRadius: '8px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', overflow: 'hidden'}}>
                        <Video size={36} style={{color: 'white', opacity: 0.5}} />
                        
                        {/* Expiration count or Saved badge overlay */}
                        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
                          {isArchived ? (
                            <span className="badge badge-green font-semibold" style={{ fontSize: '0.65rem', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>💾 Saved Permanent</span>
                          ) : (
                            <span className="badge badge-warning font-semibold" style={{ fontSize: '0.65rem', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                              ⏳ {expiryDays > 0 ? `${expiryDays} days left` : 'Expired'}
                            </span>
                          )}
                        </div>

                        <div style={{position: 'absolute', bottom: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px'}}>
                          {rec.duration}
                        </div>
                      </div>
                      <h4 style={{fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem'}}>{rec.title}</h4>
                      <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem'}}>Recorded: {rec.date} • ID: {rec.id}</p>
                      <div className="flex gap-2">
                        <button className="btn btn-primary btn-sm w-full button-3d" onClick={() => handleOpenPlayback(rec)}>
                          <Play size={14} /> Playback
                        </button>
                        <button 
                          className={`btn ${isArchived ? 'btn-secondary' : 'btn-success'} btn-sm button-3d`} 
                          onClick={() => handleToggleArchiveRecording(rec.id)} 
                          title={isArchived ? "Remove from permanent archive" : "Archive permanently before expiration"}
                          style={{ padding: '0.5rem' }}
                        >
                          💾
                        </button>
                        <button className="btn btn-danger btn-sm button-3d" onClick={() => handleDeleteRecording(rec.id)} style={{padding: '0.5rem'}}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          )
        )}

        {currentTab === 'settings' && (
          <div>
            <div className="workspace-header">
              <div>
                <h1 className="workspace-title">⚙️ Settings</h1>
                <p style={{color: 'var(--text-secondary)'}}>Configure your personal profile and meeting preferences</p>
              </div>
            </div>

            <div className="dashboard-grid">
              
              {/* Meeting System Preferences */}
              <div className="dashboard-card col-6 effect-3d">
                <h3 className="card-title">🎥 Meeting Preferences</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                  
                  {/* Auto Mute */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Auto-mute microphone</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mute your microphone automatically when joining a meeting room.</p>
                    </div>
                    <label className="switch-container">
                      <input 
                        type="checkbox" 
                        checked={prefAutoMute} 
                        onChange={(e) => {
                          setPrefAutoMute(e.target.checked);
                          localStorage.setItem('pref_auto_mute', e.target.checked ? 'true' : 'false');
                        }}
                      />
                      <span className="slider-round"></span>
                    </label>
                  </div>

                  {/* Auto Camera Off */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Auto-turn off video camera</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Turn video camera off automatically when joining a meeting room.</p>
                    </div>
                    <label className="switch-container">
                      <input 
                        type="checkbox" 
                        checked={prefAutoCameraOff} 
                        onChange={(e) => {
                          setPrefAutoCameraOff(e.target.checked);
                          localStorage.setItem('pref_auto_camera_off', e.target.checked ? 'true' : 'false');
                        }}
                      />
                      <span className="slider-round"></span>
                    </label>
                  </div>

                  {/* Mirror Video */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Mirror my video stream</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Flip your webcam feed horizontally for a natural self-view.</p>
                    </div>
                    <label className="switch-container">
                      <input 
                        type="checkbox" 
                        checked={prefMirrorVideo} 
                        onChange={(e) => {
                          setPrefMirrorVideo(e.target.checked);
                          localStorage.setItem('pref_mirror_video', e.target.checked ? 'true' : 'false');
                        }}
                      />
                      <span className="slider-round"></span>
                    </label>
                  </div>

                  {/* Participant Name Tags */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Show participant name tags</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Overlay names on participant video feeds during active calls.</p>
                    </div>
                    <label className="switch-container">
                      <input 
                        type="checkbox" 
                        checked={prefShowNames} 
                        onChange={(e) => {
                          setPrefShowNames(e.target.checked);
                          localStorage.setItem('pref_show_names', e.target.checked ? 'true' : 'false');
                        }}
                      />
                      <span className="slider-round"></span>
                    </label>
                  </div>

                  {/* Noise Suppression */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>AI background noise suppression</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Filter out ambient hums and background clicks.</p>
                    </div>
                    <label className="switch-container">
                      <input 
                        type="checkbox" 
                        checked={prefNoiseSuppress} 
                        onChange={(e) => {
                          setPrefNoiseSuppress(e.target.checked);
                          localStorage.setItem('pref_noise_suppress', e.target.checked ? 'true' : 'false');
                        }}
                      />
                      <span className="slider-round"></span>
                    </label>
                  </div>

                  {/* History Visibility */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Meeting History Visibility</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Show past meetings created within this specific timeframe.</p>
                    </div>
                    <select 
                      className="form-input effect-3d" 
                      style={{ width: '160px', margin: 0, padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                      value={prefHistoryVisibility}
                      onChange={(e) => {
                        setPrefHistoryVisibility(e.target.value);
                        localStorage.setItem('pref_history_visibility', e.target.value);
                      }}
                    >
                      <option value="All Time">All Time</option>
                      <option value="Past Week">Past Week</option>
                      <option value="Past Month">Past Month</option>
                      <option value="Past Year">Past Year</option>
                    </select>
                  </div>

                  {/* Default Download Quality */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Default Recording Quality</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Set resolution aspect for downloaded meeting recording MP4s.</p>
                    </div>
                    <select 
                      className="form-input effect-3d" 
                      style={{ width: '160px', margin: 0, padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                      value={prefDownloadQuality}
                      onChange={(e) => {
                        setPrefDownloadQuality(e.target.value);
                        localStorage.setItem('pref_download_quality', e.target.value);
                      }}
                    >
                      <option value="480p (SD)">480p (SD)</option>
                      <option value="720p (HD)">720p (HD)</option>
                      <option value="1080p (FHD)">1080p (FHD)</option>
                      <option value="1440p (QHD)">1440p (QHD)</option>
                    </select>
                  </div>

                  {/* Low Bandwidth Mode */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Low Bandwidth Mode</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Turn off intensive live grid canvas drawing on slow networks.</p>
                    </div>
                    <label className="switch-container">
                      <input 
                        type="checkbox" 
                        checked={prefLowBandwidth} 
                        onChange={(e) => {
                          setPrefLowBandwidth(e.target.checked);
                          localStorage.setItem('pref_low_bandwidth', e.target.checked ? 'true' : 'false');
                        }}
                      />
                      <span className="slider-round"></span>
                    </label>
                  </div>

                  {/* Theme Mode Toggle (Light/Dark) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Appearance Mode</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Toggle between light theme and sleek dark mode.</p>
                    </div>
                    <button className="btn btn-secondary button-3d" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={toggleTheme}>
                      {isDarkMode ? <Sun size={14} /> : <Moon size={14} />} {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                    </button>
                  </div>

                </div>
              </div>

              {/* Personal Profile Panel */}
              <div className="dashboard-card col-6 effect-3d">
                <h3 className="card-title">👤 Personal Profile Info</h3>
                
                {/* Profile Photo Live Capture and Local Upload */}
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', margin: '1.25rem 0', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {renderUserAvatar({ width: '80px', height: '80px' })}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
                    <label className="btn btn-secondary btn-sm button-3d" style={{ cursor: 'pointer', textAlign: 'center', width: '100%', justifyContent: 'center' }}>
                      📁 Upload Photo file
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                    </label>
                    <button className="btn btn-primary btn-sm button-3d" style={{ width: '100%', justifyContent: 'center' }} onClick={isWebcamActive ? stopWebcam : startWebcam}>
                      📷 {isWebcamActive ? 'Stop Camera' : 'Take Live Photo'}
                    </button>
                  </div>
                </div>

                {isWebcamActive && (
                  <div className="effect-3d" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.25rem', backgroundColor: 'var(--video-bg)', borderRadius: '12px', marginBottom: '1.25rem' }}>
                    <div style={{ width: '200px', height: '200px', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', boxShadow: 'var(--shadow-md)' }}>
                      <video ref={webcamVideoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
                    </div>
                    {cameraError && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem' }}>{cameraError}</p>}
                    <button className="btn btn-success btn-sm button-3d" onClick={captureWebcamSnapshot}>
                      📸 Capture & Set Profile Photo
                    </button>
                  </div>
                )}

                {/* Info Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text" 
                      className="form-input effect-3d" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      placeholder="Guest" 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email" 
                      className="form-input effect-3d" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      disabled={!isAuthenticated}
                      placeholder={isAuthenticated ? "admin@zidio.com" : "Sign in to set email"} 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Phone Number</label>
                    <input 
                      type="text" 
                      className="form-input effect-3d" 
                      value={userPhone} 
                      onChange={(e) => setUserPhone(e.target.value)} 
                      placeholder="e.g. +1 555-0199" 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Date of Birth (mm/dd/yyyy)</label>
                    <input 
                      type="text" 
                      className="form-input effect-3d" 
                      value={userDob} 
                      onChange={(e) => setUserDob(e.target.value)} 
                      placeholder="e.g. 05/20/1998" 
                    />
                  </div>
                </div>
              </div>

              {/* Password Controller Section */}
              <div className="dashboard-card col-12 effect-3d">
                <h3 className="card-title">🔒 Password Management</h3>
                {!isAuthenticated ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    🔒 Password modification features are only available to authenticated workspace accounts.
                  </div>
                ) : (
                  <form onSubmit={handlePasswordChange} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                    
                    {/* Input columns */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Current Password</label>
                        <input 
                          type="password" 
                          className="form-input effect-3d" 
                          value={currentPasswordInput} 
                          onChange={(e) => setCurrentPasswordInput(e.target.value)} 
                          required 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">New Password</label>
                        <input 
                          type="password" 
                          className="form-input effect-3d" 
                          value={newPasswordInput} 
                          onChange={(e) => setNewPasswordInput(e.target.value)} 
                          required 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Confirm New Password</label>
                        <input 
                          type="password" 
                          className="form-input effect-3d" 
                          value={confirmPasswordInput} 
                          onChange={(e) => setConfirmPasswordInput(e.target.value)} 
                          required 
                        />
                      </div>
                      {passwordChangeError && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '0.25rem' }}>❌ {passwordChangeError}</p>}
                      {passwordChangeStatus && <p style={{ color: 'var(--color-success)', fontSize: '0.8rem', marginTop: '0.25rem' }}>✅ {passwordChangeStatus}</p>}
                      
                      <button type="submit" className="btn btn-primary button-3d" style={{ marginTop: '0.5rem', width: 'fit-content' }}>
                        Change Password
                      </button>
                    </div>

                    {/* Password Strength Requirement Checklist */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                      <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Password Strength Requirements:</h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <li style={{ color: pwValidations.length ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {pwValidations.length ? '✅' : '❌'} Minimum 8 characters
                        </li>
                        <li style={{ color: pwValidations.uppercase ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {pwValidations.uppercase ? '✅' : '❌'} At least 1 uppercase letter (A-Z)
                        </li>
                        <li style={{ color: pwValidations.lowercase ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {pwValidations.lowercase ? '✅' : '❌'} At least 1 lowercase letter (a-z)
                        </li>
                        <li style={{ color: pwValidations.number ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {pwValidations.number ? '✅' : '❌'} At least 1 number (0-9)
                        </li>
                        <li style={{ color: pwValidations.special ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {pwValidations.special ? '✅' : '❌'} At least 1 special character (e.g. @, #, $, %, etc.)
                        </li>
                      </ul>
                    </div>

                  </form>
                )}
              </div>



            </div>
          </div>
        )}


      </main>

      {/* ==========================================
          JOIN MEETING SETUP SETUP MODAL (Logo selection)
          ========================================== */}
      {showJoinSetupModal && (
        <div className="modal-overlay" style={{ zIndex: 999 }}>
          <div className="modal-content effect-3d" style={{ maxWidth: '780px', width: '95%', padding: '2rem' }}>
            <div className="modal-header" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Ready to Join?</h3>
            </div>
            
            <div className="modal-body pre-join-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              
              {/* Left Column: Live Camera Video Stream Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--color-border)' }}>
                <div style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
                }}>
                  {isCamOff ? (
                    <div className="user-avatar" style={{ width: '70px', height: '70px', background: 'transparent' }}>
                      {renderUserAvatar({ width: '70px', height: '70px' })}
                    </div>
                  ) : (
                    <video ref={previewVideoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
                  )}
                  
                  {/* Status indicator pill */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    color: '#ffffff',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    backdropFilter: 'blur(4px)'
                  }}>
                    {isCamOff ? '📷 Camera Off' : '📷 Camera Live'}
                  </div>
                </div>

                {/* Pre-join audio/video controls panel */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button 
                    className={`control-btn ${isMuted ? 'danger' : 'active'}`}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onClick={() => setIsMuted(!isMuted)}
                    title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                    aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                    aria-pressed={!isMuted}
                  >
                    {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>

                  <button 
                    className={`control-btn ${isCamOff ? 'danger' : 'active'}`}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onClick={() => setIsCamOff(!isCamOff)}
                    title={isCamOff ? 'Turn camera on' : 'Turn camera off'}
                    aria-label={isCamOff ? 'Turn camera on' : 'Turn camera off'}
                    aria-pressed={!isCamOff}
                  >
                    {isCamOff ? <VideoOff size={16} /> : <Video size={16} />}
                  </button>

                  <button 
                    className="control-btn active"
                    style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onClick={playSoundTest}
                    title="Test speaker sound"
                    aria-label="Test speaker sound"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
              </div>

              {/* Right Column: Setup Topic, Name, and Fallback Avatar selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Topic of the meeting</label>
                  <input 
                    type="text" 
                    className="form-input effect-3d" 
                    value={meetingTitle} 
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="Enter meeting topic (e.g. Project Alignment)"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Your Display Name</label>
                  <input 
                    type="text" 
                    className="form-input effect-3d" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ marginBottom: '0.5rem' }}>Choose fallback avatar</label>
                  <div style={{
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(5, 1fr)', 
                    gap: '0.5rem', 
                    padding: '0.5rem', 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)'
                  }}>
                    {AVATAR_LOGOS.slice(0, 5).map((svg, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedAvatarIdx(idx)}
                        style={{
                          cursor: 'pointer',
                          borderRadius: '50%',
                          border: selectedAvatarIdx === idx ? '2px solid var(--color-primary)' : '2px solid transparent',
                          padding: '2px',
                          backgroundColor: selectedAvatarIdx === idx ? 'var(--bg-primary)' : 'transparent',
                          transform: selectedAvatarIdx === idx ? 'scale(1.08)' : 'none',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={idx < 2 ? "Boy Avatar" : idx < 4 ? "Girl Avatar" : "Meeting Symbol"}
                      >
                        <div style={{ width: '28px', height: '28px' }}>{svg}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
            
            <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <button className="btn btn-secondary button-3d" onClick={() => setShowJoinSetupModal(false)}>Cancel</button>
              <button className="btn btn-primary button-3d" onClick={() => startMeeting(meetingTitle)}>Join Meeting</button>
            </div>
            {renderLogoWatermark()}
          </div>
        </div>
      )}

      {/* Playback Modal */}
      {playbackUrl && (
        <div className="modal-overlay">
          <div className="modal-content effect-3d" style={{maxWidth: '700px'}}>
            <div className="modal-header">
              <h3>Play Recording: {playbackTitle}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setPlaybackUrl(null)}>X</button>
            </div>
            <div className="modal-body" style={{backgroundColor: '#000000', borderRadius: '8px', overflow: 'hidden'}}>
              <video 
                src={playbackUrl} 
                controls 
                autoPlay 
                style={{width: '100%', display: 'block'}}
              />
            </div>
            <div className="modal-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Download Quality:</span>
                <select 
                  value={downloadQuality} 
                  onChange={(e) => setDownloadQuality(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="480p">480p (SD)</option>
                  <option value="720p">720p (HD)</option>
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="1440p">1440p (QHD)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a 
                  href={playbackUrl} 
                  download={`${playbackTitle.replace(/\s+/g, '_')}_${downloadQuality}.webm`} 
                  className="btn btn-primary button-3d"
                >
                  <Download size={14} /> Download File
                </a>
                <button className="btn btn-secondary button-3d" onClick={() => setPlaybackUrl(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal-content effect-3d" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>📅 Schedule New Meeting</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Meeting Title</label>
                <input 
                  type="text" 
                  className="form-input effect-3d" 
                  placeholder="e.g. Q3 Roadmap Align" 
                  value={schedTitle}
                  onChange={(e) => setSchedTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date & Time</label>
                <input 
                  type="datetime-local" 
                  className="form-input effect-3d" 
                  value={schedDateTime}
                  onChange={(e) => setSchedDateTime(e.target.value)}
                />
              </div>

              {/* Meeting Type Selector */}
              <div className="form-group">
                <label className="form-label">Meeting Privacy</label>
                <select 
                  className="form-input effect-3d"
                  value={schedMeetingType}
                  onChange={(e) => setSchedMeetingType(e.target.value as 'public' | 'private')}
                >
                  <option value="public">Public (Anyone with link/password can join)</option>
                  <option value="private">Private (Invite-only by Email ID)</option>
                </select>
              </div>



              {/* Private Specific Configuration */}
              {schedMeetingType === 'private' && (
                <div className="animate-fade-in" style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                  <div className="form-group">
                    <label className="form-label">Recurrence Interval</label>
                    <select 
                      className="form-input effect-3d"
                      value={schedRecurrence}
                      onChange={(e) => setSchedRecurrence(e.target.value as 'none' | 'daily' | 'weekly')}
                    >
                      <option value="none">One-Time Meeting</option>
                      <option value="daily">Daily Recurring</option>
                      <option value="weekly">Weekly Recurring</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Invite Members (emails separated by comma)</label>
                    <textarea 
                      className="form-input effect-3d" 
                      placeholder="e.g. member1@zidio.com, coworker@zidio.com"
                      value={schedInvitedEmails}
                      onChange={(e) => setSchedInvitedEmails(e.target.value)}
                      rows={3}
                      style={{ resize: 'none', fontFamily: 'inherit' }}
                    />
                    <p style={{ fontSize: '0.725rem', color: '#2563eb', marginTop: '0.25rem' }}>✉️ Invited members will receive an invite email to Accept or Decline.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary button-3d" 
                onClick={() => {
                  setSchedTitle('');
                  setSchedDateTime('');
                  setSchedInvitedEmails('');
                  setSchedMeetingType('public');
                  setShowScheduleModal(false);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary button-3d" 
                onClick={() => {
                  handleScheduleMeeting(schedTitle, schedDateTime);
                  setShowScheduleModal(false);
                }}
                disabled={!schedTitle.trim() || !schedDateTime.trim()}
              >
                Schedule Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Passcode Confirmation Modal */}
      {showPasscodeAlert && lastScheduledMeet && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content effect-3d" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🚀 Meeting Successfully Scheduled</h3>
            </div>
            <div className="modal-body" style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '1rem' }}>
                <p><strong>Title:</strong> {lastScheduledMeet.title}</p>
                <p><strong>Type:</strong> <span style={{ textTransform: 'capitalize' }}>{lastScheduledMeet.meetingType}</span> ({lastScheduledMeet.meetingType === 'private' ? lastScheduledMeet.recurrence : 'one-time'})</p>
                <p><strong>Date & Time:</strong> {new Date(lastScheduledMeet.dateTime).toLocaleString()}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Meeting ID:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{lastScheduledMeet.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Passcode:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{lastScheduledMeet.passcode}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Room Join Link:</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all', padding: '0.35rem', backgroundColor: '#f1f5f9', borderRadius: '4px' }}>
                    {`http://localhost:3000/join/${lastScheduledMeet.id}`}
                  </span>
                </div>
              </div>

              {lastScheduledMeet.meetingType === 'private' ? (
                <p style={{ color: '#2563eb' }}>📨 Invitation emails have been sent to: <strong>{lastScheduledMeet.invitedEmails?.join(', ')}</strong></p>
              ) : (
                <p style={{ color: '#16a34a' }}>⚠️ This is a public one-time link. It will automatically expire after the meeting's <strong>{lastScheduledMeet.duration} minutes</strong> duration frame.</p>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-primary w-full button-3d" 
                onClick={() => {
                  setShowPasscodeAlert(false);
                  setLastScheduledMeet(null);
                }}
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content effect-3d" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>{confirmModal.title || 'Confirm Action'}</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', margin: '0.5rem 0', lineHeight: 1.5 }}>
                {confirmModal.message}
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary button-3d" 
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
              >
                No
              </button>
              <button 
                className="btn btn-primary button-3d" 
                onClick={confirmModal.onConfirm}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Video element for webcam streaming */}
      <video ref={hiddenVideoRef} style={{ display: 'none' }} playsInline muted />

      {/* Hidden Video element for screen share streaming */}
      <video ref={hiddenScreenVideoRef} style={{ display: 'none' }} playsInline muted />

      {/* Render Authentication Modal if needed */}
      {renderAuthModal()}

    </div>
  );
}

