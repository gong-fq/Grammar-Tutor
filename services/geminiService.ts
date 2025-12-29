import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GrammarAnalysis } from "../types";

// Helper to determine environment
const isNetlifyProduction = () => 
  window.location.hostname.endsWith('netlify.app');

export const analyzeGrammar = async (text: string): Promise<GrammarAnalysis> => {
  // Try Netlify Backend first if in production
  if (isNetlifyProduction()) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', text })
      });
      if (response.ok) return await response.json();
    } catch (e) {
      console.warn("Backend unreachable, falling back...");
    }
  }

  // Direct SDK call for Preview/Local environments
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: text,
    config: {
      systemInstruction: `You are Professor Gong's AI assistant. 
      STRICT LANGUAGE RULE:
      - If user input is in CHINESE: provide 'explanation_zh' and leave 'explanation_en' empty.
      - If user input is in ENGLISH: provide 'explanation_en' and leave 'explanation_zh' empty.
      
      FUNCTIONAL RULES:
      1. Correct sentences grammatically.
      2. Answer questions with examples.
      3. Generate a mastery exercise (multiple-choice or fill-in-the-blank).
      4. BE CONCISE.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          corrected: { type: Type.STRING },
          explanation_en: { type: Type.STRING },
          explanation_zh: { type: Type.STRING },
          key_points: { type: Type.ARRAY, items: { type: Type.STRING } },
          exercise: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              answer: { type: Type.STRING },
              hint: { type: Type.STRING }
            },
            required: ["type", "question", "answer", "hint"]
          }
        },
        required: ["original", "corrected", "explanation_en", "explanation_zh", "key_points", "exercise"]
      }
    }
  });

  if (!response.text) throw new Error("Empty AI response");
  return JSON.parse(response.text.trim());
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  if (isNetlifyProduction()) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tts', text })
      });
      if (response.ok) {
        const { audioData } = await response.json();
        return audioData;
      }
    } catch (e) {
      console.warn("TTS fallback needed.");
    }
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) {
    return undefined;
  }
};