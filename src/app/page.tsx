"use client";

import Chat from "@/components/Chat";
import { useState } from "react";

interface Message {
  text: string;
  sender: "user" | "ai" | "family";
  sentiment?: string;
  suggestions?: string[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = async (message: string): Promise<{ sentiment: string; suggestions: string[]; exampleMessage: string }> => {
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

      if (!data.exampleMessage) {
        throw new Error("No exampleMessage in response");
      }

      return {
        sentiment: data.sentiment || "neutral",
        suggestions: data.suggestions || [],
        exampleMessage: data.exampleMessage,
      };
    } catch (error) {
      console.error("Error with OpenAI API:", error);
      setMessages((prev: Message[]) => [
        ...prev,
        { text: "Sorry, I couldn't respond. Try again!", sender: "ai" },
      ]);
      throw error;
    }
  };

  return (
      <div>
        <Chat onSendMessage={handleSendMessage} />
      </div>
  );
}