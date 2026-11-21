import { useState } from 'react';

interface SafeImageProps {
  src: string;
  alt: string;
  title?: string;
  className?: string;
}

export function SafeImage({ src, alt, title, className = '' }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#EFECE6] text-[#57534E] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <svg
          width="36"
          height="48"
          viewBox="0 0 36 48"
          fill="none"
          aria-hidden="true"
          className="mb-3 text-[#9A7B4F]"
        >
          <rect x="11" y="2" width="14" height="9" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 11V16H22V11" stroke="currentColor" strokeWidth="1.5" />
          <rect x="5" y="16" width="26" height="30" rx="2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span className="font-serif text-lg text-[#141413]">{title || alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
