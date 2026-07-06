import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in the developer secrets panel." },
        { status: 500 }
      );
    }

    const { logData, analysisType, context } = await req.json();

    if (!logData || typeof logData !== "string") {
      return NextResponse.json(
        { error: "Invalid log data provided. It must be a non-empty string." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `You are a Senior Cyber Threat Intelligence Analyst & Incident Responder operating on a secure modular Kali Linux environment.
Please analyze the following ${analysisType || 'system data'} logs or description.

[INPUT DATA]
${logData}

[CONTEXT / SETTINGS]
${context || 'No extra context provided'}

Please provide a highly professional, structured response containing:
1. Threat Level Assessment (Critical, High, Medium, Low, or Clean) with a concise, bold explanation.
2. Attack Pattern Identification (e.g. Brute Force, SQL Injection, Privilege Escalation, Beaconing, Port Scan, or Unknown).
3. Correlated Indicators of Compromise (IPs, Ports, usernames, process names, hashes).
4. Step-by-step remediation guide following secure coding, SOLID principles, and best Kali Linux defensive actions.
5. Code correction or system hardening patch (in appropriate language like Python, Bash, Nginx config, or Dart).

Output your full response using pristine Markdown styling with beautiful dividers, code blocks, and clear visual sections. Keep it professional, objective, and detailed.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return NextResponse.json({
      success: true,
      text: response.text,
    });

  } catch (error: any) {
    console.error("AI Analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to complete AI threat intelligence analysis." },
      { status: 500 }
    );
  }
}
