
import React, { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACTS } from '@/utils/contracts';

export const TaskAnswerViewer = ({ task }: { task: any }) => {
    // 1. Fetch REAL on-chain data to get the answer string
    // We assume index 0 for the first submission
    const { data: submissionData, error, isLoading } = useReadContract({
        address: CONTRACTS.TaskEscrow.address,
        abi: CONTRACTS.TaskEscrow.abi,
        functionName: 'taskSubmissions',
        args: [BigInt(task.id), BigInt(0)],
    });

    if (error) {
        console.error("TaskAnswerViewer Error:", error);
    }

    // Debug log
    React.useEffect(() => {
        if (task?.id) console.log(`[TaskAnswerViewer] Fetching submission for task ${task.id}...`, { isLoading, hasData: !!submissionData, error: error?.message });
    }, [task, isLoading, submissionData, error]);

    // 2. Extract Answer
    // taskSubmissions returns: [worker, answer, approved]
    const answer = (submissionData as any)?.[1] || (Array.isArray(submissionData) ? submissionData[1] : '');

    // NEW: Fetch Text Content if URL (Async)
    const [fetchedText, setFetchedText] = React.useState<string | null>(null);
    const rawContentUrl = task.metadata?.content || task.textContent;

    React.useEffect(() => {
        if (rawContentUrl && (rawContentUrl.startsWith('http') || rawContentUrl.startsWith('/'))) {
            fetch(rawContentUrl)
                .then(res => res.text())
                .then(text => setFetchedText(text))
                .catch(err => {
                    console.error("Failed to fetch text content:", err);
                    setFetchedText("Error loading text content.");
                });
        }
    }, [rawContentUrl]);

    // 3. Helper to determine content type
    const isNER = task.metadata?.tmpl === 'nlp-ner' || task.type === 'nlp-ner';

    // 4. Content Content (Text)
    // We need to fetch the content if it's a URL, or use metadata field
    // For NER, the content is usually in a text file or in metadata.content? 
    // Wait, the user's example showed content: "/uploads/..."
    // We might need to fetch that text. 
    // For now, let's assume we can display the answer relative to the expected output.

    // If it's NER, the answer is a JSON string of annotations.
    // We need the ORIGINAL text to show the highlights.
    // The original text might be in `task.metadata.content` if it's a direct string, 
    // OR we might need to fetch the file.

    // Simplification: If we can't fetch the text file easily here without async complexity,
    // we will just show the parsed annotations in a clear list.

    const parsedAnswer = useMemo(() => {
        if (!answer) return null;
        try {
            return JSON.parse(answer);
        } catch {
            return answer; // Plain text
        }
    }, [answer]);

    if (isLoading) return <div className="text-gray-500 animate-pulse">Loading submission (ID: {task.id})...</div>;
    if (error) return <div className="text-red-500">Error loading submission: {error.shortMessage || error.message}</div>;
    // We check if answer is present, or if submissionData exists
    if (!submissionData && !answer) return <div className="text-gray-500">No submission found for this task.</div>;



    // IMAGE URL HELPER
    const imageUrl = task.metadata?.content || task.metadata?.imageUrl || task.imageUrl;
    const isVisionTask = !!imageUrl && (Array.isArray(parsedAnswer) && parsedAnswer.length > 0 && (parsedAnswer[0].x !== undefined || parsedAnswer[0].points !== undefined));

    // NEW: Handle Boxes (Bounding Boxes)
    if (Array.isArray(parsedAnswer) && parsedAnswer.length > 0 && parsedAnswer[0].x !== undefined && parsedAnswer[0].w !== undefined) {
        return (
            <div className="flex flex-col gap-6 w-full max-w-4xl">
                {/* Visual Preview */}
                {imageUrl && (
                    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-2xl relative flex items-center justify-center min-h-[400px]">
                        <img src={imageUrl} className="max-w-full max-h-[600px] object-contain opacity-80" alt="Task Content" />
                        <div className="absolute inset-0 flex items-center justify-center p-8">
                            <div className="relative" style={{ width: '800px', height: '600px' }}> {/* We use original 800x600 coordinate system from WorkerTaskInterface */}
                                {parsedAnswer.map((box: any, i: number) => (
                                    <div
                                        key={i}
                                        className="absolute border-2 transition-all cursor-help group"
                                        style={{
                                            left: box.x,
                                            top: box.y,
                                            width: box.w,
                                            height: box.h,
                                            borderColor: box.color || '#fbbf24',
                                            backgroundColor: `${box.color || '#fbbf24'}20`
                                        }}
                                    >
                                        <div className="absolute -top-6 left-0 px-2 py-0.5 text-[10px] font-bold text-white rounded shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{ backgroundColor: box.color || '#fbbf24' }}>
                                            {box.label || 'Object'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="w-full bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                        <h4 className="font-bold text-gray-700">Object Detection (Boxes)</h4>
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-mono">
                            {parsedAnswer.length} objects
                        </span>
                    </div>
                    <div className="p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Label</th>
                                    <th className="px-6 py-3">Dimensions</th>
                                    <th className="px-6 py-3 text-right">Coordinates</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {parsedAnswer.map((box: any, i: number) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 rounded text-xs font-bold text-white shadow-sm" style={{ backgroundColor: box.color || '#fbbf24' }}>
                                                {box.label || 'Object'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                                            {Math.round(box.w)}×{Math.round(box.h)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-400 font-mono text-xs">
                                            X:{Math.round(box.x)} Y:{Math.round(box.y)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // NEW: Handle Polygons (Segmentation)
    if (Array.isArray(parsedAnswer) && parsedAnswer.length > 0 && parsedAnswer[0].points !== undefined) {
        return (
            <div className="flex flex-col gap-6 w-full max-w-4xl">
                {/* Visual Preview */}
                {imageUrl && (
                    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-2xl relative flex items-center justify-center min-h-[400px]">
                        <img src={imageUrl} className="max-w-full max-h-[600px] object-contain opacity-80" alt="Task Content" />
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
                            {parsedAnswer.map((poly: any, i: number) => (
                                <polygon
                                    key={i}
                                    points={poly.points.map((p: any) => `${p.x},${p.y}`).join(' ')}
                                    fill={poly.color || '#10b981'}
                                    fillOpacity="0.4"
                                    stroke={poly.color || '#10b981'}
                                    strokeWidth="2"
                                />
                            ))}
                        </svg>
                    </div>
                )}

                <div className="w-full bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                        <h4 className="font-bold text-gray-700">Segmentation Masks</h4>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-mono">
                            {parsedAnswer.length} regions
                        </span>
                    </div>
                    <div className="p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Region</th>
                                    <th className="px-6 py-3">Complexity</th>
                                    <th className="px-6 py-3 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {parsedAnswer.map((poly: any, i: number) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 rounded text-xs font-bold text-white shadow-sm" style={{ backgroundColor: poly.color || '#10b981' }}>
                                                {poly.label || 'Region'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                                            {poly.points?.length || 0} vertices
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-400">
                                            <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">Point Data Active</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // 5. NER Visualizer
    if (isNER && Array.isArray(parsedAnswer)) {
        return (
            <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                    <h4 className="font-bold text-gray-700">Named Entity Recognition</h4>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-mono">
                        {parsedAnswer.length} entities
                    </span>
                </div>

                {/* Full Text Reconstruction */}
                <div className="p-8 text-lg leading-relaxed font-serif text-gray-800 border-b border-gray-100 bg-white">
                    {(() => {
                        // 1. Get the content (Prioritize fetched text, then raw content if not a URL, then default)
                        const isUrl = rawContentUrl && (rawContentUrl.startsWith('http') || rawContentUrl.startsWith('/'));
                        const rawContent = fetchedText || (!isUrl ? rawContentUrl : "Loading text content...");


                        // 2. Sort annotations by start index
                        const sortedAnns = [...parsedAnswer].sort((a: any, b: any) => a.start - b.start);

                        const segments = [];
                        let lastIndex = 0;

                        sortedAnns.forEach((ann: any, i: number) => {
                            // Text before highlight
                            if (ann.start > lastIndex) {
                                segments.push(<span key={`text-${i}`}>{rawContent.slice(lastIndex, ann.start)}</span>);
                            }

                            // Determine color (consistent hashing)
                            const getTagColor = (tag: string) => {
                                let hash = 0;
                                for (let c = 0; c < tag.length; c++) hash = tag.charCodeAt(c) + ((hash << 5) - hash);
                                const hue = Math.abs(hash % 360);
                                return `hsl(${hue}, 70%, 85%)`;
                            };
                            const color = ann.color || getTagColor(ann.tag || ann.label || 'ENTITY');

                            // Highlighted text
                            segments.push(
                                <mark
                                    key={`mark-${i}`}
                                    className="relative group rounded px-1 py-0.5 mx-0.5 font-medium cursor-help"
                                    style={{ backgroundColor: color }}
                                >
                                    {rawContent.slice(ann.start, ann.end)}
                                    {/* Tooltip Tag */}
                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 pointer-events-none select-none shadow">
                                        {ann.tag || ann.label}
                                    </span>
                                </mark>
                            );
                            lastIndex = ann.end;
                        });

                        // Remaining text
                        if (lastIndex < rawContent.length) {
                            segments.push(<span key="text-end">{rawContent.slice(lastIndex)}</span>);
                        }

                        return <div className="whitespace-pre-wrap">{segments}</div>;
                    })()}
                </div>

                {/* Raw JSON fallback details (Collapsed) */}
                <div className="bg-gray-50 p-2 border-t border-gray-100">
                    <details className="text-xs text-gray-500">
                        <summary className="cursor-pointer font-bold px-2 py-1 hover:text-gray-700 select-none">View Raw JSON Output</summary>
                        <div className="bg-gray-900 p-4 rounded mt-2 overflow-x-auto">
                            <pre className="text-[10px] text-gray-400 font-mono">
                                {JSON.stringify(parsedAnswer, null, 2)}
                            </pre>
                        </div>
                    </details>
                </div>
            </div>
        );
    }

    // 6. Text Classification Mapping (ID -> Label)
    let displayContent = parsedAnswer;

    // Check if answer is an index (number or string number) and we have options
    const options = task.metadata?.options || [];
    if (options.length > 0) {
        // Try to parse as integer
        const idx = parseInt(parsedAnswer);
        if (!isNaN(idx) && options[idx]) {
            displayContent = (
                <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900">{options[idx]}</span>
                    <span className="text-xs text-gray-400 font-mono">ID: {parsedAnswer}</span>
                </div>
            );
        } else if (typeof parsedAnswer === 'string') {
            // Maybe it's the label itself, or no match
            displayContent = <span className="text-lg font-medium text-gray-900">{parsedAnswer}</span>;
        }
    }

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full text-center">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-4">Worker Answer</h4>
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 flex justify-center items-center min-h-[100px]">
                {typeof displayContent === 'object' && !React.isValidElement(displayContent)
                    ? <pre className="text-left text-xs">{JSON.stringify(displayContent, null, 2)}</pre>
                    : displayContent || <span className="text-gray-400 italic">No answer provided.</span>
                }
            </div>
        </div>
    );
};
