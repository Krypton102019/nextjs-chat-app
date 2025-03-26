import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { message } = await request.json();
    console.log("Received prompt in /api/openai:", message);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "OpenAI API key not configured" },
            { status: 500 }
        );
    }

    try {
        // Extract the user's feelings or intentions from the prompt
        // Look for "Suggest me" and take the text before it
        const suggestIndex = message.toLowerCase().indexOf("suggest me");
        let userFeeling = message;
        if (suggestIndex !== -1) {
            userFeeling = message.substring(0, suggestIndex).trim();
        }
        console.log("Extracted user feeling/intention:", userFeeling);

        // Generate suggestions for the user to send to a family member
        const suggestionPrompt = `
      The user wants to send a message to a family member to share their feelings or intentions: '${userFeeling}'. 
      Provide 3 messages that the user can send to their family member, written from the user's perspective, to strengthen their emotional bond:
      1. Happy: A warm, cheerful message where the user shares their feelings in an uplifting way, encouraging a positive connection (e.g., "Hey, I’m feeling a bit homesick—let’s plan a family game night soon!").
      2. Caring: A heartfelt, empathetic message where the user shares their feelings and seeks emotional support or closeness (e.g., "I’m feeling really homesick—can we have a long chat this weekend?").
      3. Playful: A lighthearted, fun message where the user shares their feelings in a teasing or silly way to bring a smile (e.g., "I’m getting homesick vibes—time for you to send me some of your famous cookies!").
      The messages should be written as if the user is speaking directly to their family member, sharing their feelings or intentions in a natural, personal, and warm way. The tone should be casual and family-oriented, strengthening the emotional connection. Avoid formal, generic, or robotic responses (e.g., don't say "I'm here for you" or "That sounds challenging"). Do not write the messages as if a family member is responding to the user.
      Format the responses as a JSON object with keys 'happy', 'caring', and 'playful'.
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
                        { role: "user", content: userFeeling },
                    ],
                    temperature: 0.7,
                }),
            }
        );

        const suggestionData = await suggestionResponse.json();
        if (!suggestionResponse.ok) {
            const errorMsg = suggestionData.error?.message || "Failed to generate suggestions";
            console.error("Suggestions generation error:", {
                status: suggestionResponse.status,
                statusText: suggestionResponse.statusText,
                errorMsg,
                responseData: suggestionData,
            });
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
            suggestions = {
                happy: suggestionsObj.happy || "Hey, I’m feeling a bit homesick. Let’s plan something fun!",
                caring: suggestionsObj.caring || "I’m missing home a lot. Can we talk soon?",
                playful: suggestionsObj.playful || "I’m getting homesick vibes. Guess I need a family hug!",
            };
        } catch (parseError) {
            console.error("Error parsing suggestions:", parseError);
            suggestions = {
                happy: "Hey, I’m feeling a bit homesick. Let’s plan something fun!",
                caring: "I’m missing home a lot. Can we talk soon?",
                playful: "I’m getting homesick vibes. Guess I need a family hug!",
            };
        }
        console.log("Suggestions generated:", suggestions);

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error("Error in /api/openai:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to generate suggestions";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}