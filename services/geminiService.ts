
import { GoogleGenAI, Type } from "@google/genai";
import { AppState } from "../types";

export const getAIInsights = async (state: AppState) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Act as a professional business analyst. Analyze the following business data and provide:
    1. A brief summary of overall performance.
    2. Specific recommendations for inventory management.
    3. ROI analysis of ad spend.
    4. Top 3 actions to increase profitability.

    Data:
    Products: ${JSON.stringify(state.products)}
    Sales History: ${JSON.stringify(state.sales)}
    Ad Spending: ${JSON.stringify(state.ads)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text;
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "Unable to generate insights at this time. Please check your data or try again later.";
  }
};
