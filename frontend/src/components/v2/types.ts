import { LucideIcon } from 'lucide-react';

export type ComponentType =
    | 'campaign-info'
    | 'upload-image'
    | 'upload-text'
    | 'upload-audio'
    | 'upload-csv'
    | 'labels-creator'
    | 'classes-creator'
    | 'entity-tags'
    | 'sentiment-config'
    | 'lang-pair'
    | 'transcription-settings'
    | 'prompt-text'
    | 'audio-reqs'
    | 'fields-def'
    | 'survey-builder'
    | 'instructions-vision'
    | 'instructions-simple'
    | 'difficulty-selector'
    | 'payment-config'
    | 'verification-config';

export interface ModuleConfig {
    id: string;
    title: string;
    desc: string;
    icon?: LucideIcon; // In a real app we might pass the component or name string
    components: ComponentType[];
}

export interface SidebarGroup {
    title: string;
    items: string[]; // IDs of the modules
}

export interface CampaignConfig {
    // Shared
    moduleId: string;
    title: string;
    description: string;

    // Components Data
    datasetUrl?: string;
    textDatasetUrl?: string;
    audioDatasetUrl?: string;
    sourceDataUrl?: string;

    // Configs
    labels?: string[];
    allowMultipleBoxes?: boolean;
    classificationOptions?: string[];
    entityTags?: string[];
    sentimentLabels?: string[];
    sourceLanguage?: string;
    targetLanguage?: string;

    // Transcription
    includeTimestamps?: boolean;
    speakerIdentification?: boolean;

    // Audio Collection
    promptText?: string;
    minAudioDuration?: string;
    audioEnvironment?: string;

    // Data Enrichment
    dataFields?: { name: string; type: string }[];
    surveyQuestions?: any[]; // Simplified for now

    instructions?: string;

    // Logic
    difficulty: 'Easy' | 'Medium' | 'Hard';
    verificationStrategy?: 'Consensus' | 'Manual Review' | 'Golden Set';

    // Payment
    rewardPerTask: number;
    totalTasks: number;
}
