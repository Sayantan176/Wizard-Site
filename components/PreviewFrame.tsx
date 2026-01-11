
import React, { useEffect, useRef, useState } from 'react';

interface PreviewFrameProps {
  code: string;
  isEditing: boolean;
  onElementSelected?: (data: { tag: string; colors: { bg: string; text: string }; textContent: string }) => void;
  onCodeUpdate?: (newCode: string) => void;
}

const PreviewFrame: React.FC<PreviewFrameProps> = ({ code, isEditing, onElementSelected, onCodeUpdate }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const internalCodeRef = useRef<string>(code);
  const [iframeKey, setIframeKey] = useState(0);

  // This script is injected into the iframe to provide the interactive editing experience
  const editorScript = `
    <script id="wizard-editor-runtime">
      (function() {
        let selectedElement = null;
        let isDragging = false;
        let startX, startY;
        let currentDragElement = null;
        let isEditingMode = ${isEditing};

        // Utility to clean up HTML before sending it back to parent
        function getCleanHTML() {
          const clone = document.documentElement.cloneNode(true);
          const editorScript = clone.querySelector('#wizard-editor-runtime');
          if (editorScript) editorScript.remove();
          
          // Remove editor specific inline styles and attributes
          clone.querySelectorAll('*').forEach(el => {
            if (el.style.outline) {
              el.style.outline = '';
              el.style.outlineOffset = '';
            }
            if (el.contentEditable === 'true' || el.hasAttribute('contenteditable')) {
              el.removeAttribute('contenteditable');
            }
          });
          
          return '<!DOCTYPE html>\\n' + clone.outerHTML;
        }

        function syncCode() {
          const cleanHTML = getCleanHTML();
          window.parent.postMessage({
            type: 'CODE_UPDATED_FROM_EDITOR',
            code: cleanHTML
          }, '*');
        }

        function updateSelectionUI(el) {
          // Clear previous
          document.querySelectorAll('*').forEach(item => {
             if (item !== el) {
               item.style.outline = '';
               item.style.outlineOffset = '';
             }
          });

          if (el && isEditingMode) {
            el.style.outline = '3px solid #8b5cf6';
            el.style.outlineOffset = '-3px';
          }
        }

        document.addEventListener('mouseover', (e) => {
          if (!isEditingMode || isDragging || e.target === document.body || e.target === document.documentElement) return;
          if (e.target !== selectedElement) {
            e.target.style.outline = '2px dashed #8b5cf6';
            e.target.style.outlineOffset = '-2px';
          }
        });

        document.addEventListener('mouseout', (e) => {
          if (!isEditingMode || isDragging) return;
          if (e.target !== selectedElement) {
            e.target.style.outline = '';
          }
        });

        document.addEventListener('mousedown', (e) => {
          if (!isEditingMode || e.button !== 0 || e.target === document.body || e.target === document.documentElement) return;
          
          currentDragElement = e.target;
          startX = e.clientX;
          startY = e.clientY;
        });

        document.addEventListener('mousemove', (e) => {
          if (!isEditingMode || !currentDragElement) return;

          const dx = e.clientX - startX;
          const dy = e.clientY - startY;

          if (!isDragging && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
            isDragging = true;
            currentDragElement.style.opacity = '0.4';
            currentDragElement.style.pointerEvents = 'none';
          }
        });

        document.addEventListener('mouseup', (e) => {
          if (!isEditingMode) return;

          if (isDragging && currentDragElement) {
            currentDragElement.style.opacity = '';
            currentDragElement.style.pointerEvents = '';
            
            const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
            if (dropTarget && dropTarget !== currentDragElement && dropTarget !== document.body && dropTarget !== document.documentElement) {
              const rect = dropTarget.getBoundingClientRect();
              const midpoint = rect.top + rect.height / 2;
              
              if (e.clientY < midpoint) {
                dropTarget.parentNode.insertBefore(currentDragElement, dropTarget);
              } else {
                dropTarget.parentNode.insertBefore(currentDragElement, dropTarget.nextSibling);
              }
            }
            isDragging = false;
            syncCode();
            updateSelectionUI(currentDragElement);
          } else if (currentDragElement) {
            if (selectedElement) {
              selectedElement.removeAttribute('contenteditable');
            }

            selectedElement = currentDragElement;
            updateSelectionUI(selectedElement);
            selectedElement.contentEditable = 'true';

            const style = window.getComputedStyle(selectedElement);
            window.parent.postMessage({
              type: 'ELEMENT_SELECTED',
              tag: selectedElement.tagName,
              textContent: selectedElement.innerText,
              colors: {
                bg: style.backgroundColor,
                text: style.color
              }
            }, '*');
          }

          currentDragElement = null;
        });

        document.addEventListener('input', (e) => {
          if (isEditingMode && selectedElement) {
            syncCode();
          }
        });

        window.addEventListener('message', (event) => {
          const { type, payload } = event.data;
          
          if (type === 'ADD_ELEMENT') {
            const el = document.createElement(payload.tag);
            el.innerText = payload.text || 'New Element';
            el.className = payload.className || 'p-4 m-2 rounded-lg';
            if (selectedElement && selectedElement.parentNode) {
              selectedElement.parentNode.insertBefore(el, selectedElement.nextSibling);
            } else {
              document.body.appendChild(el);
            }
            syncCode();
            return;
          }

          if (type === 'SET_EDIT_MODE') {
            isEditingMode = payload;
            if (!payload && selectedElement) {
              selectedElement.style.outline = '';
              selectedElement.removeAttribute('contenteditable');
              selectedElement = null;
            }
            document.body.style.cursor = payload ? 'crosshair' : 'default';
            return;
          }

          if (!selectedElement) return;

          if (type === 'UPDATE_STYLE') {
            selectedElement.style[payload.key] = payload.value;
            syncCode();
          }

          if (type === 'DELETE_ELEMENT') {
            selectedElement.remove();
            selectedElement = null;
            syncCode();
          }
        });
      })();
    </script>
  `;

  // Inject the editor script safely
  const getFinalCode = (rawCode: string) => {
    return rawCode.includes('</body>') 
      ? rawCode.replace('</body>', `${editorScript}</body>`)
      : `${rawCode}${editorScript}`;
  };

  // Handle external code updates (AI or History)
  useEffect(() => {
    if (code !== internalCodeRef.current) {
      internalCodeRef.current = code;
      // Force an iframe reload by changing the key when external code arrives
      setIframeKey(prev => prev + 1);
    }
  }, [code]);

  // Handle incoming messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'ELEMENT_SELECTED') {
        onElementSelected?.(event.data);
      } else if (event.data.type === 'CODE_UPDATED_FROM_EDITOR') {
        // Track the code generated by the editor to prevent redundant reloads
        internalCodeRef.current = event.data.code;
        onCodeUpdate?.(event.data.code);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onElementSelected, onCodeUpdate]);

  // Sync edit mode state to iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'SET_EDIT_MODE', payload: isEditing }, '*');
    }
  }, [isEditing, iframeKey]);

  return (
    <div className="w-full h-full bg-white overflow-hidden relative">
      <iframe
        key={iframeKey}
        ref={iframeRef}
        title="Site Preview"
        srcDoc={getFinalCode(internalCodeRef.current)}
        className="w-full h-full border-none shadow-sm"
        sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
      />
    </div>
  );
};

export default PreviewFrame;
