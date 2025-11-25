#!/usr/bin/env python3
"""
Demo script for testing the LLM resume tailoring pipeline.

This script demonstrates how to use the /resume/tailor endpoint
to tailor resumes for job descriptions using OpenAI.

Usage:
    python demo_resume_tailor.py [--url URL] [--sample N]

Environment:
    OPENAI_API_KEY: Required - Your OpenAI API key

Examples:
    # Run all 3 sample resume/job combinations
    python demo_resume_tailor.py

    # Run only sample 2
    python demo_resume_tailor.py --sample 2

    # Use a different LLM service URL
    python demo_resume_tailor.py --url http://localhost:8000
"""
import argparse
import json
import sys
import requests


# Sample resume/job description pairs for end-to-end testing
SAMPLES = [
    {
        "name": "Backend Software Engineer",
        "resume": """
John Doe
Software Engineer

PROFESSIONAL SUMMARY
Results-driven software engineer with 6+ years of experience building scalable
web applications and distributed systems. Expertise in Python, cloud platforms,
and modern development practices.

EXPERIENCE

Senior Software Developer | Tech Corp | 2020-Present
• Designed and implemented microservices architecture using Python and FastAPI
• Led team of 5 engineers on cloud migration project to AWS
• Reduced deployment time by 60% through CI/CD pipeline improvements
• Implemented real-time data processing using Kafka and Redis

Software Developer | StartupXYZ | 2018-2020
• Full-stack development with React, Node.js, and PostgreSQL
• Built REST APIs serving 100K+ daily active users
• Implemented automated testing, achieving 85% code coverage

SKILLS
Languages: Python, JavaScript, TypeScript, Go
Frameworks: FastAPI, Django, React, Node.js
Cloud: AWS (EC2, Lambda, S3, RDS), Docker, Kubernetes
Databases: PostgreSQL, MongoDB, Redis, Elasticsearch
Tools: Git, Jenkins, Terraform, Datadog

EDUCATION
B.S. Computer Science | State University | 2018
""",
        "job_desc": """
Senior Software Engineer - Backend

About the Role:
We're looking for a Senior Backend Engineer to join our platform team and help
build the next generation of our cloud infrastructure.

Requirements:
• 5+ years of software development experience
• Strong proficiency in Python and FastAPI
• Experience designing and building microservices
• Cloud platform experience (AWS preferred)
• Knowledge of containerization (Docker, Kubernetes)
• Experience with CI/CD pipelines and DevOps practices

Responsibilities:
• Design and develop scalable backend services
• Lead technical initiatives and mentor junior developers
• Collaborate with product and design teams
• Participate in architecture discussions and code reviews
• Improve system performance and reliability

Nice to have:
• Experience with real-time data processing
• Contributions to open source projects
• Experience with Infrastructure as Code (Terraform)
""",
    },
    {
        "name": "Machine Learning Engineer",
        "resume": """
Jane Smith
Machine Learning Engineer

PROFESSIONAL SUMMARY
Innovative ML Engineer with 4 years of experience developing and deploying
machine learning models. Specializing in NLP, deep learning, and MLOps.

EXPERIENCE

ML Engineer | DataCo | 2021-Present
• Developed customer churn prediction model achieving 92% accuracy
• Built and deployed NLP pipelines for text classification and sentiment analysis
• Implemented real-time ML inference APIs serving 1M+ predictions/day
• Reduced model training time by 40% through distributed computing optimization

Data Scientist | AnalyticsFirm | 2019-2021
• Built recommendation system increasing user engagement by 25%
• Created automated feature engineering pipelines
• Conducted A/B tests to validate model performance in production

SKILLS
ML/AI: PyTorch, TensorFlow, scikit-learn, Hugging Face Transformers
Languages: Python, SQL, Scala
MLOps: MLflow, Kubeflow, SageMaker, Docker
Big Data: Spark, Airflow, Kafka
Cloud: AWS, GCP

EDUCATION
M.S. Data Science | Tech University | 2019
B.S. Statistics | State College | 2017
""",
        "job_desc": """
Machine Learning Engineer

About Us:
We're building AI-powered products that transform how businesses operate.

Requirements:
• 3+ years of ML/AI experience
• Strong Python programming skills
• Experience with deep learning frameworks (PyTorch or TensorFlow)
• NLP experience preferred
• Experience deploying ML models to production

Responsibilities:
• Design and build ML models for production deployment
• Develop and maintain ML pipelines
• Collaborate with data engineers and product teams
• Research and implement state-of-the-art ML techniques
• Monitor and improve model performance

Benefits:
• Competitive salary + equity
• Remote-first culture
• Learning and development budget
""",
    },
    {
        "name": "Site Reliability Engineer",
        "resume": """
Alex Johnson
DevOps / SRE

PROFESSIONAL SUMMARY
Experienced infrastructure engineer with 5 years specializing in site reliability,
cloud infrastructure, and automation. Passionate about building resilient systems.

EXPERIENCE

Senior Infrastructure Engineer | CloudCo | 2020-Present
• Managed Kubernetes clusters (50+ nodes) across multiple AWS regions
• Automated infrastructure provisioning with Terraform (500+ resources)
• Implemented comprehensive monitoring with Prometheus, Grafana, and PagerDuty
• Reduced incident response time by 60% through improved alerting
• Led migration of 20+ services to containerized deployments

DevOps Engineer | TechStartup | 2018-2020
• Built CI/CD pipelines using Jenkins and GitLab CI
• Managed cloud infrastructure on AWS and GCP
• Implemented Infrastructure as Code practices

SKILLS
Container Orchestration: Kubernetes, Docker, Helm
Cloud: AWS (EKS, EC2, RDS, Lambda), GCP
IaC: Terraform, Ansible, CloudFormation
Monitoring: Prometheus, Grafana, Datadog, ELK Stack
Programming: Python, Bash, Go
CI/CD: Jenkins, GitLab CI, ArgoCD

CERTIFICATIONS
• AWS Solutions Architect Professional
• Certified Kubernetes Administrator (CKA)

EDUCATION
B.S. Computer Engineering | State Technical University | 2018
""",
        "job_desc": """
Site Reliability Engineer

We're looking for an SRE to help us scale our infrastructure and maintain
99.99% uptime for our global platform.

Requirements:
• 4+ years of experience in SRE or DevOps
• Experience with Kubernetes and container orchestration
• Strong Infrastructure as Code experience (Terraform preferred)
• Experience with monitoring and observability tools
• Scripting skills (Python and/or Bash)
• Experience with cloud platforms (AWS preferred)

Responsibilities:
• Maintain and improve production infrastructure reliability
• Implement SRE best practices (SLOs, error budgets, incident management)
• Automate operational tasks and reduce toil
• Participate in on-call rotation
• Collaborate with development teams on system design

Bonus:
• Experience with multi-region deployments
• Contributions to open source infrastructure projects
• Experience with GitOps practices
""",
    },
]


def tailor_resume(base_url: str, resume: str, job_desc: str) -> dict:
    """Call the /resume/tailor endpoint."""
    url = f"{base_url.rstrip('/')}/resume/tailor"
    payload = {"resume": resume, "job_desc": job_desc}

    try:
        response = requests.post(
            url, json=payload, headers={"Content-Type": "application/json"}, timeout=60
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e), "status_code": getattr(e.response, "status_code", None)}


def print_result(name: str, result: dict):
    """Pretty print the tailoring result."""
    print("\n" + "=" * 70)
    print(f"Sample: {name}")
    print("=" * 70)

    if "error" in result:
        print(f"\n❌ Error: {result['error']}")
        if result.get("status_code"):
            print(f"   Status Code: {result['status_code']}")
        return False

    print(f"\n✅ Status: {result.get('status', 'unknown')}")
    print(f"   Model Used: {result.get('llm_model_used', 'unknown')}")

    print("\n📋 ROLE FIT:")
    print("-" * 40)
    print(result.get("role_fit", "N/A"))

    print("\n📝 EXPERIENCE JUSTIFICATION:")
    print("-" * 40)
    print(result.get("experience_justification", "N/A"))

    print("\n💼 PROFESSIONAL SUMMARY:")
    print("-" * 40)
    print(result.get("summary", "N/A"))

    print("\n📄 TAILORED RESUME (truncated):")
    print("-" * 40)
    tailored = result.get("tailored_resume", "N/A")
    # Show first 500 chars
    if len(tailored) > 500:
        print(tailored[:500] + "...\n[truncated]")
    else:
        print(tailored)

    return True


def check_health(base_url: str) -> bool:
    """Check if the service is healthy."""
    try:
        response = requests.get(f"{base_url.rstrip('/')}/health", timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Demo script for LLM resume tailoring pipeline"
    )
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="Base URL of the LLM service (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--sample",
        type=int,
        choices=[1, 2, 3],
        help="Run only a specific sample (1, 2, or 3)",
    )
    args = parser.parse_args()

    print("=" * 70)
    print("LLM Resume Tailoring Demo")
    print("=" * 70)
    print(f"\nService URL: {args.url}")

    # Check health
    print("\n🔍 Checking service health...")
    if not check_health(args.url):
        print("❌ Service is not healthy or not reachable.")
        print("   Make sure the LLM service is running and OPENAI_API_KEY is set.")
        sys.exit(1)
    print("✅ Service is healthy")

    # Run samples
    samples_to_run = [SAMPLES[args.sample - 1]] if args.sample else SAMPLES
    success_count = 0

    for sample in samples_to_run:
        result = tailor_resume(args.url, sample["resume"], sample["job_desc"])
        if print_result(sample["name"], result):
            success_count += 1

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Samples processed: {len(samples_to_run)}")
    print(f"Successful: {success_count}")
    print(f"Failed: {len(samples_to_run) - success_count}")

    if success_count == len(samples_to_run):
        print("\n✅ All samples processed successfully!")
        return 0
    else:
        print("\n⚠️ Some samples failed.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
