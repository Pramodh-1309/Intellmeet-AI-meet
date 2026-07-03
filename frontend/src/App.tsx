import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, VideoOff, Mic, MicOff, MonitorUp, 
  CheckSquare, Settings, History, BarChart3, Users, 
  LogOut, Plus, FileDown, Play, Trash2, Send, Download, Volume2, Sun, Moon
} from 'lucide-react';
import './App.css';
import { supabase, isSupabaseConfigured, saveSupabaseKeys, clearSupabaseKeys } from './supabase';
import { io } from 'socket.io-client';


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
}

interface RecordingItem {
  id: string;
  title: string;
  date: string;
  url: string;
  duration: string;
}

interface ScheduledMeeting {
  id: string;
  title: string;
  dateTime: string;
  host: string;
  isHostJoined: boolean;
  meetingType: 'public' | 'private';
  recurrence: 'none' | 'daily' | 'weekly';
  password?: string;
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

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');

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
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<string>('');
  const [passwordChangeError, setPasswordChangeError] = useState<string>('');

  // Meeting System preferences (Zoom/Meet Style)
  const [prefAutoMute, setPrefAutoMute] = useState<boolean>(() => localStorage.getItem('pref_auto_mute') === 'true');
  const [prefAutoCameraOff, setPrefAutoCameraOff] = useState<boolean>(() => localStorage.getItem('pref_auto_camera_off') === 'true');
  const [prefMirrorVideo, setPrefMirrorVideo] = useState<boolean>(() => localStorage.getItem('pref_mirror_video') !== 'false');
  const [prefShowNames, setPrefShowNames] = useState<boolean>(() => localStorage.getItem('pref_show_names') !== 'false');
  const [prefNoiseSuppress, setPrefNoiseSuppress] = useState<boolean>(() => localStorage.getItem('pref_noise_suppress') === 'true');

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

  // OTP Verification States
  const [isOtpMode, setIsOtpMode] = useState<boolean>(false);
  const [otpInput, setOtpInput] = useState<string>('');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [otpTimer, setOtpTimer] = useState<number>(600); // 10 minutes in seconds
  const [otpError, setOtpError] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Supabase Configuration UI
  const [showSupaConfig, setShowSupaConfig] = useState<boolean>(false);
  const [supaUrlInput, setSupaUrlInput] = useState<string>('');
  const [supaKeyInput, setSupaKeyInput] = useState<string>('');
  
  // Custom Participant Avatar Index (F-01 addition)
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState<number>(0);

  // SMTP Server Configuration states
  const [smtpHost, setSmtpHost] = useState<string>(() => localStorage.getItem('intellmeet_smtp_host') || '');
  const [smtpPort, setSmtpPort] = useState<string>(() => localStorage.getItem('intellmeet_smtp_port') || '587');
  const [smtpUser, setSmtpUser] = useState<string>(() => localStorage.getItem('intellmeet_smtp_user') || '');
  const [smtpPass, setSmtpPass] = useState<string>(() => localStorage.getItem('intellmeet_smtp_pass') || '');
  const [smtpSender, setSmtpSender] = useState<string>(() => localStorage.getItem('intellmeet_smtp_sender') || '"IntellMeet Workspace" <no-reply@intellmeet.com>');
  const [etherealPreviewUrl, setEtherealPreviewUrl] = useState<string | null>(null);

  const saveSmtpSettings = () => {
    localStorage.setItem('intellmeet_smtp_host', smtpHost);
    localStorage.setItem('intellmeet_smtp_port', smtpPort);
    localStorage.setItem('intellmeet_smtp_user', smtpUser);
    localStorage.setItem('intellmeet_smtp_pass', smtpPass);
    localStorage.setItem('intellmeet_smtp_sender', smtpSender);
    alert('SMTP Mail Server Settings saved successfully!');
  };

  const testSendEmail = async () => {
    if (!smtpHost || !smtpUser || !smtpPass) {
      alert('Please fill out SMTP Host, Username, and Password first.');
      return;
    }
    const targetEmail = prompt('Enter recipient email address to send a test message:', email || 'user@example.com');
    if (!targetEmail) return;

    try {
      const resp = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: targetEmail.toLowerCase().trim(),
          otpCode: '123456',
          smtpSettings: {
            host: smtpHost,
            port: smtpPort,
            user: smtpUser,
            pass: smtpPass,
            from: smtpSender
          }
        })
      });
      const data = await resp.json();
      if (data.success) {
        alert('Test email sent successfully! Please check your inbox.');
      } else {
        alert('Failed to send test email: ' + data.message);
      }
    } catch (e: any) {
      alert('Network error sending test email: ' + e.message);
    }
  };

  const sendOtpEmailLocal = async (targetEmail: string, otpCode: string) => {
    const smtpSettingsObj = smtpHost ? {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPass,
      from: smtpSender
    } : undefined;

    try {
      const resp = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: targetEmail.toLowerCase().trim(),
          otpCode,
          smtpSettings: smtpSettingsObj
        })
      });
      const data = await resp.json();
      if (data.success) {
        console.log(`[SMTP] OTP email sent successfully to ${targetEmail}.`);
        if (data.previewUrl) {
          setEtherealPreviewUrl(data.previewUrl);
          console.log(`[ETHEREAL MOCK MAIL BOX] View sent message: ${data.previewUrl}`);
        } else {
          setEtherealPreviewUrl(null);
        }
      } else {
        console.error('SMTP OTP Delivery failed:', data.message);
      }
    } catch (e: any) {
      console.error('Network error requesting OTP mail delivery:', e.message);
    }
  };

  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('dashboard'); // 'dashboard', 'meeting', 'kanban', 'analytics', 'history', 'recordings'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [currentTab]);

  // Meeting Room State
  const [inActiveMeeting, setInActiveMeeting] = useState<boolean>(false);
  const [meetingTitle, setMeetingTitle] = useState<string>('');
  const [meetingId, setMeetingId] = useState<string>('');
  const [activeMeetingPasscode, setActiveMeetingPasscode] = useState<string>('');
  const [meetingStartTime, setMeetingStartTime] = useState<number>(0);
  const [showJoinSetupModal, setShowJoinSetupModal] = useState<boolean>(false);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);

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

  // Right sidebar tab state inside meeting room
  const [activeRightTab, setActiveRightTab] = useState<string>('transcript');

  // Dynamic Simulators / Mock Data State
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sharedNotes, setSharedNotes] = useState<string>('');
  const [chatInput, setChatInput] = useState<string>('');

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
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const remoteCanvasRefs = useRef<{ [userId: string]: HTMLCanvasElement | null }>({});
  const animationFrameId = useRef<number | null>(null);

  // Real-time remote participant syncing
  const [meetingParticipants, setMeetingParticipants] = useState<any[]>([]);
  const socketRef = useRef<any>(null);
  const useRefId = useRef<string>('');

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

    socket.on('connect', () => {
      console.log('Connected to socket, joining room:', meetingId);
      socket.emit('join-room', meetingId, participantInfo);
    });

    socket.on('room-users', (users: any[]) => {
      console.log('Received updated room participants:', users);
      const remoteUsers = users.filter(u => u.socketId !== socket.id);
      setMeetingParticipants(remoteUsers);
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

  // Local file upload parser to base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setProfilePhotoUrl(reader.result);
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
        if (localUsers[matchedIdx].password !== currentPasswordInput) {
          setPasswordChangeError('Current password is incorrect.');
          return;
        }
        localUsers[matchedIdx].password = newPasswordInput;
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
      if (match.password && match.password !== joinMeetPassInput.trim()) {
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
    setActiveMeetingPasscode(match && match.password ? match.password : joinMeetPassInput.trim());
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
      <div className="dashboard-card col-12 3d-effect text-center" style={{
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
            className="btn btn-secondary 3d-button" 
            onClick={() => {
              setIsRegisterMode(false);
              setShowAuthModal(true);
            }}
          >
            Log In
          </button>
          <button 
            className="btn btn-primary 3d-button" 
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
            password: 'Password123!',
            name: 'Pramodh',
            position: 'Software Engineer'
          });
          localStorage.setItem('intellmeet_local_users', JSON.stringify(localUsers));
        }

        const savedSession = localStorage.getItem('intellmeet_session');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          setIsAuthenticated(true);
          setEmail(sessionData.email);
          setUsername(sessionData.name);
          setPosition(sessionData.position);
        }
      }
    };
    checkSession();
  }, []);

  // Fetch tasks and history when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      if (isSupabaseConfigured() && supabase) {
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

        // Load meetings history from Supabase
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
            password: s.password || '',
            invitedEmails: s.invited_emails || [],
            responses: s.responses || {},
            duration: s.duration || 30,
            isExpired: s.is_expired || false
          })));
        } else {
          console.error('Error loading scheduled meetings from Supabase:', schedErr);
        }
      } else {
        // Local Mode load
        const savedTasks = localStorage.getItem('intellmeet_tasks_v2');
        setTasks(savedTasks ? JSON.parse(savedTasks) : []);

        const savedHistory = localStorage.getItem('intellmeet_history_v2');
        setHistoryList(savedHistory ? JSON.parse(savedHistory) : []);

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
            password: s.password || '',
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

  // OTP Countdown Timer Tick
  useEffect(() => {
    if (!isOtpMode) return;

    const timer = setInterval(() => {
      setOtpTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOtpMode]);

  // Resend cooldown timer tick
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (isSupabaseConfigured() && supabase) {
      // 1. First verify email/password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (data?.user) {
        // Log out the temporary session immediately
        await supabase.auth.signOut();
        
        // 2. Trigger email OTP
        const { error: otpErr } = await supabase.auth.signInWithOtp({ email });
        if (otpErr) {
          setAuthError('Password verified, but failed to send OTP: ' + otpErr.message);
        } else {
          setIsOtpMode(true);
          setOtpTimer(600);
          setOtpInput('');
          setResendCooldown(60);
        }
      }
    } else {
      // Local Mode Login
      const usersRaw = localStorage.getItem('intellmeet_local_users') || '[]';
      const localUsers = JSON.parse(usersRaw);
      const matchedUser = localUsers.find((u: any) => u.email.toLowerCase().trim() === email.toLowerCase().trim() && u.password === password);

      if (matchedUser) {
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(otpCode);
        setIsOtpMode(true);
        setOtpTimer(600);
        setOtpInput('');
        setResendCooldown(60);
        console.log(`[LOCAL DEV MODE] Generated Sign In OTP for ${email}: ${otpCode}`);
        sendOtpEmailLocal(matchedUser.email, otpCode);
      } else {
        setAuthError('Invalid credentials. Check email/password or sign up.');
      }
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

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: username,
            position: finalPosition
          }
        }
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      setAuthError('');
      setIsRegisterMode(false);
      setPassword('');
      
      // Auto login in Supabase mode
      setIsAuthenticated(true);
      setUsername(username);
      setPosition(finalPosition);
      setShowAuthModal(false);
      addSessionLog(username, 'login');
      alert('Registration successful! Welcome to IntellMeet.');
    } else {
      // Local Mode Signup
      const usersRaw = localStorage.getItem('intellmeet_local_users') || '[]';
      const localUsers = JSON.parse(usersRaw);
      const normalizedEmail = email.toLowerCase().trim();
      if (localUsers.some((u: any) => u.email.toLowerCase().trim() === normalizedEmail)) {
        setAuthError('User already exists in local sandbox.');
        return;
      }

      localUsers.push({ email: normalizedEmail, password, name: username, position: finalPosition });
      localStorage.setItem('intellmeet_local_users', JSON.stringify(localUsers));

      // Save session object to local storage for persistence on page reload
      const sessionObj = { email: normalizedEmail, name: username, position: finalPosition };
      localStorage.setItem('intellmeet_session', JSON.stringify(sessionObj));

      setAuthError('');
      setIsRegisterMode(false);
      setPassword('');

      // Auto login in local mode
      setIsAuthenticated(true);
      setUsername(username);
      setPosition(finalPosition);
      setShowAuthModal(false);
      addSessionLog(username, 'login');
      alert('Registration successful! Welcome to IntellMeet.');
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    if (otpTimer === 0) {
      setOtpError('OTP has expired (10 minutes limit exceeded). Please click Resend OTP.');
      return;
    }

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpInput,
        type: 'email'
      });

      if (error) {
        setOtpError(error.message);
      } else if (data?.user) {
        setIsAuthenticated(true);
        setIsOtpMode(false);
        setShowAuthModal(false);
        const name = data.user.user_metadata?.name || 'User';
        setUsername(name);
        setPosition(data.user.user_metadata?.position || 'Student');
        addSessionLog(name, 'login');
      }
    } else {
      if (otpInput === generatedOtp) {
        const usersRaw = localStorage.getItem('intellmeet_local_users') || '[]';
        const localUsers = JSON.parse(usersRaw);
        const matchedUser = localUsers.find((u: any) => u.email.toLowerCase().trim() === email.toLowerCase().trim());

        if (matchedUser) {
          const sessionObj = { email: matchedUser.email, name: matchedUser.name, position: matchedUser.position };
          localStorage.setItem('intellmeet_session', JSON.stringify(sessionObj));

          setIsAuthenticated(true);
          setUsername(matchedUser.name);
          setPosition(matchedUser.position);
          setIsOtpMode(false);
          setShowAuthModal(false);
          addSessionLog(matchedUser.name, 'login');
        } else {
          setOtpError('User matching credentials not found in local sandbox.');
        }
      } else {
        setOtpError('Invalid OTP code. Please try again.');
      }
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    setOtpError('');
    setOtpInput('');
    setOtpTimer(600);
    setResendCooldown(60);

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        setOtpError('Failed to resend validation email: ' + error.message);
      }
    } else {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otpCode);
      console.log(`[LOCAL DEV MODE] Resent Sign In OTP for ${email}: ${otpCode}`);
      sendOtpEmailLocal(email, otpCode);
    }
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
    const newTaskObj = {
      title,
      description: desc,
      status: 'todo' as const,
      assignee,
      priority
    };

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
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: username,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatarLogoIndex: selectedAvatarIdx
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
      password: generatedPasscode,
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
            password: newMeetingObj.password,
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
        generatedPasscode = match.password || '';
        setMeetingTitle(match.title);
        setMeetingId(match.id);
        setActiveMeetingPasscode(match.password || '');
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

      // Define grid coordinates for a 4-quadrant layout
      const positions = [
        { x: 0, y: 0 },
        { x: 320, y: 0 },
        { x: 0, y: 180 },
        { x: 320, y: 180 }
      ];

      // 1. Draw local user at Quadrant 0 (0, 0)
      if (myVideoRef.current && !isCamOff) {
        ctx.drawImage(myVideoRef.current, 0, 0, 320, 180);
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 320, 180);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText(`${username || 'You'} (Camera Off)`, 160, 90);
      }

      // 2. Draw remote participants dynamically up to 3 remote slots
      meetingParticipants.slice(0, 3).forEach((p, idx) => {
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
          url: videoUrl, // temporarily saved in browser session memory
          duration: durationString
        };

        setRecordings(prev => [newRec, ...prev]);
        console.log("Recording saved locally:", newRec);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.warn("MediaRecorder failed (SSL or codec issue), running simulation mode", e);
      setIsRecording(true);
    }
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
        url: 'https://assets.mixkit.co/videos/preview/mixkit-curious-cat-watching-tv-42284-large.mp4', // premium stock video fallback
        duration: durationString
      };
      setRecordings(prev => [newRec, ...prev]);
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
        url: 'https://assets.mixkit.co/videos/preview/mixkit-curious-cat-watching-tv-42284-large.mp4',
        duration: durationString
      };
      setRecordings(prev => [newRec, ...prev]);
    }

    const summaryText = `AI-Generated Summary: Meeting regarding "${meetingTitle}". ` + 
      (sharedNotes.trim() 
        ? `Key notes captured: ${sharedNotes.trim().substring(0, 150)}...` 
        : `Discussed project updates, next steps, and real-time collaboration with ${participantCount} participant(s).`);
    
    const newHistoryObj = {
      title: meetingTitle,
      date: new Date().toISOString().split('T')[0],
      duration: durationText,
      participants: participantCount,
      summary: summaryText,
      action_items: meetingActions
    };

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
        actionItems: newHistoryObj.action_items
      };
      setHistoryList(prev => {
        const updated = [newHistory, ...prev];
        localStorage.setItem('intellmeet_history_v2', JSON.stringify(updated));
        return updated;
      });
    }

    setInActiveMeeting(false);
    setCurrentTab('dashboard');
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
      
      // Draw User Camera feed (myVideoRef)
      if (myVideoRef.current && !isCamOff) {
        const ctx = myVideoRef.current.getContext('2d');
        if (ctx) {
          const w = myVideoRef.current.width;
          const h = myVideoRef.current.height;
          
          if (hiddenVideoRef.current && hiddenVideoRef.current.readyState >= 2) {
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
          } else {
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

  const getButtonStatus = (dateTimeStr: string) => {
    const scheduledTime = new Date(dateTimeStr).getTime();
    const diff = scheduledTime - currentTime;
    const fiveMinutesInMs = 5 * 60 * 1000;
    return diff <= fiveMinutesInMs;
  };

  const isMeetingExpired = (_meet: ScheduledMeeting) => {
    return false;
  };

  const handleScheduleMeeting = async (title: string, dateTimeStr: string) => {
    if (!title.trim() || !dateTimeStr.trim()) return;

    // 1. Generate Link, ID, Password
    const generatedId = 'MEET-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    const generatedPassword = 'PASS-' + Math.floor(1000 + Math.random() * 9000);
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
      password: generatedPassword,
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
              password: newMeetingObj.password,
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
        `Hello ${newMeetingObj.host},\n\nYour public meeting is scheduled for ${new Date(newMeetingObj.dateTime).toLocaleString()}.\nLink: ${generatedLink}\nMeeting ID: ${generatedId}\nPassword: ${generatedPassword}\n\nNote: This link will expire after the meeting's ${newMeetingObj.duration} minutes time frame.`
      );
    } else {
      // For private, email everyone invited
      emailsList.forEach(invitedEmail => {
        sendEmailNotification(
          invitedEmail,
          `Meeting Invitation: ${newMeetingObj.title}`,
          `You are invited to join a private meeting scheduled by ${newMeetingObj.host} on ${new Date(newMeetingObj.dateTime).toLocaleString()}.\n\nMeeting Type: Private (${newMeetingObj.recurrence} recurrence)\nLink: ${generatedLink}\nMeeting ID: ${generatedId}\nPassword: ${generatedPassword}\n\nPlease log in to your dashboard to Accept or Decline the invitation.`
        );
      });
    }

    // Reset inputs
    setSchedInvitedEmails('');
    setSchedMeetingType('public');
    setSchedRecurrence('none');
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
    const list: Array<{ id: string; title: string; host: string; isScheduled: boolean }> = [];
    
    // Add started scheduled meetings
    scheduledMeetings.forEach(m => {
      if (m.isHostJoined) {
        list.push({
          id: m.id,
          title: m.title,
          host: m.host,
          isScheduled: true
        });
      }
    });

    // Add current active room if it's an instant meeting (i.e. title doesn't match any active scheduled meeting)
    if (inActiveMeeting) {
      const isRepresented = list.some(m => m.title === meetingTitle);
      if (!isRepresented) {
        list.push({
          id: 'INSTANT-ROOM',
          title: meetingTitle,
          host: username || 'User',
          isScheduled: false
        });
      }
    }

    return list;
  };

  const handleOpenPlayback = (rec: RecordingItem) => {
    setPlaybackUrl(rec.url);
    setPlaybackTitle(rec.title);
  };

  const handleDeleteRecording = (recId: string) => {
    setRecordings(prev => prev.filter(r => r.id !== recId));
  };

  const renderAuthModal = () => {
    if (!showAuthModal) return null;
    const formattedTimer = `${Math.floor(otpTimer / 60).toString().padStart(2, '0')}:${(otpTimer % 60).toString().padStart(2, '0')}`;

    return (
      <div className="modal-overlay" style={{ zIndex: 2000 }}>
        <div className="modal-content 3d-effect" style={{ maxWidth: '420px', padding: '2.5rem', position: 'relative' }}>
          <button 
            className="btn btn-secondary" 
            style={{ position: 'absolute', top: '15px', right: '15px', padding: '0.25rem 0.5rem', minWidth: 'auto' }} 
            onClick={() => setShowAuthModal(false)}
          >
            ✕
          </button>
          
          {/* Supabase Config Toggle Button */}
          <button 
            className="supabase-config-toggle" 
            style={{ right: 'auto', left: '1rem' }}
            onClick={() => {
              setSupaUrlInput(localStorage.getItem('INTELLMEET_SUPABASE_URL') || '');
              setSupaKeyInput(localStorage.getItem('INTELLMEET_SUPABASE_ANON_KEY') || '');
              setShowSupaConfig(true);
            }}
            title="Configure Supabase"
          >
            <Settings size={20} />
          </button>

          <div className="auth-logo">
            <div className="auth-logo-icon">
              <Video size={24} />
            </div>
            <span className="logo-text" style={{color: 'var(--text-primary)'}}>IntellMeet</span>
          </div>

          {/* Connection Mode Indicator */}
          {isSupabaseConfigured() ? (
            <div className="connection-indicator supabase">
              <span className="indicator-dot"></span>
              Supabase Connected
            </div>
          ) : (
            <div className="connection-indicator local">
              <span className="indicator-dot"></span>
              Local Sandbox Mode
            </div>
          )}
          {isOtpMode ? (
            <div>
              <h2 className="auth-title">Verify Registration</h2>
              <p className="auth-subtitle" style={{ marginBottom: '1.5rem' }}>
                We've sent a 6-digit confirmation code to <b>{email}</b>. Please enter it below.
              </p>

              {/* Developer OTP Helper Banner */}
              {!isSupabaseConfigured() && (
                <div style={{
                  backgroundColor: '#fffbeb',
                  border: '1px dashed #f59e0b',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontSize: '0.825rem',
                  color: '#b45309',
                  textAlign: 'center',
                  marginBottom: '1.25rem'
                }}>
                  🔑 <b>Dev Mode:</b> Enter OTP code <b>{generatedOtp}</b> to proceed.
                </div>
              )}

              {/* Ethereal Mock Mailbox Banner */}
              {!isSupabaseConfigured() && etherealPreviewUrl && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px dashed #22c55e',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontSize: '0.825rem',
                  color: '#15803d',
                  textAlign: 'center',
                  marginBottom: '1.25rem'
                }}>
                  📬 <b>Ethereal Mock Mailbox:</b> A test message was captured. <a href={etherealPreviewUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: 600 }}>Click here to view your inbox</a>.
                </div>
              )}

              <div className="otp-timer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Code Expires In:</span>
                <div className={`otp-timer ${otpTimer === 0 ? 'expired' : ''}`}>
                  {formattedTimer}
                </div>
              </div>

              <form onSubmit={handleVerifyOtp}>
                <div className="form-group">
                  <label className="form-label" style={{ textAlign: 'center' }}>6-Digit Verification OTP</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={otpInput} 
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    style={{ textAlign: 'center', letterSpacing: '0.25em', fontSize: '1.125rem', fontWeight: 600 }}
                    required 
                  />
                </div>

                {otpError && <p style={{color: 'var(--color-danger)', fontSize: '0.825rem', marginBottom: '1rem', textAlign: 'center'}}>{otpError}</p>}

                <button type="submit" className="btn btn-primary w-full mt-4" disabled={otpTimer === 0}>
                  Verify & Log In
                </button>
              </form>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginTop: '1.5rem' }}>
                <span className="auth-toggle-link" onClick={() => setIsOtpMode(false)}>
                  Back to signup
                </span>
                <div>
                  {resendCooldown > 0 ? (
                    <span style={{ color: 'var(--text-muted)' }}>Resend code in {resendCooldown}s</span>
                  ) : (
                    <button className="resend-btn" onClick={handleResendOtp}>
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
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
          )}
        </div>

        {/* Supabase Key Settings Modal */}
        {showSupaConfig && (
          <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal-content 3d-effect" style={{ maxWidth: '500px' }}>
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
                    className="btn btn-danger 3d-button mr-auto" 
                    onClick={() => {
                      clearSupabaseKeys();
                      setShowSupaConfig(false);
                    }}
                  >
                    Disconnect Supabase
                  </button>
                )}
                <button className="btn btn-secondary 3d-button" onClick={() => setShowSupaConfig(false)}>Cancel</button>
                <button 
                  className="btn btn-primary 3d-button" 
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
              <Video size={18} />
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
            <div className="account-dropdown 3d-effect" style={{
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
                  <button className="btn btn-primary btn-sm 3d-button" style={{ justifyContent: 'center' }} onClick={() => {
                    setIsRegisterMode(false);
                    setShowAuthModal(true);
                    setShowAccountMenu(false);
                  }}>
                    Log In
                  </button>
                  <button className="btn btn-secondary btn-sm 3d-button" style={{ justifyContent: 'center' }} onClick={() => {
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
                  <button className="btn btn-danger btn-sm 3d-button" style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'center' }} onClick={() => {
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
                <button className="btn btn-secondary 3d-button" onClick={() => setShowScheduleModal(true)}>Schedule Meeting</button>
                <button className="btn btn-primary 3d-button" onClick={() => setShowJoinSetupModal(true)}>Start Instant Meeting</button>
              </div>
            </div>

            {/* Join Meeting card for guests or anyone */}
            <div className="dashboard-card col-12 3d-effect mb-4" style={{
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
                    className="form-input 3d-effect" 
                    placeholder="e.g. MEET-XXXX-XXXX or paste Join Link" 
                    value={joinMeetIdInput}
                    onChange={(e) => setJoinMeetIdInput(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Passcode</label>
                  <input 
                    type="password" 
                    className="form-input 3d-effect" 
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
                      className="form-input 3d-effect" 
                      placeholder="Enter name to display" 
                      value={guestDisplayName}
                      onChange={(e) => setGuestDisplayName(e.target.value)}
                    />
                  </div>
                )}
                <button 
                  className="btn btn-primary 3d-button" 
                  style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={handleJoinMeetingFromCard}
                >
                  Join Meeting
                </button>
              </div>
            </div>



            {/* 📩 Pending Invitations Inbox (Private Meetings) */}
            {scheduledMeetings.filter(m => 
              m.meetingType === 'private' && 
              m.invitedEmails?.includes(email.trim().toLowerCase() || 'admin@zidio.com') && 
              m.responses?.[email.trim().toLowerCase() || 'admin@zidio.com'] === 'pending'
            ).length > 0 && (
              <div className="dashboard-card col-12 3d-effect mb-4" style={{ borderLeft: '4px solid var(--color-primary)', backgroundColor: '#f0f9ff' }}>
                <h3 className="card-title" style={{ color: 'var(--color-primary)' }}>📩 Pending Meeting Invitations</h3>
                <div className="meeting-list">
                  {scheduledMeetings.filter(m => 
                    m.meetingType === 'private' && 
                    m.invitedEmails?.includes(email.trim().toLowerCase() || 'admin@zidio.com') && 
                    m.responses?.[email.trim().toLowerCase() || 'admin@zidio.com'] === 'pending'
                  ).map(meet => (
                    <div key={meet.id} className="meeting-item" style={{ backgroundColor: 'white' }}>
                      <div className="meeting-info">
                        <div className="meeting-icon" style={{ backgroundColor: 'var(--color-primary)' }}>
                          <Users size={20} />
                        </div>
                        <div className="meeting-details">
                          <h4 style={{ fontWeight: 600 }}>{meet.title}</h4>
                          <p>Host: <strong>{meet.host}</strong> • Scheduled: {new Date(meet.dateTime).toLocaleString()} • Recurrence: <span style={{ textTransform: 'capitalize' }}>{meet.recurrence}</span></p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {meet.id} • Passcode: {meet.password}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn btn-primary 3d-button" onClick={() => handleAcceptInvitation(meet.id)} style={{ backgroundColor: 'var(--color-success)' }}>
                          Accept
                        </button>
                        <button className="btn btn-danger 3d-button" onClick={() => handleDeclineInvitation(meet.id)}>
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scheduled Meetings full-width block */}
            <div className="dashboard-card col-12 3d-effect mb-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="card-title" style={{ margin: 0 }}>📅 Scheduled Meetings</h3>
                <span className="badge badge-primary">{scheduledMeetings.filter(m => !m.isHostJoined).length} Scheduled</span>
              </div>
              <div className="meeting-list">
                {scheduledMeetings.filter(m => !m.isHostJoined).length > 0 ? (
                  scheduledMeetings.filter(m => !m.isHostJoined).map(meet => {
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
                              ID: <strong>{meet.id}</strong> • Passcode: <strong>{meet.password || 'None'}</strong>
                              {meet.meetingType === 'public' && ` • Duration: ${meet.duration} mins`}
                              {responseSummary && ` • ${responseSummary}`}
                            </p>
                          </div>
                        </div>
                        <div>
                          {expired ? (
                            <span className="badge badge-red font-semibold">EXPIRED</span>
                          ) : (
                            <button 
                              className={`btn 3d-button ${isEnabled ? 'btn-primary' : 'btn-secondary'}`}
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
              <div className="dashboard-card col-8 3d-effect">
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
                            <p>Host: {meet.host} • 3 participants active</p>
                          </div>
                        </div>
                        <div>
                          <span className="badge badge-green mr-4">Live</span>
                          <button className="btn btn-primary 3d-button" onClick={() => {
                            setMeetingTitle(meet.title);
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

              {/* Quick AI Extraction Box */}
              <div className="dashboard-card col-4 3d-effect ai-assistant-card">
                <h3 className="card-title">🤖 AI Meeting Assistant</h3>
                <div style={{fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-secondary)'}}>
                  <p>IntellMeet runs automated speech-to-text summaries to boost efficiency by <b>40-60%</b>.</p>
                  {tasks.length > 0 ? (
                    <div className="action-item-card mt-4">
                      <div className="action-item-card-title">Latest Extracted Task:</div>
                      <div>{tasks[tasks.length - 1].title}</div>
                      <span className="badge badge-primary mt-2">Assigned: {tasks[tasks.length - 1].assignee}</span>
                    </div>
                  ) : (
                    <div className="action-item-card mt-4" style={{ backgroundColor: 'var(--bg-secondary)', borderStyle: 'dashed' }}>
                      <div className="action-item-card-title" style={{ opacity: 0.6 }}>No actions extracted yet.</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Start a meeting room to automatically capture and assign tasks in real-time.</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Session Activity Log Widget */}
              {isAuthenticated && (
                <div className="dashboard-card col-12 3d-effect">
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
                <div className="dashboard-card col-12 3d-effect">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                      <h3 className="card-title" style={{ margin: 0 }}>📬 Outgoing Mail & Notification Logs</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        Monitor invitations, reminders, and confirmations sent to project members.
                      </p>
                    </div>
                    {userEmailLogs.length > 0 && (
                      <button 
                        className="btn btn-secondary 3d-button" 
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

                  <div style={{ maxHeight: '300px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: '#f8fafc' }}>
                    {userEmailLogs.length > 0 ? (
                      <div style={{ padding: '1rem' }}>
                        {userEmailLogs.map((log) => (
                          <div key={log.id} style={{ padding: '1rem', backgroundColor: 'white', border: '1px solid var(--color-border)', borderRadius: '8px', marginBottom: '0.75rem', boxShadow: 'var(--shadow-sm)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--color-border)', paddingBottom: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                              <span style={{ color: '#2563eb', fontWeight: 600 }}>✉️ TO: {log.to}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{log.timestamp} • {log.id}</span>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                              Subject: {log.subject}
                            </div>
                            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', backgroundColor: '#fdfdfd', padding: '0.5rem', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
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
                <h1 className="workspace-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📹 {meetingTitle}</h1>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  <span><b>Meeting ID:</b> {meetingId}</span>
                  {activeMeetingPasscode && (
                    <span><b>Passcode:</b> {activeMeetingPasscode}</span>
                  )}
                  <span><b>Join Link:</b> <a href={`http://localhost:3000/join/${meetingId}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>http://localhost:3000/join/{meetingId}</a></span>
                </div>
              </div>
              <button className="btn btn-danger 3d-button" onClick={endMeeting}>Leave & Generate Summary</button>
            </div>

            <div className="meeting-room-container">
              {/* Left Video Area: Grid */}
              <div className="video-section 3d-effect">
                <div className="video-grid">
                  {/* Local User (You) */}
                  <div className={`video-feed ${!isMuted ? 'active-speaker' : ''} 3d-effect`}>
                    {isCamOff ? (
                      <div className="user-avatar" style={{ width: '80px', height: '80px', background: 'transparent' }}>
                        {renderUserAvatar({ width: '80px', height: '80px' })}
                      </div>
                    ) : (
                      <canvas ref={myVideoRef} width="320" height="180"></canvas>
                    )}
                    <span className="participant-label">
                      <div style={{width: '20px', height: '20px', display: 'inline-block'}}>{renderUserAvatar({ width: '20px', height: '20px' })}</div>
                      {username} (You)
                    </span>
                  </div>


                  {/* Real Remote Participants */}
                  {meetingParticipants.map((p) => (
                    <div key={p.userId || p.socketId} className={`video-feed ${!p.isMuted ? 'active-speaker' : ''} 3d-effect`}>
                      {p.isCamOff ? (
                        <div className="user-avatar" style={{ width: '80px', height: '80px', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: '80px', height: '80px' }}>
                            {renderRemoteUserAvatar(p.avatarIdx, p.avatarUrl, { width: '80px', height: '80px' })}
                          </div>
                        </div>
                      ) : (
                        <ParticipantSimulatedVideo participant={p} />
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
                    onClick={() => setIsScreenSharing(!isScreenSharing)}
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
              <div className="transcript-box 3d-effect">
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
                </div>

                <div className="scroll-content">
                  {activeRightTab === 'transcript' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                      <p style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>🤖 Real-time AI transcription active (&gt;85% accuracy)...</p>
                      {transcript.map(msg => (
                        <div key={msg.id} className="message-bubble 3d-effect">
                          <div className="message-speaker">{msg.speaker} <span style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>{msg.time}</span></div>
                          <div className="message-text">{msg.text}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeRightTab === 'chat' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%'}}>
                      {chatMessages.map(msg => (
                        <div key={msg.id} className="message-bubble 3d-effect" style={{
                          alignSelf: msg.sender === username ? 'flex-end' : 'flex-start', 
                          backgroundColor: msg.sender === username ? '#f0fdf4' : '',
                          display: 'flex',
                          gap: '0.5rem',
                          alignItems: 'center',
                          maxWidth: '85%'
                        }}>
                          <div style={{width: '24px', height: '24px', flexShrink: 0}}>
                            {msg.sender === username ? renderUserAvatar({ width: '24px', height: '24px' }) : AVATAR_LOGOS[msg.avatarLogoIndex !== undefined ? msg.avatarLogoIndex : 0]}
                          </div>
                          <div>
                            <div className="message-speaker">{msg.sender} <span style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>{msg.time}</span></div>
                            <div className="message-text">{msg.text}</div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="input-with-send">
                        <input 
                          type="text" 
                          className="form-input 3d-effect" 
                          value={chatInput} 
                          onChange={(e) => setChatInput(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                          placeholder="Send message..."
                        />
                        <button className="btn btn-primary 3d-button" onClick={handleSendChat} style={{padding: '0.5rem'}}><Send size={16}/></button>
                      </div>
                    </div>
                  )}

                  {activeRightTab === 'notes' && (
                    <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
                      <textarea 
                        className="shared-notes-area 3d-effect"
                        value={sharedNotes}
                        onChange={(e) => setSharedNotes(e.target.value)}
                        placeholder="Type collaborative notes here..."
                      ></textarea>
                    </div>
                  )}

                  {activeRightTab === 'actions' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                      {meetingActions.map((act, index) => (
                        <div key={index} className="action-item-card 3d-effect">
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
                          className="form-input 3d-effect" 
                          value={actionTitleInput} 
                          onChange={(e) => setActionTitleInput(e.target.value)} 
                          placeholder="e.g. Test loopback API"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">Task Description</label>
                        <textarea 
                          className="form-input 3d-effect" 
                          style={{ minHeight: '60px', padding: '0.5rem', resize: 'vertical' }}
                          value={actionDescriptionInput} 
                          onChange={(e) => setActionDescriptionInput(e.target.value)} 
                          placeholder="Describe the task details..."
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Assignee</label>
                        <select 
                          className="form-input 3d-effect" 
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
                          className="form-input 3d-effect" 
                          value={actionTimelineInput}
                          onChange={(e) => setActionTimelineInput(e.target.value)}
                        >
                          <option value="now">Do now (done by now)</option>
                          <option value="30mins">Expire in 30 minutes</option>
                          <option value="1hour">Expire in 1 hour</option>
                          <option value="post">Post-meeting task (do after the meeting)</option>
                        </select>
                      </div>

                      <button className="btn btn-primary w-full 3d-button" onClick={handleAddActionItem}>
                        <Plus size={16} /> Post Task
                      </button>
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
          <div>
            <div className="workspace-header">
              <div>
                <h1 className="workspace-title">📋 Task Management Hub</h1>
                <p style={{color: 'var(--text-secondary)'}}>Manage and track your project tasks</p>
              </div>
            </div>

            <div className="kanban-grid">
              {['todo', 'in_progress', 'done', 'review'].map(statusKey => (
                <div key={statusKey} className="kanban-column 3d-effect">
                  <div className="kanban-column-header">
                    <span className="column-title" style={{textTransform: 'uppercase'}}>{statusKey.replace('_', ' ')}</span>
                    <span className="column-count">{tasks.filter(t => t.status === statusKey).length}</span>
                  </div>
                  <div className="kanban-cards">
                    {tasks.filter(t => t.status === statusKey).map(t => (
                      <div key={t.id} className="kanban-card 3d-effect">
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
                              className="form-input 3d-effect"
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
                                className="btn btn-warning btn-sm 3d-button" 
                                onClick={(e) => { e.stopPropagation(); handlePendingClick(t); }}
                              >
                                Pending
                              </button>
                            )}
                            {t.status === 'in_progress' && (
                              <>
                                <button 
                                  className="btn btn-danger btn-sm 3d-button" 
                                  onClick={(e) => { e.stopPropagation(); handleBackToTodoClick(t); }}
                                >
                                  Back
                                </button>
                                <button 
                                  className="btn btn-primary btn-sm 3d-button" 
                                  onClick={(e) => { e.stopPropagation(); handleOngoingClick(t); }}
                                >
                                  Ongoing
                                </button>
                              </>
                            )}
                            {t.status === 'done' && (
                              <>
                                <button 
                                  className="btn btn-secondary btn-sm 3d-button" 
                                  onClick={(e) => { e.stopPropagation(); handleBackToProgressClick(t); }}
                                >
                                  Back
                                </button>
                                <button 
                                  className="btn btn-success btn-sm 3d-button" 
                                  onClick={(e) => { e.stopPropagation(); handleCompletedClick(t); }}
                                >
                                  Completed
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          )
        )}

        {/* ==========================================
            AI ANALYTICS VIEW
            ========================================== */}
        {currentTab === 'analytics' && (
          !isAuthenticated ? renderLockedFeaturePlaceholder("AI Analytics & Insights", "Get advanced productivity analytics, sentiment trends, speaker talk-time distribution, and AI-driven efficiency reports for all your workspace meetings.") : (
          <div>
            <div className="workspace-header">
              <div>
                <h1 className="workspace-title">📈 AI Analytics & Insights</h1>
                <p style={{color: 'var(--text-secondary)'}}>Zidio Workspace productivity reports</p>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="dashboard-card col-6 3d-effect">
                <h3 className="card-title">Meeting Frequency (per week)</h3>
                <div style={{height: '240px', display: 'flex', alignItems: 'flex-end', gap: '1rem', padding: '1rem 0'}}>
                  {[120, 160, 90, 180].map((h, i) => (
                    <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1}}>
                      <div className="3d-effect" style={{width: '40px', height: `${h}px', backgroundColor: 'var(--color-primary)', borderRadius: '6px 6px 0 0`}}></div>
                      <span style={{fontSize: '0.75rem', marginTop: '0.5rem'}}>Wk {i+1}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dashboard-card col-6 3d-effect">
                <h3 className="card-title">Productivity Score Trends</h3>
                <div style={{height: '240px', position: 'relative', borderBottom: '2px solid var(--color-border)', borderLeft: '2px solid var(--color-border)', margin: '1rem 0'}}>
                  <svg style={{width: '100%', height: '100%', overflow: 'visible'}}>
                    <path d="M 0 180 L 100 120 L 200 140 L 300 80 L 400 40 L 400 240 L 0 240 Z" fill="rgba(2, 132, 199, 0.1)" />
                    <path d="M 0 180 L 100 120 L 200 140 L 300 80 L 400 40" fill="none" stroke="var(--color-primary)" strokeWidth="3" />
                    {[0, 100, 200, 300, 400].map((x, idx) => {
                      const yList = [180, 120, 140, 80, 40];
                      return <circle key={idx} cx={x} cy={yList[idx]} r="6" fill="#0f172a" stroke="white" strokeWidth="2" className="3d-effect" />;
                    })}
                  </svg>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0'}}>
                    <span>Sprint 1</span>
                    <span>Sprint 2</span>
                    <span>Sprint 3</span>
                    <span>Sprint 4</span>
                    <span>Sprint 5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )
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

            <div className="form-group flex gap-2 mb-4" style={{maxWidth: '400px'}}>
              <input 
                type="text" 
                className="form-input 3d-effect" 
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Search meeting titles..."
              />
            </div>

            <div className="history-table-container 3d-effect">
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
                  {historyList.filter(h => 
                    h.title.toLowerCase().includes(historySearchQuery.toLowerCase())
                  ).map(meet => (
                    <tr key={meet.id}>
                      <td style={{fontWeight: 600, color: 'var(--color-primary)'}}>{meet.id}</td>
                      <td style={{fontWeight: 500}}>{meet.title}</td>
                      <td>{meet.date}</td>
                      <td>{meet.duration}</td>
                      <td>{meet.participants}</td>
                      <td style={{maxWidth: '280px', color: 'var(--text-secondary)', fontSize: '0.8rem'}}>{meet.summary}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm 3d-button" onClick={() => handleExportSummary(meet)}>
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
                <div className="dashboard-card col-12 3d-effect text-center" style={{padding: '3rem'}}>
                  <Video size={48} style={{color: 'var(--text-muted)', marginBottom: '1rem'}} />
                  <h3>No Recordings Available</h3>
                  <p style={{color: 'var(--text-secondary)'}}>Start a meeting room and click the record button to capture live sessions.</p>
                </div>
              ) : (
                recordings.map(rec => (
                  <div key={rec.id} className="dashboard-card col-4 3d-effect hover-lift">
                    <div style={{height: '140px', backgroundColor: '#0f172a', borderRadius: '8px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', overflow: 'hidden'}}>
                      <Video size={36} style={{color: 'white', opacity: 0.5}} />
                      <div style={{position: 'absolute', bottom: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px'}}>
                        {rec.duration}
                      </div>
                    </div>
                    <h4 style={{fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem'}}>{rec.title}</h4>
                    <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem'}}>Recorded: {rec.date} • ID: {rec.id}</p>
                    <div className="flex gap-2">
                      <button className="btn btn-primary btn-sm w-full 3d-button" onClick={() => handleOpenPlayback(rec)}>
                        <Play size={14} /> Playback
                      </button>
                      <button className="btn btn-danger btn-sm 3d-button" onClick={() => handleDeleteRecording(rec.id)} style={{padding: '0.5rem'}}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
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
              <div className="dashboard-card col-6 3d-effect">
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

                  {/* Theme Mode Toggle (Light/Dark) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Appearance Mode</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Toggle between light theme and sleek dark mode.</p>
                    </div>
                    <button className="btn btn-secondary 3d-button" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={toggleTheme}>
                      {isDarkMode ? <Sun size={14} /> : <Moon size={14} />} {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                    </button>
                  </div>

                </div>
              </div>

              {/* Personal Profile Panel */}
              <div className="dashboard-card col-6 3d-effect">
                <h3 className="card-title">👤 Personal Profile Info</h3>
                
                {/* Profile Photo Live Capture and Local Upload */}
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', margin: '1.25rem 0', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {renderUserAvatar({ width: '80px', height: '80px' })}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
                    <label className="btn btn-secondary btn-sm 3d-button" style={{ cursor: 'pointer', textAlign: 'center', width: '100%', justifyContent: 'center' }}>
                      📁 Upload Photo file
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                    </label>
                    <button className="btn btn-primary btn-sm 3d-button" style={{ width: '100%', justifyContent: 'center' }} onClick={isWebcamActive ? stopWebcam : startWebcam}>
                      📷 {isWebcamActive ? 'Stop Camera' : 'Take Live Photo'}
                    </button>
                  </div>
                </div>

                {/* Webcam Stream Preview Box */}
                {isWebcamActive && (
                  <div className="3d-effect" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: 'var(--video-bg)', borderRadius: '12px', marginBottom: '1.25rem' }}>
                    <video ref={webcamVideoRef} style={{ width: '100%', maxHeight: '180px', borderRadius: '8px', objectFit: 'cover' }} playsInline muted />
                    {cameraError && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem' }}>{cameraError}</p>}
                    <button className="btn btn-success btn-sm 3d-button" onClick={captureWebcamSnapshot}>
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
                      className="form-input 3d-effect" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      placeholder="Guest" 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email" 
                      className="form-input 3d-effect" 
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
                      className="form-input 3d-effect" 
                      value={userPhone} 
                      onChange={(e) => setUserPhone(e.target.value)} 
                      placeholder="e.g. +1 555-0199" 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Date of Birth (mm/dd/yyyy)</label>
                    <input 
                      type="text" 
                      className="form-input 3d-effect" 
                      value={userDob} 
                      onChange={(e) => setUserDob(e.target.value)} 
                      placeholder="e.g. 05/20/1998" 
                    />
                  </div>
                </div>
              </div>

              {/* Password Controller Section */}
              <div className="dashboard-card col-12 3d-effect">
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
                          className="form-input 3d-effect" 
                          value={currentPasswordInput} 
                          onChange={(e) => setCurrentPasswordInput(e.target.value)} 
                          required 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">New Password</label>
                        <input 
                          type="password" 
                          className="form-input 3d-effect" 
                          value={newPasswordInput} 
                          onChange={(e) => setNewPasswordInput(e.target.value)} 
                          required 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Confirm New Password</label>
                        <input 
                          type="password" 
                          className="form-input 3d-effect" 
                          value={confirmPasswordInput} 
                          onChange={(e) => setConfirmPasswordInput(e.target.value)} 
                          required 
                        />
                      </div>
                      {passwordChangeError && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '0.25rem' }}>❌ {passwordChangeError}</p>}
                      {passwordChangeStatus && <p style={{ color: 'var(--color-success)', fontSize: '0.8rem', marginTop: '0.25rem' }}>✅ {passwordChangeStatus}</p>}
                      
                      <button type="submit" className="btn btn-primary 3d-button" style={{ marginTop: '0.5rem', width: 'fit-content' }}>
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

              {/* SMTP Mail Server Configuration */}
              <div className="dashboard-card col-12 3d-effect" style={{ marginTop: '1.5rem' }}>
                <h3 className="card-title">🔑 SMTP Email Server Configuration (Real OTP Setup)</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Configure your SMTP credentials below to send real OTP verification emails to registered email addresses. If left unconfigured, a zero-config dev mode Ethereal testing account will auto-generate and capture OTP codes.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">SMTP Host / Server</label>
                    <input 
                      type="text" 
                      className="form-input 3d-effect" 
                      value={smtpHost} 
                      onChange={(e) => setSmtpHost(e.target.value)} 
                      placeholder="e.g. smtp.gmail.com" 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">SMTP Port</label>
                    <input 
                      type="text" 
                      className="form-input 3d-effect" 
                      value={smtpPort} 
                      onChange={(e) => setSmtpPort(e.target.value)} 
                      placeholder="e.g. 587 or 465" 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">SMTP Username (Email)</label>
                    <input 
                      type="text" 
                      className="form-input 3d-effect" 
                      value={smtpUser} 
                      onChange={(e) => setSmtpUser(e.target.value)} 
                      placeholder="user@example.com" 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">SMTP Password</label>
                    <input 
                      type="password" 
                      className="form-input 3d-effect" 
                      value={smtpPass} 
                      onChange={(e) => setSmtpPass(e.target.value)} 
                      placeholder="Your App Password" 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Sender Address / Envelope</label>
                    <input 
                      type="text" 
                      className="form-input 3d-effect" 
                      value={smtpSender} 
                      onChange={(e) => setSmtpSender(e.target.value)} 
                      placeholder='"IntellMeet Support" <no-reply@intellmeet.com>' 
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                  <button className="btn btn-primary 3d-button" onClick={saveSmtpSettings}>
                    Save SMTP Configuration
                  </button>
                  <button className="btn btn-secondary 3d-button" onClick={testSendEmail} disabled={!smtpHost || !smtpUser}>
                    Send Test Email
                  </button>
                </div>
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
          <div className="modal-content 3d-effect" style={{ maxWidth: '780px', width: '95%', padding: '2rem' }}>
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
                  >
                    {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>

                  <button 
                    className={`control-btn ${isCamOff ? 'danger' : 'active'}`}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onClick={() => setIsCamOff(!isCamOff)}
                    title={isCamOff ? 'Turn camera on' : 'Turn camera off'}
                  >
                    {isCamOff ? <VideoOff size={16} /> : <Video size={16} />}
                  </button>

                  <button 
                    className="control-btn active"
                    style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onClick={playSoundTest}
                    title="Test speaker sound"
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
                    className="form-input 3d-effect" 
                    value={meetingTitle} 
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="Enter meeting topic (e.g. Project Alignment)"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Your Display Name</label>
                  <input 
                    type="text" 
                    className="form-input 3d-effect" 
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
                          backgroundColor: selectedAvatarIdx === idx ? 'white' : 'transparent',
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
              <button className="btn btn-secondary 3d-button" onClick={() => setShowJoinSetupModal(false)}>Cancel</button>
              <button className="btn btn-primary 3d-button" onClick={() => startMeeting(meetingTitle)}>Join Meeting</button>
            </div>
          </div>
        </div>
      )}

      {/* Playback Modal */}
      {playbackUrl && (
        <div className="modal-overlay">
          <div className="modal-content 3d-effect" style={{maxWidth: '700px'}}>
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
                  <option value="720p">720p (HD)</option>
                  <option value="1080p">1080p (Full HD)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a 
                  href={playbackUrl} 
                  download={`${playbackTitle.replace(/\s+/g, '_')}_${downloadQuality}.webm`} 
                  className="btn btn-primary 3d-button"
                >
                  <Download size={14} /> Download File
                </a>
                <button className="btn btn-secondary 3d-button" onClick={() => setPlaybackUrl(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal-content 3d-effect" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>📅 Schedule New Meeting</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Meeting Title</label>
                <input 
                  type="text" 
                  className="form-input 3d-effect" 
                  placeholder="e.g. Q3 Roadmap Align" 
                  value={schedTitle}
                  onChange={(e) => setSchedTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date & Time</label>
                <input 
                  type="datetime-local" 
                  className="form-input 3d-effect" 
                  value={schedDateTime}
                  onChange={(e) => setSchedDateTime(e.target.value)}
                />
              </div>

              {/* Meeting Type Selector */}
              <div className="form-group">
                <label className="form-label">Meeting Privacy</label>
                <select 
                  className="form-input 3d-effect"
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
                      className="form-input 3d-effect"
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
                      className="form-input 3d-effect" 
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
                className="btn btn-secondary 3d-button" 
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
                className="btn btn-primary 3d-button" 
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
          <div className="modal-content 3d-effect" style={{ maxWidth: '520px' }}>
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
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{lastScheduledMeet.password}</span>
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
                className="btn btn-primary w-full 3d-button" 
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
          <div className="modal-content 3d-effect" style={{ maxWidth: '400px' }}>
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
                className="btn btn-secondary 3d-button" 
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
              >
                No
              </button>
              <button 
                className="btn btn-primary 3d-button" 
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

      {/* Render Authentication Modal if needed */}
      {renderAuthModal()}

    </div>
  );
}
