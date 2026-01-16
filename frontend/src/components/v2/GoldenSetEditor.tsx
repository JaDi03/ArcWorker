import React, { useState, useEffect } from 'react';
import { Info, Maximize2, X } from 'lucide-react';

interface GoldenSetEditorProps {
    textContent: string;
    entityTags: string[];
    value: string; // The current JSON string of the answer
    onChange: (jsonValue: string) => void;
}

interface NerAnnotation {
    start: number;
    end: number;
    text: string;
    tag: string;
    color: string;
}

export const GoldenSetEditor: React.FC<GoldenSetEditorProps> = ({
    textContent,
    entityTags,
    value,
    onChange
}) => {
    const [annotations, setAnnotations] = useState<NerAnnotation[]>([]);
    const [activeTag, setActiveTag] = useState<string | null>(null);

    // Initialize state from props if value exists
    useEffect(() => {
        if (value) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    // Restore colors if missing
                    const withColors = parsed.map((a: any) => ({
                        ...a,
                        color: a.color || getTagColor(a.tag)
                    }));
                    setAnnotations(withColors);
                }
            } catch (e) {
                // Invalid JSON, ignore
            }
        }
    }, []); // Only on mount

    // Update parent whenever annotations change
    useEffect(() => {
        let newJson = "";
        if (annotations.length > 0) {
            // Strip color before saving
            const clean = annotations.map(({ start, end, text, tag }) => ({ start, end, text, tag }));
            newJson = JSON.stringify(clean);
        }

        // Only trigger onChange if the value is actually different
        // This prevents infinite loops when the parent re-renders with a new 'onChange' reference
        if (newJson !== value) {
            onChange(newJson);
        }
    }, [annotations, onChange, value]);

    // Color generator
    const getTagColor = (tag: string) => {
        let hash = 0;
        for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 70%, 85%)`;
    };

    const handleNerSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const container = document.getElementById('golden-set-container');
        if (!container || !container.contains(selection.anchorNode)) return;

        if (!activeTag) {
            alert("Please select a tag first.");
            return;
        }

        const range = selection.getRangeAt(0);

        // Robust Offset Calculation (Same as WorkerTaskInterface)
        const getCleanOffset = (node: Node, offset: number): number => {
            try {
                const preRange = document.createRange();
                preRange.selectNodeContents(container);
                preRange.setEnd(node, offset);

                const fragment = preRange.cloneContents();
                const tempDiv = document.createElement('div');
                tempDiv.appendChild(fragment);

                // Remove ignored
                const ignored = tempDiv.querySelectorAll('[data-ignore-ner="true"]');
                ignored.forEach(el => el.remove());

                return tempDiv.textContent?.length || 0;
            } catch (e) {
                console.error("Offset calc error", e);
                return -1;
            }
        };

        const start = getCleanOffset(range.startContainer, range.startOffset);
        const end = getCleanOffset(range.endContainer, range.endOffset);

        if (start === -1 || end === -1 || start >= end) return;

        const realText = textContent.slice(start, end);

        // Filter overlaps
        const newAnns = annotations.filter(a => (start >= a.end || end <= a.start));

        newAnns.push({
            start,
            end,
            text: realText,
            tag: activeTag,
            color: getTagColor(activeTag)
        });

        newAnns.sort((a, b) => a.start - b.start);
        setAnnotations(newAnns);
        selection.removeAllRanges();
    };

    const renderHighlightedText = () => {
        if (annotations.length === 0) return textContent;

        const segments = [];
        let lastIndex = 0;

        annotations.forEach((ann, i) => {
            // Text before
            if (ann.start > lastIndex) {
                segments.push(<span key={`txt-${i}`}>{textContent.slice(lastIndex, ann.start)}</span>);
            }

            // Highlight
            segments.push(
                <mark
                    key={`mark-${i}`}
                    className="relative cursor-pointer group rounded px-0.5 mx-0.5"
                    style={{ backgroundColor: ann.color }}
                >
                    {textContent.slice(ann.start, ann.end)}
                    <span
                        data-ignore-ner="true"
                        className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 select-none pointer-events-none"
                    >
                        {ann.tag}
                    </span>
                    <button
                        data-ignore-ner="true"
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 hover:bg-red-600 transition z-20 select-none"
                        onClick={(e) => {
                            e.stopPropagation();
                            setAnnotations(prev => prev.filter((_, idx) => idx !== i));
                        }}
                    >
                        ×
                    </button>
                </mark>
            );
            lastIndex = ann.end;
        });

        if (lastIndex < textContent.length) {
            segments.push(<span key="end">{textContent.slice(lastIndex)}</span>);
        }

        return segments;
    };

    if (!textContent) {
        return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                ⚠️ Please upload or enter text in the "Data Upload" section first.
            </div>
        );
    }

    if (!entityTags || entityTags.length === 0) {
        return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                ⚠️ Please define at least one "Entity Tag" above first.
            </div>
        );
    }

    return (
        <div className="space-y-4 border border-gray-200 rounded-xl p-4 bg-gray-50">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-200">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider py-1.5 mr-2">
                    Select Tag:
                </span>
                {entityTags.map(tag => (
                    <button
                        key={tag}
                        onClick={() => setActiveTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${activeTag === tag
                            ? 'ring-2 ring-offset-1 ring-blue-500'
                            : 'opacity-70 hover:opacity-100'
                            }`}
                        style={{
                            backgroundColor: getTagColor(tag),
                            borderColor: getTagColor(tag),
                            color: '#374151'
                        }}
                    >
                        {tag}
                    </button>
                ))}
            </div>

            {/* Editor Area */}
            <div className="relative">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                    Text Content (Highlight words to label)
                </p>
                <div
                    id="golden-set-container"
                    className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-sm leading-8 text-gray-800 font-medium whitespace-pre-wrap outline-none focus:ring-2 focus:ring-blue-500/20"
                    onMouseUp={handleNerSelection}
                >
                    {renderHighlightedText()}
                </div>
            </div>

            {/* Output Preview (Optional - Helpful for debugging/confidence) */}
            <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-[10px] text-gray-400">Generated JSON Code (Auto-saved):</p>
                <code className="block bg-gray-900 text-green-400 p-2 rounded text-[10px] font-mono mt-1 overflow-x-auto">
                    {value || "[]"}
                </code>
            </div>
        </div>
    );
};
