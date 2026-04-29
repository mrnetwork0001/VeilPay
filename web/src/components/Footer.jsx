export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-brand">VeilPay</div>
        <p>Confidential salary matching powered by <strong style={{ color: 'var(--violet-light)' }}>Zama fhEVM</strong></p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
          Built for the Zama Builder Track Hackathon · Deployed on Sepolia ·{' '}
          <a
            href={`https://sepolia.etherscan.io/address/${import.meta.env.VITE_CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--cyan-light)' }}
          >
            View Contract on Etherscan
          </a>
        </p>
      </div>
    </footer>
  );
}
