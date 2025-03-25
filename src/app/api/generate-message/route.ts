import { NextResponse } from "next/server";

export async function POST(request: Request) {
    console.log("Received POST request to /api/generate-message");

    const apiKey = "REDACTED_API_KEY";
    if (!apiKey) {
        return NextResponse.json(
            { error: "OpenAI API key not configured" },
            { status: 500 }
        );
    }

    try {
        const prompt = `
      Generate a short message (1-2 sentences) that a family member might send in a chat. 
      The message should be about a random family-related scenario or story, such as sharing a memory, asking for advice, expressing a feeling, or planning an event. 
      The tone can vary (e.g., happy, sad, excited, concerned).
    `;

        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        { role: "system", content: prompt },
                        { role: "user", content: "Generate a random family message." },
                    ],
                    temperature: 0.8,
                }),
            }
        );

        const data = await response.json();
        if (!response.ok) {
            const errorMsg = data.error?.message || "Failed to generate message";
            if (errorMsg.includes("quota")) {
                return NextResponse.json(
                    { error: "OpenAI quota exceeded. Please check your plan and billing details." },
                    { status: 429 }
                );
            }
            return NextResponse.json({ error: errorMsg }, { status: 500 });
        }

        const generatedMessage = data.choices[0].message.content.trim();
        return NextResponse.json({ message: generatedMessage }, { status: 200 });
    } catch (error) {
        console.error("Error in /api/generate-message:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate message" },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    console.log("Received GET request to /api/generate-message");
    return new NextResponse(null, { status: 405 });
}

export async function OPTIONS(request: Request) {
    console.log("Received OPTIONS request to /api/generate-message");
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}