import React from 'react';
import {
    ScanLine, Image as ImageIcon, Shapes,
    Tag, Smile, Languages,
    Mic, Mic2, Database, ClipboardList
} from 'lucide-react';
import { ModuleConfig } from './types';

interface SidebarProps {
    activeModuleId: string;
    onSelect: (id: string) => void;
}

// Configuration of the sidebar structure
const GROUPS = [
    {
        title: "Computer Vision",
        items: [
            { id: 'vision-bbox', label: 'Bounding Boxes', icon: ScanLine },
            { id: 'vision-class', label: 'Image Classification', icon: ImageIcon },
            { id: 'vision-seg', label: 'Segmentation', icon: Shapes },
        ]
    },
    {
        title: "Natural Language",
        items: [
            { id: 'nlp-ner', label: 'Entity Recognition (NER)', icon: Tag },
            { id: 'nlp-sentiment', label: 'Sentiment Analysis', icon: Smile },
            { id: 'nlp-trans', label: 'Translation', icon: Languages },
        ]
    },
    {
        title: "Audio & Speech",
        items: [
            { id: 'audio-transcribe', label: 'Transcription', icon: Mic },
            { id: 'audio-collect', label: 'Speech Collection', icon: Mic2 },
        ]
    },
    {
        title: "Data Operations",
        items: [
            { id: 'data-enrich', label: 'Data Enrichment', icon: Database },
            { id: 'survey', label: 'Surveys', icon: ClipboardList },
        ]
    }
];

export const Sidebar: React.FC<SidebarProps> = ({ activeModuleId, onSelect }) => {
    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col z-20 shadow-sm overflow-y-auto h-full">
            <div className="p-6 flex items-center gap-3 sticky top-0 bg-white z-10">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-100">
                    A
                </div>
                <span className="font-bold text-xl tracking-tight text-gray-900">ArcWorker</span>
            </div>

            <nav className="flex-1 pb-6">
                {GROUPS.map((group) => (
                    <div key={group.title}>
                        <div className="px-6 pt-6 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {group.title}
                        </div>
                        {group.items.map((item) => {
                            const isActive = activeModuleId === item.id;
                            const Icon = item.icon;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onSelect(item.id)}
                                    className={`w-full flex items-center px-6 py-2 text-sm font-medium transition-colors ${isActive
                                        ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </nav>
        </aside>
    );
};
