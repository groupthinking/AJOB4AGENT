import { Channel } from 'amqplib';

// This is the data structure received from the job_completed_queue
export interface TailoredOutput {
    job_id: string;
    platform: string;
    job_url: string;
    status: string;
    tailored_resume: string;
    cover_letter: string;
    outreach_message: string;
    confidence_score: number;
}

// The contract for all apply agents
export interface IApplyAgent {
    payload: TailoredOutput;
    apply(channel: Channel): Promise<void>; // The primary execution method now takes the channel
    login(page: any): Promise<void>;
    navigateToJob(page: any): Promise<void>;
    fillApplication(page: any): Promise<void>;
    submitApplication(page: any): Promise<void>;
    // The reportStatus method now requires the channel to publish events
    reportStatus(channel: Channel, status: 'success' | 'failure', details: string): Promise<void>;
}