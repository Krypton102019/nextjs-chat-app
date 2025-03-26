"use client";

import { useState } from "react";

interface Message {
  text: string;
  sender: "user" | "ai";
  suggestions?: { happy: string; caring: string; playful: string };
}

interface ChatProps {
  onSendMessage: (message: string) => Promise<{ suggestions: { happy: string; caring: string; playful: string } }>;
}

const Chat: React.FC<ChatProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;

    // Add the user's full prompt to the chat
    const userMessage: Message = { text: message, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setMessage(""); // Clear the input field

    // Call the API to get suggestions
    try {
      const response = await onSendMessage(message);
      const { suggestions } = response;

      // Add the suggestions to the chat as a single message
      const suggestionMessage: Message = {
        text: "Suggestions to send to your family member:",
        sender: "ai",
        suggestions: {
          happy: suggestions.happy,
          caring: suggestions.caring,
          playful: suggestions.playful,
        },
      };
      setMessages((prev) => [...prev, suggestionMessage]);
      setError(null);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setError("Sorry, I couldn't fetch suggestions. Try again later!");
    }
  };

  return (
      <div className="flex flex-col h-screen bg-gray-100 max-w-md mx-auto">
        <div className="bg-green-500 text-white p-4 text-center">
          <h1 className="text-lg font-bold">Family Chat AI</h1>
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
                  {msg.sender === "ai" && msg.suggestions ? (
                      <div>
                        <strong>{msg.text}</strong>
                        <ul className="mt-2">
                          <li>
                            <strong>Happy:</strong> {msg.suggestions.happy}
                          </li>
                          <li>
                            <strong>Caring:</strong> {msg.suggestions.caring}
                          </li>
                          <li>
                            <strong>Playful:</strong> {msg.suggestions.playful}
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
              placeholder="E.g., 'My girlfriend is mad. Suggest me.'"
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