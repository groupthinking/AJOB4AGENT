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

// Following Anthropic's MCP server pattern
const YCJobSearchSchema = z.object({
  query: z.string().optional().default(''),
  location: z.string().optional().default(''),
  experience_level: z.enum(['entry', 'mid', 'senior']).optional(),
  remote_ok: z.boolean().optional().default(false),
  limit: z.number().optional().default(20)
});

interface YCJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  batch: string;
  equity?: string;
  salary?: string;
  remote: boolean;
  experience_level: string;
  posted_date: string;
}

class YCombinatorMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: 'ycombinator-jobs', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
      return {
        tools: [
          {
            name: 'search_yc_jobs',
            description: 'Search for startup jobs from Y Combinator companies. Returns jobs with equity information, company details, and startup batch information.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Job title or keyword search (e.g., "software engineer", "product manager")'
                },
                location: {
                  type: 'string', 
                  description: 'Location preference (e.g., "San Francisco", "Remote", "New York")'
                },
                experience_level: {
                  type: 'string',
                  enum: ['entry', 'mid', 'senior'],
                  description: 'Experience level filter'
                },
                remote_ok: {
                  type: 'boolean',
                  description: 'Include remote positions only'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 20)'
                }
              }
            }
          } as Tool
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
      if (request.params.name === 'search_yc_jobs') {
        try {
          const params = YCJobSearchSchema.parse(request.params.arguments);
          const jobs = await this.searchYCJobs(params);
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                jobs,
                total_count: jobs.length,
                platform: 'ycombinator',
                search_params: params,
                timestamp: new Date().toISOString()
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text', 
              text: `Error searching Y Combinator jobs: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      }

      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  private async searchYCJobs(params: z.infer<typeof YCJobSearchSchema>): Promise<YCJob[]> {
    try {
      // Y Combinator Work at a Startup URL
      const baseUrl = 'https://www.workatastartup.com/jobs';
      const searchUrl = `${baseUrl}?query=${encodeURIComponent(params.query)}&location=${encodeURIComponent(params.location)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'AJOB4AGENT YC Job Search Bot 1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const jobs: YCJob[] = [];

      // Parse Y Combinator job listings
      $('.job-listing, .job-card, [data-job-id]').each((index, element) => {
        if (index >= params.limit) return false; // Break loop if limit reached

        const $job = $(element);
        const title = $job.find('.job-title, h3, h4').first().text().trim();
        const company = $job.find('.company-name, .startup-name').first().text().trim();
        const location = $job.find('.location, .job-location').first().text().trim();
        const description = $job.find('.job-description, p').first().text().trim();
        const jobUrl = $job.find('a').first().attr('href') || '';
        const batch = $job.find('.batch, .yc-batch').first().text().trim() || 'Unknown';
        
        // Extract equity and salary information (YC specific)
        const equity = this.extractEquity($job.html() || '');
        const salary = this.extractSalary($job.html() || '');
        
        if (title && company) {
          const job: YCJob = {
            id: `yc-${index}-${Date.now()}`,
            title,
            company,
            location: location || 'San Francisco, CA', // YC default
            description: description || 'Y Combinator startup opportunity',
            url: jobUrl.startsWith('http') ? jobUrl : `https://www.workatastartup.com${jobUrl}`,
            batch,
            equity,
            salary,
            remote: this.isRemote(location, description),
            experience_level: this.extractExperienceLevel(title, description),
            posted_date: new Date().toISOString()
          };

          // Apply filters
          if (params.remote_ok && !job.remote) return;
          if (params.experience_level && job.experience_level !== params.experience_level) return;

          jobs.push(job);
        }
      });

      return jobs;

    } catch (error) {
      console.error('❌ Y Combinator scraping error:', error);
      return [];
    }
  }

  private extractEquity(html: string): string | undefined {
    const equityRegex = /(\d+\.?\d*%|\d+\.?\d*\s*(?:equity|shares|options))/i;
    const match = html.match(equityRegex);
    return match?.[1];
  }

  private extractSalary(html: string): string | undefined {
    const salaryRegex = /\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*\/?\s*(?:year|annually|yr))?/i;
    const match = html.match(salaryRegex);
    return match?.[0];
  }

  private isRemote(location: string, description: string): boolean {
    const text = `${location} ${description}`.toLowerCase();
    return text.includes('remote') || text.includes('anywhere') || text.includes('distributed');
  }

  private extractExperienceLevel(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes('senior') || text.includes('lead') || text.includes('principal') || text.includes('staff')) return 'senior';
    if (text.includes('junior') || text.includes('entry') || text.includes('new grad') || text.includes('intern')) return 'entry';
    return 'mid';
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('✅ Y Combinator MCP server running on stdio');
  }
}

// Start server
const server = new YCombinatorMCPServer();
server.run().catch((error) => {
  console.error('❌ Failed to start Y Combinator MCP server:', error);
  process.exit(1);
});