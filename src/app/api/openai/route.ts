import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { message } = await request.json();
    console.log("Received POST request to /api/openai with message:", message);

    const apiKey = process.env.OPENAI_API_KEY; // Read from environment variable
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
            const errorMsg = responseData.error?.message || "Failed to generate response";
            console.error("Response generation error:", errorMsg);
            if (errorMsg.includes("quota")) {
                return NextResponse.json(
                    { error: "OpenAI quota exceeded. Please check your plan and billing details." },
                    { status: 429 }
                );
            }
            throw new Error(errorMsg);
        }

        const generatedResponse = responseData.choices[0].message.content.trim();
        console.log("Generated response:", generatedResponse);

        // Step 2: Sentiment Analysis of the Generated Response
        console.log("Calling OpenAI for sentiment analysis...");
        const sentimentResponse = await fetch(
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
                        {
                            role: "system",
                            content:
                                "Analyze the message and determine the emotion (happy, sad, neutral, excited, angry, etc.). Only return the emotion as one word.",
                        },
                        { role: "user", content: generatedResponse },
                    ],
                    temperature: 0.3,
                }),
            }
        );

        const sentimentData = await sentimentResponse.json();
        if (!sentimentResponse.ok) {
            const errorMsg = sentimentData.error?.message || "Failed to analyze sentiment";
            console.error("Sentiment analysis error:", errorMsg);
            if (errorMsg.includes("quota")) {
                return NextResponse.json(
                    { error: "OpenAI quota exceeded. Please check your plan and billing details." },
                    { status: 429 }
                );
            }
            throw new Error(errorMsg);
        }

        const sentiment = sentimentData.choices[0].message.content.trim() || "neutral";
        console.log("Sentiment analysis result:", sentiment);

        // Step 3: Generate Suggestions for the User's Next Reply
        const suggestionPrompt = `
      A family member sent this message: '${generatedResponse}'. 
      Provide 3 responses in the following styles for the user to reply with:
      1. Positive/Neutral: A light, optimistic, or neutral response.
      2. Genuinely Caring: A deeply empathetic and supportive response.
      3. Playful: A fun, lighthearted, or teasing response.
      Format the responses as a JSON object with keys 'positive', 'caring', and 'playful'.
    `;

        console.log("Calling OpenAI for suggestions...");
        const suggestionResponse = await fetch(
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
                        { role: "system", content: suggestionPrompt },
                        { role: "user", content: generatedResponse },
                    ],
                    temperature: 0.7,
                }),
            }
        );

        const suggestionData = await suggestionResponse.json();
        if (!suggestionResponse.ok) {
            const errorMsg = suggestionData.error?.message || "Failed to generate suggestions";
            console.error("Suggestions generation error:", errorMsg);
            if (errorMsg.includes("quota")) {
                return NextResponse.json(
                    { error: "OpenAI quota exceeded. Please check your plan and billing details." },
                    { status: 429 }
                );
            }
            throw new Error(errorMsg);
        }

        let suggestions;
        try {
            const suggestionsObj = JSON.parse(suggestionData.choices[0].message.content.trim());
            suggestions = [
                suggestionsObj.positive || "That sounds great!",
                suggestionsObj.caring || "I’m here if you need me!",
                suggestionsObj.playful || "Let’s see how this goes!",
            ];
        } catch (parseError) {
            console.error("Error parsing suggestions:", parseError);
            suggestions = [
                "That sounds great!",
                "I’m here if you need me!",
                "Let’s see how this goes!",
            ];
        }
        console.log("Suggestions generated:", suggestions);

        const finalResponse = { sentiment, suggestions, exampleMessage: generatedResponse };
        console.log("Final response from /api/openai:", finalResponse);
        return NextResponse.json(finalResponse, {
            headers: {
                "Content-Type": "application/json",
            },
        });
    } catch (error) {
        console.error("Error in /api/openai:", error);
        // Safely handle the error type
        const errorMessage = error instanceof Error ? error.message : "Failed to generate response";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}