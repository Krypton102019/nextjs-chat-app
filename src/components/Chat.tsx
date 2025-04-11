"use client";

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

interface ChatProps {
  onSendMessage: (message: string) => Promise<{
    slang_term: string;
    definition: string;
    part_of_speech: string;
    example: string;
  }>;
}

const Chat: React.FC<ChatProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;

    // Add the user's slang term to the chat
    const userMessage: Message = { text: message, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setMessage(""); // Clear the input field

    // Call the API to get slang term info
    try {
      const response = await onSendMessage(message);
      const { slang_term, definition, part_of_speech, example } = response;

      // Add the slang term info to the chat
      const slangMessage: Message = {
        text: `Here's the info for "${slang_term}":`,
        sender: "ai",
        slangInfo: {
          slang_term,
          definition,
          part_of_speech,
          example,
        },
      };
      setMessages((prev) => [...prev, slangMessage]);
      setError(null);
    } catch (error) {
      console.error("Failed to fetch slang info:", error);
      setError("Sorry, I couldn't fetch the slang term info. Try another term!");
    }
  };

  return (
      <div className="flex flex-col h-screen bg-gray-100 max-w-md mx-auto">
        <div className="bg-green-500 text-white p-4 text-center">
          <h1 className="text-lg font-bold">Slang Translator AI</h1>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.map((msg, index) => (
              <div
                  key={index}
                  className={`mb-4 flex ${
                      msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                <div
                    className={`p-3 rounded-2xl max-w-xs ${
                        msg.sender === "user" ? "bg-white text-black" : "bg-blue-200 text-black"
                    }`}
                >
                  {msg.sender === "ai" && msg.slangInfo ? (
                      <div>
                        <strong>{msg.text}</strong>
                        <ul className="mt-2">
                          <li>
                            <strong>Definition:</strong> {msg.slangInfo.definition}
                          </li>
                          <li>
                            <strong>Part of Speech:</strong> {msg.slangInfo.part_of_speech}
                          </li>
                          <li>
                            <strong>Example:</strong> {msg.slangInfo.example}
                          </li>
                        </ul>
                      </div>
                  ) : (
                      msg.text
                  )}
                </div>
              </div>
          ))}
          {error && (
              <div className="mb-4 flex justify-start">
                <div className="p-3 rounded-2xl max-w-xs bg-red-200 text-black">
                  {error}
                </div>
              </div>
          )}
        </div>
        <div className="p-4 text-black flex items-center">
          <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="E.g., 'skibidi'"
              className="flex-1 p-3 rounded-2xl border border-gray-300 focus:outline-none text-sm"
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
          />
          <button
              onClick={handleSend}
              className="ml-2 bg-green-500 text-white p-3 rounded-full"
          >
            <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
            >
              <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          </button>
        </div>
      </div>
  );
};

export default Chat;