import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
    startOnLoad: false,
    theme: 'forest',
    securityLevel: 'loose',
    fontFamily: 'inherit',
});

export default function Mermaid({ chart }) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current && chart) {
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
            mermaid.render(id, chart).then(({ svg }) => {
                if (containerRef.current) {
                    containerRef.current.innerHTML = svg;
                }
            }).catch((error) => {
                console.error('Mermaid rendering failed:', error);
                if (containerRef.current) {
                    containerRef.current.innerHTML = `<div class="text-red-500 text-sm p-2 border border-red-200 rounded bg-red-50">Failed to render diagram: ${error.message}</div>`;
                }
            });
        }
    }, [chart]);

    return <div ref={containerRef} className="mermaid my-4 flex justify-center overflow-x-auto" />;
}
