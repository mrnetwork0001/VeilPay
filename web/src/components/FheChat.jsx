import { useState, useEffect, useRef } from 'react';
import { useContract } from '../hooks/useContract';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Lock, Send, X, Unlock } from 'lucide-react';

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
    <div className="mt-4 w-full">
      {/* Toggle Button */}
      <button
        className="btn btn-secondary w-full md:w-auto"
        onClick={() => setIsOpen(p => !p)}
      >
        <span className="flex items-center gap-2">
          {isOpen ? <X className="w-5 h-5 text-ink bg-accent rounded p-0.5" /> : <MessageSquare className="w-4 h-4 text-ink-muted" />}
          {isOpen ? 'Close Secure Channel' : `Communicate with ${counterpartyName}`}
        </span>
        {messages.length > 0 && !isOpen && (
          <span className="bg-accent text-white px-2 py-0.5 rounded-full text-xs font-mono shadow-glow flex items-center justify-center min-w-[20px]">
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
            transition={{ duration: 0.3, ease: [0.175, 0.885, 0.32, 1.275] }}
            className="overflow-hidden w-full"
          >
            <div className="mt-4 bg-chassis border border-white/40 shadow-recessed rounded-xl overflow-hidden">
              {/* Header */}
              <div className="bg-muted/30 border-b border-ink/10 p-3 flex justify-between items-center relative">
                <div className="absolute top-1/2 left-2 -translate-y-1/2 card-screw w-4 h-4"></div>
                <div className="absolute top-1/2 right-2 -translate-y-1/2 card-screw w-4 h-4"></div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Lock className="w-4 h-4 text-ink" />
                  <span className="font-sans font-bold text-sm tracking-tight text-ink">
                    Secure Relay
                  </span>
                </div>
                <span className="mr-4 text-[9px] font-mono font-bold text-green-600 bg-green-500/10 px-2 py-1 rounded uppercase tracking-widest border border-green-500/20 flex items-center gap-1.5">
                  <span className="led led-green w-1.5 h-1.5 shadow-none" />
                  FHE Match Confirmed
                </span>
              </div>

              {/* Messages Area */}
              <div className="h-[320px] overflow-y-auto p-4 flex flex-col gap-3 bg-[url('data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1h18v18H1V1zm1 1v16h16V2H2z\' fill=\'%23d1d9e6\' fill-opacity=\'0.2\' fill-rule=\'evenodd\'/%3E%3C/svg%3E')]">
                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-ink-muted text-sm font-mono gap-2 animate-pulse">
                    <span className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></span>
                    Initializing secure connection...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-ink-muted text-center p-6 bg-chassis/80 rounded-lg shadow-recessed mx-4 my-auto border border-white/40 backdrop-blur-sm">
                    <Unlock className="w-8 h-8 text-ink bg-accent p-1.5 mb-3 shadow-floating rounded-full" />
                    <div className="font-sans font-bold text-ink text-sm">Channel Unlocked</div>
                    <div className="text-xs font-mono mt-2 leading-relaxed">
                      Zama FHE confirmed a salary match.<br/>
                      Transmit first datagram to begin.
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const self = isSelf(msg.sender);
                    return (
                      <div
                        key={i}
                        className={`flex w-full ${self ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] p-3 shadow-card border border-white/40 ${
                          self 
                            ? 'bg-panel rounded-t-xl rounded-l-xl rounded-br-sm' 
                            : 'bg-muted/40 rounded-t-xl rounded-r-xl rounded-bl-sm shadow-recessed border-none'
                        }`}>
                          <div className={`text-[10px] font-mono font-bold tracking-wider mb-1 ${self ? 'text-ink bg-accent px-1.5 py-0.5 rounded inline-block shadow-floating border border-ink/10' : 'text-ink'}`}>
                            {self ? 'LOCAL' : 'REMOTE'}
                          </div>
                          <div className="text-sm text-ink leading-relaxed whitespace-pre-wrap font-sans">
                            {msg.content}
                          </div>
                          <div className="text-[9px] font-mono text-ink-muted mt-2 text-right">
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
              <div className="p-3 bg-muted/20 border-t border-ink/10 flex gap-2 items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Transmit datagram..."
                  disabled={sending}
                  className="form-input flex-1 py-3 text-sm h-12 placeholder:text-ink-muted/60"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  className="btn btn-primary h-12 w-12 !p-0 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
