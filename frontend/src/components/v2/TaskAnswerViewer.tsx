
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

    if (isNER && Array.isArray(parsedAnswer)) {
        // ... (existing NER code)
    }

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

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-4">Worker Answer</h4>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-medium">
                {typeof parsedAnswer === 'object' ? JSON.stringify(parsedAnswer, null, 2) : (parsedAnswer || "No text answer provided.")}
            </div>
        </div>
    );
};
