"use client";

import { useState } from "react";

interface Message {
  text: string;
  sender: "user" | "ai";
}

interface ChatProps {
  onSendMessage: (message: string) => Promise<{
    translated_message: string;
  }>;
}

const Chat: React.FC<ChatProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;

    // Add the user's message to the chat
    const userMessage: Message = { text: message, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setMessage(""); // Clear the input field

    // Call the API to get the translated message
    try {
      const response = await onSendMessage(message);
      const { translated_message } = response;

      // Add the translated message to the chat
      const translationMessage: Message = {
        text: translated_message,
        sender: "ai",
      };
      setMessages((prev) => [...prev, translationMessage]);
      setError(null);
    } catch (error) {
      console.error("Failed to fetch translation:", error);
      setError("Sorry, I couldn't translate the message. Try again!");
    }
  };

  return (
      <div className="flex flex-col h-screen bg-gray-100 max-w-md mx-auto">
        <div className="bg-green-500 text-white p-4 text-center">
          <h1 className="text-lg font-bold">Gen Z to Gen X/Y Translator AI</h1>
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
                  {msg.text}
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
              placeholder="E.g., 'I’ve been so busy this week, it’s cray cray!'"
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