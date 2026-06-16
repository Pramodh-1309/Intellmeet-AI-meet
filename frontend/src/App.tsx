import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, VideoOff, Mic, MicOff, MonitorUp, PhoneOff, MessageSquare, 
  FileText, CheckSquare, Settings, History, BarChart3, Users, 
  LogOut, Lock, Plus, Search, FileDown, Play, CheckCircle2, Trash2, Send, Download
} from 'lucide-react';
import './App.css';

// TypeScript Interfaces
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  assignee: string;
  priority: 'low' | 'medium' | 'high';
  meetingId?: string;
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // default true for demo
  const [email, setEmail] = useState<string>('admin@zidio.com');
  const [password, setPassword] = useState<string>('password');
  const [authError, setAuthError] = useState<string>('');
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('John Doe');
  
  // Custom Participant Avatar Index (F-01 addition)
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState<number>(0);

  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('dashboard'); // 'dashboard', 'meeting', 'kanban', 'analytics', 'history', 'recordings'

  // Meeting Room State
  const [inActiveMeeting, setInActiveMeeting] = useState<boolean>(false);
  const [meetingTitle, setMeetingTitle] = useState<string>('Enterprise AI Integration Align');
  const [showJoinSetupModal, setShowJoinSetupModal] = useState<boolean>(false);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);

  // Meeting Controls
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCamOff, setIsCamOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  // Right sidebar tab state inside meeting room
  const [activeRightTab, setActiveRightTab] = useState<string>('transcript');

  // Dynamic Simulators / Mock Data State
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([
    { id: '1', speaker: 'Sarah Jenkins (PM)', text: "Welcome team to the Q3 AI integration sync-up.", time: "10:00 AM" },
    { id: '2', speaker: 'Alex Rivera (Dev)', text: "I've checked the API limits for Whisper. We should be good to proceed.", time: "10:01 AM" }
  ]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'Sarah Jenkins', text: "Hello! Let's paste relevant links here.", time: "10:01 AM", avatarLogoIndex: 2 }
  ]);
  const [sharedNotes, setSharedNotes] = useState<string>(
    "## Meeting Goals:\n- Review WebRTC WebSockets signaling latency\n- Confirm OpenAI transcription integration architecture\n- Plan Next Sprint Deliverables"
  );
  const [chatInput, setChatInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Kanban Board State (Persisted in localStorage)
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('intellmeet_tasks');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Verify WebRTC connection latency', description: 'Test peer loopbacks across regions.', status: 'in_progress', assignee: 'Alex Rivera', priority: 'high' },
      { id: '2', title: 'Configure Redis cache limits', description: 'Enable feed caching and session parameters.', status: 'todo', assignee: 'John Doe', priority: 'medium' },
      { id: '3', title: 'Verify OAuth2 JWT refresh tokens', description: 'Ensure user sessions expire correctly.', status: 'done', assignee: 'Sarah Jenkins', priority: 'high' }
    ];
  });

  // Action Items State in Active Meeting
  const [meetingActions, setMeetingActions] = useState<string[]>([
    "Configure Redis cache limits (Assignee: John Doe)",
    "Verify WebRTC connection latency (Assignee: Alex Rivera)"
  ]);
  const [actionTitleInput, setActionTitleInput] = useState<string>('');
  const [actionAssigneeInput, setActionAssigneeInput] = useState<string>('John Doe');

  // History State
  const [historyList, setHistoryList] = useState<MeetingHistory[]>(() => {
    const saved = localStorage.getItem('intellmeet_history');
    return saved ? JSON.parse(saved) : [
      {
        id: 'MEET-872A',
        title: 'V2.0 Deployment Architecture Review',
        date: '2026-06-12',
        duration: '45 mins',
        participants: 5,
        summary: 'Reviewed the production deployment targets including Prometheus orchestration, Kubernetes autoscaling limits, and Helm configuration charts. Confirmed Redis container limits and SSL endpoint secrets.',
        actionItems: ['Configure Helm chart replica count limits', 'Update Grafana dashboard panels']
      }
    ];
  });
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Local Canvas Recording MOCK-RECORDER system
  const [recordings, setRecordings] = useState<RecordingItem[]>(() => {
    const saved = localStorage.getItem('intellmeet_recordings');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const recordingStartTime = useRef<number>(0);
  const mixCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mixIntervalRef = useRef<number | null>(null);

  // Playback Modal State
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackTitle, setPlaybackTitle] = useState<string>('');

  // Refs for drawing simulated video canvas streams
  const myVideoRef = useRef<HTMLCanvasElement | null>(null);
  const sarahVideoRef = useRef<HTMLCanvasElement | null>(null);
  const alexVideoRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Sync localStorage
  useEffect(() => {
    localStorage.setItem('intellmeet_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('intellmeet_history', JSON.stringify(historyList));
  }, [historyList]);

  useEffect(() => {
    localStorage.setItem('intellmeet_recordings', JSON.stringify(recordings));
  }, [recordings]);

  // Handle Auth
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@zidio.com' && password === 'password') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid credentials. Use admin@zidio.com / password.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  // Add a task in Kanban
  const handleAddTask = (title: string, desc: string, assignee: string, priority: 'low'|'medium'|'high') => {
    const newTask: Task = {
      id: 'TASK-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
      title,
      description: desc,
      status: 'todo',
      assignee,
      priority
    };
    setTasks(prev => [...prev, newTask]);
  };

  // Move Kanban card status
  const cycleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const order: Task['status'][] = ['todo', 'in_progress', 'review', 'done'];
        const nextIdx = (order.indexOf(t.status) + 1) % order.length;
        return { ...t, status: order[nextIdx] };
      }
      return t;
    }));
  };

  // Create action item from meeting room
  const handleAddActionItem = () => {
    if (!actionTitleInput.trim()) return;
    const itemString = `${actionTitleInput.trim()} (Assignee: ${actionAssigneeInput})`;
    setMeetingActions(prev => [...prev, itemString]);
    
    // Auto-create on the Kanban board
    handleAddTask(actionTitleInput, 'Created during meeting: ' + meetingTitle, actionAssigneeInput, 'high');
    
    setActionTitleInput('');
  };

  // Send Chat message and simulate AI/teammate responses
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

    // Simulate Teammate Typing and Response
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const responses = [
        "That sounds like a solid plan. I will start testing the loopbacks.",
        "I've updated the task description in our sprint board.",
        "Could you clarify the database cluster specifications for that?",
        "Agree! We should definitely cache those API endpoints."
      ];
      const randomReply = responses[Math.floor(Math.random() * responses.length)];
      const names = ["Sarah Jenkins", "Alex Rivera"];
      const logos = [2, 1]; // indexes of girl 1 and boy 2
      const selectIdx = Math.floor(Math.random() * names.length);
      const randomName = names[selectIdx];
      const randomLogo = logos[selectIdx];
      
      const teamMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: randomName,
        text: randomReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatarLogoIndex: randomLogo
      };
      setChatMessages(prev => [...prev, teamMsg]);
    }, 2000);
  };

  // Start Meeting Room & Draw WebRTC Simulated Canvas Loops
  const startMeeting = (title: string) => {
    setMeetingTitle(title || 'General Team Sync');
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

      // Draw feeds in a grid layout
      if (myVideoRef.current && !isCamOff) {
        ctx.drawImage(myVideoRef.current, 0, 0, 320, 180);
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 320, 180);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText("You (Camera Off)", 160, 90);
      }

      if (sarahVideoRef.current) {
        ctx.drawImage(sarahVideoRef.current, 320, 0, 320, 180);
      }
      if (alexVideoRef.current) {
        ctx.drawImage(alexVideoRef.current, 160, 180, 320, 180);
      }

      // Draw red recording dot
      ctx.fillStyle = '#ef4444';
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

  const endMeeting = () => {
    if (isRecording) {
      stopRecording();
    }
    
    // Save to History before closing
    const newHistory: MeetingHistory = {
      id: 'MEET-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
      title: meetingTitle,
      date: new Date().toISOString().split('T')[0],
      duration: '10 mins',
      participants: 3,
      summary: 'AI-Generated Summary: Meeting regarding ' + meetingTitle + '. Discussed real-time collaborations. Notes review contents: ' + sharedNotes.substring(0, 100) + '...',
      actionItems: meetingActions
    };
    setHistoryList(prev => [newHistory, ...prev]);
    setInActiveMeeting(false);
    setCurrentTab('dashboard');
  };

  // Simulated Speech-to-Text Transcription Generator Loop
  useEffect(() => {
    if (!inActiveMeeting) return;
    
    const phrases = [
      { speaker: "Sarah Jenkins (PM)", text: "Let's make sure the MERN folder structure follows clean principles." },
      { speaker: "Alex Rivera (Dev)", text: "Agreed. Controllers calling services, and services querying repositories." },
      { speaker: "Sarah Jenkins (PM)", text: "Excellent. Let's make sure we also add rate limiters and error handlers." },
      { speaker: "Alex Rivera (Dev)", text: "I'll handle the token validation and redis feed caching routes." },
      { speaker: "Sarah Jenkins (PM)", text: "Perfect. We need high availability. Docker setup is done." }
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index >= phrases.length) return;
      const nextPhrase = phrases[index];
      const newMsg: TranscriptMessage = {
        id: Math.random().toString(),
        speaker: nextPhrase.speaker,
        text: nextPhrase.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setTranscript(prev => [...prev, newMsg]);
      index++;
    }, 10000); // add a transcript line every 10 seconds

    return () => clearInterval(interval);
  }, [inActiveMeeting]);

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

      // Draw Sarah's simulated video feed (sarahVideoRef)
      if (sarahVideoRef.current) {
        const ctx = sarahVideoRef.current.getContext('2d');
        if (ctx) {
          const w = sarahVideoRef.current.width;
          const h = sarahVideoRef.current.height;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, w, h);
          
          // Simulated moving sine wave (simulating speaking)
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          for (let x = 0; x < w; x++) {
            const y = Math.sin(x * 0.02 + frame * 0.1) * 15 + (h / 2);
            ctx.lineTo(x, y);
          }
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Add a circle avatar (Sarah Jenkins)
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, 35, 0, Math.PI * 2);
          ctx.fillStyle = '#10b981';
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 24px Poppins';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText("SJ", w / 2, h / 2);

          // Name overlay
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Poppins';
          ctx.textAlign = 'left';
          ctx.fillText("Sarah Jenkins", 15, h - 15);
        }
      }

      // Draw Alex's simulated video feed (alexVideoRef)
      if (alexVideoRef.current) {
        const ctx = alexVideoRef.current.getContext('2d');
        if (ctx) {
          const w = alexVideoRef.current.width;
          const h = alexVideoRef.current.height;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, w, h);
          
          // Draw a spinning grid background
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
          ctx.lineWidth = 1;
          const spacing = 20;
          const offset = (frame % spacing);
          for (let x = offset; x < w; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }
          for (let y = offset; y < h; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          // Draw avatar (Alex Rivera)
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, 35, 0, Math.PI * 2);
          ctx.fillStyle = '#6366f1';
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 24px Poppins';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText("AR", w / 2, h / 2);

          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Poppins';
          ctx.textAlign = 'left';
          ctx.fillText("Alex Rivera", 15, h - 15);
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

  const handleOpenPlayback = (rec: RecordingItem) => {
    setPlaybackUrl(rec.url);
    setPlaybackTitle(rec.title);
  };

  const handleDeleteRecording = (recId: string) => {
    setRecordings(prev => prev.filter(r => r.id !== recId));
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <div className="auth-card 3d-effect">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <Video size={24} />
            </div>
            <span className="logo-text" style={{color: 'var(--text-primary)'}}>IntellMeet</span>
          </div>
          <h2 className="auth-title">{isRegisterMode ? 'Create Account' : 'Sign In'}</h2>
          <p className="auth-subtitle">AI-Powered Enterprise Collaboration</p>
          
          <form onSubmit={isRegisterMode ? handleRegister : handleLogin}>
            {isRegisterMode && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required 
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="admin@zidio.com"
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
                placeholder="password"
                required 
              />
            </div>
            {authError && <p style={{color: 'var(--color-danger)', fontSize: '0.825rem', marginBottom: '1rem'}}>{authError}</p>}
            
            <button type="submit" className="btn btn-primary w-full mt-4">
              {isRegisterMode ? 'Register' : 'Login to Workspace'}
            </button>
          </form>
          
          <p className="auth-toggle">
            {isRegisterMode ? 'Already have an account? ' : 'Need an enterprise account? '}
            <span className="auth-toggle-link" onClick={() => setIsRegisterMode(!isRegisterMode)}>
              {isRegisterMode ? 'Sign In' : 'Sign Up'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar - 20% Black */}
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">
            <Video size={18} />
          </div>
          <span className="logo-text">IntellMeet</span>
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
            <span>Project Kanban</span>
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
        </nav>
        
        <div className="user-profile-widget">
          <div className="user-avatar" style={{ border: 'none', background: 'transparent' }}>
            {AVATAR_LOGOS[selectedAvatarIdx]}
          </div>
          <div className="user-info">
            <span className="user-name">{username}</span>
            <span className="user-role">Enterprise Admin</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Log Out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Workspace - 65% White */}
      <main className="main-workspace">
        
        {/* ==========================================
            DASHBOARD VIEW
            ========================================== */}
        {currentTab === 'dashboard' && (
          <div>
            <div className="workspace-header">
              <div>
                <h1 className="workspace-title">Welcome Back, {username}!</h1>
                <p style={{color: 'var(--text-secondary)'}}>Zidio Development Workspace Portal • March 2026</p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary 3d-button" onClick={() => setShowScheduleModal(true)}>Schedule Meeting</button>
                <button className="btn btn-primary 3d-button" onClick={() => setShowJoinSetupModal(true)}>Start Instant Meeting</button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="dashboard-grid mb-4">
              <div className="dashboard-card col-3 3d-effect">
                <span className="stat-label">Scheduled Meetings</span>
                <div className="stat-value">3</div>
              </div>
              <div className="dashboard-card col-3 3d-effect">
                <span className="stat-label">Pending Action Items</span>
                <div className="stat-value">
                  {tasks.filter(t => t.status !== 'done').length}
                </div>
              </div>
              <div className="dashboard-card col-3 3d-effect">
                <span className="stat-label">Recordings Saved</span>
                <div className="stat-value">{recordings.length}</div>
              </div>
              <div className="dashboard-card col-3 3d-effect">
                <span className="stat-label">AI Summary Accuracy</span>
                <div className="stat-value">92.4%</div>
              </div>
            </div>

            <div className="dashboard-grid">
              {/* Active Meetings List */}
              <div className="dashboard-card col-8 3d-effect">
                <h3 className="card-title">🚀 Join Active Meetings</h3>
                <div className="meeting-list">
                  <div className="meeting-item">
                    <div className="meeting-info">
                      <div className="meeting-icon">
                        <Video size={24} />
                      </div>
                      <div className="meeting-details">
                        <h4>Enterprise AI Integration Align</h4>
                        <p>Host: Sarah Jenkins • 3 participants active</p>
                      </div>
                    </div>
                    <div>
                      <span className="badge badge-green mr-4">Live</span>
                      <button className="btn btn-primary 3d-button" onClick={() => {
                        setMeetingTitle('Enterprise AI Integration Align');
                        setShowJoinSetupModal(true);
                      }}>Join Room</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick AI Extraction Box */}
              <div className="dashboard-card col-4 3d-effect">
                <h3 className="card-title">🤖 AI Meeting Assistant</h3>
                <div style={{fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-secondary)'}}>
                  <p>IntellMeet runs automated speech-to-text summaries to boost efficiency by <b>40-60%</b>.</p>
                  <div className="action-item-card mt-4">
                    <div className="action-item-card-title">Latest Extracted Task:</div>
                    <div>Verify WebRTC loopback servers setup.</div>
                    <span className="badge badge-blue mt-2">Assigned: Alex Rivera</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            MEETING ROOM VIEW
            ========================================== */}
        {currentTab === 'meeting' && (
          <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <div className="workspace-header" style={{marginBottom: '1rem'}}>
              <div>
                <h1 className="workspace-title">📹 {meetingTitle}</h1>
                <p style={{color: 'var(--text-secondary)'}}>ID: MEET-LOOPBACK-2026 • Encryption SECURE</p>
              </div>
              <button className="btn btn-danger 3d-button" onClick={endMeeting}>Leave & Generate Summary</button>
            </div>

            <div className="meeting-room-container">
              {/* Left Video Area: Grid */}
              <div className="video-section 3d-effect">
                <div className="video-grid">
                  <div className={`video-feed ${!isMuted ? 'active-speaker' : ''} 3d-effect`}>
                    {isCamOff ? (
                      <div className="user-avatar" style={{ width: '80px', height: '80px', background: 'transparent' }}>
                        {AVATAR_LOGOS[selectedAvatarIdx]}
                      </div>
                    ) : (
                      <canvas ref={myVideoRef} width="320" height="180"></canvas>
                    )}
                    <span className="participant-label">
                      <div style={{width: '20px', height: '20px', display: 'inline-block'}}>{AVATAR_LOGOS[selectedAvatarIdx]}</div>
                      {username} (You)
                    </span>
                  </div>
                  
                  <div className="video-feed active-speaker 3d-effect">
                    <canvas ref={sarahVideoRef} width="320" height="180"></canvas>
                    <span className="participant-label">
                      <div style={{width: '20px', height: '20px', display: 'inline-block'}}>{AVATAR_LOGOS[2]}</div>
                      Sarah Jenkins
                    </span>
                  </div>

                  <div className="video-feed 3d-effect">
                    <canvas ref={alexVideoRef} width="320" height="180"></canvas>
                    <span className="participant-label">
                      <div style={{width: '20px', height: '20px', display: 'inline-block'}}>{AVATAR_LOGOS[1]}</div>
                      Alex Rivera
                    </span>
                  </div>
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
                      backgroundColor: 'red', display: 'inline-block',
                      animation: isRecording ? 'pulse 1s infinite' : 'none'
                    }}></span>
                  </button>
                  {isRecording && <span style={{color: '#ef4444', fontSize: '0.75rem', fontWeight: 600}}>REC</span>}
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
                            {AVATAR_LOGOS[msg.avatarLogoIndex !== undefined ? msg.avatarLogoIndex : 0]}
                          </div>
                          <div>
                            <div className="message-speaker">{msg.sender} <span style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>{msg.time}</span></div>
                            <div className="message-text">{msg.text}</div>
                          </div>
                        </div>
                      ))}
                      {isTyping && <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Teammate is typing...</div>}
                      
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

                      <div className="form-group mt-4" style={{borderTop: '1px solid var(--color-border)', paddingTop: '1rem'}}>
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
                        <label className="form-label">Assignee</label>
                        <select 
                          className="form-input 3d-effect" 
                          value={actionAssigneeInput}
                          onChange={(e) => setActionAssigneeInput(e.target.value)}
                        >
                          <option value={username}>You ({username})</option>
                          <option value="Sarah Jenkins">Sarah Jenkins</option>
                          <option value="Alex Rivera">Alex Rivera</option>
                        </select>
                      </div>
                      <button className="btn btn-primary w-full 3d-button" onClick={handleAddActionItem}>
                        <Plus size={16} /> Add Action Item
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
          <div>
            <div className="workspace-header">
              <div>
                <h1 className="workspace-title">📋 Kanban Project Board</h1>
                <p style={{color: 'var(--text-secondary)'}}>Click cards to cycle status</p>
              </div>
            </div>

            <div className="kanban-grid">
              {['todo', 'in_progress', 'review', 'done'].map(statusKey => (
                <div key={statusKey} className="kanban-column 3d-effect">
                  <div className="kanban-column-header">
                    <span className="column-title" style={{textTransform: 'uppercase'}}>{statusKey.replace('_', ' ')}</span>
                    <span className="column-count">{tasks.filter(t => t.status === statusKey).length}</span>
                  </div>
                  <div className="kanban-cards">
                    {tasks.filter(t => t.status === statusKey).map(t => (
                      <div key={t.id} className="kanban-card 3d-effect" onClick={() => cycleTaskStatus(t.id)}>
                        <h4 className="kanban-card-title">{t.title}</h4>
                        <p className="kanban-card-desc">{t.description}</p>
                        <div className="kanban-card-footer">
                          <span className="assignee"><Users size={12} /> {t.assignee}</span>
                          <span className="priority-tag" style={{color: t.priority === 'high' ? 'var(--color-danger)' : 'var(--color-warning)'}}>{t.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            AI ANALYTICS VIEW
            ========================================== */}
        {currentTab === 'analytics' && (
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
        )}

        {/* ==========================================
            MEETING HISTORY VIEW
            ========================================== */}
        {currentTab === 'history' && (
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
        )}

        {/* ==========================================
            RECORDINGS VIEW
            ========================================== */}
        {currentTab === 'recordings' && (
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
        )}

      </main>

      {/* ==========================================
          JOIN MEETING SETUP SETUP MODAL (Logo selection)
          ========================================== */}
      {showJoinSetupModal && (
        <div className="modal-overlay">
          <div className="modal-content 3d-effect" style={{maxWidth: '600px'}}>
            <div className="modal-header">
              <h3>Configure Meeting Presence</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Your Display Name</label>
                <input 
                  type="text" 
                  className="form-input 3d-effect" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{marginBottom: '1rem'}}>Choose Presence Avatar / Logo (Reference from PDF)</label>
                <div style={{
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(5, 1fr)', 
                  gap: '1rem', 
                  padding: '1rem', 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)'
                }}>
                  {AVATAR_LOGOS.map((svg, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedAvatarIdx(idx)}
                      style={{
                        cursor: 'pointer',
                        borderRadius: '50%',
                        border: selectedAvatarIdx === idx ? '3px solid var(--color-primary)' : '2px solid transparent',
                        padding: '3px',
                        backgroundColor: selectedAvatarIdx === idx ? 'white' : 'transparent',
                        transform: selectedAvatarIdx === idx ? 'scale(1.1) translateY(-2px)' : 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: selectedAvatarIdx === idx ? '0 4px 10px rgba(2, 132, 199, 0.3)' : 'none'
                      }}
                      title={idx < 2 ? "Boy Avatar" : idx < 4 ? "Girl Avatar" : "Meeting Symbol"}
                    >
                      {svg}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary 3d-button" onClick={() => setShowJoinSetupModal(false)}>Cancel</button>
              <button className="btn btn-primary 3d-button" onClick={() => startMeeting(meetingTitle)}>Join/Start Meeting</button>
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
            <div className="modal-footer">
              <a href={playbackUrl} download={`${playbackTitle.replace(/\s+/g, '_')}.webm`} className="btn btn-primary 3d-button">
                <Download size={14} /> Download File
              </a>
              <button className="btn btn-secondary 3d-button" onClick={() => setPlaybackUrl(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal-content 3d-effect">
            <div className="modal-header">
              <h3>Schedule Meeting</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Meeting Title</label>
                <input type="text" className="form-input 3d-effect" placeholder="e.g. Sprint Planning Sync" />
              </div>
              <div className="form-group">
                <label className="form-label">Date & Time</label>
                <input type="datetime-local" className="form-input 3d-effect" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary 3d-button" onClick={() => setShowScheduleModal(false)}>Cancel</button>
              <button className="btn btn-primary 3d-button" onClick={() => setShowScheduleModal(false)}>Schedule Sync</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
