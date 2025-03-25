"use client";

import { useState, useRef } from "react";

interface Message {
  text: string;
  sender: "user" | "family";
  sentiment?: string;
  suggestions?: string[];
}

interface ChatProps {
  onSendMessage: (message: string) => Promise<{ sentiment: string; suggestions: string[]; exampleMessage: string }>;
}

const Chat: React.FC<ChatProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState<boolean>(false); // New state to track fetching
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowMenu(true);
    }, 500) as unknown as NodeJS.Timeout;
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const fetchSuggestions = async (input: string, retries = 2): Promise<string[]> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Attempt ${attempt}: Calling onSendMessage for suggestions with input:`, input);
        const response = await onSendMessage(input);
        console.log("Response from onSendMessage for suggestions:", response);

        const { suggestions = [] } = response;
        if (!Array.isArray(suggestions) || suggestions.length === 0) {
          throw new Error("No valid suggestions returned from onSendMessage");
        }

        return suggestions;
      } catch (error) {
        console.error(`Attempt ${attempt} failed to fetch suggestions:`, error);
        if (attempt === retries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return [];
  };

  const handleAIGeneratedMessage = async (input: string, retries = 2): Promise<any> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Attempt ${attempt}: Calling onSendMessage with input:`, input);
        const response = await onSendMessage(input);
        console.log("Response from onSendMessage:", response);

        const { sentiment = "neutral", exampleMessage, suggestions = [] } = response;
        if (!exampleMessage) {
          throw new Error("No exampleMessage returned from onSendMessage");
        }

        setMessages((prev: Message[]) => [
          ...prev,
          { text: exampleMessage, sender: "family", sentiment, suggestions },
        ]);
        return { sentiment, suggestions, exampleMessage };
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        if (attempt === retries) {
          setMessages((prev: Message[]) => [
            ...prev,
            { text: "Sorry, I couldn't fetch a message. Try again later!", sender: "family" },
          ]);
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const handleSend = async () => {
    if (message.trim()) {
      const newMessages: Message[] = [...messages, { text: message, sender: "user" }];
      setMessages(newMessages);
      setMessage("");
      setShowMenu(false);

      await handleAIGeneratedMessage(message);
    }
  };

  const handleAISuggestion = async () => {
    if (isFetchingSuggestions) return; // Prevent multiple clicks while fetching

    setIsFetchingSuggestions(true); // Disable the button
    try {
      // Find the latest AI response (from "family" sender)
      const latestAIResponse = messages
          .slice()
          .reverse()
          .find(msg => msg.sender === "family");

      if (!latestAIResponse) {
        console.log("No AI response found to generate suggestions for.");
        setSuggestions([]);
        setShowMenu(false);
        setShowModal(false);
        return;
      }

      const inputForAI = latestAIResponse.text;
      console.log("Fetching suggestions based on latest AI response:", inputForAI);
      const fetchedSuggestions = await fetchSuggestions(inputForAI);
      const safeSuggestions = Array.isArray(fetchedSuggestions) ? fetchedSuggestions : [];
      setSuggestions(safeSuggestions);
      setShowMenu(false);
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
      setShowMenu(false);
      setShowModal(false);
    } finally {
      setIsFetchingSuggestions(false); // Re-enable the button after fetching completes
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setMessage(suggestion);
    setShowModal(false);
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
                  {msg.text}
                </div>
              </div>
          ))}
        </div>
        {showModal && suggestions.length > 0 && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 text-black">
              <div className="bg-white p-4 rounded-2xl shadow-lg max-w-md w-full mx-4">
                <h2 className="text-lg font-semibold mb-3">AI Suggestions</h2>
                <div className="mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Positive/Neutral</h3>
                  <button
                      onClick={() => handleSuggestionSelect(suggestions[0])}
                      className="block w-full text-left p-2 mt-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    {suggestions[0]}
                  </button>
                </div>
                <div className="mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Genuinely Caring</h3>
                  <button
                      onClick={() => handleSuggestionSelect(suggestions[1])}
                      className="block w-full text-left p-2 mt-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    {suggestions[1]}
                  </button>
                </div>
                <div className="mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Playful</h3>
                  <button
                      onClick={() => handleSuggestionSelect(suggestions[2])}
                      className="block w-full text-left p-2 mt-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    {suggestions[2]}
                  </button>
                </div>
                <button
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full text-center text-sm text-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
        )}
        {showMenu && (
            <div className="absolute bottom-18 right-4 flex space-x-2">
              <button
                  className="bg-green-500 text-white p-3 rounded-full"
                  onClick={() => alert("Files feature not implemented yet.")}
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </button>
              <button
                  className="bg-green-500 text-white p-3 rounded-full"
                  onClick={() => alert("Photos feature not implemented yet.")}
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
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <button
                  className="bg-green-500 text-white p-3 rounded-full"
                  onClick={() => alert("Emoji feature not implemented yet.")}
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
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              <button
                  className={`bg-green-500 text-white p-3 rounded-full ${isFetchingSuggestions ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={handleAISuggestion}
                  disabled={isFetchingSuggestions} // Disable the button while fetching
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
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </button>
            </div>
        )}
        <div className="p-4 text-black flex items-center">
          <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask Family Chat AI..."
              className="flex-1 p-3 rounded-2xl border border-gray-300 focus:outline-none text-sm"
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
          />
          <button
              onMouseDown={handleLongPressStart}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={handleLongPressStart}
              onTouchEnd={handleLongPressEnd}
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