
import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";

export const getAIInsights = async (state: AppState) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Act as a world-class CFO and Business Strategy Consultant. Analyze the following business performance data:
    
    Current Inventory: ${JSON.stringify(state.products)}
    Historical Sales: ${JSON.stringify(state.sales)}
    Ad Spending Logs: ${JSON.stringify(state.ads)}
    
    Provide a comprehensive analysis covering:
    1. **Profitability Deep Dive**: Identify which products have the best margins vs. volume. 
    2. **Burn Rate & ROI**: Evaluate ad spend effectiveness (ROAS). Are we spending too much relative to revenue?
    3. **Inventory Efficiency**: Flag "dead stock" (low sales/high inventory) and "stockout risks" (high sales/low inventory).
    4. **30-Day Growth Plan**: Provide 3 specific, data-driven actions to increase Net Profit.

    Format the response in clean Markdown with professional headers and clear sections.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });

    return response.text;
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "The financial strategist is currently processing complex market variables. Please ensure your data is populated and try again shortly.";
  }
};
