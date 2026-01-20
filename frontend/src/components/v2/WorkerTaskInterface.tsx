import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Timer,
    ArrowRight,
    ScanLine,
    MousePointer2,
    Hexagon,
    Brush,
    SkipBack,
    Play,
    SkipForward,
    Mic,
    Loader2,
    Zap,
    Clock,
    Users,
    Info,
    Trash2,
    XCircle,
    X,
    Maximize2,
    ArrowLeft
} from 'lucide-react';

export interface TaskData {
    id: string;
    type: 'vision' | 'nlp' | 'audio' | 'form';
    title: string;
    subtitle?: string;
    reward?: string;
    verificationType?: string;

    // Data payloads
    imageUrl?: string;
    textContent?: string;
    audioUrl?: string;
    formData?: any; // Survey questions schema could go here
}

export interface TaskConfig {
    instruction: string;
    tools?: ('draw' | 'select' | 'poly' | 'brush')[];
    classes?: { id: string | number; name: string; color?: string }[];
    hasTranscribeInput?: boolean;
    hasRecordInput?: boolean;
    hasTranslationInput?: boolean;
    exampleImageUrl?: string;
    entityTags?: string[];
}

export interface WorkerTaskInterfaceProps {
    task: TaskData;
    config: TaskConfig;
    onSubmit: (result: any) => Promise<void> | void;
    onExit: () => void;
}

export const WorkerTaskInterface: React.FC<WorkerTaskInterfaceProps> = ({
    task,
    config,
    onSubmit,
    onExit
}) => {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form/Input States
    const [textInput, setTextInput] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string | number | null>(null);

    // NER State
    const [nerAnnotations, setNerAnnotations] = useState<{ start: number, end: number, text: string, tag: string, color: string }[]>([]);
    const [activeNerTag, setActiveNerTag] = useState<string | null>(null);

    // Color generator for tags
    const getTagColor = (tag: string) => {
        let hash = 0;
        for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 70%, 85%)`; // Pastel background
    };

    const handleNerSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const container = document.getElementById('ner-text-container');
        if (!container || !container.contains(selection.anchorNode)) return;

        if (!activeNerTag) {
            alert("Please select a tag from the toolbar first.");
            return;
        }

        const range = selection.getRangeAt(0);

        // ULTRA-ROBUST OFFSET CALCULATION
        // Clone the content *before* the selection start/end, strip out ignored UI elements, 
        // and count the remaining text length. This handles all DOM complexity.

        const getCleanOffset = (node: Node, offset: number): number => {
            try {
                const preRange = document.createRange();
                preRange.selectNodeContents(container);
                preRange.setEnd(node, offset);

                const fragment = preRange.cloneContents();
                const tempDiv = document.createElement('div');
                tempDiv.appendChild(fragment);

                // Remove all ignored elements (badges, buttons)
                const ignored = tempDiv.querySelectorAll('[data-ignore-ner="true"]');
                ignored.forEach(el => el.remove());

                return tempDiv.textContent?.length || 0;
            } catch (e) {
                console.error("Offset calculation failed", e);
                return -1;
            }
        };

        const start = getCleanOffset(range.startContainer, range.startOffset);
        const end = getCleanOffset(range.endContainer, range.endOffset);

        if (start === -1 || end === -1 || start >= end) {
            console.warn("Invalid selection offsets calculated.");
            return;
        }

        // Get the real text content using the calculated offsets
        const realText = displayedText.slice(start, end);

        // Simple overlap check
        const newAnnotations = nerAnnotations.filter(a =>
            (start >= a.end || end <= a.start)
        );

        newAnnotations.push({
            start,
            end,
            text: realText,
            tag: activeNerTag,
            color: getTagColor(activeNerTag)
        });

        // Sort by start index
        newAnnotations.sort((a, b) => a.start - b.start);

        setNerAnnotations(newAnnotations);
        selection.removeAllRanges();
    };

    // Helper to render text with highlights
    const renderHighlightedText = (fullText: string) => {
        if (nerAnnotations.length === 0) return fullText;

        const segments = [];
        let lastIndex = 0;

        nerAnnotations.forEach((ann, i) => {
            // Text before highlight
            if (ann.start > lastIndex) {
                const slice = fullText.slice(lastIndex, ann.start);
                if (slice) segments.push(<span key={`text-${i}`}>{slice}</span>);
            }
            // Highlighted text
            segments.push(
                <mark
                    key={`mark-${i}`}
                    className="relative cursor-pointer group"
                    style={{ backgroundColor: ann.color, padding: '2px 0' }}
                >
                    {fullText.slice(ann.start, ann.end)}
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
                            setNerAnnotations(prev => prev.filter((_, idx) => idx !== i));
                        }}
                    >
                        ×
                    </button>
                </mark>
            );
            lastIndex = ann.end;
        });

        // Remaining text
        if (lastIndex < fullText.length) {
            segments.push(<span key="text-end">{fullText.slice(lastIndex)}</span>);
        }

        return segments;
    };

    // Timer
    useEffect(() => {
        const timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        // Collect current state based on task type
        // For Survey/Form tasks, serialize the answers as the main text output
        let finalOutputText = textInput.trim();
        if (task.type === 'form') {
            finalOutputText = JSON.stringify(surveyAnswers);
        }

        const result = {
            taskId: task.id,
            duration: elapsedSeconds,
            output: {
                text: finalOutputText,
                classification: selectedClassId,
                formData: task.type === 'form' ? surveyAnswers : undefined,
                ner: nerAnnotations, // Add NER output
                boxes: boxes,        // Add Bounding Boxes output
                polygons: polygons   // Add Segmentation output
            }
        };

        try {
            await onSubmit(result);
            // Reset for next task logic could be handled by parent
            setTextInput('');
            setSelectedClassId(null);
            setElapsedSeconds(0);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- LIGHTBOX STATE ---
    const [expandedImage, setExpandedImage] = useState<string | null>(null);

    // --- RENDER HELPERS ---

    // --- ACTIONS ---
    const cancelAction = () => {
        setIsDrawing(false);
        setStartPos({ x: 0, y: 0 });
        setCurrentBox(null);
        setCurrentPoly(null);
        setSelectedBoxId(null);
        setSelectedPolyId(null);
    };

    const deleteSelected = () => {
        if (selectedBoxId !== null) {
            setBoxes(prev => prev.filter(b => b.id !== selectedBoxId));
            setSelectedBoxId(null);
        }
        if (selectedPolyId !== null) {
            setPolygons(prev => prev.filter(p => p.id !== selectedPolyId));
            setSelectedPolyId(null);
        }
    };

    // --- LEFT SIDEBAR (TOOLS & INSTRUCTIONS) ---

    const renderLeftSidebar = () => {
        const hasTools = config.tools && config.tools.length > 0;

        return (
            <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-10 shrink-0">
                {/* 1. TOOLS SECTION */}
                {hasTools && (
                    <div className="p-4 border-b border-gray-800">
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-3">Tools</p>
                        <div className="flex flex-wrap gap-2">
                            {config.tools?.map(tool => (
                                <button
                                    key={tool}
                                    className="w-10 h-10 rounded hover:bg-gray-800 bg-gray-800/50 border border-gray-700 text-gray-300 flex items-center justify-center transition hover:border-blue-500 hover:text-blue-400"
                                    title={tool}
                                >
                                    {tool === 'draw' && <ScanLine className="w-5 h-5" />}
                                    {tool === 'select' && <MousePointer2 className="w-5 h-5" />}
                                    {tool === 'poly' && <Hexagon className="w-5 h-5" />}
                                    {tool === 'brush' && <Brush className="w-5 h-5" />}
                                </button>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        {(isDrawing || currentPoly || selectedBoxId || selectedPolyId) ? (
                            <div className="mt-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
                                {(selectedBoxId || selectedPolyId) && (
                                    <button
                                        onClick={deleteSelected}
                                        className="w-full py-2 px-3 bg-red-900/30 border border-red-900/50 hover:bg-red-900/50 text-red-200 text-xs rounded flex items-center justify-center gap-2 transition"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete Selection
                                    </button>
                                )}
                                {(isDrawing || currentPoly) && (
                                    <button
                                        onClick={cancelAction}
                                        className="w-full py-2 px-3 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 text-xs rounded flex items-center justify-center gap-2 transition"
                                    >
                                        <XCircle className="w-3.5 h-3.5" /> Cancel Drawing
                                    </button>
                                )}
                            </div>
                        ) : null}
                    </div>
                )}

                {/* 2. INSTRUCTIONS & GUIDES */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                    <div className="mb-6">
                        <p className="mb-2 font-bold text-gray-500 uppercase flex items-center gap-2 text-[10px]">
                            <Info className="w-3.5 h-3.5" /> Instructions
                        </p>
                        <p className="text-gray-300 text-xs leading-relaxed font-medium bg-gray-800/50 p-3 rounded-lg border border-gray-800 whitespace-pre-wrap">
                            {config.instruction}
                        </p>
                    </div>

                    {/* UNIFIED VISUAL GUIDE */}
                    {(config.exampleImageUrl || config.entityTags || config.tools?.includes('draw') || config.tools?.includes('poly')) && (
                        <div className="mt-4 pt-4 border-t border-gray-800">
                            {/* 1. Image Guide (Generic) */}
                            {(config.exampleImageUrl || config.entityTags) && (
                                <div className="bg-gray-800 p-2 rounded-lg border border-gray-700 mb-3 opacity-80 group/guide relative">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Visual Guide</p>
                                    <div className="relative cursor-zoom-in" onClick={() => setExpandedImage(config.exampleImageUrl || (config.entityTags ? "/ner_guide.png" : null))}>
                                        <img
                                            src={config.exampleImageUrl || (config.entityTags ? "/ner_guide.png" : "/bbox_tips_preview_1768020935499.png")}
                                            className="w-full rounded border border-gray-600 mb-2 object-cover"
                                            alt="Task Guide"
                                            onError={(e) => {
                                                // Hide if simple fallback fails and no user image provided
                                                if (!config.exampleImageUrl && !config.entityTags) e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover/guide:bg-black/20 transition flex items-center justify-center opacity-0 group-hover/guide:opacity-100">
                                            <Maximize2 className="w-5 h-5 text-white drop-shadow-lg" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 text-center">Click to expand</p>
                                </div>
                            )}

                            {/* 2. Tool Controls Help */}
                            <div className="space-y-3">
                                {config.tools?.includes('draw') && (
                                    <div className="flex gap-3">
                                        <div className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
                                            <MousePointer2 className="w-3 h-3" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-300">Draw Box</p>
                                            <p className="text-[10px] text-gray-500">Hold click & drag diagonal.</p>
                                        </div>
                                    </div>
                                )}
                                {config.tools?.includes('poly') && (
                                    <>
                                        <div className="flex gap-3">
                                            <div className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
                                                <Hexagon className="w-3 h-3" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-300">Create Polygon</p>
                                                <p className="text-[10px] text-gray-500">Click points. <b>ESC</b> to cancel.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
                                                <Users className="w-3 h-3" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-300">Close Shape</p>
                                                <p className="text-[10px] text-gray-500">Click start point to finish.</p>
                                            </div>
                                        </div>
                                    </>
                                )}
                                {config.entityTags && (
                                    <div className="flex gap-3">
                                        <div className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
                                            <MousePointer2 className="w-3 h-3" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-300">Highlight Text</p>
                                            <p className="text-[10px] text-gray-500">Select tag, then drag cursor over text.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        );
    };

    // --- DRAWING LOGIC (BBOX & POLY) ---
    const [boxes, setBoxes] = useState<{ id: number, x: number, y: number, w: number, h: number, color: string, classId: string | number, label: string }[]>([]);
    const [polygons, setPolygons] = useState<{ id: number, points: { x: number, y: number }[], color: string, label: string }[]>([]);
    const [currentPoly, setCurrentPoly] = useState<{ points: { x: number, y: number }[] } | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentBox, setCurrentBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [selectedBoxId, setSelectedBoxId] = useState<number | null>(null);
    const [selectedPolyId, setSelectedPolyId] = useState<number | null>(null);

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                deleteSelected();
            }
            if (e.key === 'Escape') {
                cancelAction();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedBoxId, selectedPolyId, isDrawing, currentPoly]);

    const getMouseCoords = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // POLYGON LOGIC
        if (config.tools?.includes('poly')) {
            const { x, y } = getMouseCoords(e);

            // Check if closing polygon (near start)
            if (currentPoly && currentPoly.points.length > 2) {
                const start = currentPoly.points[0];
                const dist = Math.sqrt(Math.pow(x - start.x, 2) + Math.pow(y - start.y, 2));
                if (dist < 20) {
                    // Close polygon
                    const activeClass = config.classes?.find(c => c.id === selectedClassId);
                    setPolygons([...polygons, {
                        id: Date.now(),
                        points: currentPoly.points,
                        color: activeClass?.color || '#3b82f6',
                        label: activeClass?.name || 'Region'
                    }]);
                    setCurrentPoly(null);
                    return;
                }
            }

            // Add point
            if (!currentPoly) {
                setCurrentPoly({ points: [{ x, y }] });
            } else {
                setCurrentPoly({ points: [...currentPoly.points, { x, y }] });
            }
            return;
        }

        // BBOX LOGIC
        if (!config.tools?.includes('draw')) return;

        // Deselect if clicking empty space
        if (e.target === e.currentTarget) {
            setSelectedBoxId(null);
        }

        const { x, y } = getMouseCoords(e);
        setStartPos({ x, y });
        setIsDrawing(true);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { x, y } = getMouseCoords(e);
        setMousePos({ x, y });

        if (isDrawing && config.tools?.includes('draw')) {
            setCurrentBox({
                x: Math.min(x, startPos.x),
                y: Math.min(y, startPos.y),
                w: Math.abs(x - startPos.x),
                h: Math.abs(y - startPos.y)
            });
        }
    };

    const handleMouseUp = () => {
        if (!isDrawing || !currentBox) {
            setIsDrawing(false);
            return;
        }

        if (currentBox.w > 5 && currentBox.h > 5) {
            // Find selected class info
            const activeClass = config.classes?.find(c => c.id === selectedClassId);
            const color = activeClass?.color || '#facc15';
            const label = activeClass?.name || 'Object';
            const classId = activeClass?.id || 'unknown';

            const newBox = {
                ...currentBox,
                id: Date.now(),
                color,
                classId,
                label
            };

            setBoxes([...boxes, newBox]);
            setSelectedBoxId(newBox.id);
        }
        setIsDrawing(false);
        setCurrentBox(null);
    };

    const deleteBox = (id: number) => {
        setBoxes(boxes.filter(b => b.id !== id));
        if (selectedBoxId === id) setSelectedBoxId(null);
    };

    const deletePoly = (id: number) => {
        setPolygons(polygons.filter(p => p.id !== id));
        if (selectedPolyId === id) setSelectedPolyId(null);
    };

    // Sync boxes to internal result state (simplified for this demo)
    useEffect(() => {
        // In a real app we'd update a parent 'result' state here
    }, [boxes, polygons]);

    const renderVision = () => (
        <div
            className="relative shadow-2xl rounded-sm border border-gray-700 select-none bg-gray-900 overflow-hidden cursor-crosshair group outline-none"
            style={{ width: '800px', height: '600px' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            tabIndex={0}
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'linear-gradient(45deg, #1f2937 25%, transparent 25%), linear-gradient(-45deg, #1f2937 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f2937 75%), linear-gradient(-45deg, transparent 75%, #1f2937 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}
            />
            {task.imageUrl && (
                <img src={task.imageUrl} className="w-full h-full object-contain pointer-events-none relative z-10 opacity-80" alt="Task Subject" />
            )}

            <svg className="absolute inset-0 w-full h-full z-20 pointer-events-none">
                {/* POLYGONS */}
                {polygons.map(poly => (
                    <g key={poly.id} onClick={(e) => { e.stopPropagation(); setSelectedPolyId(poly.id); }} className="pointer-events-auto cursor-pointer">
                        <polygon
                            points={poly.points.map(p => `${p.x},${p.y}`).join(' ')}
                            fill={poly.color}
                            fillOpacity={selectedPolyId === poly.id ? 0.6 : 0.4}
                            stroke={poly.color}
                            strokeWidth={selectedPolyId === poly.id ? 3 : 1}
                        />
                        {/* Label Center */}
                        <text
                            x={poly.points.reduce((sum, p) => sum + p.x, 0) / poly.points.length}
                            y={poly.points.reduce((sum, p) => sum + p.y, 0) / poly.points.length}
                            fill="white"
                            fontSize="12"
                            fontWeight="bold"
                            textAnchor="middle"
                            style={{ textShadow: '0px 1px 2px black' }}
                        >
                            {poly.label}
                        </text>
                    </g>
                ))}

                {/* CURRENT POLYGON DRAWING */}
                {currentPoly && (
                    <g>
                        <polyline
                            points={currentPoly.points.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeDasharray="4"
                        />
                        {currentPoly.points.map((p, i) => (
                            <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 5 : 3} fill={i === 0 ? 'white' : '#3b82f6'} stroke="#3b82f6" strokeWidth="1" />
                        ))}
                        {/* Preview Line */}
                        {mousePos && currentPoly.points.length > 0 && (
                            <line
                                x1={currentPoly.points[currentPoly.points.length - 1].x}
                                y1={currentPoly.points[currentPoly.points.length - 1].y}
                                x2={mousePos.x}
                                y2={mousePos.y}
                                stroke="#3b82f6"
                                strokeWidth="1"
                                strokeDasharray="2"
                            />
                        )}
                        {/* Snap helper to close */}
                        {mousePos && currentPoly.points.length > 2 &&
                            Math.sqrt(Math.pow(mousePos.x - currentPoly.points[0].x, 2) + Math.pow(mousePos.y - currentPoly.points[0].y, 2)) < 20 && (
                                <circle cx={currentPoly.points[0].x} cy={currentPoly.points[0].y} r={10} fill="rgba(59,130,246,0.3)" />
                            )
                        }
                    </g>
                )}
            </svg>

            {/* BOXES (DOM Layer for easy interaction) */}
            {boxes.map(box => (
                <div
                    key={box.id}
                    className={`absolute border-2 z-30 transition-all ${selectedBoxId === box.id ? 'border-white ring-2 ring-white/50 z-40' : ''}`}
                    style={{
                        left: box.x,
                        top: box.y,
                        width: box.w,
                        height: box.h,
                        borderColor: box.color,
                        backgroundColor: `${box.color}20`
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedBoxId(box.id);
                    }}
                >
                    <div className="absolute -top-6 left-0 px-2 py-0.5 text-[10px] font-bold text-white rounded shadow-sm whitespace-nowrap"
                        style={{ backgroundColor: box.color }}>
                        {box.label}
                        {selectedBoxId === box.id && (
                            <span className="ml-2 cursor-pointer hover:text-red-200" onClick={(e) => {
                                e.stopPropagation();
                                deleteBox(box.id);
                            }}>✕</span>
                        )}
                    </div>
                </div>
            ))}

            {/* Current Drawing Box */}
            {currentBox && (
                <div
                    className="absolute border-2 border-dashed border-white z-50 pointer-events-none"
                    style={{
                        left: currentBox.x,
                        top: currentBox.y,
                        width: currentBox.w,
                        height: currentBox.h,
                    }}
                />
            )}
        </div>
    );


    const [displayedText, setDisplayedText] = useState<string>(task.textContent || "No text content provided.");

    // Fetch text content if it's a URL
    useEffect(() => {
        const content = task.textContent;
        if (content && (content.startsWith('http') || content.startsWith('/'))) {
            setDisplayedText("Loading text content...");
            fetch(content)
                .then(res => res.text())
                .then(text => setDisplayedText(text))
                .catch(err => {
                    console.error("Failed to fetch text content:", err);
                    setDisplayedText("Error loading text content. Please try refreshing.");
                });
        } else {
            setDisplayedText(content || "No text content provided.");
        }
    }, [task.textContent]);

    const renderNLP = () => (
        <div className="w-full max-w-3xl bg-white rounded-lg shadow-xl text-gray-900 overflow-hidden flex flex-col min-h-[500px]">
            <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-bold text-gray-700">
                    {config.entityTags ? 'Named Entity Recognition' : 'Source Text'}
                </h3>
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded">ID: {task.id}</span>
            </div>

            {/* NER Toolbar */}
            {config.entityTags && config.entityTags.length > 0 && (
                <div className="px-6 py-3 bg-white border-b border-gray-100 flex gap-2 flex-wrap items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase mr-2">Tags:</span>
                    {config.entityTags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => setActiveNerTag(tag)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 border ${activeNerTag === tag
                                ? 'ring-2 ring-offset-1 ring-blue-500 shadow-sm'
                                : 'hover:bg-gray-50 border-gray-200 text-gray-600'
                                }`}
                            style={{
                                backgroundColor: activeNerTag === tag ? getTagColor(tag) : undefined,
                                borderColor: activeNerTag === tag ? 'transparent' : undefined,
                                color: activeNerTag === tag ? '#1f2937' : undefined
                            }}
                        >
                            <span className="w-2 h-2 rounded-full bg-current opacity-50" />
                            {tag}
                        </button>
                    ))}
                    <div className="ml-auto text-[10px] text-gray-400 font-medium">
                        Select a tag, then highlight text.
                    </div>
                </div>
            )}

            <div className="p-8 text-lg leading-relaxed font-serif whitespace-pre-wrap flex-1 relative">
                {config.entityTags ? (
                    <div
                        id="ner-text-container"
                        onMouseUp={handleNerSelection}
                        className="prose max-w-none text-gray-800"
                    >
                        {renderHighlightedText(displayedText)}
                    </div>
                ) : (
                    displayedText
                )}
            </div>

            {/* Classification Options (Only if NOT NER) */}
            {!config.entityTags && config.classes && config.classes.length > 0 && (
                <div className="mt-auto border-t border-gray-200 p-6 bg-gray-50">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Classification</label>
                    <div className="flex flex-wrap gap-3">
                        {config.classes.map((cls) => (
                            <button
                                key={cls.id}
                                onClick={() => setSelectedClassId(cls.id)}
                                className={`px-4 py-2 rounded-lg border text-sm font-semibold transition ${selectedClassId === cls.id
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                    }`}
                            >
                                {cls.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {config.hasTranslationInput && (
                <div className="mt-auto border-t border-gray-200 p-6 bg-gray-50">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Translation (Target)</label>
                    <textarea
                        className="w-full border border-gray-300 rounded p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        rows={3}
                        placeholder="Type translation here..."
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                    />
                </div>
            )}
        </div>
    );

    const renderAudio = () => (
        <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col gap-6">
            {/* Visualizer Mock */}
            <div className="h-32 bg-gray-950 rounded-lg border border-gray-800 flex items-center justify-center relative overflow-hidden">
                <div className="flex gap-1 items-center justify-center w-full px-8 h-16">
                    {/* Simulated bars */}
                    {Array.from({ length: 40 }).map((_, i) => (
                        <div
                            key={i}
                            className="bg-blue-500 rounded-sm w-1 animate-pulse"
                            style={{ height: `${Math.max(20, Math.random() * 100)}%`, animationDelay: `${i * 0.05}s` }}
                        />
                    ))}
                </div>
                <div className="absolute inset-x-0 top-1/2 h-px bg-blue-500/30"></div>
            </div>

            <div className="flex items-center gap-4 justify-center">
                <button className="p-3 bg-gray-800 rounded-full hover:bg-gray-700 text-white"><SkipBack className="w-5 h-5" /></button>
                <button className="p-4 bg-white rounded-full hover:bg-gray-200 text-black shadow-lg"><Play className="w-6 h-6 fill-black" /></button>
                <button className="p-3 bg-gray-800 rounded-full hover:bg-gray-700 text-white"><SkipForward className="w-5 h-5" /></button>
            </div>

            {config.hasTranscribeInput && (
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Transcription</label>
                    <textarea
                        className="w-full bg-gray-800 border border-gray-700 rounded p-4 text-gray-200 focus:border-blue-500 outline-none font-mono text-sm"
                        rows={4}
                        placeholder="Type what you hear..."
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                    />
                </div>
            )}

            {config.hasRecordInput && (
                <div className="text-center p-6 border-2 border-dashed border-gray-700 rounded-lg hover:border-red-500 cursor-pointer transition group">
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-900/50 group-hover:scale-110 transition">
                        <Mic className="w-8 h-8 text-white" />
                    </div>
                    <p className="font-bold text-white">Click to Record</p>
                </div>
            )}
        </div>
    );

    // Survey State
    const [surveyAnswers, setSurveyAnswers] = useState<Record<number, any>>({});

    const handleSurveyChange = (index: number, value: any) => {
        setSurveyAnswers(prev => ({
            ...prev,
            [index]: value
        }));
    };

    const renderForm = () => {
        const questions = task.formData as {
            question: string;
            type: 'text' | 'multiple_choice' | 'checkbox' | 'rating';
            required: boolean;
            options?: string[];
        }[] || [];

        if (questions.length === 0) {
            return (
                <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden p-8 text-gray-900 flex flex-col items-center justify-center min-h-[300px]">
                    <p className="text-gray-400 italic">No questions found for this survey.</p>
                </div>
            );
        }

        return (
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden text-gray-900 flex flex-col">
                <div className="bg-gray-100 px-8 py-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">{task.title || 'Survey Task'}</h2>
                    <p className="text-gray-500 text-sm mt-1">Please answer all required questions below.</p>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto max-h-[600px] custom-scrollbar">
                    {questions.map((q, i) => (
                        <div key={i} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 50}ms` }}>
                            <label className="block text-base font-semibold text-gray-800 mb-3 flex gap-1">
                                <span className="text-gray-400 font-mono w-6">{i + 1}.</span>
                                {q.question}
                                {q.required && <span className="text-red-500 ml-1">*</span>}
                            </label>

                            {q.type === 'text' && (
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-gray-50 hover:bg-white"
                                    rows={3}
                                    placeholder="Type your answer here..."
                                    value={surveyAnswers[i] || ''}
                                    onChange={(e) => handleSurveyChange(i, e.target.value)}
                                />
                            )}

                            {q.type === 'multiple_choice' && (
                                <div className="space-y-2 ml-7">
                                    {q.options?.map((opt, optIdx) => (
                                        <label key={optIdx} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition group">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${surveyAnswers[i] === opt ? 'border-blue-500 bg-blue-500' : 'border-gray-300 group-hover:border-blue-400'}`}>
                                                {surveyAnswers[i] === opt && <div className="w-2 h-2 rounded-full bg-white" />}
                                            </div>
                                            <input
                                                type="radio"
                                                name={`q-${i}`}
                                                value={opt}
                                                checked={surveyAnswers[i] === opt}
                                                onChange={() => handleSurveyChange(i, opt)}
                                                className="hidden"
                                            />
                                            <span className={`${surveyAnswers[i] === opt ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {q.type === 'checkbox' && (
                                <div className="space-y-2 ml-7">
                                    {q.options?.map((opt, optIdx) => {
                                        const currentAnswers = (surveyAnswers[i] as string[]) || [];
                                        const isChecked = currentAnswers.includes(opt);
                                        return (
                                            <label key={optIdx} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition group">
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isChecked ? 'border-blue-500 bg-blue-500' : 'border-gray-300 group-hover:border-blue-400'}`}>
                                                    {isChecked && <div className="text-white text-xs font-bold">✓</div>}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    value={opt}
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const newVideo = e.target.checked
                                                            ? [...currentAnswers, opt]
                                                            : currentAnswers.filter(a => a !== opt);
                                                        handleSurveyChange(i, newVideo);
                                                    }}
                                                    className="hidden"
                                                />
                                                <span className={`${isChecked ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>{opt}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {q.type === 'rating' && (
                                <div className="flex gap-2 ml-7">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => handleSurveyChange(i, star)}
                                            className={`p-2 rounded-lg border transition ${surveyAnswers[i] === star
                                                ? 'bg-yellow-50 border-yellow-400 text-yellow-600'
                                                : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                        >
                                            <div className={`text-2xl mb-1 ${surveyAnswers[i] >= star || (surveyAnswers[i] && surveyAnswers[i] === star) ? 'grayscale-0' : 'grayscale opacity-50'}`}>
                                                ★
                                            </div>
                                            <div className="text-xs font-bold">{star}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // --- MAIN RENDER ---
    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-950 text-gray-200 font-sans">
            {/* Header */}
            <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onExit}
                        className="p-2 hover:bg-gray-800 rounded-md text-gray-400"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-sm font-semibold text-white flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900 text-blue-200 border border-blue-800 uppercase">
                                {task.type}
                            </span>
                            <span>{task.title}</span>
                            {task.verificationType && (
                                <span className={`px-2 py-0.5 rounded flex items-center gap-1 text-[10px] font-bold border ${task.verificationType === 'Instant Auto-Pay' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                                    task.verificationType === 'Consensus' ? 'bg-blue-950 text-blue-400 border-blue-800' :
                                        'bg-gray-800 text-gray-400 border-gray-700'
                                    }`}>
                                    {task.verificationType === 'Instant Auto-Pay' ? <Zap className="w-2.5 h-2.5 fill-emerald-500" /> :
                                        task.verificationType === 'Consensus' ? <Users className="w-2.5 h-2.5" /> :
                                            <Clock className="w-2.5 h-2.5" />}
                                    {task.verificationType}
                                </span>
                            )}
                        </h1>
                        <p className="text-xs text-gray-400">
                            {task.subtitle} {task.reward && <span className="text-green-400 font-mono">• {task.reward}</span>}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Timer className="w-4 h-4 text-gray-500" />
                        <span className="font-mono">{formatTime(elapsedSeconds)}</span>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-1.5 rounded-full text-sm font-medium transition shadow-lg shadow-blue-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                            </>
                        ) : (
                            <>
                                <span>Submit Task</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Left Toolbar (Tools & Instructions) */}
                {renderLeftSidebar()}

                {/* Center Workspace */}
                <section className="flex-1 bg-gray-950 relative overflow-hidden flex items-center justify-center p-8">
                    {task.type === 'vision' && renderVision()}
                    {task.type === 'nlp' && renderNLP()}
                    {task.type === 'audio' && renderAudio()}
                    {task.type === 'form' && renderForm()}
                </section>

                {/* Right Panel (Instructions / Classes) */}
                <aside className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col z-10">
                    <div className="flex border-b border-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        <div className="px-5 py-3 text-blue-400 border-b-2 border-blue-500">
                            {config.classes ? 'Select Answer' : 'Task Details'}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-900/40">
                        {config.classes && config.classes.length > 0 ? (
                            config.classes.map(cls => (
                                <div
                                    key={cls.id}
                                    onClick={() => setSelectedClassId(cls.id)}
                                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all mb-3 ${selectedClassId === cls.id
                                        ? 'border-blue-500 bg-blue-900/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                                        : 'border-gray-800 bg-gray-800/50 hover:border-gray-700 hover:bg-gray-800'
                                        }`}
                                >
                                    <div className="w-4 h-4 rounded-full border-2 border-gray-700 flex items-center justify-center">
                                        {selectedClassId === cls.id && <div className="w-2 h-2 rounded-full bg-blue-400 animate-in zoom-in" />}
                                    </div>
                                    <div className="w-3 h-3 rounded-full opacity-70" style={{ backgroundColor: cls.color || '#ccc' }}></div>
                                    <span className={`text-sm font-semibold ${selectedClassId === cls.id ? 'text-blue-200' : 'text-gray-400'}`}>
                                        {cls.name}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-600 text-xs mt-10 italic px-4">
                                {config.classes ? "No options available. Check task metadata." : "No specific options required for this step."}
                            </div>
                        )}

                    </div>

                    <div className="p-4 border-t border-gray-800 bg-gray-900 shrink-0">
                        <div className="bg-blue-900/10 border border-blue-800/30 rounded-lg p-3">
                            <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">Status</p>
                            <p className="text-xs text-gray-300">Ready to submit. Review your choice before clicking <b>Submit</b>.</p>
                        </div>
                    </div>
                </aside>
            </main>
            {/* LIGHTBOX OVERLAY */}
            {expandedImage && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-10 animate-in fade-in duration-200" onClick={() => setExpandedImage(null)}>
                    <button className="absolute top-5 right-5 text-white/70 hover:text-white p-2">
                        <X className="w-8 h-8" />
                    </button>
                    <img
                        src={expandedImage}
                        className="max-w-full max-h-full rounded-lg shadow-2xl border border-gray-800 object-contain animate-in zoom-in-50 duration-200"
                        alt="Expanded Guide"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
                    />
                </div>
            )}
        </div>
    );
};
