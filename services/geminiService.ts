import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CalculatedItem, AnalysisResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeInventory = async (locationName: string, items: CalculatedItem[]): Promise<AnalysisResult> => {
  
  // Filter only items with discrepancies, losses, or notes to provide context
  const criticalItems = items.filter(i => Math.abs(i.difference) > 0 || i.losses > 0 || i.returns > 0 || i.auditNotes).map(i => ({
    product: i.name,
    category: i.category,
    systemStock: i.theoreticalStock,
    actualCount: i.finalCount,
    diff: i.difference,
    financialDiff: i.financialDifference,
    losses: i.losses,
    returns: i.returns,
    notes: i.auditNotes
  }));

  const prompt = `
    Act as a Senior Inventory Auditor for a large hospitality group.
    Perform a rigorous audit for the sector: "${locationName}".
    
    Data Provided (Critical Items Only):
    ${JSON.stringify(criticalItems, null, 2)}
    
    Total Items Checked: ${items.length}
    Total Stock Value: ${items.reduce((acc, i) => acc + (i.finalCount * i.costPrice), 0).toFixed(2)}

    Task:
    Generate a formal audit report with 3 distinct sections:
    1. Consolidated Audit (Executive Summary): A paragraph summarizing the overall health of this sector.
    2. Category Analysis: A brief status check for each category (OK, Review, Critical) with a short comment.
    3. Detailed Report: List specific products that need immediate attention, identifying the issue and required action.
    4. Financial Risk Score.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            consolidatedAudit: { type: Type.STRING, description: "Executive summary of the audit." },
            categoryAnalysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ['OK', 'Review', 'Critical'] },
                  comment: { type: Type.STRING }
                }
              }
            },
            detailedReport: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productName: { type: Type.STRING },
                  issue: { type: Type.STRING, description: "What is wrong (e.g. High loss, Missing stock)" },
                  actionRequired: { type: Type.STRING, description: "Operational instruction" }
                }
              }
            },
            financialRiskScore: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] }
          }
        } as Schema
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    
    throw new Error("No response from AI");

  } catch (error) {
    console.error("Analysis failed", error);
    return {
      consolidatedAudit: "Unable to generate audit report. Please check connection.",
      categoryAnalysis: [],
      detailedReport: [{ productName: "System Error", issue: "AI Service Unavailable", actionRequired: "Check API Key" }],
      financialRiskScore: 'Low'
    };
  }
};