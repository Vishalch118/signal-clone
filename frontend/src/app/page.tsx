"use client";
import { useState, useEffect, useRef } from 'react';

// Strict TypeScript Interfaces for Vercel Build
interface User {
  id: number;
  phone_number: string;
  display_name: string;
  avatar_url: string | null;
}

interface Conversation {
  id: number;
  is_group: boolean;
  name: string | null;
  created_at: string;
}

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  status: string;
  created_at: string;
}

export default function SignalClone() {
  const [user, setUser] = useState<User | null>(null);
  const [phone, setPhone] = useState('555-0001'); 
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  
  const ws = useRef<WebSocket | null>(null);

  // Use Vercel Environment Variables, fallback to localhost (strip trailing slashes)
  const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
  const WS_URL = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws").replace(/\/$/, "");

  useEffect(() => {
    if (user) {
      fetch(`${API_URL}/api/conversations`)
        .then(r => r.json())
        .then(setConversations);
      
      ws.current = new WebSocket(WS_URL);
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'new_message') {
          setMessages(prev => {
            if (prev.find(m => m.id === data.payload.id)) return prev;
            return [...prev, data.payload];
          });
        }
      };
      
      return () => ws.current?.close();
    }
  }, [user, API_URL, WS_URL]);

  const loadMessages = async (conv: Conversation) => {
    setActiveConv(conv);
    const res = await fetch(`${API_URL}/api/conversations/${conv.id}/messages`);
    const data = await res.json();
    setMessages(data);
  };

  const login = async () => {
    if (!phone.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone })
      });
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);
      
      const userData: User = await res.json();
      if (!userData || !userData.display_name) throw new Error("Invalid user data");
      
      setUser(userData);
    } catch (err: any) {
      alert("Failed to connect to backend: " + err.message);
      console.error(err);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !activeConv || !user) return;
    
    const msg: Message = {
      id: Date.now(),
      conversation_id: activeConv.id,
      sender_id: user.id,
      content: inputText,
      status: 'SENT',
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, msg]);
    ws.current?.send(JSON.stringify({ type: 'new_message', payload: msg }));
    setInputText('');
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="p-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg text-center w-96">
          <h1 className="text-3xl font-bold mb-2 text-blue-600 dark:text-blue-400">Signal</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">Privacy that fits in your pocket.</p>
          
          <input 
            type="text" 
            placeholder="Phone Number (e.g. 555-0001)" 
            className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-4 w-full text-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            value={phone} onChange={e => setPhone(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && login()}
          />
          <button onClick={login} className="bg-blue-600 hover:bg-blue-700 transition text-white font-semibold px-4 py-3 rounded-lg w-full">
            Register / Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#121212] text-black dark:text-gray-100 font-sans">
      <div className="w-1/3 max-w-md border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-[#1a1a1a]">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
              {user.display_name[0].toUpperCase()}
            </div>
            <span className="font-semibold text-lg">{user.display_name}</span>
          </div>
          <button className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-300" title="Placeholder: Settings">⚙️</button>
        </div>

        <div className="p-3">
          <input type="text" placeholder="Search" className="w-full bg-gray-200 dark:bg-gray-800 text-sm rounded-lg px-4 py-2 outline-none focus:ring-1 focus:ring-blue-500"/>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map(c => (
            <div 
              key={c.id} 
              onClick={() => loadMessages(c)}
              className={`p-4 flex items-center gap-4 cursor-pointer transition ${activeConv?.id === c.id ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}
            >
              <div className="w-12 h-12 bg-gradient-to-tr from-gray-400 to-gray-500 rounded-full flex-shrink-0" />
              <div className="flex-1 overflow-hidden">
                <div className="font-semibold truncate">{c.is_group ? c.name : 'Alice & Bob Chat'}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">Tap to view conversation</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative bg-white dark:bg-[#121212]">
        {activeConv ? (
          <>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-tr from-gray-400 to-gray-500 rounded-full" />
                <span className="font-semibold text-lg">{activeConv.is_group ? activeConv.name : 'Alice & Bob Chat'}</span>
              </div>
              
              <div className="flex gap-4 text-xl">
                <button title="Voice Call (Coming Soon)" className="text-gray-400 hover:text-blue-500 transition">📞</button>
                <button title="Video Call (Coming Soon)" className="text-gray-400 hover:text-blue-500 transition">🎥</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
              {messages.map((m, i) => {
                const isMine = m.sender_id === user.id;
                return (
                  <div key={i} className={`flex flex-col max-w-[75%] ${isMine ? 'self-end items-end' : 'self-start items-start'}`}>
                    <div className={`px-4 py-2 text-[15px] shadow-sm ${
                      isMine 
                        ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm' 
                        : 'bg-gray-200 dark:bg-gray-800 text-black dark:text-gray-100 rounded-2xl rounded-bl-sm'
                    }`}>
                      {m.content}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                      {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      {isMine && <span className="text-blue-500">✓✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-gray-800 flex items-center gap-3">
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl">+</button>
              <input 
                type="text" 
                placeholder="Signal message..." 
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-full px-5 py-2.5 outline-none focus:ring-1 focus:ring-blue-500 transition"
                value={inputText} onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
              />
              <button 
                onClick={sendMessage} 
                className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 transition flex items-center justify-center text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-1"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-4">
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center">
               <span className="text-4xl text-gray-400 dark:text-gray-600">💬</span>
            </div>
            <p className="text-lg font-medium">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
