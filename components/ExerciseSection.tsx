
import React, { useState, useCallback, useRef } from 'react';
import { Exercise } from '../types';

interface ExerciseSectionProps {
  exercise: Exercise;
  onCorrect: () => void;
}

const ExerciseSection: React.FC<ExerciseSectionProps> = ({ exercise, onCorrect }) => {
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const clean = (str: string) => str.trim().toLowerCase().replace(/[.,!?;]$/, '');

  const handleSubmit = (answer: string) => {
    if (isSubmitted || !answer.trim()) return;
    const correct = clean(answer) === clean(exercise.answer);
    
    setIsCorrect(correct);
    setIsSubmitted(true);
    if (correct) onCorrect();
  };

  const toggleVoiceInput = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setUserAnswer(transcript);
      handleSubmit(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
  }, [isListening, exercise.answer, onCorrect]);

  return (
    <div className="mt-4 p-4 border-2 border-indigo-100 rounded-xl bg-indigo-50/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">Q</span>
        <h4 className="text-sm font-bold text-slate-800">Mastery Exercise</h4>
      </div>
      
      <p className="text-sm text-slate-700 mb-4 italic font-medium leading-relaxed">"{exercise.question}"</p>

      {exercise.type === 'multiple-choice' && exercise.options ? (
        <div className="grid grid-cols-1 gap-2">
          {exercise.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleSubmit(opt)}
              disabled={isSubmitted}
              className={`text-left px-4 py-2.5 rounded-lg text-sm transition-all border ${
                isSubmitted 
                  ? clean(opt) === clean(exercise.answer)
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                    : clean(userAnswer) === clean(opt) && !isCorrect
                      ? 'bg-red-100 border-red-300 text-red-800'
                      : 'bg-white border-slate-100 text-slate-400'
                  : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 shadow-sm'
              }`}
            >
              <span className="font-bold mr-2 text-indigo-400">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(userAnswer)}
                disabled={isSubmitted}
                placeholder="Type or speak..."
                className={`w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none transition-all ${
                  isSubmitted
                    ? isCorrect
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-red-50 border-red-300 text-red-800'
                    : 'bg-white border-slate-200 focus:border-indigo-500'
                }`}
              />
              {isListening && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
            </div>
            {!isSubmitted && (
              <>
                <button
                  onClick={toggleVoiceInput}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all border shadow-sm ${
                    isListening ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <i className="fas fa-microphone"></i>
                </button>
                <button
                  onClick={() => handleSubmit(userAnswer)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700"
                >
                  Check
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {isSubmitted && (
        <div className={`mt-4 p-3 rounded-lg text-xs font-bold flex items-start gap-3 border ${isCorrect ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
          <i className={`fas ${isCorrect ? 'fa-check-circle' : 'fa-lightbulb'} mt-0.5`}></i>
          <div>
            <p className="mb-1">{isCorrect ? 'Excellent!' : `Correct answer: ${exercise.answer}`}</p>
            <p className="opacity-80 font-medium italic">Hint: {exercise.hint}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseSection;
