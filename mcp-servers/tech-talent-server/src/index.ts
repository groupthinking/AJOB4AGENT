#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/server/node';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolRequest,
  CallToolResult,
  ListToolsResult,
} from '@modelcontextprotocol/server/types';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { z } from 'zod';

// Following Anthropic's unified MCP server pattern for tech talent platforms
const TechTalentSearchSchema = z.object({
  query: z.string().optional().default(''),
  location: z.string().optional().default(''),
  platforms: z.array(z.enum(['hired', 'vettery', 'builtin-sf', 'builtin-nyc', 'builtin-la', 'builtin-chicago', 'builtin-austin', 'builtin-seattle'])).optional().default(['hired', 'vettery']),
  experience_level: z.enum(['entry', 'mid', 'senior']).optional(),
  remote_ok: z.boolean().optional().default(false),
  salary_min: z.number().optional(),
  limit: z.number().optional().default(25)
});

interface TechTalentJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  platform: string;
  salary_range?: string;
  skills: string[];
  remote: boolean;
  experience_level: string;
  posted_date: string;
  company_size?: string;
  interview_process?: string;
  benefits?: string[];
}

class TechTalentMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: 'tech-talent-unified', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
      return {
        tools: [
          {
            name: 'search_tech_talent_jobs',
            description: 'Search across unified tech talent platforms (Hired/Vettery + Built In networks). Provides AI-curated matches, salary transparency, and streamlined interview processes.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Job title or skill search (e.g., "frontend engineer", "data scientist", "devops")'
                },
                location: {
                  type: 'string',
                  description: 'Location or tech hub (e.g., "San Francisco", "New York", "Remote", "Austin")'
                },
                platforms: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['hired', 'vettery', 'builtin-sf', 'builtin-nyc', 'builtin-la', 'builtin-chicago', 'builtin-austin', 'builtin-seattle']
                  },
                  description: 'Specific platforms to search (default: hired, vettery)'
                },
                experience_level: {
                  type: 'string',
                  enum: ['entry', 'mid', 'senior'],
                  description: 'Experience level for targeted matching'
                },
                remote_ok: {
                  type: 'boolean',
                  description: 'Include remote positions only'
                },
                salary_min: {
                  type: 'number',
                  description: 'Minimum salary requirement'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum results per platform (default: 25)'
                }
              }
            }
          } as Tool
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
      if (request.params.name === 'search_tech_talent_jobs') {
        try {
          const params = TechTalentSearchSchema.parse(request.params.arguments);
          const jobs = await this.searchTechTalentJobs(params);
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                jobs,
                total_count: jobs.length,
                platforms_searched: params.platforms,
                search_params: params,
                timestamp: new Date().toISOString(),
                unified_features: {
                  ai_matching: true,
                  salary_transparency: true,
                  streamlined_interviews: true,
                  tech_focus: true
                }
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error searching tech talent platforms: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      }

      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  private async searchTechTalentJobs(params: z.infer<typeof TechTalentSearchSchema>): Promise<TechTalentJob[]> {
    const allJobs: TechTalentJob[] = [];

    // Search each platform in parallel (Anthropic's orchestrator-worker pattern)
    const searchPromises = params.platforms.map(platform => {
      switch (platform) {
        case 'hired':
        case 'vettery':
          return this.searchHiredVettery(platform, params);
        case 'builtin-sf':
        case 'builtin-nyc':
        case 'builtin-la':
        case 'builtin-chicago':
        case 'builtin-austin':
        case 'builtin-seattle':
          return this.searchBuiltIn(platform, params);
        default:
          return Promise.resolve([]);
      }
    });

    try {
      const results = await Promise.allSettled(searchPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allJobs.push(...result.value);
        } else {
          console.error(`❌ Platform ${params.platforms[index]} search failed:`, result.reason);
        }
      });

    } catch (error) {
      console.error('❌ Tech talent search error:', error);
    }

    // Deduplicate and sort by relevance
    return this.deduplicateAndSort(allJobs, params);
  }

  private async searchHiredVettery(platform: string, params: z.infer<typeof TechTalentSearchSchema>): Promise<TechTalentJob[]> {
    try {
      // Hired/Vettery unified search (post-merger)
      const baseUrl = platform === 'hired' ? 'https://hired.com' : 'https://vettery.com';
      const searchUrl = `${baseUrl}/jobs`;
      
      const response = await axios.get(searchUrl, {
        params: {
          q: params.query,
          location: params.location,
          remote: params.remote_ok,
          experience: params.experience_level,
          salary_min: params.salary_min
        },
        headers: {
          'User-Agent': 'AJOB4AGENT Tech Talent Bot 1.0',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 15000
      });

      return this.parseHiredVetteryJobs(response.data, platform, params);

    } catch (error) {
      console.error(`❌ ${platform} search failed:`, error);
      return [];
    }
  }

  private async searchBuiltIn(platform: string, params: z.infer<typeof TechTalentSearchSchema>): Promise<TechTalentJob[]> {
    try {
      // Built In regional platform search
      const cityMap = {
        'builtin-sf': 'https://www.builtinsf.com/jobs',
        'builtin-nyc': 'https://www.builtinnyc.com/jobs',
        'builtin-la': 'https://www.builtinla.com/jobs',
        'builtin-chicago': 'https://www.builtinchicago.com/jobs',
        'builtin-austin': 'https://www.builtinaustin.com/jobs',
        'builtin-seattle': 'https://www.builtinseattle.com/jobs'
      };

      const searchUrl = cityMap[platform as keyof typeof cityMap];
      if (!searchUrl) return [];

      const response = await axios.get(searchUrl, {
        params: {
          q: params.query,
          remote: params.remote_ok ? 'true' : undefined
        },
        headers: {
          'User-Agent': 'AJOB4AGENT Tech Talent Bot 1.0',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 15000
      });

      return this.parseBuiltInJobs(response.data, platform, params);

    } catch (error) {
      console.error(`❌ Built In ${platform} search failed:`, error);
      return [];
    }
  }

  private parseHiredVetteryJobs(html: string, platform: string, params: z.infer<typeof TechTalentSearchSchema>): TechTalentJob[] {
    const $ = cheerio.load(html);
    const jobs: TechTalentJob[] = [];

    $('.job-card, .opportunity-card, [data-job]').each((index, element) => {
      if (index >= params.limit) return false;

      const $job = $(element);
      const title = $job.find('.job-title, h3, h4').first().text().trim();
      const company = $job.find('.company-name, .employer-name').first().text().trim();
      const location = $job.find('.location, .job-location').first().text().trim();
      const description = $job.find('.job-description, .summary').first().text().trim();
      const jobUrl = $job.find('a').first().attr('href') || '';
      const salaryRange = this.extractSalary($job.html() || '');
      const skills = this.extractSkills($job.html() || '');

      if (title && company) {
        jobs.push({
          id: `${platform}-${index}-${Date.now()}`,
          title,
          company,
          location: location || 'Remote',
          description,
          url: jobUrl.startsWith('http') ? jobUrl : `https://${platform}.com${jobUrl}`,
          platform,
          salary_range: salaryRange,
          skills,
          remote: this.isRemote(location, description),
          experience_level: this.extractExperienceLevel(title, description),
          posted_date: new Date().toISOString(),
          interview_process: this.extractInterviewProcess($job.html() || ''),
          benefits: this.extractBenefits($job.html() || '')
        });
      }
    });

    return jobs;
  }

  private parseBuiltInJobs(html: string, platform: string, params: z.infer<typeof TechTalentSearchSchema>): TechTalentJob[] {
    const $ = cheerio.load(html);
    const jobs: TechTalentJob[] = [];

    $('.job-item, .company-job, [data-job-id]').each((index, element) => {
      if (index >= params.limit) return false;

      const $job = $(element);
      const title = $job.find('.job-title, h2, h3').first().text().trim();
      const company = $job.find('.company-name, .company').first().text().trim();
      const location = $job.find('.location, .job-location').first().text().trim();
      const description = $job.find('.description, .summary').first().text().trim();
      const jobUrl = $job.find('a').first().attr('href') || '';
      const companySize = $job.find('.company-size, .size').first().text().trim();

      if (title && company) {
        jobs.push({
          id: `${platform}-${index}-${Date.now()}`,
          title,
          company,
          location,
          description,
          url: jobUrl.startsWith('http') ? jobUrl : `https://builtin.com${jobUrl}`,
          platform,
          skills: this.extractSkills($job.html() || ''),
          remote: this.isRemote(location, description),
          experience_level: this.extractExperienceLevel(title, description),
          posted_date: new Date().toISOString(),
          company_size: companySize
        });
      }
    });

    return jobs;
  }

  private extractSalary(html: string): string | undefined {
    const salaryRegex = /\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*\/?\s*(?:year|annually|yr))?/i;
    const match = html.match(salaryRegex);
    return match?.[0];
  }

  private extractSkills(html: string): string[] {
    const skillsRegex = /(JavaScript|TypeScript|Python|React|Node\.js|AWS|Docker|Kubernetes|Go|Java|SQL|MongoDB|Redis|GraphQL|REST|API|DevOps|Machine Learning|AI|Data Science)/gi;
    const matches = html.match(skillsRegex) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  private extractExperienceLevel(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes('senior') || text.includes('lead') || text.includes('principal') || text.includes('staff')) return 'senior';
    if (text.includes('junior') || text.includes('entry') || text.includes('associate') || text.includes('graduate')) return 'entry';
    return 'mid';
  }

  private extractInterviewProcess(html: string): string | undefined {
    if (html.includes('streamlined') || html.includes('fast track') || html.includes('accelerated')) {
      return 'Streamlined process';
    }
    return undefined;
  }

  private extractBenefits(html: string): string[] {
    const benefits: string[] = [];
    if (html.includes('equity')) benefits.push('Equity');
    if (html.includes('remote')) benefits.push('Remote work');
    if (html.includes('healthcare') || html.includes('health insurance')) benefits.push('Healthcare');
    if (html.includes('401k') || html.includes('retirement')) benefits.push('Retirement');
    return benefits;
  }

  private isRemote(location: string, description: string): boolean {
    const text = `${location} ${description}`.toLowerCase();
    return text.includes('remote') || text.includes('anywhere') || text.includes('distributed');
  }

  private deduplicateAndSort(jobs: TechTalentJob[], params: z.infer<typeof TechTalentSearchSchema>): TechTalentJob[] {
    // Remove duplicates based on company + title
    const unique = new Map<string, TechTalentJob>();
    
    jobs.forEach(job => {
      const key = `${job.company}-${job.title}`.toLowerCase();
      if (!unique.has(key) || (unique.get(key)?.platform === 'builtin-sf' && job.platform === 'hired')) {
        unique.set(key, job);
      }
    });

    // Sort by relevance (prefer hired/vettery, then by posting date)
    return Array.from(unique.values()).sort((a, b) => {
      if (a.platform.includes('hired') || a.platform.includes('vettery')) return -1;
      if (b.platform.includes('hired') || b.platform.includes('vettery')) return 1;
      return new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime();
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('✅ Tech Talent Unified MCP server running on stdio');
  }
}

// Start server
const server = new TechTalentMCPServer();
server.run().catch((error) => {
  console.error('❌ Failed to start Tech Talent MCP server:', error);
  process.exit(1);
});