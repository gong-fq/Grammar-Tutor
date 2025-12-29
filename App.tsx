
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, GrammarAnalysis } from './types';
import { analyzeGrammar, generateSpeech } from './services/geminiService';
import AnalysisCard from './components/AnalysisCard';

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micLanguage, setMicLanguage] = useState<'en-US' | 'zh-CN'>('en-US');
  const [score, setScore] = useState(0);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionInstance = useRef<any>(null);

  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Good day. Prof. Gong\'s Studio is ready. Input a sentence or ask a question.\n\n你好。龚教授的工作室已就绪。请输入句子或提问。',
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const playAIVoice = async (text: string) => {
    if (isSpeaking && audioContextRef.current) {
      try { await audioContextRef.current.close(); } catch(e) {}
    }
    setIsSpeaking(true);
    try {
      const audioBase64 = await generateSpeech(text);
      if (!audioBase64) { setIsSpeaking(false); return; }
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioData = decodeBase64(audioBase64);
      const audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsSpeaking(false);
      source.start();
    } catch {
      setIsSpeaking(false);
    }
  };

  const toggleListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (isListening) {
      if (recognitionInstance.current) recognitionInstance.current.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = micLanguage;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => setInput(prev => `${prev} ${e.results[0][0].transcript}`.trim());
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionInstance.current = recognition;
  }, [isListening, micLanguage]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const currentInput = input;
    const isChineseInput = /[\u4e00-\u9fa5]/.test(currentInput);
    
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: currentInput, timestamp: new Date() }]);
    setInput('');
    setIsTyping(true);

    try {
      const analysis = await analyzeGrammar(currentInput);
      setIsTyping(false);
      
      // Force display content to match detected input language strictly
      let displayContent = isChineseInput 
        ? (analysis.explanation_zh || analysis.explanation_en) 
        : (analysis.explanation_en || analysis.explanation_zh);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: displayContent || "Mastery analysis complete.",
        timestamp: new Date(),
        analysis
      };
      setMessages(prev => [...prev, assistantMsg]);
      
      const speechText = `${analysis.corrected}. ${displayContent}`;
      playAIVoice(speechText); 
    } catch (err) {
      console.error(err);
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: isChineseInput ? "抱歉，发生了通信错误。请重试。" : "I apologize, a communication error occurred. Please try again.", 
        timestamp: new Date() 
      }]);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto shadow-2xl bg-white relative overflow-hidden font-inter text-slate-900">
      <header className="bg-slate-800 text-white p-4 flex items-center justify-between shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center border border-slate-600 shadow-lg">
            <i className="fas fa-user-graduate text-sm"></i>
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight">Prof. Gong's Studio</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Mastery Sync</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-700 flex items-center gap-2">
            <i className="fas fa-star text-amber-400 text-[10px]"></i>
            <span className="text-[10px] font-black tracking-tighter">SCORE: {score}</span>
          </div>
          <button 
            onClick={() => setMicLanguage(l => l === 'en-US' ? 'zh-CN' : 'en-US')}
            className={`px-3 py-1 rounded-lg border text-[9px] font-black transition-all ${micLanguage === 'en-US' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}
          >
            {micLanguage === 'en-US' ? '🎤 EN' : '🎤 中文'}
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`message-bubble relative ${msg.role === 'user' ? 'bg-slate-700 text-white rounded-l-2xl rounded-tr-2xl' : 'bg-white border border-slate-200 rounded-r-2xl rounded-tl-2xl shadow-sm'} p-4`}>
              <div className="text-[14px] leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</div>
              {msg.analysis && (
                <AnalysisCard 
                  analysis={msg.analysis} 
                  onExerciseComplete={() => setScore(s => s + 10)}
                />
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-r-2xl rounded-tl-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Mastering...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex gap-3 items-end">
          <button 
            onClick={toggleListening} 
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-600 text-white ring-4 ring-red-50' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            <i className={`fas fa-microphone text-lg ${isListening ? 'animate-pulse' : ''}`}></i>
          </button>
          <div className="flex-1 relative">
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Enter sentence or ask a question..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-4 pr-12 resize-none text-[14px] font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all"
              rows={1}
            />
            <button 
              onClick={handleSend} 
              disabled={!input.trim() || isTyping} 
              className={`absolute right-1.5 bottom-1.5 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${!input.trim() || isTyping ? 'bg-slate-100 text-slate-300' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-90 shadow-md'}`}
            >
              <i className="fas fa-paper-plane text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
