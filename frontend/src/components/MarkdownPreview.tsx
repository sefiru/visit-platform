import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MarkdownPreview.css';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

const MarkdownPreview = ({ content, className = '' }: MarkdownPreviewProps) => {
  if (!content || content.trim() === '') {
    return null;
  }

  return (
    <div className={`markdown-preview ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownPreview;
