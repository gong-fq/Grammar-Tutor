
import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { action, text } = JSON.parse(event.body);

    if (action === "analyze") {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: text,
        config: {
          systemInstruction: `You are Professor Gong's AI assistant. 
          STRICT LANGUAGE RULE:
          - If the user input is in CHINESE (Simplified or Traditional): You MUST provide 'explanation_zh' and leave 'explanation_en' as an EMPTY STRING.
          - If the user input is in ENGLISH: You MUST provide 'explanation_en' and leave 'explanation_zh' as an EMPTY STRING.
          - DO NOT provide both explanations. The language of your explanation MUST match the language of the user's prompt.

          CORE TASK:
          1. Sentence Correction: If input is a sentence, 'corrected' is the best English version.
          2. Question Answer: If input is a question, 'corrected' is an illustrative English example.
          3. Mastery Exercise: Generate one exercise (multiple-choice or fill-in-the-blank) based strictly on the 'corrected' sentence.
          4. Conciseness: Keep explanations short and academic.`,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
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
                  type: { type: Type.STRING, description: "multiple-choice or fill-in-the-blank" },
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
      return { 
        statusCode: 200, 
        headers: { "Content-Type": "application/json" },
        body: response.text 
      };
    }

    if (action === "tts") {
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
      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      return { 
        statusCode: 200, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioData }) 
      };
    }

    return { statusCode: 400, body: "Invalid Action" };
  } catch (error) {
    return { 
      statusCode: 500, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message }) 
    };
  }
};
