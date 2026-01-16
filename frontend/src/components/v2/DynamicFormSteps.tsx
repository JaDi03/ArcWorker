import React, { useRef, useState } from 'react';
import {
    ImagePlus, FileText, Headphones, Table,
    Globe, UploadCloud, CheckCircle
} from 'lucide-react';
import { CampaignConfig } from './types';

// Wrapper Component
const Wrapper = ({ title, children, index }: { title: string, children: React.ReactNode, index: number }) => (
    <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">{index + 1}. {title}</h3>
        {children}
    </section>
);

interface StepProps {
    index: number;
    config: CampaignConfig;
    onChange: (updates: Partial<CampaignConfig>) => void;
}

export const InstructionsStep: React.FC<StepProps> = ({ index, config, onChange }) => {
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
                        onChange({ exampleImageUrl: result.url });
                    } else {
                        throw new Error("No URL returned");
                    }
                })
                .catch(err => {
                    console.error("Upload failed:", err);
                    setUploadStatus('idle');
                });
        }
    };

    return (
        <Wrapper title="Instructions & Visual Guide" index={index}>
            <div className="flex flex-col md:flex-row gap-4 h-56">
                <div className="md:w-1/2 flex flex-col">
                    <label className="text-xs font-bold text-gray-700 mb-2">Worker Instructions</label>
                    <textarea
                        className="flex-1 border border-gray-300 rounded-md p-3 text-sm font-medium text-gray-900 placeholder-gray-500 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Explain specifically what to look for..."
                        value={config.instructions || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange({ instructions: e.target.value })}
                    ></textarea>
                </div>
                <div className="md:w-1/2 flex flex-col">
                    <label className="text-xs font-bold text-gray-700 mb-2">Visual Guide (Optional)</label>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 cursor-pointer transition group ${uploadStatus === 'success' ? 'border-green-500 bg-green-50/30' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                            }`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />

                        {uploadStatus === 'success' ? (
                            <>
                                <CheckCircle className="w-8 h-8 text-green-500 mb-2 animate-in zoom-in" />
                                <span className="text-xs font-bold text-green-700">{fileName}</span>
                                <span className="text-[10px] text-green-600">Uploaded successfully</span>
                            </>
                        ) : uploadStatus === 'uploading' ? (
                            <>
                                <UploadCloud className="w-8 h-8 text-blue-500 mb-2 animate-bounce" />
                                <span className="text-xs font-bold text-blue-600">Uploading...</span>
                            </>
                        ) : (
                            <>
                                <ImagePlus className="w-8 h-8 text-gray-400 mb-2 group-hover:text-blue-500 transition" />
                                <span className="text-xs font-bold text-gray-500 group-hover:text-blue-600">Upload Example Image</span>
                                <span className="text-[10px] text-gray-400 mt-1">Shows workers what a "good" answer looks like</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Wrapper>
    );
};

export const UploadImageStep: React.FC<StepProps> = ({ index, config, onChange }) => {
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

export const UploadTextStep: React.FC<StepProps> = ({ index, config, onChange }) => {
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

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">or</span>
                <input
                    type="text"
                    className="flex-1 bg-gray-50 border-none rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    placeholder="Paste JSONL/CSV Dataset URL..."
                    value={config.textDatasetUrl || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ textDatasetUrl: e.target.value })}
                />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-700 mb-2 block">Or enter a single phrase/text directly:</label>
                <div className="flex gap-2">
                    <textarea
                        className="flex-1 border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                        rows={2}
                        placeholder="Type text here (e.g., 'The service was excellent, highly recommended.')"
                        onBlur={(e) => {
                            const text = e.target.value;
                            if (text && text.length > 0) {
                                setUploadStatus('uploading');
                                const blob = new Blob([text], { type: 'text/plain' });
                                const file = new File([blob], 'phrase.txt', { type: 'text/plain' });
                                const data = new FormData();
                                data.append('file', file);

                                fetch('/api/upload', { method: 'POST', body: data })
                                    .then(res => res.json())
                                    .then(result => {
                                        if (result.url) {
                                            setUploadStatus('success');
                                            setFileName('phrase.txt');
                                            onChange({ textDatasetUrl: result.url });
                                        }
                                    })
                                    .catch(err => {
                                        console.error('Text upload failed:', err);
                                        setUploadStatus('idle');
                                    });
                            }
                        }}
                    ></textarea>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Text will be automatically uploaded when you click outside the box.</p>
            </div>
        </Wrapper>
    );
};

export const UploadAudioStep: React.FC<StepProps> = ({ index, config, onChange }) => {
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

export const UploadCsvStep: React.FC<StepProps> = ({ index, config, onChange }) => {
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
