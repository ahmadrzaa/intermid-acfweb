import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-inner simple">
        <p className="footer-line footer-tagline">
          A strategic execution tool to classify, prioritize, and accelerate progress at all levels.
        </p>
        <p className="footer-line footer-copy">
          © {year} INTERMID Action Cycle Framework
        </p>
      </div>
    </footer>
  );
}
