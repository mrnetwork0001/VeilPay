import { useState, useEffect, useRef } from 'react';
import { useContract } from '../hooks/useContract';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * FHE-Gated Chat Component
 * 
 * This chat channel is ONLY available because Zama's FHE computed
 * FHE.le(candidate_salary, employer_budget) = true on encrypted data.
 * Without that encrypted comparison passing, this UI never renders.
 */
export default function FheChat({ jobId, applicationId, counterpartyName, isEmployer }) {
  const { sendMessage, getMessages, account } = useContract();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const msgs = await getMessages(jobId, applicationId);
      setMessages(msgs);
    } catch (err) {
      console.warn('Failed to load messages:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      // Poll for new messages every 15 seconds when chat is open
      const interval = setInterval(loadMessages, 15000);
      return () => clearInterval(interval);
    }
  }, [isOpen, jobId, applicationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    try {
      toast.loading('Sending message on-chain...', { id: 'chat-tx' });
      await sendMessage(jobId, applicationId, content);
      toast.success('Message sent!', { id: 'chat-tx', duration: 2000 });
      // Reload messages after sending
      await loadMessages();
    } catch (err) {
      toast.error('Failed to send: ' + (err.message || 'Unknown error'), { id: 'chat-tx' });
      setNewMessage(content); // Restore the message on failure
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const isSelf = (sender) => {
    return sender?.toLowerCase() === account?.toLowerCase();
  };

  return (
    <div style={{ marginTop: '0.75rem' }}>
      {/* Toggle Button */}
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => setIsOpen(p => !p)}
        style={{
          fontSize: '0.78rem',
          display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}
      >
        💬 {isOpen ? 'Close Chat' : `Chat with ${counterpartyName}`}
        {messages.length > 0 && !isOpen && (
          <span style={{
            background: 'var(--purple)', color: '#fff',
            borderRadius: '50%', width: '1.2rem', height: '1.2rem',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 700,
          }}>
            {messages.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              marginTop: '0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              background: 'rgba(255,255,255,0.02)',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                padding: '0.6rem 1rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(139,92,246,0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem' }}>🔐</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
                    FHE-Gated Chat
                  </span>
                </div>
                <span style={{
                  fontSize: '0.65rem', color: 'var(--white-50)',
                  background: 'rgba(0,255,200,0.1)', padding: '0.15rem 0.5rem',
                  borderRadius: '1rem', border: '1px solid rgba(0,255,200,0.2)',
                }}>
                  Unlocked by FHE.le() match
                </span>
              </div>

              {/* Messages Area */}
              <div style={{
                height: '280px', overflowY: 'auto',
                padding: '0.75rem 1rem',
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
              }}>
                {loading ? (
                  <div style={{ textAlign: 'center', color: 'var(--white-50)', padding: '2rem 0' }}>
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{
                    textAlign: 'center', color: 'var(--white-50)',
                    padding: '2rem 0', fontSize: '0.85rem',
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔓</div>
                    <div>Chat channel unlocked by FHE salary match.</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      Send the first message to start the conversation.
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const self = isSelf(msg.sender);
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: self ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div style={{
                          maxWidth: '75%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: self
                            ? '0.75rem 0.75rem 0.15rem 0.75rem'
                            : '0.75rem 0.75rem 0.75rem 0.15rem',
                          background: self
                            ? 'linear-gradient(135deg, var(--purple), var(--purple-light, #a855f7))'
                            : 'rgba(255,255,255,0.06)',
                          border: self ? 'none' : '1px solid var(--border)',
                        }}>
                          <div style={{ fontSize: '0.65rem', color: self ? 'rgba(255,255,255,0.7)' : 'var(--cyan)', marginBottom: '0.2rem', fontWeight: 600 }}>
                            {self ? 'You' : counterpartyName}
                          </div>
                          <div style={{ fontSize: '0.82rem', lineHeight: 1.4, wordBreak: 'break-word' }}>
                            {msg.content}
                          </div>
                          <div style={{ fontSize: '0.6rem', color: self ? 'rgba(255,255,255,0.5)' : 'var(--white-50)', marginTop: '0.25rem', textAlign: 'right' }}>
                            {formatTime(msg.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div style={{
                padding: '0.6rem 0.75rem',
                borderTop: '1px solid var(--border)',
                display: 'flex', gap: '0.5rem', alignItems: 'center',
                background: 'rgba(0,0,0,0.2)',
              }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  disabled={sending}
                  style={{
                    flex: 1, padding: '0.5rem 0.75rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    color: 'var(--white)',
                    fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  className="btn btn-primary btn-sm"
                  style={{
                    fontSize: '0.78rem', padding: '0.5rem 1rem',
                    opacity: sending || !newMessage.trim() ? 0.5 : 1,
                  }}
                >
                  {sending ? '⏳' : '📨 Send'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
