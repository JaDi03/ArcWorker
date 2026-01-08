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
    Loader2
} from 'lucide-react';

export interface TaskData {
    id: string;
    type: 'vision' | 'nlp' | 'audio' | 'form';
    title: string;
    subtitle?: string;
    reward?: string;

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
        const result = {
            taskId: task.id,
            duration: elapsedSeconds,
            output: {
                text: textInput,
                classification: selectedClassId,
                // In a real app, we'd gather canvas bbox coordinates, audio blobs, etc.
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

    // --- RENDER HELPERS ---

    const renderToolbar = () => {
        if (!config.tools || config.tools.length === 0) return null;

        return (
            <aside className="w-14 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 gap-4 z-10">
                {config.tools.map(tool => (
                    <button
                        key={tool}
                        className="w-10 h-10 rounded hover:bg-gray-800 text-gray-400 flex items-center justify-center transition"
                        title={tool}
                    >
                        {tool === 'draw' && <ScanLine className="w-5 h-5" />}
                        {tool === 'select' && <MousePointer2 className="w-5 h-5" />}
                        {tool === 'poly' && <Hexagon className="w-5 h-5" />}
                        {tool === 'brush' && <Brush className="w-5 h-5" />}
                    </button>
                ))}
            </aside>
        );
    };

    const renderVision = () => (
        <div
            className="relative shadow-2xl rounded-sm border border-gray-700 select-none bg-gray-900 overflow-hidden"
            style={{ width: '800px', height: '600px' }}
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
                <img src={task.imageUrl} className="w-full h-full object-contain pointer-events-none relative z-10" alt="Task Subject" />
            )}
            {/* Overlay Layer for BBoxes would go here */}
            <div className="absolute inset-0 w-full h-full cursor-crosshair z-20"></div>
        </div>
    );

    const renderNLP = () => (
        <div className="w-full max-w-3xl bg-white rounded-lg shadow-xl text-gray-900 overflow-hidden flex flex-col min-h-[500px]">
            <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-bold text-gray-700">Source Text</h3>
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded">ID: {task.id}</span>
            </div>
            <div className="p-8 text-lg leading-relaxed font-serif">
                {task.textContent || "No text content provided."}
            </div>

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

    const renderForm = () => (
        <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden p-8 text-gray-900">
            <h2 className="text-xl font-bold mb-6">{task.title || 'Data Entry'}</h2>
            <p className="text-gray-500 italic">Form rendering would go here based on task.formData schema...</p>
        </div>
    );

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
                        <LayoutDashboard className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-sm font-semibold text-white flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900 text-blue-200 border border-blue-800 uppercase">
                                {task.type}
                            </span>
                            <span>{task.title}</span>
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
                {/* Left Toolbar (only for tools) */}
                {renderToolbar()}

                {/* Center Workspace */}
                <section className="flex-1 bg-gray-950 relative overflow-hidden flex items-center justify-center p-8">
                    {task.type === 'vision' && renderVision()}
                    {task.type === 'nlp' && renderNLP()}
                    {task.type === 'audio' && renderAudio()}
                    {task.type === 'form' && renderForm()}
                </section>

                {/* Right Panel (Instructions / Classes) */}
                <aside className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col z-10">
                    <div className="flex border-b border-gray-800 text-xs font-medium">
                        <button className="flex-1 py-3 text-white border-b-2 border-blue-500">
                            {config.classes ? 'Classes' : 'Info'}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {config.classes ? (
                            config.classes.map(cls => (
                                <div
                                    key={cls.id}
                                    onClick={() => setSelectedClassId(cls.id)}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition mb-2 ${selectedClassId === cls.id
                                            ? 'border-blue-500 bg-gray-800'
                                            : 'border-gray-800 bg-gray-800/50 hover:bg-gray-800'
                                        }`}
                                >
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cls.color || '#ccc' }}></div>
                                    <span className="text-sm font-medium text-gray-300">{cls.name}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-500 text-sm mt-10 italic">
                                No classes configuration needed for this task type.
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-850 p-4 border-t border-gray-800 text-xs text-gray-400">
                        <p className="mb-2 font-semibold text-gray-500 uppercase">Instructions</p>
                        <p>{config.instruction}</p>
                    </div>
                </aside>
            </main>
        </div>
    );
};
