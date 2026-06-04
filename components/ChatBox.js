'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * ChatBox component
 *
 * A self-contained chat UI. It manages its own message history and
 * sends requests to /api/chat. Drop it into any page with <ChatBox />.
 */
export default function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  async function sendMessage(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Request failed');

      setMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto border border-gray-200 rounded-2xl shadow-sm bg-white overflow-hidden">

      {/* Message area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Send a message to get started
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-black text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-400 px-4 py-2 rounded-2xl rounded-bl-sm text-sm">
              Thinking...
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-500 text-sm text-center px-4 py-2 bg-red-50 rounded-lg">
            Error: {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={sendMessage}
        className="border-t border-gray-100 p-3 flex gap-2 bg-white"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isLoading}
          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-50 transition"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-black text-white text-sm rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
