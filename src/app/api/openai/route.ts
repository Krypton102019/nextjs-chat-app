import { NextResponse } from "next/server";
import slangKnowledgeBase from "@/data/slang_knowledge_base.json"; // Import the slang knowledge base

// Helper function to find slang terms in the message and retrieve or generate their translations
async function retrieveSlangTranslations(
    message: string,
    apiKey: string
): Promise<{ term: string; simple_translation: string; part_of_speech: string }[]> {
    const foundSlang: { term: string; simple_translation: string; part_of_speech: string }[] = [];
    const lowerCaseMessage = message.toLowerCase();

    // Step 1: Check the knowledge base for slang terms
    const knownSlang: { term: string; simple_translation: string; part_of_speech: string }[] = [];
    const potentialSlang: string[] = [];

    // Split the message into words and phrases to identify potential slang
    const words = message.split(/\s+/);
    words.forEach((word) => {
        const cleanedWord = word.replace(/[^a-zA-Z]/g, "").toLowerCase(); // Remove punctuation
        const matchedTerm = slangKnowledgeBase.slang_terms.find(
            (entry) => entry.term.toLowerCase() === cleanedWord
        );

        if (matchedTerm) {
            knownSlang.push({
                term: matchedTerm.term,
                simple_translation: matchedTerm.simple_translation,
                part_of_speech: matchedTerm.part_of_speech,
            });
        } else if (cleanedWord.length > 2 && !["and", "the", "is", "to", "in", "it", "for", "on", "at", "with", "of", "been", "this", "that"].includes(cleanedWord)) {
            // Heuristic: Consider words longer than 2 characters and not common stop words as potential slang
            potentialSlang.push(cleanedWord);
        }
    });

    // Check for multi-word phrases in the knowledge base
    slangKnowledgeBase.slang_terms.forEach((entry) => {
        if (lowerCaseMessage.includes(entry.term.toLowerCase()) && !knownSlang.some((s) => s.term === entry.term)) {
            knownSlang.push({
                term: entry.term,
                simple_translation: entry.simple_translation,
                part_of_speech: entry.part_of_speech,
            });
        }
    });

    foundSlang.push(...knownSlang);

    // Step 2: For potential slang not in the knowledge base, use OpenAI API to generate translations
    if (potentialSlang.length > 0) {
        console.log("Potential slang terms not in knowledge base:", potentialSlang);

        const slangPrompt = `
        The user has provided a message that may contain Gen Z slang terms: "${message}".
        The following words are potential slang terms that are not in the predefined knowledge base: ${potentialSlang.join(", ")}.
        For each of these terms, determine if it is a slang term commonly used by Gen Z as of April 2025. If it is:
        1. Provide a simple translation that someone from Gen X or Gen Y (born between 1965 and 1996) would understand.
        2. Identify its part of speech (e.g., noun, verb, adjective, phrase, interjection).
        If a term is not a recognizable slang term, indicate that it is not slang.
        Return the results as a JSON object where each key is a potential slang term, and the value is an object with 'is_slang' (boolean), 'simple_translation' (string, or empty if not slang), and 'part_of_speech' (string, or empty if not slang).
        Example:
        {
            "slay": { "is_slang": true, "simple_translation": "do great", "part_of_speech": "verb" },
            "hello": { "is_slang": false, "simple_translation": "", "part_of_speech": "" }
        }
        `;

        const slangResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: slangPrompt },
                    { role: "user", content: message },
                ],
                temperature: 0.7,
            }),
        });

        const slangData = await slangResponse.json();
        if (!slangResponse.ok) {
            const errorMsg = slangData.error?.message || "Failed to identify slang terms";
            console.error("Slang identification error:", {
                status: slangResponse.status,
                statusText: slangResponse.statusText,
                errorMsg,
                responseData: slangData,
            });
            throw new Error(errorMsg);
        }

        let slangResults;
        try {
            slangResults = JSON.parse(slangData.choices[0].message.content.trim());
        } catch (parseError) {
            console.error("Error parsing slang results:", parseError);
            slangResults = {};
        }

        // Add identified slang terms to the foundSlang list
        potentialSlang.forEach((term) => {
            const result = slangResults[term];
            if (result && result.is_slang) {
                foundSlang.push({
                    term: term,
                    simple_translation: result.simple_translation,
                    part_of_speech: result.part_of_speech,
                });
            }
        });
    }

    return foundSlang;
}

export async function POST(request: Request) {
    const { message } = await request.json();
    console.log("Received message in /api/openai:", message);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "OpenAI API key not configured" },
            { status: 500 }
        );
    }

    try {
        // The message is the user's input (e.g., "I’ve been so busy this week, it’s cray cray!")
        const userMessage = message.trim();
        console.log("User message:", userMessage);

        // Retrieve slang terms and their translations (from knowledge base or OpenAI API)
        const slangTranslations = await retrieveSlangTranslations(userMessage, apiKey);
        console.log("Retrieved slang translations:", slangTranslations);

        let translatedMessage: string;

        if (slangTranslations.length === 0) {
            // If no slang terms are found, return the original message
            translatedMessage = userMessage;
        } else {
            // Prepare the prompt for OpenAI to rephrase the message
            let translationPrompt = `
            The user has provided the following message written in Gen Z slang: "${userMessage}".
            The message contains the following slang terms and their simple translations:
            ${slangTranslations.map((entry) => `- "${entry.term}" (a ${entry.part_of_speech}) means "${entry.simple_translation}"`).join("\n")}

            Your task is to rephrase the entire message into simple, clear language that someone from Gen X or Gen Y (born between 1965 and 1996) would easily understand.
            Replace each slang term with its simple translation, ensuring the sentence remains natural and grammatically correct.
            Do not add extra context or explanations beyond rephrasing the message.
            Return the rephrased message as a plain string.
            `;

            console.log("Calling OpenAI for message translation...");
            const translationResponse = await fetch(
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
                            { role: "system", content: translationPrompt },
                            { role: "user", content: userMessage },
                        ],
                        temperature: 0.7,
                    }),
                }
            );

            const translationData = await translationResponse.json();
            if (!translationResponse.ok) {
                const errorMsg = translationData.error?.message || "Failed to translate message";
                console.error("Translation generation error:", {
                    status: translationResponse.status,
                    statusText: translationResponse.statusText,
                    errorMsg,
                    responseData: translationData,
                });
                if (errorMsg.includes("quota")) {
                    return NextResponse.json(
                        { error: "OpenAI quota exceeded. Please check your plan and billing details." },
                        { status: 429 }
                    );
                }
                throw new Error(errorMsg);
            }

            try {
                translatedMessage = translationData.choices[0].message.content.trim();
            } catch (parseError) {
                console.error("Error parsing translated message:", parseError);
                translatedMessage = "I couldn't translate the message.";
            }
        }

        console.log("Translated message:", translatedMessage);

        // Return only the translated message
        return NextResponse.json({
            translated_message: translatedMessage,
        });
    } catch (error) {
        console.error("Error in /api/openai:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to process the message";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}