import { LinkedInApplyAgent } from './linkedin.agent';
import { GlassdoorApplyAgent } from './glassdoor.agent';
import { WellfoundApplyAgent } from './wellfound.agent';
import { IApplyAgent, TailoredOutput } from './agent.interface';

// The Agent Factory
export function dispatchApplyAgent(payload: TailoredOutput): IApplyAgent | null {
    console.log(`[FACTORY] Selecting agent for platform: ${payload.platform}`);
    switch (payload.platform.toLowerCase()) {
        case 'linkedin':
            return new LinkedInApplyAgent(payload);
        case 'glassdoor':
            return new GlassdoorApplyAgent(payload);
        case 'wellfound':
            return new WellfoundApplyAgent(payload);
        default:
            console.error(`[FACTORY] No agent found for platform: ${payload.platform}`);
            return null;
    }
}