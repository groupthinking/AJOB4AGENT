#!/usr/bin/env python
"""Demo script for resume tailoring API.

This script demonstrates how to use the LLM Service resume tailoring endpoint.

Usage:
    # Run with default settings (localhost:8002)
    python demo_tailoring.py
    
    # Run with custom URL
    LLM_SERVICE_URL=http://custom:8002 python demo_tailoring.py
"""
import asyncio
import os
import sys

import httpx


# Sample resume data
SAMPLE_RESUME = {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "555-123-4567",
    "location": "San Francisco, CA",
    "linkedin": "https://linkedin.com/in/johndoe",
    "summary": "Senior software engineer with 8 years of experience building "
               "scalable web applications and leading cross-functional teams. "
               "Expert in Python, cloud infrastructure, and distributed systems.",
    "experience": [
        {
            "title": "Senior Software Engineer",
            "company": "TechCorp Inc",
            "start_date": "2020-01",
            "end_date": None,
            "description": "Lead development of microservices architecture serving 10M+ users",
            "highlights": [
                "Reduced API latency by 40% through caching optimization",
                "Mentored team of 5 junior developers",
                "Implemented CI/CD pipelines reducing deployment time by 60%"
            ]
        },
        {
            "title": "Software Engineer",
            "company": "StartupXYZ",
            "start_date": "2016-03",
            "end_date": "2019-12",
            "description": "Full-stack development using Python and React",
            "highlights": [
                "Built customer analytics dashboard used by 500+ clients",
                "Developed RESTful APIs handling 1M requests/day"
            ]
        }
    ],
    "skills": ["Python", "TypeScript", "AWS", "Docker", "Kubernetes", "PostgreSQL", "React", "Node.js"],
    "education": [
        {
            "degree": "B.S. Computer Science",
            "institution": "University of California, Berkeley",
            "graduation_date": "2016",
            "gpa": 3.7,
            "highlights": ["Dean's List", "Computer Science Honor Society"]
        }
    ],
    "certifications": ["AWS Solutions Architect", "Kubernetes Administrator"],
    "projects": ["Open source contributor to FastAPI", "Built personal finance tracking app"]
}

# Sample job descriptions
SAMPLE_JOBS = [
    {
        "title": "Staff Software Engineer",
        "company": "InnovateTech",
        "description": """We are looking for a Staff Software Engineer to join our platform team. 
        You will be responsible for designing and building scalable systems that power our 
        growing user base. This is a leadership role where you will mentor other engineers 
        and drive technical decisions.""",
        "requirements": [
            "5+ years of software engineering experience",
            "Strong Python or TypeScript skills",
            "Experience with cloud platforms (AWS, GCP, or Azure)",
            "Track record of building scalable systems",
            "Experience mentoring junior engineers"
        ],
        "preferred": [
            "Experience with Kubernetes and container orchestration",
            "Background in distributed systems",
            "Open source contributions"
        ],
        "location": "Remote",
        "salary_range": "$180,000 - $220,000"
    },
    {
        "title": "Backend Engineer",
        "company": "DataFlow Solutions",
        "description": """Join our backend team to build high-performance data pipelines.
        You'll work on real-time data processing systems handling millions of events per second.
        Strong focus on reliability and performance optimization.""",
        "requirements": [
            "3+ years backend development experience",
            "Proficiency in Python or Go",
            "Experience with SQL and NoSQL databases",
            "Understanding of microservices architecture"
        ],
        "preferred": [
            "Experience with Apache Kafka or similar",
            "Performance optimization experience"
        ],
        "location": "New York, NY",
        "salary_range": "$140,000 - $180,000"
    },
    {
        "title": "DevOps Engineer",
        "company": "CloudFirst Corp",
        "description": """Looking for a DevOps engineer to help us scale our cloud infrastructure.
        You'll work on automating deployments, monitoring, and security across AWS.""",
        "requirements": [
            "Experience with AWS services (EC2, EKS, Lambda, etc.)",
            "Kubernetes and container orchestration",
            "CI/CD pipeline design and implementation",
            "Infrastructure as Code (Terraform, CloudFormation)"
        ],
        "preferred": [
            "Python scripting experience",
            "Security certifications",
            "Cost optimization experience"
        ],
        "location": "Seattle, WA",
        "salary_range": "$150,000 - $190,000"
    }
]


async def tailor_resume_for_job(client: httpx.AsyncClient, base_url: str, resume: dict, job: dict) -> dict:
    """Call the resume tailoring API for a single job."""
    print(f"\n{'='*60}")
    print(f"Tailoring for: {job['title']} at {job['company']}")
    print(f"{'='*60}")
    
    try:
        response = await client.post(
            f"{base_url}/api/v1/resume/tailor",
            json={
                "resume": resume,
                "job_description": job,
                "options": {
                    "model": "gpt-4",
                    "focus_areas": ["summary", "experience", "skills"],
                    "tone": "professional"
                }
            },
            timeout=120.0  # LLM calls can take a while
        )
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"\n✅ Fit Score: {result['tailored_resume']['fit_score']}/100")
            print(f"📊 Tokens Used: {result['tokens_used']}")
            print(f"🤖 Model: {result['model']}")
            
            print("\n📝 Tailored Summary:")
            print(f"   {result['tailored_resume']['summary'][:200]}...")
            
            print("\n🎯 Skills Highlighted:")
            for skill in result['tailored_resume']['skills_highlighted'][:5]:
                print(f"   • {skill}")
            
            print("\n🔑 Keywords Matched:")
            for kw in result['tailored_resume']['keywords_matched'][:5]:
                print(f"   • {kw}")
            
            print("\n💡 Suggestions:")
            for suggestion in result['suggestions'][:3]:
                print(f"   → {suggestion}")
            
            return result
        else:
            print(f"\n❌ Error: {response.status_code}")
            print(f"   {response.text[:200]}")
            return None
            
    except httpx.TimeoutException:
        print("\n❌ Request timed out. The LLM may be processing a large response.")
        return None
    except httpx.ConnectError:
        print(f"\n❌ Could not connect to {base_url}. Is the service running?")
        return None
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return None


async def check_health(client: httpx.AsyncClient, base_url: str) -> bool:
    """Check if the service is healthy."""
    try:
        response = await client.get(f"{base_url}/health")
        if response.status_code == 200:
            health = response.json()
            print(f"✅ Service is {health['status']} (v{health['version']})")
            return True
        return False
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False


async def main():
    """Run the demo."""
    base_url = os.getenv("LLM_SERVICE_URL", "http://localhost:8002")
    
    print("\n" + "="*60)
    print("🚀 LLM Service Resume Tailoring Demo")
    print("="*60)
    print(f"Service URL: {base_url}")
    
    async with httpx.AsyncClient() as client:
        # Check health first
        print("\n🔍 Checking service health...")
        if not await check_health(client, base_url):
            print("\n❌ Service is not available. Please start it with:")
            print("   uvicorn src.main:app --reload --port 8002")
            sys.exit(1)
        
        # Tailor resume for each job
        results = []
        for job in SAMPLE_JOBS:
            result = await tailor_resume_for_job(client, base_url, SAMPLE_RESUME, job)
            if result:
                results.append({
                    "job": f"{job['title']} at {job['company']}",
                    "fit_score": result["tailored_resume"]["fit_score"],
                    "tokens": result["tokens_used"]
                })
        
        # Summary
        if results:
            print("\n" + "="*60)
            print("📊 Summary")
            print("="*60)
            
            # Sort by fit score
            results.sort(key=lambda x: x["fit_score"], reverse=True)
            
            print("\nRanking by Fit Score:")
            for i, r in enumerate(results, 1):
                print(f"  {i}. {r['job']}: {r['fit_score']}/100")
            
            total_tokens = sum(r["tokens"] for r in results)
            print(f"\nTotal tokens used: {total_tokens}")
            print(f"Estimated cost (GPT-4): ${total_tokens * 0.00003:.4f}")


if __name__ == "__main__":
    asyncio.run(main())
