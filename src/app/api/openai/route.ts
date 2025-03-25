import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { message } = await request.json();
    console.log("Received POST request to /api/generate-message with message:", message);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "OpenAI API key not configured" },
            { status: 500 }
        );
    }

    try {
        // Step 1: Generate a response based on the user's message
        console.log("Generating a response to the user's message...");
        const responsePrompt = `
            You are a family member responding in a family chat. 
            The user sent this message: '${message}'. 
            Respond with a short message (1-2 sentences) that continues the conversation naturally, as a family member would. 
            The response should be relevant to the user's message and maintain a familial tone (e.g., happy, nostalgic, supportive, playful).
        `;

        const responseGeneration = await fetch(
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
                        { role: "system", content: responsePrompt },
                        { role: "user", content: message },
                    ],
                    temperature: 0.8,
                }),
            }
        );

        const responseData = await responseGeneration.json();
        if (!responseGeneration.ok) {
            const errorMsg = responseData.error?.message || "Failed to generate message";
            console.error("Response generation error:", errorMsg);
            if (errorMsg.includes("quota")) {
                return NextResponse.json(
                    { error: "OpenAI quota exceeded. Please check your plan and billing details." },
                    { status: 429 }
                );
            }
            throw new Error(errorMsg);
        }

        const generatedMessage = responseData.choices[0].message.content.trim();
        console.log("Generated message:", generatedMessage);

        // Return the generated message
        return NextResponse.json(
            { message: generatedMessage },
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    } catch (error) {
        // Log the error for debugging
        console.error("Error in /api/generate-message:", error);

        // Safely handle the error type
        const errorMessage = error instanceof Error ? error.message : "Failed to generate message";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}