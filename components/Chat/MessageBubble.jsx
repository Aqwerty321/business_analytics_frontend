import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <article
      role="listitem"
      aria-label={`${isUser ? 'User' : 'Assistant'} message`}
      className={clsx('animate-riseIn flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={clsx(
          'max-w-[92%] rounded-2xl border px-4 py-3 text-sm leading-6 md:max-w-[80%]',
          isUser
            ? 'border-accent/30 bg-accent/15 text-slate-100'
            : 'border-slate-700/90 bg-slate-900/60 text-slate-100',
          message.isStreaming && 'shadow-[0_0_0_1px_rgba(31,143,255,0.35)]'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="markdown-body prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => (
                  <a
                    {...props}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent underline-offset-2 hover:underline"
                  />
                )
              }}
            >
              {message.content || '...'}
            </ReactMarkdown>
          </div>
        )}

        <div className="mt-2 text-[11px] text-slate-400">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </article>
  );
}
