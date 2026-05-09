"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function processDistressSignal(message: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    Analyze this maritime distress message: "${message}"
    Return ONLY a JSON object with:
    {
      "severity": "Low" | "Medium" | "High",
      "category": "Mechanical" | "Weather" | "Medical" | "Piracy",
      "summary": "one sentence summary"
    }
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return JSON.parse(response.text());
}