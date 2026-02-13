import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: "You are a medical first aid guide. Ask clarifying questions then give step by step first aid instructions."
});

export const askFirstAid = async (text: string) => {
    if (!apiKey) {
        console.error("Gemini API key is missing. Please set VITE_GOOGLE_API_KEY in .env");
        return null;
    }

    try {
        const result = await model.generateContent(text);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error calling Gemini:", error);
        return null;
    }
};
