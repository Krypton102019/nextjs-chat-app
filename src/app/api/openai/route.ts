import { NextResponse } from "next/server";
import slangKnowledgeBase from "@/data/slang_knowledge_base.json"; // Import the slang knowledge base

// Helper function to find the slang term in the knowledge base
function retrieveSlangInfo(slangTerm: string): { definition: string; part_of_speech: string } | null {
    const lowerCaseTerm = slangTerm.toLowerCase().trim();
    const matchedTerm = slangKnowledgeBase.slang_terms.find(
        (entry) => entry.term.toLowerCase() === lowerCaseTerm
    );

    if (matchedTerm) {
        return {
            definition: matchedTerm.definition,
            part_of_speech: matchedTerm.part_of_speech,
        };
    }
    return null; // Return null if no match is found
}

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
        // The message is the slang term (e.g., "skibidi")
        const slangTerm = message.trim();
        console.log("Extracted slang term:", slangTerm);

        // Retrieve the slang term's definition and part of speech from the knowledge base
        let slangInfo = retrieveSlangInfo(slangTerm);
        console.log("Retrieved slang info from knowledge base:", slangInfo);

        let definition: string;
        let partOfSpeech: string;
        let exampleSentence: string;

        if (!slangInfo) {
            // Fallback: Use OpenAI API to generate the definition and part of speech
            console.log(`Slang term "${slangTerm}" not found in knowledge base. Using OpenAI API as fallback...`);
            const fallbackPrompt = `
            The user has provided the slang term "${slangTerm}".
            Since this term is not in the predefined knowledge base, provide the following:
            1. A definition of the slang term "${slangTerm}" based on its modern usage in informal contexts, such as on social media (e.g., TikTok, Instagram, X) or in Gen Z/Gen Alpha culture.
            2. The part of speech for the slang term (e.g., noun, verb, adjective).
            3. A natural, casual example sentence using the slang term "${slangTerm}" in a way that matches its definition and part of speech.
            The definition should reflect the term's current usage as of April 2025, considering its origins (e.g., African American Vernacular English, internet culture) if applicable.
            The example sentence should feel conversational and appropriate for a modern, informal context.
            Return the response as a JSON object with keys 'definition', 'part_of_speech', and 'example'.
            If the term is not a recognizable slang term, provide a best-guess definition based on its potential usage or indicate that it may not be a known slang term.
            `;

            const fallbackResponse = await fetch(
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
                            { role: "system", content: fallbackPrompt },
                            { role: "user", content: slangTerm },
                        ],
                        temperature: 0.7,
                    }),
                }
            );

            const fallbackData = await fallbackResponse.json();
            if (!fallbackResponse.ok) {
                const errorMsg = fallbackData.error?.message || "Failed to generate slang info";
                console.error("Fallback generation error:", {
                    status: fallbackResponse.status,
                    statusText: fallbackResponse.statusText,
                    errorMsg,
                    responseData: fallbackData,
                });
                if (errorMsg.includes("quota")) {
                    return NextResponse.json(
                        { error: "OpenAI quota exceeded. Please check your plan and billing details." },
                        { status: 429 }
                    );
                }
                throw new Error(errorMsg);
            }

            let fallbackResult;
            try {
                fallbackResult = JSON.parse(fallbackData.choices[0].message.content.trim());
                definition = fallbackResult.definition || `Could not determine a definition for "${slangTerm}".`;
                partOfSpeech = fallbackResult.part_of_speech || "unknown";
                exampleSentence = fallbackResult.example || `I couldn't generate an example sentence for "${slangTerm}".`;
            } catch (parseError) {
                console.error("Error parsing fallback result:", parseError);
                definition = `Could not determine a definition for "${slangTerm}".`;
                partOfSpeech = "unknown";
                exampleSentence = `I couldn't generate an example sentence for "${slangTerm}".`;
            }
        } else {
            // Use the knowledge base info and generate an example sentence
            definition = slangInfo.definition;
            partOfSpeech = slangInfo.part_of_speech;

            // Generate an example sentence using the slang term
            const examplePrompt = `
            The user has provided the slang term "${slangTerm}", which is defined as: "${slangInfo.definition}" and is a ${slangInfo.part_of_speech}.
            Generate a natural, casual example sentence using the slang term "${slangTerm}" in a way that matches its definition and part of speech.
            The sentence should feel conversational and appropriate for a modern, informal context.
            Return the example sentence as a plain string.
            `;

            console.log("Calling OpenAI for example sentence...");
            const exampleResponse = await fetch(
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
                            { role: "system", content: examplePrompt },
                            { role: "user", content: slangTerm },
                        ],
                        temperature: 0.7,
                    }),
                }
            );

            const exampleData = await exampleResponse.json();
            if (!exampleResponse.ok) {
                const errorMsg = exampleData.error?.message || "Failed to generate example sentence";
                console.error("Example sentence generation error:", {
                    status: exampleResponse.status,
                    statusText: exampleResponse.statusText,
                    errorMsg,
                    responseData: exampleData,
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
                exampleSentence = exampleData.choices[0].message.content.trim();
            } catch (parseError) {
                console.error("Error parsing example sentence:", parseError);
                exampleSentence = `I couldn't generate an example sentence for "${slangTerm}".`;
            }
        }

        console.log("Final response:", { slangTerm, definition, partOfSpeech, exampleSentence });

        // Return the slang term info and example sentence
        return NextResponse.json({
            slang_term: slangTerm,
            definition: definition,
            part_of_speech: partOfSpeech,
            example: exampleSentence,
        });
    } catch (error) {
        console.error("Error in /api/openai:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to process the slang term";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}