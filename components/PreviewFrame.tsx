
import React from 'react';

interface PreviewFrameProps {
  code: string;
}

const PreviewFrame: React.FC<PreviewFrameProps> = ({ code }) => {
  return (
    <div className="w-full h-full border rounded-lg bg-white overflow-hidden shadow-inner">
      <iframe
        title="Site Preview"
        srcDoc={code}
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-forms allow-modals"
      />
    </div>
  );
};

export default PreviewFrame;
