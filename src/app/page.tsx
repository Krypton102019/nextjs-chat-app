"use client";

import Chat from "@/components/Chat";
import { useState } from "react";

interface Message {
  text: string;
  sender: "user" | "ai";
  suggestions?: { happy: string; caring: string; playful: string };
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = async (message: string): Promise<{ suggestions: { happy: string; caring: string; playful: string } }> => {
    try {
      const response = await fetch("/api/openai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch response from /api/openai: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Response from /api/openai in handleSendMessage:", data);

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.suggestions || !data.suggestions.happy || !data.suggestions.caring || !data.suggestions.playful) {
        throw new Error("Invalid suggestions format in response");
      }

      return {
        suggestions: {
          happy: data.suggestions.happy,
          caring: data.suggestions.caring,
          playful: data.suggestions.playful,
        },
      };
    } catch (error) {
      console.error("Error with OpenAI API:", error);
      throw error; // Let Chat.tsx handle the error
    }
  };

  return (
      <div>
        <Chat onSendMessage={handleSendMessage} />
      </div>
  );
}