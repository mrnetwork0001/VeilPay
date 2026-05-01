import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useContract } from '../hooks/useContract';
import { useFhevm } from '../hooks/useFhevm';
import { useTransaction } from '../components/TransactionOverlay';
import { useAccount } from 'wagmi';

export default function ReviewModal({ isOpen, onClose, employerAddress, companyName }) {
  const { submitReview } = useContract();
  const { encryptUint8 } = useFhevm();
  const { startTransaction, updateStep, failTransaction, STATUS } = useTransaction();
  const { address: account } = useAccount();

  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      toast.error('Please select a rating (1-5 stars).');
      return;
    }

    setSubmitting(true);
    startTransaction('Submitting Anonymous Review', [
      'Encrypting rating via ZamaFHE',
      'Submitting encrypted review on-chain',
    ]);

    try {
      // Step 1: Encrypt the rating
      const { handle, inputProof } = await encryptUint8(rating, account);
      updateStep(0, STATUS.DONE, `Rating encrypted (${rating} stars)`);

      // Step 2: Submit to contract
      await submitReview(employerAddress, handle, inputProof);
      updateStep(1, STATUS.DONE, 'Review recorded anonymously');

      toast.success('Review submitted! Your identity is protected by FHE.', { icon: '🛡️' });
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('Already reviewed')) {
        failTransaction('You have already reviewed this employer.');
      } else {
        failTransaction(msg.slice(0, 120));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const starLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          {/* Modal */}
          <motion.div
            className="card relative z-10 w-full max-w-md mx-auto"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <div className="absolute top-4 left-4 card-screw" />
            <div className="absolute top-4 right-4 card-screw" />

            {/* Close button */}
            <button
              className="absolute top-3 right-12 p-1.5 rounded-full hover:bg-muted/40 text-ink-muted transition-colors"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6 border-b border-ink/10 pb-4">
              <div className="w-10 h-10 rounded-lg bg-chassis border border-white/40 shadow-floating flex items-center justify-center">
                <Shield className="w-5 h-5 text-ink" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-lg text-ink">Anonymous Review</h3>
                <span className="font-mono text-[10px] text-ink-muted uppercase tracking-widest">
                  {companyName || employerAddress?.slice(0, 10) + '...'}
                </span>
              </div>
            </div>

            {/* FHE Info */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-6 flex gap-2.5 shadow-recessed">
              <Shield className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <p className="text-[10px] font-mono text-ink-muted leading-relaxed">
                Your rating is <strong className="text-green-600">encrypted with FHE</strong> before reaching the blockchain.
                Individual scores are mathematically impossible to extract — only the aggregate average is ever revealed.
              </p>
            </div>

            {/* Star Rating */}
            <div className="text-center mb-6">
              <span className="text-[10px] font-mono text-ink-muted uppercase tracking-widest block mb-3">
                Rate your experience
              </span>
              <div className="flex justify-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-1 transition-transform hover:scale-110"
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoveredStar || rating)
                          ? 'text-yellow-500 fill-yellow-500 drop-shadow-[0_0_6px_rgba(234,179,8,0.4)]'
                          : 'text-ink-muted/30'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {(hoveredStar || rating) > 0 && (
                <span className="font-mono text-xs font-bold text-ink uppercase tracking-widest">
                  {starLabels[hoveredStar || rating]}
                </span>
              )}
            </div>

            {/* Submit */}
            <button
              id="submit-review-btn"
              className="btn btn-primary w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-floating"
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
            >
              {submitting ? 'Encrypting & Submitting...' : `Submit ${rating > 0 ? rating + '-Star' : ''} Review`}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
