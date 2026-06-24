interface Quote {
  text: string;
  author: string;
}

interface MotivationalQuoteProps {
  currentQuote: Quote;
  currentQuoteIndex: number;
  totalQuotes: number;
  onPrevQuote: () => void;
  onNextQuote: () => void;
  onClose: () => void;
  show: boolean;
}

const MotivationalQuote = ({
  currentQuote,
  currentQuoteIndex,
  totalQuotes,
  onPrevQuote,
  onNextQuote,
  onClose,
  show,
}: MotivationalQuoteProps) => {
  if (!show) return null;

  return (
    <div className="relative overflow-hidden bg-surface border border-hairline rounded-lg p-8">
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-surface-2 rounded-lg">
                <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-fg">Training Plan</h2>
                <p className="text-fg-muted text-sm mt-1">Plan, Track, Improve</p>
              </div>
            </div>
            <blockquote className="border-l-4 border-hairline pl-4 py-2">
              <p className="text-fg text-lg italic font-medium">&quot;{currentQuote.text}&quot;</p>
              <cite className="text-fg-muted text-sm">— {currentQuote.author}</cite>
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={onPrevQuote}
                  className="p-2 bg-surface-2 hover:bg-surface-2 border border-hairline rounded-lg transition-colors"
                  title="Previous quote"
                >
                  <svg className="w-4 h-4 text-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-fg-subtle text-xs font-medium">
                  {currentQuoteIndex + 1} / {totalQuotes}
                </span>
                <button
                  onClick={onNextQuote}
                  className="p-2 bg-surface-2 hover:bg-surface-2 border border-hairline rounded-lg transition-colors"
                  title="Next quote"
                >
                  <svg className="w-4 h-4 text-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </blockquote>
          </div>
          <button
            onClick={onClose}
            className="text-fg-subtle hover:text-fg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MotivationalQuote;
