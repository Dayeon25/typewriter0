import { useState, useEffect, useRef, TouchEvent } from 'react';
import { io, Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { Keyboard, Laptop, Smartphone, Copy, Check, RefreshCw, MousePointer2, Type, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CheonjiinState } from './lib/cheonjiin';

// Initialize socket lazily
let socket: Socket;

export default function App() {
  const [mode, setMode] = useState<'select' | 'sender' | 'receiver'>('select');
  const [roomId, setRoomId] = useState('');
  const [typedText, setTypedText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [cheonjiin] = useState(() => new CheonjiinState());
  const [connected, setConnected] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // In many cloud environments like Cloud Run, websocket transport is more reliable 
    // when properly configured, and helps avoid CORS/sticky session issues with polling.
    const socketUrl = import.meta.env.VITE_SOCKET_SERVER_URL || (typeof process !== 'undefined' ? process.env.APP_URL : undefined);
    
    console.log('Connecting to socket...', socketUrl ? `at ${socketUrl}` : 'at current origin');

    const s = io(socketUrl || window.location.origin, {
      transports: ['websocket'], // Use websocket only to avoid sticky session issues in load-balanced environments
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });
    
    socketRef.current = s;

    s.on('connect', () => {
      console.log('Socket connected:', s.id);
      setConnected(true);
      
      // If we have a room from URL, join it now that we're connected
      const params = new URLSearchParams(window.location.search);
      const roomFromUrl = params.get('room');
      if (roomFromUrl) {
        const id = roomFromUrl.toUpperCase();
        setRoomId(id);
        s.emit('join-room', id);
        setMode('sender');
      }
    });

    s.on('user-joined', ({ count }) => {
      console.log('User joined room, total users:', count);
      if (count >= 2) {
        setPeerConnected(true);
      }
    });

    s.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    s.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
      setPeerConnected(false);
    });

    s.on('receive-key', (key: string) => {
      console.log('Received key:', key);
      if (key === 'backspace') {
        setTypedText(prev => prev.slice(0, -1));
      } else if (key === 'clear') {
        setTypedText('');
      } else {
        setTypedText(prev => prev + key);
      }
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const startSender = (id: string) => {
    setRoomId(id);
    if (socketRef.current) {
      socketRef.current.emit('join-room', id);
    }
    setMode('sender');
  };

  const startReceiver = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(id);
    if (socketRef.current) {
      socketRef.current.emit('join-room', id);
    }
    setMode('receiver');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(typedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans selection:bg-[#5A5A40] selection:text-white">
      <AnimatePresence mode="wait">
        {mode === 'select' && (
          <motion.div 
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen p-6 text-center"
          >
            {!connected && (
              <div className="fixed top-4 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-xs font-bold animate-pulse">
                서버 연결 중...
              </div>
            )}
            <div className="mb-8">
              <div className="w-20 h-20 bg-[#5A5A40] rounded-3xl flex items-center justify-center mb-4 mx-auto shadow-lg">
                <Keyboard className="text-white w-10 h-10" />
              </div>
              <h1 className="text-4xl font-serif font-bold mb-2">천지인 리모트</h1>
              <p className="text-[#5A5A40]/60 italic">핸드폰으로 노트북에 글자를 입력하세요</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
              <button 
                onClick={startReceiver}
                className="group p-8 bg-white rounded-[32px] shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-[#5A5A40]/20 flex flex-col items-center"
              >
                <div className="w-16 h-16 bg-[#F5F5F0] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Laptop className="text-[#5A5A40] w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-2">노트북 (수신)</h2>
                <p className="text-sm text-center opacity-60">이 기기를 글자를 받을 노트북으로 설정합니다.</p>
              </button>

              <div className="p-8 bg-white rounded-[32px] shadow-sm flex flex-col items-center border border-transparent">
                <div className="w-16 h-16 bg-[#F5F5F0] rounded-2xl flex items-center justify-center mb-4">
                  <Smartphone className="text-[#5A5A40] w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-2">핸드폰 (송신)</h2>
                <p className="text-sm text-center opacity-60 mb-4">노트북의 QR 코드를 스캔하거나 코드를 입력하세요.</p>
                <input 
                  type="text" 
                  placeholder="코드 입력 (예: AB12CD)"
                  className="w-full p-3 bg-[#F5F5F0] rounded-xl text-center font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/30"
                  onChange={(e) => {
                    if (e.target.value.length === 6) {
                      startSender(e.target.value.toUpperCase());
                    }
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'receiver' && (
          <motion.div 
            key="receiver"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto p-8 pt-16"
          >
            <div className="flex justify-between items-start mb-12">
              <div>
                <h1 className="text-3xl font-serif font-bold mb-2">수신 대기 중</h1>
                <div className="flex items-center gap-2 text-[#5A5A40]">
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium">{connected ? (peerConnected ? '상대방 연결됨' : '대기 중...') : '서버 연결 끊김'}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest opacity-40 mb-1">연결 코드</p>
                <p className="text-4xl font-mono font-bold tracking-tighter">{roomId}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-[40px] p-8 shadow-sm min-h-[400px] flex flex-col">
                  <div className="flex-1 text-2xl leading-relaxed whitespace-pre-wrap outline-none">
                    {typedText || <span className="opacity-20 italic">핸드폰에서 입력을 시작하세요...</span>}
                  </div>
                  <div className="mt-8 flex gap-4">
                    <button 
                      onClick={copyToClipboard}
                      className="flex-1 bg-[#5A5A40] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#4A4A30] transition-colors"
                    >
                      {isCopied ? <Check size={20} /> : <Copy size={20} />}
                      {isCopied ? '복사됨' : '클립보드에 복사'}
                    </button>
                    <button 
                      onClick={() => setTypedText('')}
                      className="p-4 bg-[#F5F5F0] rounded-2xl hover:bg-red-50 text-red-500 transition-colors"
                      title="지우기"
                    >
                      <RefreshCw size={24} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center bg-white rounded-[40px] p-8 shadow-sm h-fit">
                <p className="text-sm font-medium mb-6 text-center">핸드폰으로 스캔하여<br/>즉시 연결하세요</p>
                <div className="p-4 bg-[#F5F5F0] rounded-3xl">
                  <QRCodeSVG 
                    value={`${process.env.APP_URL || window.location.origin}?room=${roomId}`} 
                    size={180}
                    fgColor="#5A5A40"
                    bgColor="transparent"
                  />
                </div>
                <button 
                  onClick={() => setMode('select')}
                  className="mt-8 text-sm opacity-40 hover:opacity-100 transition-opacity"
                >
                  처음으로 돌아가기
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'sender' && socketRef.current && (
          <SenderView roomId={roomId} socket={socketRef.current} cheonjiin={cheonjiin} connected={connected} peerConnected={peerConnected} onBack={() => setMode('select')} />
        )}

        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border border-[#5A5A40]/10 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-4">
          <div className="text-[10px] font-bold uppercase tracking-tighter text-[#5A5A40]/40">System Bridge</div>
          <a 
            href="/bridge.js" 
            download 
            className="text-xs font-bold text-[#5A5A40] hover:underline flex items-center gap-1"
          >
            PC 제어 프로그램 다운로드
          </a>
        </div>
      </AnimatePresence>
    </div>
  );
}

function SenderView({ roomId, socket, cheonjiin, connected, peerConnected, onBack }: { roomId: string, socket: Socket, cheonjiin: CheonjiinState, connected: boolean, peerConnected: boolean, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'keyboard' | 'mouse'>('keyboard');
  const [currentText, setCurrentText] = useState('');
  const [preview, setPreview] = useState('');
  const lastTouch = useRef<{ x: number, y: number } | null>(null);

  const handleKey = (key: string) => {
    const result = cheonjiin.handleKey(key);
    setPreview(result);
  };

  const finalize = () => {
    if (preview) {
      socket.emit('send-key', { roomId, key: preview });
      setCurrentText(prev => prev + preview);
      cheonjiin.clear();
      setPreview('');
    }
  };

  const sendBackspace = () => {
    if (preview) {
      const result = cheonjiin.handleKey('backspace');
      setPreview(result);
    } else {
      socket.emit('send-key', { roomId, key: 'backspace' });
      setCurrentText(prev => prev.slice(0, -1));
    }
  };

  const sendSpace = () => {
    socket.emit('send-key', { roomId, key: ' ' });
    setCurrentText(prev => prev + ' ');
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (activeTab !== 'mouse') return;
    const touch = e.touches[0];
    if (lastTouch.current) {
      const dx = (touch.clientX - lastTouch.current.x) * 1.5;
      const dy = (touch.clientY - lastTouch.current.y) * 1.5;
      socket.emit('mouse-move', { roomId, dx, dy });
    }
    lastTouch.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = () => {
    lastTouch.current = null;
  };

  const handleMouseClick = (button: 'left' | 'right') => {
    socket.emit('mouse-click', { roomId, button });
  };

  return (
    <motion.div 
      key="sender"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-screen bg-white overflow-hidden"
    >
      {!peerConnected && (
        <div className="bg-amber-500 text-white text-[10px] font-bold py-1 px-4 text-center animate-pulse">
          {connected ? '노트북과 연결 대기 중...' : '서버 연결 끊김'}
        </div>
      )}
      <div className="p-4 flex justify-between items-center border-b border-[#F5F5F0]">
        <button onClick={onBack} className="text-sm font-medium text-[#5A5A40]">뒤로</button>
        <div className="flex bg-[#F5F5F0] p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('keyboard')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'keyboard' ? 'bg-white shadow-sm text-[#5A5A40]' : 'text-[#5A5A40]/40'}`}
          >
            <Type size={14} /> 자판
          </button>
          <button 
            onClick={() => setActiveTab('mouse')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'mouse' ? 'bg-white shadow-sm text-[#5A5A40]' : 'text-[#5A5A40]/40'}`}
          >
            <MousePointer2 size={14} /> 마우스
          </button>
        </div>
        <div className="text-right">
          <p className="text-[8px] uppercase tracking-widest opacity-40">ROOM</p>
          <p className="font-mono font-bold text-xs">{roomId}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'keyboard' ? (
            <motion.div 
              key="kb"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 p-6 flex flex-col justify-end"
            >
              <div className="mb-6 p-6 bg-[#F5F5F0] rounded-[32px] min-h-[100px] relative overflow-hidden">
                <div className="text-2xl font-medium break-all">
                  <span className="opacity-30">{currentText.slice(-20)}</span>
                  <span className="text-[#5A5A40] border-b-4 border-[#5A5A40] animate-pulse">{preview || ' '}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <Key label="ㅣ" sub="1" onClick={() => handleKey('ㅣ')} />
                <Key label="ㆍ" sub="2" onClick={() => handleKey('ㆍ')} />
                <Key label="ㅡ" sub="3" onClick={() => handleKey('ㅡ')} />
                
                <Key label="ㄱㅋ" sub="4" onClick={() => handleKey('4')} />
                <Key label="ㄴㄹ" sub="5" onClick={() => handleKey('5')} />
                <Key label="ㄷㅌ" sub="6" onClick={() => handleKey('6')} />
                
                <Key label="ㅂㅍ" sub="7" onClick={() => handleKey('7')} />
                <Key label="ㅅㅎ" sub="8" onClick={() => handleKey('8')} />
                <Key label="ㅈㅊ" sub="9" onClick={() => handleKey('9')} />
                
                <Key label="완료" sub="Enter" onClick={finalize} className="bg-[#5A5A40] text-white" />
                <Key label="ㅇㅁ" sub="0" onClick={() => handleKey('0')} />
                <Key label="←" sub="Del" onClick={sendBackspace} className="bg-red-50 text-red-500" />
              </div>
              
              <button 
                onClick={sendSpace}
                className="w-full py-4 bg-[#F5F5F0] rounded-2xl font-bold text-[#5A5A40] active:scale-95 transition-transform"
              >
                Space
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="ms"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col p-6"
            >
              <div 
                className="flex-1 bg-[#F5F5F0] rounded-[40px] mb-6 flex flex-col items-center justify-center relative touch-none"
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="flex flex-col items-center opacity-20 pointer-events-none">
                  <Move size={48} className="mb-4" />
                  <p className="text-sm font-bold">터치패드</p>
                  <p className="text-xs">손가락으로 마우스를 움직이세요</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 h-32">
                <button 
                  onPointerDown={() => handleMouseClick('left')}
                  className="bg-[#F5F5F0] rounded-3xl font-bold text-[#5A5A40] active:bg-[#5A5A40] active:text-white transition-all flex items-center justify-center"
                >
                  왼쪽 클릭
                </button>
                <button 
                  onPointerDown={() => handleMouseClick('right')}
                  className="bg-[#F5F5F0] rounded-3xl font-bold text-[#5A5A40] active:bg-[#5A5A40] active:text-white transition-all flex items-center justify-center"
                >
                  오른쪽 클릭
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function Key({ label, sub, onClick, className = "" }: { label: string, sub: string, onClick: () => void, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`h-20 flex flex-col items-center justify-center bg-[#F5F5F0] rounded-2xl active:scale-90 transition-all ${className}`}
    >
      <span className="text-2xl font-bold">{label}</span>
      <span className="text-[10px] opacity-40 font-mono mt-1">{sub}</span>
    </button>
  );
}
