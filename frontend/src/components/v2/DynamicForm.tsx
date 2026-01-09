import React, { useRef, useState } from 'react';
import {
    ImagePlus, FileText, Headphones, Table,
    Globe, UploadCloud, CheckCircle
} from 'lucide-react';
import { ComponentType, CampaignConfig } from './types';

interface DynamicFormProps {
    components: ComponentType[];
    config: CampaignConfig;
    onChange: (updates: Partial<CampaignConfig>) => void;
}

// Extract Wrapper component outside to prevent re-creation on every render
const Wrapper = ({ title, children, index }: { title: string, children: React.ReactNode, index: number }) => (
    <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">{index + 1}. {title}</h3>
        {children}
    </section>
);

export const DynamicForm: React.FC<DynamicFormProps> = React.memo(({ components, config, onChange }) => {


    const renderUploadImage = (index: number) => {
        const fileInputRef = useRef<HTMLInputElement>(null);
        const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
        const [fileName, setFileName] = useState<string | null>(null);

        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                setFileName(file.name);
                setUploadStatus('uploading');

                const data = new FormData();
                data.append('file', file);

                fetch('/api/upload', {
                    method: 'POST',
                    body: data
                })
                    .then(res => res.json())
                    .then(result => {
                        if (result.url) {
                            setUploadStatus('success');
                            onChange({ datasetUrl: result.url });
                        } else {
                            throw new Error("No URL returned");
                        }
                    })
                    .catch(err => {
                        console.error("Upload failed:", err);
                        setUploadStatus('idle');
                        alert("Image upload failed. Please try again.");
                    });
            }
        };

        return (
            <Wrapper title="Dataset (Images)" index={index}>
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center transition cursor-pointer group ${uploadStatus === 'success' ? 'border-green-500 bg-green-50/30' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                        }`}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".zip,image/*"
                        onChange={handleFileChange}
                    />

                    {uploadStatus === 'success' ? (
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3 animate-in zoom-in" />
                    ) : uploadStatus === 'uploading' ? (
                        <UploadCloud className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-bounce" />
                    ) : (
                        <ImagePlus className="w-12 h-12 text-gray-400 mx-auto group-hover:text-blue-500 mb-3" />
                    )}

                    <p className={`text-sm font-bold ${uploadStatus === 'success' ? 'text-green-700' : 'text-gray-700'}`}>
                        {uploadStatus === 'success' ? `Ready: ${fileName}` : uploadStatus === 'uploading' ? 'Analyzing file...' : 'Upload Images (ZIP) or Folder'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG, WEBP, ZIP</p>

                    <div className="mt-6 pt-6 border-t border-gray-100 flex items-center gap-3">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">or</span>
                        <input
                            type="text"
                            className="flex-1 bg-gray-50 border-none rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            placeholder="Connect AWS S3 Bucket URL"
                            value={config.datasetUrl || ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ datasetUrl: e.target.value })}
                        />
                    </div>
                </div>
            </Wrapper>
        );
    };

    const renderCampaignInfo = (index: number) => (
        <Wrapper title="Campaign Information" index={index}>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Campaign Title *
                    </label>
                    <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="e.g., Product Image Labeling Q1 2024"
                        value={config.title || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ title: e.target.value })}
                    />
                    <p className="text-xs text-gray-400 mt-1">Give your campaign a descriptive name</p>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Description (Optional)
                    </label>
                    <textarea
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Provide additional context about this campaign..."
                        rows={3}
                        value={config.description || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange({ description: e.target.value })}
                    />
                </div>
            </div>
        </Wrapper>
    );


    const renderUploadText = (index: number) => {
        const fileInputRef = useRef<HTMLInputElement>(null);
        const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
        const [fileName, setFileName] = useState<string | null>(null);

        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                setFileName(file.name);
                setUploadStatus('uploading');

                const data = new FormData();
                data.append('file', file);

                fetch('/api/upload', {
                    method: 'POST',
                    body: data
                })
                    .then(res => res.json())
                    .then(result => {
                        if (result.url) {
                            setUploadStatus('success');
                            onChange({ textDatasetUrl: result.url });
                        } else {
                            throw new Error("No URL returned");
                        }
                    })
                    .catch(err => {
                        console.error("Text upload failed:", err);
                        setUploadStatus('idle');
                    });
            }
        };

        return (
            <Wrapper title="Text Dataset" index={index}>
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer group ${uploadStatus === 'success' ? 'border-blue-500 bg-blue-50/30' : 'border-gray-300 hover:border-blue-500'
                        }`}
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept=".jsonl,.csv,.txt" onChange={handleFileChange} />
                    {uploadStatus === 'success' ? (
                        <CheckCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    ) : (
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-blue-500" />
                    )}
                    <p className="text-sm font-bold text-gray-700">
                        {uploadStatus === 'success' ? fileName : 'Upload JSONL, CSV or TXT files'}
                    </p>
                </div>
            </Wrapper>
        );
    };

    const renderUploadAudio = (index: number) => {
        const fileInputRef = useRef<HTMLInputElement>(null);
        const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
        const [fileName, setFileName] = useState<string | null>(null);

        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                setFileName(file.name);
                setUploadStatus('uploading');

                const data = new FormData();
                data.append('file', file);

                fetch('/api/upload', {
                    method: 'POST',
                    body: data
                })
                    .then(res => res.json())
                    .then(result => {
                        if (result.url) {
                            setUploadStatus('success');
                            onChange({ audioDatasetUrl: result.url });
                        } else {
                            throw new Error("No URL returned");
                        }
                    })
                    .catch(err => {
                        console.error("Audio upload failed:", err);
                        setUploadStatus('idle');
                    });
            }
        };

        return (
            <Wrapper title="Audio Source" index={index}>
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer group ${uploadStatus === 'success' ? 'border-purple-500 bg-purple-50/30' : 'border-gray-300 hover:border-purple-500'
                        }`}
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept=".mp3,.wav,.ogg" onChange={handleFileChange} />
                    {uploadStatus === 'success' ? (
                        <CheckCircle className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    ) : (
                        <Headphones className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-purple-500" />
                    )}
                    <p className="text-sm font-bold text-gray-700">
                        {uploadStatus === 'success' ? fileName : 'Upload MP3/WAV files'}
                    </p>
                </div>
            </Wrapper>
        );
    };

    const renderUploadCsv = (index: number) => {
        const fileInputRef = useRef<HTMLInputElement>(null);
        const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
        const [fileName, setFileName] = useState<string | null>(null);

        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                setFileName(file.name);
                setUploadStatus('uploading');

                const data = new FormData();
                data.append('file', file);

                fetch('/api/upload', {
                    method: 'POST',
                    body: data
                })
                    .then(res => res.json())
                    .then(result => {
                        if (result.url) {
                            setUploadStatus('success');
                            onChange({ sourceDataUrl: result.url });
                        } else {
                            throw new Error("No URL returned");
                        }
                    })
                    .catch(err => {
                        console.error("CSV upload failed:", err);
                        setUploadStatus('idle');
                    });
            }
        };

        return (
            <Wrapper title="Source Data" index={index}>
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer group ${uploadStatus === 'success' ? 'border-orange-500 bg-orange-50/30' : 'border-gray-300 hover:border-orange-500'
                        }`}
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
                    {uploadStatus === 'success' ? (
                        <CheckCircle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    ) : (
                        <Table className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-orange-500" />
                    )}
                    <p className="text-sm font-bold text-gray-700">
                        {uploadStatus === 'success' ? fileName : "Upload CSV with 'source' column"}
                    </p>
                </div>
            </Wrapper>
        );
    };

    const renderLabelsCreator = (index: number) => (
        <Wrapper title="Taxonomy (Classes)" index={index}>
            <div className="space-y-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Add labels (comma separated)..."
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        value={config.labels?.join(', ') || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ labels: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s) })}
                    />
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                    {config.labels?.map((label: string, i: number) => (
                        <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            {label}
                            <button
                                className="ml-2 text-gray-400 hover:text-red-500"
                                onClick={() => onChange({ labels: config.labels?.filter((_: string, idx: number) => idx !== i) })}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
                <div className="pt-4 border-t mt-4">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.allowMultipleBoxes || false}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ allowMultipleBoxes: e.target.checked })}
                            className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        Allow multiple boxes per object?
                    </label>
                </div>
            </div>
        </Wrapper>
    );

    const renderClassesCreator = (index: number) => (
        <Wrapper title="Classification Options" index={index}>
            <p className="text-xs text-gray-500 mb-2">Workers must choose ONE of these:</p>
            <div className="space-y-2">
                {config.classificationOptions?.map((option: string, i: number) => (
                    <div key={i} className="flex gap-2">
                        <input
                            type="text"
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                            value={option}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const newOptions = [...(config.classificationOptions || [])];
                                newOptions[i] = e.target.value;
                                onChange({ classificationOptions: newOptions });
                            }}
                        />
                        <button
                            className="text-red-500 hover:text-red-700"
                            onClick={() => onChange({ classificationOptions: config.classificationOptions?.filter((_: string, idx: number) => idx !== i) })}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
            <button
                className="text-blue-600 text-sm font-medium mt-2 hover:underline"
                onClick={() => onChange({ classificationOptions: [...(config.classificationOptions || []), ''] })}
            >
                + Add Option
            </button>
        </Wrapper>
    );

    const renderEntityTags = (index: number) => (
        <Wrapper title="Entity Tags" index={index}>
            <div className="grid grid-cols-2 gap-4 text-sm">
                {config.entityTags?.map((tag: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-2 border rounded bg-pink-50 border-pink-100 text-pink-700 font-medium">
                        <span className="w-3 h-3 rounded-full bg-pink-500"></span> {tag}
                        <button
                            className="ml-auto text-gray-400 hover:text-red-500"
                            onClick={() => onChange({ entityTags: config.entityTags?.filter((_: string, idx: number) => idx !== i) })}
                        >
                            ×
                        </button>
                    </div>
                ))}
                <button
                    className="border border-dashed border-gray-300 p-2 rounded text-gray-500 hover:bg-gray-50"
                    onClick={() => onChange({ entityTags: [...(config.entityTags || []), 'New Tag'] })}
                >
                    + Add Tag
                </button>
            </div>
        </Wrapper>
    );

    const renderLangPair = (index: number) => (
        <Wrapper title="Languages" index={index}>
            <div className="flex items-center gap-4">
                <select
                    className="border p-2 rounded flex-1"
                    value={config.sourceLanguage || 'English (US)'}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ sourceLanguage: e.target.value })}
                >
                    <option>English (US)</option>
                    <option>Spanish (MX)</option>
                    <option>French (FR)</option>
                </select>
                <Globe className="text-gray-400 w-4 h-4" />
                <select
                    className="border p-2 rounded flex-1"
                    value={config.targetLanguage || 'Spanish (MX)'}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ targetLanguage: e.target.value })}
                >
                    <option>Spanish (MX)</option>
                    <option>French (FR)</option>
                    <option>English (US)</option>
                </select>
            </div>
        </Wrapper>
    );

    const renderSentimentConfig = (index: number) => (
        <Wrapper title="Sentiment Labels" index={index}>
            <div className="flex gap-4">
                {(config.sentimentLabels || ['Positive', 'Negative', 'Neutral']).map((label: string) => (
                    <div key={label} className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50 flex-1 justify-between">
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                        <input
                            type="checkbox"
                            checked={config.sentimentLabels?.includes(label) || false}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const currentLabels = new Set(config.sentimentLabels || []);
                                if (e.target.checked) {
                                    currentLabels.add(label);
                                } else {
                                    currentLabels.delete(label);
                                }
                                onChange({ sentimentLabels: Array.from(currentLabels) });
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                        />
                    </div>
                ))}
            </div>
            <button
                className="text-blue-600 text-sm font-medium mt-3 hover:underline"
                onClick={() => {
                    const newLabel = prompt("Enter new sentiment label:");
                    if (newLabel && !config.sentimentLabels?.includes(newLabel)) {
                        onChange({ sentimentLabels: [...(config.sentimentLabels || []), newLabel] });
                    }
                }}
            >
                + Add Custom Label
            </button>
        </Wrapper>
    );

    const renderTranscriptionSettings = (index: number) => (
        <Wrapper title="Transcription Rules" index={index}>
            <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                        type="checkbox"
                        checked={config.includeTimestamps || false}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ includeTimestamps: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                        <span className="block text-sm font-medium text-gray-900">Include Timestamps</span>
                        <span className="block text-xs text-gray-500">Require timestamp every speaker change</span>
                    </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                        type="checkbox"
                        checked={config.speakerIdentification || false}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ speakerIdentification: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                        <span className="block text-sm font-medium text-gray-900">Speaker Identification</span>
                        <span className="block text-xs text-gray-500">Label as Speaker 1, Speaker 2, etc.</span>
                    </div>
                </label>
            </div>
        </Wrapper>
    );

    const renderPromptText = (index: number) => (
        <Wrapper title="Script to Record" index={index}>
            <textarea
                className="w-full h-24 border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter the exact text you want workers to read aloud defined variables like {name} are allowed..."
                value={config.promptText || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange({ promptText: e.target.value })}
            ></textarea>
        </Wrapper>
    );

    const renderAudioReqs = (index: number) => (
        <Wrapper title="Audio Requirements" index={index}>
            <div className="grid grid-cols-2 gap-4">
                <div className="border p-3 rounded-lg">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Min Duration</label>
                    <select
                        className="w-full border-gray-200 rounded text-sm"
                        value={config.minAudioDuration || '5 seconds'}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ minAudioDuration: e.target.value })}
                    >
                        <option>5 seconds</option>
                        <option>10 seconds</option>
                        <option>15 seconds</option>
                    </select>
                </div>
                <div className="border p-3 rounded-lg">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Environment</label>
                    <select
                        className="w-full border-gray-200 rounded text-sm"
                        value={config.audioEnvironment || 'Any'}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ audioEnvironment: e.target.value })}
                    >
                        <option>Any</option>
                        <option>No background noise</option>
                        <option>Quiet room</option>
                    </select>
                </div>
            </div>
        </Wrapper>
    );

    const renderFieldsDef = (index: number) => (
        <Wrapper title="Data Fields to Find" index={index}>
            <div className="space-y-2">
                {config.dataFields?.map((field: { name: string; type: string }, i: number) => (
                    <div key={i} className="flex gap-2 items-center">
                        <input
                            type="text"
                            value={field.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const newFields = [...(config.dataFields || [])];
                                newFields[i] = { ...newFields[i], name: e.target.value };
                                onChange({ dataFields: newFields });
                            }}
                            className="flex-1 bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-500"
                        />
                        <select
                            value={field.type}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const newFields = [...(config.dataFields || [])];
                                newFields[i] = { ...newFields[i], type: e.target.value as 'URL' | 'Number' | 'Text' };
                                onChange({ dataFields: newFields });
                            }}
                            className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500 border border-gray-200"
                        >
                            <option>URL</option>
                            <option>Number</option>
                            <option>Text</option>
                        </select>
                        <button
                            className="text-red-500 hover:text-red-700"
                            onClick={() => onChange({ dataFields: config.dataFields?.filter((_: any, idx: number) => idx !== i) })}
                        >
                            ×
                        </button>
                    </div>
                ))}
                <button
                    className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
                    onClick={() => onChange({ dataFields: [...(config.dataFields || []), { name: '', type: 'Text' }] })}
                >
                    + Add Field
                </button>
            </div>
        </Wrapper>
    );

    const renderSurveyBuilder = (index: number) => (
        <Wrapper title="Survey Questions" index={index}>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer">
                <span className="text-lg font-medium">+ Add Question</span>
                <span className="text-xs mt-1">Multiple Choice, Text, Rating, etc.</span>
            </div>
        </Wrapper>
    );

    const renderInstructions = (index: number) => (
        <Wrapper title="Instructions & Visual Guide" index={index}>
            <div className="flex flex-col md:flex-row gap-4 h-48">
                <div className="md:w-1/2">
                    <textarea
                        className="w-full h-full border border-gray-300 rounded-md p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Explain how tight the boxes should be..."
                        value={config.instructions || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange({ instructions: e.target.value })}
                    ></textarea>
                </div>
                <div className="md:w-1/2 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 text-sm">
                    Preview of Annotation Tool
                </div>
            </div>
        </Wrapper>
    );

    const renderDifficultySelector = (index: number) => (
        <Wrapper title="Difficulty Level" index={index}>
            <div className="grid grid-cols-3 gap-4">
                {(['Easy', 'Medium', 'Hard'] as const).map((level) => (
                    <button
                        key={level}
                        onClick={() => onChange({ difficulty: level })}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition group focus:outline-none ${config.difficulty === level
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-2'
                            : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                            }`}
                    >
                        <span className={`text-lg font-bold mb-1 ${config.difficulty === level ? 'text-blue-900' : 'text-gray-500'}`}>{level}</span>
                        <span className="text-xs opacity-75 text-gray-500">
                            {level === 'Easy' && 'Quick tasks, minimal training'}
                            {level === 'Medium' && 'Standard complexity'}
                            {level === 'Hard' && 'Expertise required'}
                        </span>
                        <div className="w-full h-1 bg-gray-200 mt-3 rounded-full overflow-hidden">
                            <div className={`h-full ${level === 'Easy' ? 'w-1/3 bg-green-500' : level === 'Medium' ? 'w-2/3 bg-yellow-500' : 'w-full bg-red-500'}`}></div>
                        </div>
                    </button>
                ))}
            </div>
        </Wrapper>
    );

    const renderPaymentConfig = (index: number) => (
        <Wrapper title="Budget & Launch Limit" index={index}>
            <div className="flex gap-6">
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reward per Task</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 font-medium">$</span>
                        <input
                            type="number"
                            step="0.01"
                            className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 text-gray-900 font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={config.rewardPerTask || 0.15}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ rewardPerTask: parseFloat(e.target.value) })}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Recommended: $0.10 - $0.30</p>
                </div>

                <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Tasks</label>
                    <input
                        type="number"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={config.totalTasks || 10}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ totalTasks: parseInt(e.target.value) })}
                    />
                </div>

                <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Workers / Task</label>
                    <input
                        type="number"
                        min="1"
                        className={`w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none ${config.verificationStrategy === 'Manual Review' ? 'bg-gray-50 opacity-50' : ''}`}
                        value={config.workersPerTask || 1}
                        disabled={config.verificationStrategy === 'Manual Review'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ workersPerTask: parseInt(e.target.value) })}
                    />
                </div>

                <div className="w-px bg-gray-200 mx-1"></div>

                <div className="w-48 bg-gray-900 rounded-lg p-3 text-white flex flex-col justify-center shadow-lg border border-gray-700">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Total Budget</span>
                    <span className="text-xl font-bold font-mono">
                        ${((config.rewardPerTask || 0.15) * (config.totalTasks || 10) * (config.workersPerTask || 1) * 1.05).toFixed(2)}
                    </span>
                    <span className="text-[9px] text-gray-500 mt-1">Incl. 5% platform fee</span>
                </div>
            </div>
        </Wrapper>
    );

    const renderVerificationConfig = (index: number) => (
        <Wrapper title="Verification Strategy" index={index}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition ${config.verificationStrategy === 'Consensus' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    <input
                        type="radio"
                        name="verification"
                        checked={config.verificationStrategy === 'Consensus'}
                        onChange={() => onChange({ verificationStrategy: 'Consensus', workersPerTask: 3 })}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                        <span className="block text-sm font-semibold text-gray-900">Consensus (Auto)</span>
                        <span className="block text-xs text-gray-500 mt-1">Multiple workers confirm the same task for quality.</span>
                    </div>
                </label>

                <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition ${config.verificationStrategy === 'Manual Review' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    <input
                        type="radio"
                        name="verification"
                        checked={config.verificationStrategy === 'Manual Review'}
                        onChange={() => onChange({ verificationStrategy: 'Manual Review', workersPerTask: 1 })}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                        <span className="block text-sm font-semibold text-gray-900">Manual Review</span>
                        <span className="block text-xs text-gray-500 mt-1">You verify each submission manually from the dashboard.</span>
                    </div>
                </label>

                <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 transition ${config.verificationStrategy === 'Golden Set' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    <input
                        type="radio"
                        name="verification"
                        checked={config.verificationStrategy === 'Golden Set'}
                        onChange={() => onChange({ verificationStrategy: 'Golden Set', workersPerTask: 1 })}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                        <span className="block text-sm font-semibold text-gray-900">Golden Set (Auto)</span>
                        <span className="block text-xs text-gray-500 mt-1">Instant approval if worker matches ground truth answer.</span>
                    </div>
                </label>
            </div>

            {config.verificationStrategy === 'Golden Set' && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg animate-fade-in">
                    <label className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Ground Truth Answer</label>
                    <input
                        type="text"
                        placeholder="Enter the correct answer for auto-verification..."
                        className="w-full bg-white border border-amber-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        value={config.correctAnswer || ''}
                        onChange={(e) => onChange({ correctAnswer: e.target.value })}
                    />
                    <p className="text-[10px] text-amber-600 mt-2 font-medium italic">
                        * Workers who submit this exact text will be approved and paid immediately by the protocol.
                    </p>
                </div>
            )}
        </Wrapper>
    );

    const renderDefaultComponent = (type: ComponentType, index: number) => (
        <Wrapper title={type} index={index}>
            <div className="p-4 bg-gray-50 text-gray-400 text-sm text-center">
                Config for {type} (Not yet implemented or no specific config)
            </div>
        </Wrapper>
    );

    const renderComponent = (type: ComponentType, index: number) => {
        switch (type) {
            case 'campaign-info':
                return renderCampaignInfo(index);
            case 'upload-image':
                return renderUploadImage(index);
            case 'upload-text':
                return renderUploadText(index);
            case 'upload-audio':
                return renderUploadAudio(index);
            case 'upload-csv':
                return renderUploadCsv(index);
            case 'labels-creator':
                return renderLabelsCreator(index);
            case 'classes-creator':
                return renderClassesCreator(index);
            case 'entity-tags':
                return renderEntityTags(index);
            case 'lang-pair':
                return renderLangPair(index);
            case 'sentiment-config':
                return renderSentimentConfig(index);
            case 'transcription-settings':
                return renderTranscriptionSettings(index);
            case 'prompt-text':
                return renderPromptText(index);
            case 'audio-reqs':
                return renderAudioReqs(index);
            case 'fields-def':
                return renderFieldsDef(index);
            case 'survey-builder':
                return renderSurveyBuilder(index);
            case 'instructions-simple':
            case 'instructions-vision':
                return renderInstructions(index);
            case 'difficulty-selector':
                return renderDifficultySelector(index);
            case 'payment-config':
                return renderPaymentConfig(index);
            case 'verification-config':
                return renderVerificationConfig(index);
            default:
                return renderDefaultComponent(type, index);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {components.map((comp, idx) => (
                <React.Fragment key={`${comp}-${idx}`}>
                    {renderComponent(comp, idx)}
                </React.Fragment>
            ))}
        </div>
    );
});
