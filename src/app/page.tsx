"use client";

import Chat from "@/components/Chat";
import { useState } from "react";

interface Message {
  text: string;
  sender: "user" | "ai";
  slangInfo?: {
    slang_term: string;
    definition: string;
    part_of_speech: string;
    example: string;
  };
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = async (message: string): Promise<{
    slang_term: string;
    definition: string;
    part_of_speech: string;
    example: string;
  }> => {
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

      if (!data.slang_term || !data.definition || !data.part_of_speech || !data.example) {
        throw new Error("Invalid slang term info format in response");
      }

      return {
        slang_term: data.slang_term,
        definition: data.definition,
        part_of_speech: data.part_of_speech,
        example: data.example,
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