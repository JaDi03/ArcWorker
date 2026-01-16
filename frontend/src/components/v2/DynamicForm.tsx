import React, { useRef, useState } from 'react';
import {
    ImagePlus, FileText, Headphones, Table,
    Globe, UploadCloud, CheckCircle, Trash2
} from 'lucide-react';
import { ComponentType, CampaignConfig } from './types';
import {
    InstructionsStep,
    UploadImageStep,
    UploadTextStep,
    UploadAudioStep,
    UploadCsvStep
} from './DynamicFormSteps';
import { GoldenSetEditor } from './GoldenSetEditor';

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





    const renderLabelsCreator = (index: number) => (
        <Wrapper title="Taxonomy (Classes)" index={index}>
            <div className="space-y-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Add labels (comma separated)..."
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm font-bold text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
            <p className="text-xs font-bold text-gray-700 mb-2">Workers must choose ONE of these:</p>
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

    const [tagInput, setTagInput] = useState('');

    const renderEntityTags = (index: number) => (
        <Wrapper title="Entity Tags" index={index}>
            <div className="space-y-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Type a tag (e.g. Person, Organization, Location)..."
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (tagInput.trim()) {
                                    onChange({ entityTags: [...(config.entityTags || []), tagInput.trim()] });
                                    setTagInput('');
                                }
                            }
                        }}
                    />
                    <button
                        className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!tagInput.trim()}
                        onClick={() => {
                            if (tagInput.trim()) {
                                onChange({ entityTags: [...(config.entityTags || []), tagInput.trim()] });
                                setTagInput('');
                            }
                        }}
                    >
                        Add Tag
                    </button>
                </div>

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
                    {(!config.entityTags || config.entityTags.length === 0) && (
                        <div className="col-span-2 text-center py-4 border-2 border-dashed border-gray-100 rounded-lg text-gray-400 text-xs uppercase font-bold tracking-wider">
                            No tags added yet
                        </div>
                    )}
                </div>
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

    const renderSentimentConfig = (index: number) => {
        const defaultOptions = ['Positive', 'Negative', 'Neutral'];
        // Combine defaults with any custom labels that are NOT in defaults
        const currentLabels = config.sentimentLabels || [];
        const customLabels = currentLabels.filter(l => !defaultOptions.includes(l));
        const allOptions = [...defaultOptions, ...customLabels];

        return (
            <Wrapper title="Sentiment Labels" index={index}>
                <div className="flex gap-4 flex-wrap">
                    {allOptions.map((label: string) => {
                        const isSelected = config.sentimentLabels ? config.sentimentLabels.includes(label) : true; // Default to all selected if undefined (initial state)

                        return (
                            <div key={label} className={`flex items-center gap-2 p-3 border rounded-lg flex-1 justify-between min-w-[120px] transition ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-500'}`}>{label}</span>
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                        const currentSet = new Set(config.sentimentLabels || allOptions); // If undefined, start with ALL selected
                                        if (e.target.checked) {
                                            currentSet.add(label);
                                        } else {
                                            currentSet.delete(label);
                                        }
                                        onChange({ sentimentLabels: Array.from(currentSet) });
                                    }}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                            </div>
                        );
                    })}
                </div>
                <button
                    className="text-blue-600 text-sm font-medium mt-3 hover:underline"
                    onClick={() => {
                        const newLabel = prompt("Enter new sentiment label:");
                        if (newLabel && !allOptions.includes(newLabel)) {
                            onChange({ sentimentLabels: [...(config.sentimentLabels || allOptions), newLabel] });
                        }
                    }}
                >
                    + Add Custom Label
                </button>
            </Wrapper>
        );
    };

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
            <div className="space-y-4">
                {/* List of Questions */}
                {config.questions?.map((q: any, i: number) => (
                    <div key={i} className="p-4 border rounded-lg bg-gray-50 border-gray-200 relative group transition hover:border-blue-200">
                        <div className="flex gap-3 mb-3">
                            <div className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                                {i + 1}
                            </div>
                            <input
                                type="text"
                                placeholder="Enter your question here..."
                                className="flex-1 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none pb-1 font-medium text-gray-900 placeholder-gray-400"
                                value={q.question || ''}
                                onChange={(e) => {
                                    const newQuestions = [...(config.questions || [])];
                                    newQuestions[i] = { ...newQuestions[i], question: e.target.value };
                                    onChange({ questions: newQuestions });
                                }}
                            />
                            <button
                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                onClick={() => onChange({ questions: config.questions?.filter((_: any, idx: number) => idx !== i) })}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="pl-9 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Answer Type</label>
                                <select
                                    className="w-full text-sm border-gray-300 rounded-md p-2 bg-white"
                                    value={q.type || 'text'}
                                    onChange={(e) => {
                                        const newQuestions = [...(config.questions || [])];
                                        newQuestions[i] = { ...newQuestions[i], type: e.target.value as 'text' | 'multiple_choice' | 'checkbox' | 'rating' };
                                        onChange({ questions: newQuestions });
                                    }}
                                >
                                    <option value="text">Text Input</option>
                                    <option value="multiple_choice">Multiple Choice</option>
                                    <option value="checkbox">Checkbox (Multiple Select)</option>
                                    <option value="rating">Star Rating (1-5)</option>
                                </select>
                            </div>
                            <div className="flex items-center pt-5">
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={q.required !== false}
                                        onChange={(e) => {
                                            const newQuestions = [...(config.questions || [])];
                                            newQuestions[i] = { ...newQuestions[i], required: e.target.checked };
                                            onChange({ questions: newQuestions });
                                        }}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    Required Question
                                </label>
                            </div>
                        </div>

                        {/* Options for Multiple Choice */}
                        {['multiple_choice', 'checkbox'].includes(q.type) && (
                            <div className="pl-9 mt-3">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Options (Comma separated)</label>
                                <input
                                    type="text"
                                    placeholder="Option A, Option B, Option C..."
                                    className="w-full text-sm border-gray-300 rounded-md p-2"
                                    value={q.options?.join(', ') || ''}
                                    onChange={(e) => {
                                        const newQuestions = [...(config.questions || [])];
                                        newQuestions[i] = {
                                            ...newQuestions[i],
                                            options: e.target.value.split(',').map((s: string) => s.trim())
                                        };
                                        onChange({ questions: newQuestions });
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}

                {/* Add Button */}
                <button
                    onClick={() => onChange({
                        questions: [
                            ...(config.questions || []),
                            { question: '', type: 'text', required: true }
                        ]
                    })}
                    className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-medium hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition flex flex-col items-center justify-center gap-2"
                >
                    <span className="text-2xl font-light">+</span>
                    <span>Add Another Question</span>
                </button>
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
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Reward per Task</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500 font-bold">$</span>
                        <input
                            type="number"
                            step="0.0001"
                            placeholder="0.15"
                            className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 text-gray-900 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={config.rewardPerTask || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ rewardPerTask: parseFloat(e.target.value) })}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Set your price (Min $0.01)</p>
                </div>

                <div className="flex-1">
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Total Tasks</label>
                    <input
                        type="number"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={config.totalTasks || 10}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ totalTasks: parseInt(e.target.value) })}
                    />
                </div>

                <div className="flex-1">
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                        Workers / Task
                        {config.verificationStrategy === 'Manual Review' && <span className="text-[9px] text-orange-600 ml-2 normal-case font-normal">(Locked for Manual Review)</span>}
                    </label>
                    <input
                        type="number"
                        min="1"
                        className={`w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none ${config.verificationStrategy === 'Manual Review' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
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
                        <span className="block text-sm font-bold text-gray-900">Consensus (Auto)</span>
                        <span className="block text-xs text-gray-600 mt-1 font-medium">Multiple workers confirm the same task for quality.</span>
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
                        <span className="block text-sm font-bold text-gray-900">Manual Review</span>
                        <span className="block text-xs text-gray-600 mt-1 font-medium">You verify each submission manually from the dashboard.</span>
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
                        <span className="block text-sm font-bold text-gray-900">Golden Set (Auto)</span>
                        <span className="block text-xs text-gray-600 mt-1 font-medium">Instant approval if worker matches ground truth answer.</span>
                    </div>
                </label>
            </div>

            {config.verificationStrategy === 'Golden Set' && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg animate-fade-in">
                    <label className="block text-xs font-black text-amber-800 uppercase tracking-wider mb-2">Ground Truth Answer</label>

                    {/* VISUAL EDITOR FOR NER */}
                    {config.moduleId === 'nlp-ner' ? (
                        <GoldenSetEditor
                            textContent={config.textContent || ""}
                            entityTags={config.entityTags || []}
                            value={config.correctAnswer || ""}
                            onChange={(val) => onChange({ correctAnswer: val })}
                        />
                    ) : (
                        /* DEFAULT TEXT INPUT FOR OTHERS */
                        <input
                            type="text"
                            placeholder="Enter the correct answer for auto-verification..."
                            className="w-full bg-white border border-amber-200 rounded px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none"
                            value={config.correctAnswer || ''}
                            onChange={(e) => onChange({ correctAnswer: e.target.value })}
                        />
                    )}

                    <p className="text-[10px] text-amber-700 mt-2 font-bold italic">
                        * Workers who submit this exact {config.moduleId === 'nlp-ner' ? 'structure' : 'text'} will be approved and paid immediately by the protocol.
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
                return <UploadImageStep key={index} index={index} config={config} onChange={onChange} />;
            case 'upload-text':
                return <UploadTextStep key={index} index={index} config={config} onChange={onChange} />;
            case 'upload-audio':
                return <UploadAudioStep key={index} index={index} config={config} onChange={onChange} />;
            case 'upload-csv':
                return <UploadCsvStep key={index} index={index} config={config} onChange={onChange} />;
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
                return <InstructionsStep key={index} index={index} config={config} onChange={onChange} />;
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
