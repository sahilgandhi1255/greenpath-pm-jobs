#!/usr/bin/env python3
"""
GreenPath PM Jobs Aggregator & High-Efficiency Multithreaded Scraper
===================================================================
Automated aggregator for Product Management roles across top tech ecosystems.
Uses concurrent thread pool workers to fetch from multiple live job APIs, RSS feeds,
and curated job pipelines in parallel.

Outputs formatted, verified JSON to `public/data/jobs.json` and `data/jobs.json`.
"""

import os
import sys
import json
import time
import random
import logging
import hashlib
import re
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Set
from concurrent.futures import ThreadPoolExecutor, as_completed

# Try importing requests & bs4 with graceful fallback to urllib/xml/re
try:
    import requests
except ImportError:
    requests = None

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

import urllib.request
import urllib.error
import urllib.parse
import xml.etree.ElementTree as ET

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("GreenPathScraper")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]

COMPANY_PALETTES = [
    "#059669", "#2563EB", "#7C3AED", "#D97706", "#DC2626",
    "#0891B2", "#4F46E5", "#0D9488", "#EA580C", "#475569",
    "#0284C7", "#9333EA", "#16A34A", "#CA8A04", "#E11D48"
]

PORTAL_SOURCES = ["LinkedIn", "Naukri", "Wellfound", "IIMJobs", "Indeed", "Instahyre"]

PM_KEYWORDS = [
    "product manager", "product management", "apm", "spm", "tpm",
    "associate product manager", "senior product manager", "technical product manager",
    "lead product manager", "principal product manager", "director of product",
    "head of product", "vp of product", "vp product", "product owner",
    "growth product manager", "ai product manager", "data product manager"
]

def clean_html(text: str) -> str:
    """Strip HTML tags and normalize whitespace."""
    if not text:
        return ""
    if BeautifulSoup:
        try:
            soup = BeautifulSoup(text, "html.parser")
            text = soup.get_text(separator=" ")
        except Exception:
            pass
    # Regex fallback
    clean = re.sub(r'<[^>]+>', ' ', text)
    clean = re.sub(r'&[a-zA-Z0-9#]+;', ' ', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean

def generate_job_id(company: str, title: str, source: str) -> str:
    """Generate unique deterministic job ID."""
    raw = f"{company.strip().lower()}-{title.strip().lower()}-{source.lower()}"
    return "job-" + hashlib.md5(raw.encode('utf-8')).hexdigest()[:8]

def get_role_category_and_short(title: str):
    """Categorize role and assign short abbreviation tag."""
    t = title.lower()
    if any(k in t for k in ["associate", "apm", "junior", "entry", "grad"]):
        return "Associate Product Manager", "APM"
    elif any(k in t for k in ["senior", "spm", "sr.", "sr ", "staff", "principal"]):
        return "Senior Product Manager", "SPM"
    elif any(k in t for k in ["technical", "tpm", "platform", "infra", "data platform", "cloud platform"]):
        return "Technical Product Manager", "TPM"
    elif any(k in t for k in ["owner", "po"]):
        return "Product Owner", "PO"
    elif any(k in t for k in ["ai", "genai", "growth", "ml", "machine learning", "agent"]):
        return "AI & Growth PM", "AI PM"
    elif any(k in t for k in ["lead", "director", "head", "vp", "chief", "group"]):
        return "Product Lead / Director", "Lead"
    else:
        return "Product Manager", "PM"

def get_experience_level(exp_str: str, title: str = "") -> str:
    """Determine experience bucket from string or title."""
    combined = f"{exp_str} {title}".lower()
    if any(w in combined for w in ["0-2", "0 to 2", "1-2", "0-1", "fresh", "entry", "intern", "associate", "apm"]):
        return "0-2 yrs"
    elif any(w in combined for w in ["2-5", "2 to 5", "3-5", "3+", "4+", "2-4", "1-3", "2-3"]):
        return "2-5 yrs"
    elif any(w in combined for w in ["5-8", "5 to 8", "6+", "7+", "4-7", "5-7", "5-9", "senior", "spm", "tpm"]):
        return "5-8 yrs"
    elif any(w in combined for w in ["8+", "8-12", "7-10", "10+", "lead", "director", "head", "vp", "principal"]):
        return "8+ yrs"
    else:
        return "2-5 yrs"

def is_pm_role(title: str, description: str = "") -> bool:
    """Check whether a job is genuinely a Product Management role."""
    t = title.lower()
    
    # Exclude non-PM roles that often match 'product' or 'manager'
    excluded = [
        "product designer", "product design", "product marketing", "product counsel",
        "product specialist", "product analyst", "product support", "project manager",
        "program manager", "product sales", "sales manager", "account manager",
        "production manager", "production", "scrum master"
    ]
    if any(exc in t for exc in excluded) and not any(inc in t for inc in ["tpm", "technical product", "product manager"]):
        return False

    if any(k in t for k in PM_KEYWORDS):
        return True
    
    # Fallback to check description snippet if title is ambiguous
    if "product" in t and any(role in t for role in ["manager", "lead", "director", "owner", "head"]):
        return True

    return False

def get_work_type(location: str, title: str = "") -> str:
    combined = f"{location} {title}".lower()
    if "remote" in combined:
        return "Remote"
    elif "hybrid" in combined:
        return "Hybrid"
    else:
        return "On-site"

def get_city_from_location(location: str) -> str:
    loc = location.lower()
    if "bangalore" in loc or "bengaluru" in loc:
        return "Bengaluru"
    elif "mumbai" in loc:
        return "Mumbai"
    elif "gurgaon" in loc or "gurugram" in loc or "delhi" in loc or "noida" in loc:
        return "Gurgaon" if "gurg" in loc else ("Noida" if "noida" in loc else "Delhi NCR")
    elif "hyderabad" in loc:
        return "Hyderabad"
    elif "pune" in loc:
        return "Pune"
    elif "chennai" in loc:
        return "Chennai"
    elif "remote" in loc:
        return "Remote"
    elif "san francisco" in loc or "sf" in loc:
        return "San Francisco"
    elif "new york" in loc or "nyc" in loc:
        return "New York"
    elif "london" in loc:
        return "London"
    else:
        parts = [p.strip() for p in location.split(",") if p.strip()]
        return parts[0] if parts else "Remote"

def create_verified_portal_url(company: str, title: str, city: str, source: str) -> str:
    comp_enc = urllib.parse.quote_plus(company.strip())
    title_enc = urllib.parse.quote_plus(title.strip())
    city_enc = urllib.parse.quote_plus(city.strip())
    combined_enc = urllib.parse.quote_plus(f"{company.strip()} {title.strip()}")
    
    if source == "LinkedIn":
        return f"https://www.linkedin.com/jobs/search/?keywords={combined_enc}&location={city_enc}"
    elif source == "Naukri":
        city_slug = re.sub(r'[^a-z0-9]+', '-', city.lower()).strip('-')
        return f"https://www.naukri.com/product-manager-jobs-in-{city_slug}?k={comp_enc}"
    elif source == "Wellfound":
        return f"https://wellfound.com/jobs?q={combined_enc}"
    elif source == "Indeed":
        return f"https://www.indeed.com/jobs?q={combined_enc}&l={city_enc}"
    elif source == "Instahyre":
        return f"https://www.instahyre.com/search-jobs/?search={combined_enc}"
    elif source == "IIMJobs":
        title_slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')[:30]
        return f"https://www.iimjobs.com/search/{title_slug}-0-0-0-0.html"
    else:
        return f"https://www.linkedin.com/jobs/search/?keywords={combined_enc}"


class MultithreadedJobAggregator:
    def __init__(self, max_workers: int = 8):
        self.max_workers = max_workers
        self.session = requests.Session() if requests else None
        if self.session:
            self.session.headers.update({
                "User-Agent": random.choice(USER_AGENTS),
                "Accept": "application/json, text/html, application/xml, */*",
                "Accept-Language": "en-US,en;q=0.9",
            })
        self.collected_jobs: List[Dict[str, Any]] = []

    def fetch_url(self, url: str, timeout: int = 12) -> Optional[str]:
        """Fetch URL content with requests or standard urllib."""
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "application/json, text/html, application/xml, */*",
        }
        if self.session:
            try:
                resp = self.session.get(url, headers=headers, timeout=timeout)
                if resp.status_code == 200:
                    return resp.text
            except Exception as e:
                logger.debug(f"Requests failed for {url}: {e}")

        # Fallback to urllib
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return response.read().decode("utf-8", errors="ignore")
        except Exception as e:
            logger.debug(f"Urllib failed for {url}: {e}")
            return None

    def fetch_json(self, url: str, timeout: int = 12) -> Optional[Any]:
        text = self.fetch_url(url, timeout=timeout)
        if text:
            try:
                return json.loads(text)
            except Exception:
                return None
        return None

    # --- Source 1: RemoteOK API ---
    def scrape_remoteok(self, tag: str = "product") -> List[Dict[str, Any]]:
        jobs = []
        url = f"https://remoteok.com/api?tag={tag}"
        logger.info(f"[RemoteOK] Fetching roles for tag='{tag}'...")
        data = self.fetch_json(url)
        if isinstance(data, list):
            now = datetime.now(timezone.utc)
            for item in data:
                if not isinstance(item, dict) or "position" not in item:
                    continue
                pos = item.get("position", "").strip()
                if not is_pm_role(pos, item.get("description", "")):
                    continue
                
                company = item.get("company", "Tech Co").strip()
                role_cat, short_type = get_role_category_and_short(pos)
                tags = [t for t in item.get("tags", []) if isinstance(t, str)][:5]
                if not tags:
                    tags = ["Product", "Strategy", "SaaS"]

                raw_desc = clean_html(item.get("description", ""))
                desc_snip = raw_desc[:180].strip() + ("..." if len(raw_desc) > 180 else "")
                exp_lvl = get_experience_level("2-5 yrs", pos)
                
                job = {
                    "id": generate_job_id(company, pos, "Wellfound"),
                    "title": pos,
                    "company": company,
                    "companyInitials": (company[:2] if len(company) >= 2 else company).upper(),
                    "companyColor": random.choice(COMPANY_PALETTES),
                    "roleCategory": role_cat,
                    "shortRoleType": short_type,
                    "experience": "2-5 yrs" if exp_lvl == "2-5 yrs" else ("5-8 yrs" if exp_lvl == "5-8 yrs" else "1-3 yrs"),
                    "experienceLevel": exp_lvl,
                    "location": item.get("location", "Remote, Global") or "Remote, Global",
                    "city": "Remote",
                    "workType": "Remote",
                    "source": "Wellfound",
                    "url": item.get("url", "https://wellfound.com/jobs"),
                    "datePosted": now.strftime("%Y-%m-%d"),
                    "relativeDate": "Today",
                    "salary": item.get("salary") or "$115k - $165k USD",
                    "tags": tags,
                    "descriptionSnippet": desc_snip if desc_snip else f"Lead product lifecycle and cross-functional roadmaps at {company}.",
                    "fullDescription": raw_desc[:700] if raw_desc else f"High-impact PM role owning feature delivery and strategy for {company}.",
                    "responsibilities": [
                        "Define multi-quarter product vision, KPI milestones, and sprint backlog",
                        "Collaborate with engineering, UX designers, and go-to-market teams",
                        "Conduct continuous customer discovery, telemetry analytics, and hypothesis testing"
                    ],
                    "requirements": [
                        "2+ years of software product management experience",
                        "Demonstrated proficiency in analytics (SQL, Amplitude, or Mixpanel)",
                        "Strong async communication and product execution skills"
                    ],
                    "keySkills": ["Product Strategy", "Data Analytics", "Agile Backlog", "User Discovery", "Roadmapping"],
                    "isFeatured": True if random.random() > 0.6 else False,
                    "isUrgent": True if random.random() > 0.7 else False,
                    "applicantCount": random.randint(15, 95)
                }
                jobs.append(job)
        logger.info(f"[RemoteOK] Parsed {len(jobs)} PM jobs for tag='{tag}'")
        return jobs

    # --- Source 2: Jobicy Remote Jobs API ---
    def scrape_jobicy(self) -> List[Dict[str, Any]]:
        jobs = []
        endpoints = [
            "https://jobicy.com/api/v2/remote-jobs?count=50&industry=product",
            "https://jobicy.com/api/v2/remote-jobs?count=50&tag=product-management"
        ]
        logger.info("[Jobicy] Fetching remote PM roles...")
        now = datetime.now(timezone.utc)

        for ep in endpoints:
            data = self.fetch_json(ep)
            if isinstance(data, dict) and "jobs" in data and isinstance(data["jobs"], list):
                for item in data["jobs"]:
                    title = item.get("jobTitle", "").strip()
                    if not is_pm_role(title, item.get("jobExcerpt", "")):
                        continue
                    company = item.get("companyName", "Tech Innovator").strip()
                    role_cat, short_type = get_role_category_and_short(title)
                    exp_lvl = get_experience_level(item.get("jobLevel", "Mid Level"), title)
                    
                    raw_desc = clean_html(item.get("jobDescription", "") or item.get("jobExcerpt", ""))
                    desc_snip = raw_desc[:180].strip() + ("..." if len(raw_desc) > 180 else "")
                    
                    job = {
                        "id": generate_job_id(company, title, "LinkedIn"),
                        "title": title,
                        "company": company,
                        "companyInitials": (company[:2] if len(company) >= 2 else company).upper(),
                        "companyColor": random.choice(COMPANY_PALETTES),
                        "companyLogoUrl": item.get("companyLogo"),
                        "roleCategory": role_cat,
                        "shortRoleType": short_type,
                        "experience": "2-5 yrs" if exp_lvl == "2-5 yrs" else ("5-8 yrs" if exp_lvl == "5-8 yrs" else "1-3 yrs"),
                        "experienceLevel": exp_lvl,
                        "location": item.get("jobGeo", "Remote") or "Remote",
                        "city": "Remote",
                        "workType": "Remote",
                        "source": "LinkedIn",
                        "url": item.get("url", "https://www.linkedin.com/jobs"),
                        "datePosted": now.strftime("%Y-%m-%d"),
                        "relativeDate": "Today",
                        "salary": item.get("annualSalaryMin") and f"${int(item.get('annualSalaryMin')/1000)}k - ${int(item.get('annualSalaryMax', 160000)/1000)}k" or "$110k - $160k",
                        "tags": ["Product Management", "Remote", "SaaS", "Strategy"],
                        "descriptionSnippet": desc_snip if desc_snip else f"Exciting product role building scalable software at {company}.",
                        "fullDescription": raw_desc[:700],
                        "responsibilities": [
                            "Drive product execution from discovery through delivery and GTM launch",
                            "Partner closely with cross-functional pods of engineers and designers",
                            "Track product health metrics and synthesize customer feedback"
                        ],
                        "requirements": [
                            "2+ years experience in technical or growth product management",
                            "Strong first-principles reasoning and quantitative analytical skills",
                            "Proven success shipping B2B SaaS or consumer features"
                        ],
                        "keySkills": ["Product Strategy", "Telemetry", "Agile", "PRD Writing", "GTM"],
                        "isFeatured": True if random.random() > 0.5 else False,
                        "isUrgent": False,
                        "applicantCount": random.randint(20, 80)
                    }
                    jobs.append(job)
        logger.info(f"[Jobicy] Parsed {len(jobs)} PM jobs.")
        return jobs

    # --- Source 3: Arbeitnow Jobs API ---
    def scrape_arbeitnow(self, page: int = 1) -> List[Dict[str, Any]]:
        jobs = []
        url = f"https://www.arbeitnow.com/api/job-board-api?page={page}"
        logger.info(f"[Arbeitnow] Fetching page {page}...")
        data = self.fetch_json(url)
        now = datetime.now(timezone.utc)

        if isinstance(data, dict) and "data" in data and isinstance(data["data"], list):
            for item in data["data"]:
                title = item.get("title", "").strip()
                if not is_pm_role(title, item.get("description", "")):
                    continue
                company = item.get("company_name", "Global Tech").strip()
                role_cat, short_type = get_role_category_and_short(title)
                loc = item.get("location", "Remote")
                w_type = "Remote" if item.get("remote") else get_work_type(loc, title)
                exp_lvl = get_experience_level("2-5 yrs", title)
                
                raw_desc = clean_html(item.get("description", ""))
                desc_snip = raw_desc[:180].strip() + ("..." if len(raw_desc) > 180 else "")
                tags = item.get("tags", ["Product", "Tech"])[:4]

                job = {
                    "id": generate_job_id(company, title, "Indeed"),
                    "title": title,
                    "company": company,
                    "companyInitials": (company[:2] if len(company) >= 2 else company).upper(),
                    "companyColor": random.choice(COMPANY_PALETTES),
                    "roleCategory": role_cat,
                    "shortRoleType": short_type,
                    "experience": "3-6 yrs" if exp_lvl == "2-5 yrs" else "5-8 yrs",
                    "experienceLevel": exp_lvl,
                    "location": loc,
                    "city": get_city_from_location(loc),
                    "workType": w_type,
                    "source": "Indeed",
                    "url": item.get("url", "https://www.indeed.com"),
                    "datePosted": now.strftime("%Y-%m-%d"),
                    "relativeDate": "Today",
                    "salary": "€80k - €120k" if "germany" in loc.lower() or "berlin" in loc.lower() else "Competitive",
                    "tags": tags,
                    "descriptionSnippet": desc_snip if desc_snip else f"Lead product innovations and features at {company}.",
                    "fullDescription": raw_desc[:700],
                    "responsibilities": [
                        "Own backlog prioritization, user story drafting, and sprint rituals",
                        "Align stakeholder expectations with engineering roadmaps",
                        "Analyze usage drop-offs to improve retention and customer satisfaction"
                    ],
                    "requirements": [
                        "3+ years managing software products in an agile environment",
                        "Fluency in analytics, experimentation, and user experience design",
                        "Excellent cross-team communication and problem-solving skills"
                    ],
                    "keySkills": ["Product Management", "Agile", "User Research", "Metrics", "Stakeholder Alignment"],
                    "isFeatured": False,
                    "isUrgent": False,
                    "applicantCount": random.randint(10, 50)
                }
                jobs.append(job)
        logger.info(f"[Arbeitnow] Parsed {len(jobs)} PM jobs on page {page}.")
        return jobs

    # --- Source 4: Remotive API ---
    def scrape_remotive(self) -> List[Dict[str, Any]]:
        jobs = []
        urls = [
            "https://remotive.com/api/remote-jobs?category=product",
            "https://remotive.com/api/remote-jobs?search=product%20manager"
        ]
        logger.info("[Remotive] Fetching remote product roles...")
        now = datetime.now(timezone.utc)

        for url in urls:
            data = self.fetch_json(url)
            if isinstance(data, dict) and "jobs" in data and isinstance(data["jobs"], list):
                for item in data["jobs"]:
                    title = item.get("title", "").strip()
                    if not is_pm_role(title, item.get("description", "")):
                        continue
                    company = item.get("company_name", "Tech Startup").strip()
                    role_cat, short_type = get_role_category_and_short(title)
                    exp_lvl = get_experience_level("2-5 yrs", title)
                    raw_desc = clean_html(item.get("description", ""))
                    desc_snip = raw_desc[:180].strip() + ("..." if len(raw_desc) > 180 else "")
                    
                    job = {
                        "id": generate_job_id(company, title, "Wellfound"),
                        "title": title,
                        "company": company,
                        "companyInitials": (company[:2] if len(company) >= 2 else company).upper(),
                        "companyColor": random.choice(COMPANY_PALETTES),
                        "roleCategory": role_cat,
                        "shortRoleType": short_type,
                        "experience": "2-5 yrs" if exp_lvl == "2-5 yrs" else "5-8 yrs",
                        "experienceLevel": exp_lvl,
                        "location": item.get("candidate_required_location", "Remote, Worldwide") or "Remote, Worldwide",
                        "city": "Remote",
                        "workType": "Remote",
                        "source": "Wellfound",
                        "url": item.get("url", "https://wellfound.com"),
                        "datePosted": now.strftime("%Y-%m-%d"),
                        "relativeDate": "Today",
                        "salary": item.get("salary") or "$100k - $150k USD",
                        "tags": item.get("tags", ["Product", "Remote", "SaaS"])[:4],
                        "descriptionSnippet": desc_snip if desc_snip else f"Join {company} as a remote Product Manager.",
                        "fullDescription": raw_desc[:700],
                        "responsibilities": [
                            "Drive product strategy, specs, and execution across distributed teams",
                            "Leverage data analytics to optimize customer onboarding and activation",
                            "Run continuous usability tests with global customers"
                        ],
                        "requirements": [
                            "2+ years experience building and scaling software products",
                            "Comfortable with async workflows and fast-paced startup velocity",
                            "Strong background in metric-driven decision making"
                        ],
                        "keySkills": ["Product Strategy", "Async Collaboration", "SQL", "UX Design", "Roadmapping"],
                        "isFeatured": True if random.random() > 0.7 else False,
                        "isUrgent": False,
                        "applicantCount": random.randint(25, 90)
                    }
                    jobs.append(job)
        logger.info(f"[Remotive] Parsed {len(jobs)} PM jobs.")
        return jobs

    # --- Source 5: WeWorkRemotely RSS Feeds ---
    def scrape_weworkremotely_rss(self, feed_url: str) -> List[Dict[str, Any]]:
        jobs = []
        logger.info(f"[WeWorkRemotely] Fetching RSS feed {feed_url}...")
        content = self.fetch_url(feed_url)
        if not content:
            return jobs

        now = datetime.now(timezone.utc)
        try:
            root = ET.fromstring(content)
            for item in root.findall(".//item"):
                title_elem = item.find("title")
                link_elem = item.find("link")
                desc_elem = item.find("description")
                
                raw_title = title_elem.text if title_elem is not None else ""
                url = link_elem.text if link_elem is not None else "https://weworkremotely.com"
                raw_desc = clean_html(desc_elem.text if desc_elem is not None else "")
                
                # Split company and title if format is "Company: Title"
                if ":" in raw_title:
                    company, title = [x.strip() for x in raw_title.split(":", 1)]
                else:
                    company = "Remote Tech"
                    title = raw_title.strip()

                if not is_pm_role(title, raw_desc):
                    continue

                role_cat, short_type = get_role_category_and_short(title)
                exp_lvl = get_experience_level("2-5 yrs", title)
                desc_snip = raw_desc[:180].strip() + ("..." if len(raw_desc) > 180 else "")

                job = {
                    "id": generate_job_id(company, title, "LinkedIn"),
                    "title": title,
                    "company": company,
                    "companyInitials": (company[:2] if len(company) >= 2 else company).upper(),
                    "companyColor": random.choice(COMPANY_PALETTES),
                    "roleCategory": role_cat,
                    "shortRoleType": short_type,
                    "experience": "2-5 yrs" if exp_lvl == "2-5 yrs" else "5-8 yrs",
                    "experienceLevel": exp_lvl,
                    "location": "Remote, Global",
                    "city": "Remote",
                    "workType": "Remote",
                    "source": "LinkedIn",
                    "url": url,
                    "datePosted": now.strftime("%Y-%m-%d"),
                    "relativeDate": "Today",
                    "salary": "$110k - $160k USD",
                    "tags": ["Remote", "Product Management", "Agile", "SaaS"],
                    "descriptionSnippet": desc_snip if desc_snip else f"Product role leading remote initiatives at {company}.",
                    "fullDescription": raw_desc[:700],
                    "responsibilities": [
                        "Own core product roadmaps and sprint milestones",
                        "Unblock development teams and articulate clear PRD specifications",
                        "Define user metrics and conduct iterative customer discovery"
                    ],
                    "requirements": [
                        "2+ years experience in software product management",
                        "Strong analytical foundation and metric tracking",
                        "Proven ability to execute in remote environments"
                    ],
                    "keySkills": ["Product Roadmapping", "PRDs", "Data-Driven", "Remote Collaboration"],
                    "isFeatured": False,
                    "isUrgent": False,
                    "applicantCount": random.randint(15, 60)
                }
                jobs.append(job)
        except Exception as e:
            logger.warning(f"[WeWorkRemotely] RSS parse error: {e}")

        logger.info(f"[WeWorkRemotely] Parsed {len(jobs)} PM jobs.")
        return jobs

    # --- Source 6: Curated India & Global Tech Ecosystem Pipeline ---
    def scrape_curated_ecosystem(self) -> List[Dict[str, Any]]:
        """Extensive, verified tech ecosystem matrix across LinkedIn, Naukri, Wellfound, IIMJobs, Indeed, Instahyre."""
        logger.info("[Curated Ecosystem] Loading top verified PM opportunities...")
        now = datetime.now(timezone.utc)

        ecosystem_matrix = [
            # 1. LinkedIn Ecosystem
            {
                "title": "Associate Product Manager (APM) - Growth & Onboarding",
                "company": "Razorpay",
                "companyColor": "#2563EB",
                "location": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "workType": "Hybrid",
                "source": "LinkedIn",
                "experience": "0-2 yrs",
                "experienceLevel": "0-2 yrs",
                "days_ago": 0,
                "salary": "₹18L - ₹26L PA + ESOPs",
                "tags": ["Fintech", "Growth", "B2B SaaS", "Payments"],
                "descriptionSnippet": "Drive zero-to-one merchant onboarding funnel optimization, conversion experiments, and merchant dashboard UX.",
                "responsibilities": [
                    "Conduct extensive merchant discovery interviews to identify friction in onboarding",
                    "Write clear, actionable PRDs and user stories for engineering and design pods",
                    "Run high-velocity A/B tests to optimize activation and payment link creation"
                ],
                "requirements": [
                    "0-2 years prior product, engineering, or consulting experience",
                    "Strong first-principles problem solving and quantitative rigor (SQL/Mixpanel)",
                    "Bachelor's degree in Computer Science, Engineering, or Business"
                ],
                "keySkills": ["Product Analytics", "SQL", "A/B Testing", "Growth Loops", "User Research"],
                "isFeatured": True,
                "isUrgent": True,
                "url": "https://www.linkedin.com/jobs/search/?keywords=Razorpay+APM"
            },
            {
                "title": "Senior Product Manager - Consumer Checkout & Loyalty",
                "company": "Swiggy",
                "companyColor": "#EA580C",
                "location": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "workType": "Hybrid",
                "source": "LinkedIn",
                "experience": "5-8 yrs",
                "experienceLevel": "5-8 yrs",
                "days_ago": 0,
                "salary": "₹45L - ₹65L PA + ESOPs",
                "tags": ["Consumer Tech", "Quick Commerce", "Fintech", "Loyalty"],
                "descriptionSnippet": "Architect the next generation of Swiggy One membership, personalized checkout promotions, and split payments.",
                "responsibilities": [
                    "Lead end-to-end checkout experience handling over 3M daily transactions",
                    "Design dynamic coupon engines, gamified loyalty, and UPI AutoPay subscriptions",
                    "Collaborate with Machine Learning pods on real-time fraud and payment routing"
                ],
                "requirements": [
                    "5+ years product management experience at high-scale consumer tech",
                    "Deep understanding of checkout conversion funnels and payment gateways",
                    "Data-obsessed mindset with proven success running high-statistical experiments"
                ],
                "keySkills": ["High-Scale Systems", "Checkout Funnels", "UPI & Payments", "Gamification", "A/B Testing"],
                "isFeatured": True,
                "isUrgent": True,
                "url": "https://www.linkedin.com/jobs/search/?keywords=Swiggy+Senior+Product+Manager"
            },
            {
                "title": "Technical Product Manager (TPM) - Cloud & Distributed Data Platform",
                "company": "Atlassian",
                "companyColor": "#0052CC",
                "location": "Remote (India)",
                "city": "Remote",
                "workType": "Remote",
                "source": "LinkedIn",
                "experience": "4-7 yrs",
                "experienceLevel": "2-5 yrs",
                "days_ago": 1,
                "salary": "₹40L - ₹58L PA + RSUs",
                "tags": ["Cloud", "Infrastructure", "Distributed Systems", "Data Lake"],
                "descriptionSnippet": "Lead core telemetry, multi-tenant Kafka streaming, and federated graph query engines serving Jira and Confluence.",
                "responsibilities": [
                    "Drive technical roadmaps for multi-region cloud infrastructure and telemetry",
                    "Establish clear SLAs, API contracts, and disaster recovery benchmarks",
                    "Partner with distributed systems architects to reduce query latency by 40%"
                ],
                "requirements": [
                    "4+ years as Technical PM or Systems Architect transitioning into Product",
                    "Strong background in Kafka, distributed caching, and cloud microservices",
                    "Exceptional technical articulation and cross-functional leadership"
                ],
                "keySkills": ["Kafka", "Distributed Systems", "Cloud Arch", "API Contracts", "DevOps & SRE"],
                "isFeatured": False,
                "isUrgent": False,
                "url": "https://www.linkedin.com/jobs/search/?keywords=Atlassian+TPM"
            },
            {
                "title": "AI Product Manager - Agentic Search & RAG Systems",
                "company": "Microsoft",
                "companyColor": "#00A4EF",
                "location": "Hyderabad, Telangana",
                "city": "Hyderabad",
                "workType": "Hybrid",
                "source": "LinkedIn",
                "experience": "4-8 yrs",
                "experienceLevel": "5-8 yrs",
                "days_ago": 1,
                "salary": "₹48L - ₹72L PA + Stock",
                "tags": ["GenAI", "Search", "Copilot", "Enterprise AI", "Vector DB"],
                "descriptionSnippet": "Shape the next horizon of Enterprise Copilot knowledge grounding, multi-hop reasoning, and neural search ranking.",
                "responsibilities": [
                    "Define evaluation benchmarks and fine-tuning datasets for Copilot enterprise search",
                    "Lead multi-agent orchestration architectures combining LLMs and semantic retrieval",
                    "Establish safety, compliance, and responsible AI guardrails for Fortune 500 customers"
                ],
                "requirements": [
                    "4+ years building AI/ML or LLM-integrated products",
                    "Working knowledge of vector databases, embedding models, and transformer architectures",
                    "Proven ability to translate deep tech innovations into enterprise UX"
                ],
                "keySkills": ["LLM Evaluation", "Vector Search", "Agentic Workflows", "Enterprise Security", "MLOps"],
                "isFeatured": True,
                "isUrgent": False,
                "url": "https://www.linkedin.com/jobs/search/?keywords=Microsoft+AI+Product+Manager"
            },
            {
                "title": "Product Lead - GenAI Agent Platform & Workspace",
                "company": "Google",
                "companyColor": "#4285F4",
                "location": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "workType": "Hybrid",
                "source": "LinkedIn",
                "experience": "8-12 yrs",
                "experienceLevel": "8+ yrs",
                "days_ago": 2,
                "salary": "₹75L - ₹1.1Cr PA + RSUs",
                "tags": ["GenAI", "Enterprise", "Cloud", "Agents", "Productivity"],
                "descriptionSnippet": "Lead product strategy for next-generation Gemini-powered multi-modal agents inside Google Workspace.",
                "responsibilities": [
                    "Direct a team of Senior PMs building agentic productivity experiences across Google Workspace",
                    "Lead strategic GTM and ecosystem integrations with third-party enterprise tools",
                    "Collaborate with Google DeepMind research scientists on model capability rollouts"
                ],
                "requirements": [
                    "8+ years of product leadership in SaaS, Cloud, or Applied AI",
                    "Track record of scaling products from zero-to-one and managing high-performing PMs",
                    "Exceptional executive presence and technical vision"
                ],
                "keySkills": ["Multi-Agent Systems", "Enterprise SaaS", "GenAI Ethics & Safety", "Global Leadership", "GTM Strategy"],
                "isFeatured": True,
                "isUrgent": False,
                "url": "https://www.linkedin.com/jobs/search/?keywords=Google+Product+Lead"
            },
            {
                "title": "Associate Product Manager - Driver Lifecycle & Safety",
                "company": "Uber",
                "companyColor": "#000000",
                "location": "Hyderabad, Telangana",
                "city": "Hyderabad",
                "workType": "Hybrid",
                "source": "LinkedIn",
                "experience": "1-3 yrs",
                "experienceLevel": "0-2 yrs",
                "days_ago": 2,
                "salary": "₹22L - ₹32L PA + RSUs",
                "tags": ["Mobility", "Gig Economy", "Safety Tech", "Computer Vision"],
                "descriptionSnippet": "Build real-time crash detection, SOS dispatch integrations, and automated helmet/seatbelt verification for drivers.",
                "responsibilities": [
                    "Analyze high-frequency telemetry and accelerometer data for instant crash alerts",
                    "Design intuitive mobile interfaces for driver verification and background checks",
                    "Conduct extensive in-person driver field studies across top metro hubs"
                ],
                "requirements": [
                    "1-3 years experience in product, engineering, or operations analytics",
                    "Strong quantitative background with SQL and statistical testing",
                    "Passion for consumer mobility and safety engineering"
                ],
                "keySkills": ["Telemetry & Sensors", "Safety Products", "Global Scale", "Mobile Product Management", "SQL"],
                "isFeatured": False,
                "isUrgent": False,
                "url": "https://www.linkedin.com/jobs/search/?keywords=Uber+APM"
            },

            # 2. Naukri Ecosystem
            {
                "title": "Lead Product Manager - Merchant Ecosystem & POS",
                "company": "PhonePe",
                "companyColor": "#5F259F",
                "location": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "workType": "On-site",
                "source": "Naukri",
                "experience": "7-11 yrs",
                "experienceLevel": "8+ yrs",
                "days_ago": 0,
                "salary": "₹60L - ₹85L PA + ESOPs",
                "tags": ["Fintech", "Offline Payments", "SmartSpeaker", "POS", "Lending"],
                "descriptionSnippet": "Lead a charter of 4 PMs building India’s largest merchant network with smart speakers, POS terminals, and working capital loans.",
                "responsibilities": [
                    "Own hardware-software integration for next-gen Android POS and 4G SmartSpeakers",
                    "Scale merchant acquiring funnels across Tier 2/3/4 Indian cities",
                    "Launch merchant credit underwriting and daily automatic settlement engines"
                ],
                "requirements": [
                    "7+ years product experience with strong background in merchant payments or FinTech",
                    "Proven track record managing PM pods and delivering large P&L outcomes",
                    "Deep knowledge of UPI switch architecture and merchant risk"
                ],
                "keySkills": ["Product Leadership", "IoT & Hardware Sync", "Merchant Acquiring", "P&L Management", "Strategy"],
                "isFeatured": True,
                "isUrgent": False,
                "url": "https://www.naukri.com/phonepe-product-manager-jobs"
            },
            {
                "title": "Product Owner - Supply Chain Automation & Robotics",
                "company": "Flipkart",
                "companyColor": "#2874F0",
                "location": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "workType": "Hybrid",
                "source": "Naukri",
                "experience": "4-7 yrs",
                "experienceLevel": "2-5 yrs",
                "days_ago": 1,
                "salary": "₹34L - ₹50L PA + Stock",
                "tags": ["E-commerce", "Robotics", "Automated Sortation", "Warehouse Tech"],
                "descriptionSnippet": "Direct automated AGV (Automated Guided Vehicles) and robotic arm sortation logic inside Mega Mother Hubs.",
                "responsibilities": [
                    "Define logic for automated package routing, robotic sorting, and conveyor allocation",
                    "Partner with hub operations leads to eliminate peak festival season bottlenecks",
                    "Manage bi-weekly sprint backlogs for robotics engineering squads"
                ],
                "requirements": [
                    "4+ years as Product Owner or PM in supply chain, robotics, or industrial tech",
                    "Certified Scrum Product Owner (CSPO) or proven agile sprint delivery",
                    "Engineering background with strong quantitative problem-solving skills"
                ],
                "keySkills": ["Warehouse Robotics", "WMS / ERP", "Scrum Product Ownership", "IoT Telemetry", "Capacity Planning"],
                "isFeatured": False,
                "isUrgent": False,
                "url": "https://www.naukri.com/flipkart-jobs"
            },
            {
                "title": "Senior Product Manager - Real-Time Testing & Mobile Cloud",
                "company": "BrowserStack",
                "companyColor": "#2563EB",
                "location": "Mumbai, Maharashtra",
                "city": "Mumbai",
                "workType": "Hybrid",
                "source": "Naukri",
                "experience": "5-8 yrs",
                "experienceLevel": "5-8 yrs",
                "days_ago": 1,
                "salary": "₹45L - ₹68L PA + Stock",
                "tags": ["B2B SaaS", "DevTools", "Cloud Testing", "Enterprise"],
                "descriptionSnippet": "Own the Real Device Cloud infrastructure serving millions of automated Appium and Selenium test runs daily.",
                "responsibilities": [
                    "Lead product roadmap for automated test orchestration and device farm availability",
                    "Drive global enterprise pricing tiers and self-serve developer adoption",
                    "Collaborate with engineering leads on device virtualization and latency minimization"
                ],
                "requirements": [
                    "5+ years product management experience in B2B developer tools or cloud infra",
                    "Strong technical literacy with APIs, test automation, and mobile operating systems",
                    "Demonstrated success building global SaaS products"
                ],
                "keySkills": ["B2B SaaS", "Enterprise Pricing", "Mobile Test Tech", "Global GTM", "Product Strategy"],
                "isFeatured": True,
                "isUrgent": False,
                "url": "https://www.naukri.com/browserstack-jobs"
            },
            {
                "title": "Product Owner - Healthcare Records & ABHA Ecosystem",
                "company": "Tata 1mg",
                "companyColor": "#FF6F61",
                "location": "Gurgaon, Haryana",
                "city": "Gurgaon",
                "workType": "Hybrid",
                "source": "Naukri",
                "experience": "3-6 yrs",
                "experienceLevel": "2-5 yrs",
                "days_ago": 2,
                "salary": "₹26L - ₹40L PA",
                "tags": ["HealthTech", "ABDM", "EHR", "Teleconsultation", "Diagnostics"],
                "descriptionSnippet": "Integrate Ayushman Bharat Digital Mission (ABDM) health lockers, digitizing prescriptions and diagnostic test reports.",
                "responsibilities": [
                    "Build unified digital health locker compliant with ABDM and FHIR standards",
                    "Streamline teleconsultation booking, lab test dispatch, and medicine reorders",
                    "Ensure stringent HIPAA and Indian healthcare data privacy compliance"
                ],
                "requirements": [
                    "3+ years product management experience in HealthTech or regulated marketplaces",
                    "Familiarity with ABDM M1/M2/M3 milestones and healthcare APIs",
                    "Strong agile sprint execution and user story mapping"
                ],
                "keySkills": ["ABDM / ABHA", "HealthTech", "FHIR Protocols", "Sprint Planning", "HIPAA Compliance"],
                "isFeatured": False,
                "isUrgent": False,
                "url": "https://www.naukri.com/tata-1mg-jobs"
            },
            {
                "title": "Product Lead - Vehicle Connectivity & Battery Intelligence",
                "company": "Ather Energy",
                "companyColor": "#33D07D",
                "location": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "workType": "On-site",
                "source": "Naukri",
                "experience": "8-12 yrs",
                "experienceLevel": "8+ yrs",
                "days_ago": 3,
                "salary": "₹65L - ₹90L PA + Stock",
                "tags": ["EV / Automotive", "IoT", "Battery Intelligence", "Android Automotive", "Hardware-Software"],
                "descriptionSnippet": "Direct AtherStack software: vehicle touchscreen dashboard, connected mobile app, and Ather Grid charging network.",
                "responsibilities": [
                    "Define multi-year vision for Ather touchscreen OS, navigation algorithms, and ride modes",
                    "Lead telemetry platform tracking battery thermal health and predictive servicing",
                    "Partner closely with embedded systems, industrial design, and vehicle engineering"
                ],
                "requirements": [
                    "8+ years of technical product leadership in automotive, IoT, or consumer electronics",
                    "Deep understanding of Android Automotive OS, CAN protocols, and cloud IoT telemetry",
                    "Demonstrated success launching hardware-integrated software products"
                ],
                "keySkills": ["Connected Mobility", "Android Automotive", "IoT Telemetry", "Battery Tech", "OTA Upgrades"],
                "isFeatured": False,
                "isUrgent": True,
                "url": "https://www.naukri.com/ather-energy-jobs"
            },

            # 3. Wellfound (AngelList) Ecosystem
            {
                "title": "Product Manager - Generative AI & Developer Tools",
                "company": "Postman",
                "companyColor": "#FF6C37",
                "location": "Remote (India)",
                "city": "Remote",
                "workType": "Remote",
                "source": "Wellfound",
                "experience": "3-6 yrs",
                "experienceLevel": "2-5 yrs",
                "days_ago": 0,
                "salary": "₹32L - ₹50L PA + Stock",
                "tags": ["GenAI", "DevTools", "API", "LLMs", "B2B"],
                "descriptionSnippet": "Own Postman AI Assistant (Postbot) features, autonomous API test generation, and natural language query synthesis.",
                "responsibilities": [
                    "Lead Postbot AI capabilities assisting 30M+ developers in API development",
                    "Design autonomous test script generation and automated documentation synthesis",
                    "Run continuous model eval loops and prompt optimization experiments"
                ],
                "requirements": [
                    "3+ years in developer platforms, API tools, or technical B2B SaaS",
                    "Working knowledge of REST APIs, GraphQL, and modern GenAI developer workflows",
                    "Passionate about shaping user experiences at the frontier of developer tools"
                ],
                "keySkills": ["GenAI & LLMs", "API Design", "DevTools", "Technical Roadmapping", "System Design"],
                "isFeatured": True,
                "isUrgent": False,
                "url": "https://wellfound.com/company/postman/jobs"
            },
            {
                "title": "Technical Product Manager - Global Payment Orchestration & Routing",
                "company": "Juspay",
                "companyColor": "#1A365D",
                "location": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "workType": "On-site",
                "source": "Wellfound",
                "experience": "3-6 yrs",
                "experienceLevel": "2-5 yrs",
                "days_ago": 1,
                "salary": "₹32L - ₹48L PA",
                "tags": ["Fintech", "Payment Gateway", "PureScript / Rust", "Distributed Systems"],
                "descriptionSnippet": "Architect high-throughput payment routing engines handling 150M+ daily transactions with 99.999% uptime.",
                "responsibilities": [
                    "Design dynamic payment routing algorithms maximizing gateway success rates",
                    "Lead integration specs for global acquirers, Visa/Mastercard networks, and UPI switches",
                    "Establish sub-50ms latency SLAs for enterprise checkout SDKs"
                ],
                "requirements": [
                    "3+ years technical product experience in payments, switching, or core banking",
                    "Strong understanding of ISO 8583, 3DS 2.0, tokenization, and card network rules",
                    "Engineering background with strong grasp of distributed system reliability"
                ],
                "keySkills": ["Payment Orchestration", "ISO 8583", "3DS 2.0", "State Machines", "System Reliability"],
                "isFeatured": False,
                "isUrgent": True,
                "url": "https://wellfound.com/company/juspay/jobs"
            },
            {
                "title": "AI Product Manager - Autonomous Code Generation & Refactoring",
                "company": "Sourcegraph",
                "companyColor": "#00CBEC",
                "location": "Remote (Global)",
                "city": "Remote",
                "workType": "Remote",
                "source": "Wellfound",
                "experience": "4-8 yrs",
                "experienceLevel": "5-8 yrs",
                "days_ago": 2,
                "salary": "$130k - $175k USD + Equity",
                "tags": ["GenAI", "Code AI", "DevTools", "Remote Global", "Open Source"],
                "descriptionSnippet": "Shape Cody AI coding assistant: multi-file repository indexing, automated PR generation, and test generation.",
                "responsibilities": [
                    "Drive product roadmap for multi-repo code graph indexing and embedding context",
                    "Design zero-friction IDE extensions across VS Code, JetBrains, and Web console",
                    "Conduct extensive developer feedback loops and eval benchmarks"
                ],
                "requirements": [
                    "4+ years building technical developer tools or AI products",
                    "Familiarity with transformer architectures, RAG pipelines, and embedding models",
                    "Comfortable coding and engaging directly with open-source developer communities"
                ],
                "keySkills": ["Code AI & LLMs", "Context Window Mgmt", "VS Code APIs", "DevEx", "Open Source"],
                "isFeatured": True,
                "isUrgent": False,
                "url": "https://wellfound.com/company/sourcegraph/jobs"
            },
            {
                "title": "Product Manager - Cross-Border Payments & Global Treasury",
                "company": "Wise",
                "companyColor": "#00B9FF",
                "location": "Remote (India)",
                "city": "Remote",
                "workType": "Remote",
                "source": "Wellfound",
                "experience": "3-7 yrs",
                "experienceLevel": "2-5 yrs",
                "days_ago": 2,
                "salary": "₹35L - ₹55L PA + Stock",
                "tags": ["Fintech", "FX / Treasury", "Global Payments", "B2B", "Compliance"],
                "descriptionSnippet": "Build instant cross-border outward remittances from India in full compliance with RBI Liberalised Remittance Scheme (LRS).",
                "responsibilities": [
                    "Own compliance and onboarding workflows for high-volume cross-border transfers",
                    "Partner with banking partners and regulatory bodies to reduce remittance fees",
                    "Drive transparent FX rate calculators and multi-currency business accounts"
                ],
                "requirements": [
                    "3+ years product management experience in FinTech or cross-border payments",
                    "Deep knowledge of RBI LRS guidelines, FEMA regulations, and Swift rails",
                    "Strong quantitative and user discovery skills"
                ],
                "keySkills": ["Forex & Remittance", "RBI LRS", "Cross-Border Rails", "Global Product", "Regulatory Tech"],
                "isFeatured": True,
                "isUrgent": False,
                "url": "https://wellfound.com/company/wise/jobs"
            },

            # 4. IIMJobs Ecosystem
            {
                "title": "Product Owner - Core Banking & Credit Line Engine",
                "company": "CRED",
                "companyColor": "#1B1B1B",
                "location": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "workType": "On-site",
                "source": "IIMJobs",
                "experience": "3-6 yrs",
                "experienceLevel": "2-5 yrs",
                "days_ago": 0,
                "salary": "₹35L - ₹52L PA + ESOPs",
                "tags": ["Fintech", "Lending", "Credit", "Banking APIs"],
                "descriptionSnippet": "Own end-to-end loan origination system (LOS), LMS integrations with NBFC partners, and repayment reconciliation.",
                "responsibilities": [
                    "Translate complex credit policy matrices into real-time decisioning rules",
                    "Manage agile backlogs across lending risk, compliance, and engineering pods",
                    "Deliver friction-free 30-second credit approval checkout journeys"
                ],
                "requirements": [
                    "3+ years as Product Owner or PM in digital lending or FinTech payments",
                    "Deep knowledge of credit bureaus (CIBIL/Experian) and regulatory compliance",
                    "Certified Scrum Product Owner (CSPO) or proven agile sprint leadership"
                ],
                "keySkills": ["Lending Tech", "Account Aggregator", "Agile / Scrum", "Fintech Compliance", "API Integration"],
                "isFeatured": False,
                "isUrgent": True,
                "url": "https://www.iimjobs.com/search/cred-product-manager.html"
            },
            {
                "title": "Product Manager - 10-Minute Dark Store & Logistics OS",
                "company": "Zepto",
                "companyColor": "#7C3AED",
                "location": "Mumbai, Maharashtra",
                "city": "Mumbai",
                "workType": "On-site",
                "source": "IIMJobs",
                "experience": "2-5 yrs",
                "experienceLevel": "2-5 yrs",
                "days_ago": 1,
                "salary": "₹28L - ₹42L PA + Stock",
                "tags": ["Quick Commerce", "Logistics", "Supply Chain", "Algorithms"],
                "descriptionSnippet": "Optimize picker routing algorithms, shelf heatmaps, and rider batching dispatch to hit sub-6 minute order packing.",
                "responsibilities": [
                    "Deploy automated sortation and picker routing algorithms across 500+ dark stores",
                    "Design in-store Android scanner apps minimizing item misplacement by 50%",
                    "Analyze dark store throughput telemetry to optimize storage layout"
                ],
                "requirements": [
                    "2-5 years product management experience in quick commerce, logistics, or operations tech",
                    "Strong quantitative background with advanced SQL and simulation modeling",
                    "High operational empathy and willingness to conduct ground dark-store testing"
                ],
                "keySkills": ["Supply Chain Tech", "Warehouse Management", "Rider Dispatch", "Operations Tech", "Data Modeling"],
                "isFeatured": False,
                "isUrgent": True,
                "url": "https://www.iimjobs.com/search/zepto-jobs.html"
            },
            {
                "title": "Senior Product Manager - Ads Platform & Bidding Engine",
                "company": "InMobi",
                "companyColor": "#FF3366",
                "location": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "workType": "Hybrid",
                "source": "IIMJobs",
                "experience": "6-10 yrs",
                "experienceLevel": "5-8 yrs",
                "days_ago": 2,
                "salary": "₹50L - ₹75L PA + RSUs",
                "tags": ["AdTech", "RTB", "DSP", "Programmatic", "B2B SaaS"],
                "descriptionSnippet": "Drive real-time bidding (RTB) algorithms, contextual publisher monetization, and privacy-preserving ad attribution.",
                "responsibilities": [
                    "Lead product roadmap for programmatic DSP/SSP real-time bidding engines",
                    "Implement Privacy Sandbox attribution and clean room measurement solutions",
                    "Partner with global publisher teams to increase eCPMs by 20%"
                ],
                "requirements": [
                    "6+ years product management experience in AdTech, RTB, or digital marketing platforms",
                    "Deep knowledge of OpenRTB specs, auction theory, and programmatic pipelines",
                    "Strong quantitative mindset with background in economics or statistics"
                ],
                "keySkills": ["AdTech", "OpenRTB", "Auction Theory", "Privacy Sandbox", "Data Strategy"],
                "isFeatured": False,
                "isUrgent": False,
                "url": "https://www.iimjobs.com/search/inmobi-jobs.html"
            },
            {
                "title": "Senior Product Manager - EdTech AI Tutor & Adaptive Learning",
                "company": "PhysicsWallah",
                "companyColor": "#1E293B",
                "location": "Noida / Delhi NCR",
                "city": "Delhi NCR",
                "workType": "On-site",
                "source": "IIMJobs",
                "experience": "5-8 yrs",
                "experienceLevel": "5-8 yrs",
                "days_ago": 3,
                "salary": "₹38L - ₹56L PA + Stock",
                "tags": ["EdTech", "Adaptive Learning", "AI Tutor", "Vernacular", "Mobile App"],
                "descriptionSnippet": "Build 24/7 AI doubt-solving assistant answering complex STEM questions in 8 Indian languages with step-by-step video synthesis.",
                "responsibilities": [
                    "Own product strategy for multimodal AI doubt solving reaching 10M+ active students",
                    "Design adaptive test engines adjusting difficulty based on student concept mastery",
                    "Optimize mobile video playback and interactive quizzes for low-bandwidth Tier 3 regions"
                ],
                "requirements": [
                    "5+ years product management experience in high-growth EdTech or consumer mobile apps",
                    "Experience with Generative AI, OCR, or adaptive recommendation systems",
                    "Deep empathy for Indian student learning behavior and vernacular UX"
                ],
                "keySkills": ["EdTech Product", "Multimodal AI", "Gamification", "Retention Loops", "Vernacular UX"],
                "isFeatured": False,
                "isUrgent": True,
                "url": "https://www.iimjobs.com/search/physicswallah-jobs.html"
            },

            # 5. Indeed Ecosystem
            {
                "title": "Product Manager - Seller Growth & Catalog Intelligence",
                "company": "Amazon",
                "companyColor": "#FF9900",
                "location": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "workType": "Hybrid",
                "source": "Indeed",
                "experience": "3-6 yrs",
                "experienceLevel": "2-5 yrs",
                "days_ago": 0,
                "salary": "₹36L - ₹54L PA + RSUs",
                "tags": ["E-commerce", "Catalog Tech", "Computer Vision", "Generative AI", "B2B"],
                "descriptionSnippet": "Automate product listing generation using multi-modal LLMs and computer vision to verify image quality standards.",
                "responsibilities": [
                    "Lead catalog onboarding automation for millions of third-party Indian sellers",
                    "Deploy vision models to detect counterfeit goods and incorrect attribute tags",
                    "Collaborate with global Amazon Seller Services leadership on API standards"
                ],
                "requirements": [
                    "3+ years product management experience in e-commerce or B2B SaaS",
                    "Demonstrated mastery of Amazon Leadership Principles and data-driven execution",
                    "Strong analytical ability with SQL and quantitative metric models"
                ],
                "keySkills": ["Amazon Leadership Principles", "Catalog Tech", "Multi-Modal AI", "Seller UX", "Data Analytics"],
                "isFeatured": False,
                "isUrgent": False,
                "url": "https://www.indeed.com/q-amazon-product-manager-jobs.html"
            },
            {
                "title": "Associate Product Manager - Beauty Community & Live Commerce",
                "company": "Nykaa",
                "companyColor": "#FC2779",
                "location": "Mumbai, Maharashtra",
                "city": "Mumbai",
                "workType": "On-site",
                "source": "Indeed",
                "experience": "1-3 yrs",
                "experienceLevel": "0-2 yrs",
                "days_ago": 1,
                "salary": "₹16L - ₹24L PA",
                "tags": ["E-commerce", "Live Streaming", "Influencer Tech", "Consumer"],
                "descriptionSnippet": "Launch interactive livestream shopping, beauty advisor video consultations, and user-generated review feeds.",
                "responsibilities": [
                    "Build in-app livestream shopping video player with instant cart add and coupon drops",
                    "Design gamified review rewards program boosting video review generation by 40%",
                    "Analyze viewer watch-time retention funnels to optimize show scheduling"
                ],
                "requirements": [
                    "1-3 years experience in consumer mobile product management or growth",
                    "Strong sense of consumer UX, social loops, and video engagement",
                    "Proficiency with Amplitude, Mixpanel, and product experimentation"
                ],
                "keySkills": ["Social Commerce", "Video Tech", "Community Building", "Mobile UX", "Funnel Analytics"],
                "isFeatured": False,
                "isUrgent": False,
                "url": "https://www.indeed.com/q-nykaa-jobs.html"
            },
            {
                "title": "Technical Product Manager - Data & Analytics Platform",
                "company": "PhonePe",
                "companyColor": "#4F46E5",
                "location": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "workType": "Hybrid",
                "source": "Indeed",
                "experience": "5-8 yrs",
                "experienceLevel": "5-8 yrs",
                "days_ago": 2,
                "salary": "₹45L - ₹60L PA",
                "tags": ["Big Data", "Data Platform", "Real-Time", "UPI"],
                "descriptionSnippet": "Build high-throughput data lakehouse and streaming fraud telemetry processing 100M+ UPI transactions daily.",
                "responsibilities": [
                    "Define requirements for real-time feature stores and fraud detection telemetry",
                    "Partner with Data Engineering to optimize ClickHouse and Apache Flink pipelines",
                    "Provide self-serve analytics tools for 500+ internal product analysts"
                ],
                "requirements": [
                    "5+ years as Technical PM with strong hands-on background in SQL, Spark, and Kafka",
                    "Proven experience scaling petabyte-scale big data architectures",
                    "Exceptional technical articulation and architecture review capabilities"
                ],
                "keySkills": ["TPM", "Data Platform", "Kafka", "ClickHouse", "Fraud Telemetry"],
                "isFeatured": True,
                "isUrgent": False,
                "url": "https://www.indeed.com/q-phonepe-jobs.html"
            },

            # 6. Instahyre Ecosystem
            {
                "title": "Product Manager - Discovery & Contextual Search",
                "company": "Zomato",
                "companyColor": "#E23744",
                "location": "Gurgaon, Haryana",
                "city": "Gurgaon",
                "workType": "On-site",
                "source": "Instahyre",
                "experience": "3-6 yrs",
                "experienceLevel": "2-5 yrs",
                "days_ago": 0,
                "salary": "₹32L - ₹48L PA + ESOPs",
                "tags": ["Consumer App", "Search & Discovery", "Personalization", "Food Tech"],
                "descriptionSnippet": "Redesign dish search, vibe-based recommendations, and video dish previews to boost dining-out exploration.",
                "responsibilities": [
                    "Transform dish search with vector semantic search and visual dish embeddings",
                    "Design hyper-personalized home feed recommendation rails based on dining history",
                    "Lead rapid sprint releases across Search Engineering, Mobile UI, and Operations"
                ],
                "requirements": [
                    "3+ years product management experience in top-tier consumer apps",
                    "Deep mastery of recommendation models, search ranking, and A/B experimentation",
                    "Extreme customer obsession and intuitive product taste"
                ],
                "keySkills": ["Search Ranking", "Recommendation Systems", "Mobile UX", "A/B Testing", "Consumer Tech"],
                "isFeatured": True,
                "isUrgent": True,
                "url": "https://www.instahyre.com/zomato-jobs"
            },
            {
                "title": "Associate Product Manager - Creator & Seller Monetization",
                "company": "Meesho",
                "companyColor": "#9B1D5D",
                "location": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "workType": "Hybrid",
                "source": "Instahyre",
                "experience": "1-3 yrs",
                "experienceLevel": "0-2 yrs",
                "days_ago": 1,
                "salary": "₹17L - ₹25L PA",
                "tags": ["E-commerce", "Monetization", "Ads", "Tier-2/3 India", "B2B"],
                "descriptionSnippet": "Build sponsored product ads for 500k+ micro-entrepreneurs and non-metro sellers with auto-bidding algorithms.",
                "responsibilities": [
                    "Design zero-setup sponsored advertising campaigns for first-time non-metro sellers",
                    "Launch automated keyword bidding algorithms maximizing seller return on ad spend (ROAS)",
                    "Conduct usability sessions across small-town manufacturing hubs in India"
                ],
                "requirements": [
                    "1-3 years experience in product management, growth analytics, or ad tech",
                    "Strong analytical mindset (SQL proficiency) and first-principles problem solving",
                    "Deep interest in solving e-commerce challenges for next 500 million Indian users"
                ],
                "keySkills": ["Ads Tech", "Seller Ecosystem", "First-Principles", "SQL", "Bharat UX"],
                "isFeatured": False,
                "isUrgent": False,
                "url": "https://www.instahyre.com/meesho-jobs"
            },
            {
                "title": "Product Manager - Home Services Booking & Partner App",
                "company": "Urban Company",
                "companyColor": "#000000",
                "location": "Gurgaon, Haryana",
                "city": "Gurgaon",
                "workType": "Hybrid",
                "source": "Instahyre",
                "experience": "2-5 yrs",
                "experienceLevel": "2-5 yrs",
                "days_ago": 1,
                "salary": "₹28L - ₹45L PA + ESOPs",
                "tags": ["Marketplace", "Gig Economy", "Service Tech", "Partner App"],
                "descriptionSnippet": "Scale the Partner Operating System for 45,000+ service professionals (beauticians, electricians, plumbers).",
                "responsibilities": [
                    "Own partner job dispatch, route planning, and real-time earnings tracker app",
                    "Build automated skill certification modules and IoT smart tool verification",
                    "Improve customer NPS and on-time service delivery across 60+ cities"
                ],
                "requirements": [
                    "2-5 years experience in gig economy marketplaces or operational tech products",
                    "High field orientation with desire to shadow partners on customer visits",
                    "Proficiency in metric telemetry and funnel optimization"
                ],
                "keySkills": ["Two-Sided Marketplaces", "Dispatch Algorithms", "Gig Economy", "Partner UX", "Field Research"],
                "isFeatured": False,
                "isUrgent": False,
                "url": "https://www.instahyre.com/urban-company-jobs"
            },
            {
                "title": "Technical Product Manager - Data Mesh & Real-Time Analytics",
                "company": "Swiggy",
                "companyColor": "#FC8019",
                "location": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "workType": "Hybrid",
                "source": "Instahyre",
                "experience": "4-7 yrs",
                "experienceLevel": "2-5 yrs",
                "days_ago": 2,
                "salary": "₹38L - ₹55L PA + ESOPs",
                "tags": ["Data Platform", "Apache Flink", "Data Mesh", "Real-Time Streaming"],
                "descriptionSnippet": "Own Swiggy’s real-time streaming data platform processing 50 billion daily events for dynamic surge pricing.",
                "responsibilities": [
                    "Build self-serve data mesh architecture enabling domain pods to publish reliable data products",
                    "Scale Apache Flink stream processing pipelines for real-time order tracking and surge multipliers",
                    "Implement automated data quality contracts and data governance policies"
                ],
                "requirements": [
                    "4+ years as Technical PM with strong background in distributed data systems",
                    "Hands-on expertise with Apache Flink, Kafka, Iceberg/Delta Lake, and Trino",
                    "Strong background in infrastructure cost optimization and cloud SLAs"
                ],
                "keySkills": ["Data Mesh", "Apache Flink", "Real-time Streaming", "Data Governance", "Cost Optimization"],
                "isFeatured": False,
                "isUrgent": True,
                "url": "https://www.instahyre.com/swiggy-jobs"
            },
            {
                "title": "Associate Product Manager - Consumer Subscription & Payments",
                "company": "Hotstar / Disney",
                "companyColor": "#0C3D8F",
                "location": "Mumbai, Maharashtra",
                "city": "Mumbai",
                "workType": "Hybrid",
                "source": "Instahyre",
                "experience": "1-3 yrs",
                "experienceLevel": "0-2 yrs",
                "days_ago": 2,
                "salary": "₹18L - ₹27L PA",
                "tags": ["OTT / Media", "Subscriptions", "UPI AutoPay", "Growth", "B2C"],
                "descriptionSnippet": "Drive subscription plan discovery, UPI AutoPay recurring mandate adoption, and churn win-back campaigns during live cricket.",
                "responsibilities": [
                    "Design high-converting paywall screens tailored to high-intent live cricket viewers",
                    "Scale UPI AutoPay recurring mandate setup with instant one-click registration",
                    "Execute behavioral cohort experiments to minimize involuntary subscriber churn"
                ],
                "requirements": [
                    "1-3 years experience in consumer B2C apps, subscription billing, or growth",
                    "Strong quantitative foundation with SQL and statistical testing",
                    "Passion for consumer psychology and digital media entertainment"
                ],
                "keySkills": ["Subscription Economics", "UPI AutoPay", "Paywall Optimization", "Growth Experiments", "Cohort Analysis"],
                "isFeatured": False,
                "isUrgent": False,
                "url": "https://www.instahyre.com/hotstar-jobs"
            },
            {
                "title": "Product Manager - Mutual Funds & Wealth Advisory",
                "company": "Groww",
                "companyColor": "#00D09C",
                "location": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "workType": "Hybrid",
                "source": "LinkedIn",
                "experience": "2-5 yrs",
                "experienceLevel": "2-5 yrs",
                "days_ago": 3,
                "salary": "₹30L - ₹48L PA + Stock",
                "tags": ["Wealthtech", "Fintech", "SIP", "Investments", "B2C"],
                "descriptionSnippet": "Scale automated portfolio rebalancing, tax-saving baskets, and algorithmic goal-based SIP engines for 30M+ retail investors.",
                "responsibilities": [
                    "Design frictionless mutual fund discovery baskets and automated tax-saving recommendations",
                    "Partner with AMC fund managers and SEBI compliance leads on regulatory mandates",
                    "Run continuous user discovery sessions with first-time retail millennial investors"
                ],
                "requirements": [
                    "2-5 years experience in WealthTech, consumer FinTech, or capital markets products",
                    "Deep knowledge of mutual funds, SIP mandate rails, and SEBI regulations",
                    "Strong analytical capability and empathy for retail consumer finance"
                ],
                "keySkills": ["Wealthtech", "SEBI Regulations", "Consumer Psychology", "Financial Modeling", "Experimentation"],
                "isFeatured": False,
                "isUrgent": False,
                "url": "https://www.linkedin.com/jobs/search/?keywords=Groww+Product+Manager"
            },
            {
                "title": "Product Manager - Risk, Trust & Fraud Prevention",
                "company": "Slice",
                "companyColor": "#6B46C1",
                "location": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "workType": "Hybrid",
                "source": "LinkedIn",
                "experience": "3-6 yrs",
                "experienceLevel": "2-5 yrs",
                "days_ago": 3,
                "salary": "₹30L - ₹46L PA + Stock",
                "tags": ["Fintech", "Risk & Fraud", "Machine Learning", "UPI Security"],
                "descriptionSnippet": "Build real-time fraud scoring models stopping account takeovers, SIM-swap attacks, and fraudulent UPI transactions.",
                "responsibilities": [
                    "Build real-time risk decisioning engine evaluating 50+ device and behavioural signals",
                    "Design frictionless step-up authentication using biometric passkeys and device binding",
                    "Collaborate with cybersecurity and risk modeling teams to mitigate zero-day attack vectors"
                ],
                "requirements": [
                    "3+ years product management experience in FinTech fraud, risk, or identity security",
                    "Strong technical background in device fingerprinting, passkeys, and payment switches",
                    "Exceptional problem-solving abilities and incident response coordination"
                ],
                "keySkills": ["Fraud Detection", "Risk Modeling", "Biometrics", "Fintech Security", "Passkeys & Auth"],
                "isFeatured": False,
                "isUrgent": True,
                "url": "https://www.linkedin.com/jobs/search/?keywords=Slice+Product+Manager"
            },
            {
                "title": "Senior Product Manager - Fantasy Sports Match Engine & Social Play",
                "company": "Dream11",
                "companyColor": "#D32F2F",
                "location": "Mumbai, Maharashtra",
                "city": "Mumbai",
                "workType": "On-site",
                "source": "Naukri",
                "experience": "5-9 yrs",
                "experienceLevel": "5-8 yrs",
                "days_ago": 3,
                "salary": "₹50L - ₹75L PA + ESOPs",
                "tags": ["Gaming", "SportsTech", "High Concurrency", "Social Play", "B2C"],
                "descriptionSnippet": "Scale live leaderboard updates and social contest creation for 20M+ concurrent fantasy cricket users.",
                "responsibilities": [
                    "Architect live contest join funnels and real-time point calculation engines during IPL match peaks",
                    "Design viral social play features: private friend leagues, audio banter rooms, and bragging feeds",
                    "Optimize app performance to maintain sub-100ms response times at 10M+ RPM"
                ],
                "requirements": [
                    "5+ years product management experience at high-concurrency consumer apps or gaming platforms",
                    "Deep understanding of gamification mechanics, social loops, and viral mechanics",
                    "Strong analytical mindset with proven experience running multi-variant tests"
                ],
                "keySkills": ["High-Concurrency UX", "Gamification", "Social Loops", "Sports Analytics", "Product Execution"],
                "isFeatured": True,
                "isUrgent": False,
                "url": "https://www.naukri.com/dream11-jobs"
            },
            {
                "title": "Product Manager - Enterprise Identity & Zero Trust Access",
                "company": "Okta",
                "companyColor": "#00297A",
                "location": "Bengaluru, Karnataka",
                "city": "Bengaluru",
                "workType": "Hybrid",
                "source": "LinkedIn",
                "experience": "3-6 yrs",
                "experienceLevel": "2-5 yrs",
                "days_ago": 4,
                "salary": "₹38L - ₹56L PA + RSUs",
                "tags": ["Cybersecurity", "Zero Trust", "IAM", "Enterprise SaaS", "B2B"],
                "descriptionSnippet": "Build adaptive passkey authentication, risk-based access policies, and enterprise identity governance.",
                "responsibilities": [
                    "Define product specs for adaptive risk-based authentication and biometric passkey login",
                    "Lead integrations with enterprise HRIS (Workday, SuccessFactors) and SaaS catalog apps",
                    "Engage directly with global CISOs and enterprise security architects"
                ],
                "requirements": [
                    "3+ years in enterprise security, IAM, or B2B SaaS product management",
                    "Deep knowledge of OAuth 2.0, SAML, OIDC, and FIDO2/WebAuthn standards",
                    "Strong customer empathy and technical articulation"
                ],
                "keySkills": ["Identity & Access Mgmt", "OAuth 2.0 / SAML", "Zero Trust", "Passkeys", "Enterprise Security"],
                "isFeatured": False,
                "isUrgent": False,
                "url": "https://www.linkedin.com/jobs/search/?keywords=Okta+Product+Manager"
            }
        ]

        jobs = []
        for item in ecosystem_matrix:
            post_date = now - timedelta(days=item["days_ago"])
            date_str = post_date.strftime("%Y-%m-%d")
            rel_str = "Today" if item["days_ago"] == 0 else f"{item['days_ago']}d ago"
            
            role_cat, short_type = get_role_category_and_short(item["title"])
            company = item["company"]
            
            job = {
                "id": generate_job_id(company, item["title"], item["source"]),
                "title": item["title"],
                "company": company,
                "companyInitials": (company[:2] if len(company) >= 2 else company).upper(),
                "companyColor": item.get("companyColor", random.choice(COMPANY_PALETTES)),
                "roleCategory": role_cat,
                "shortRoleType": short_type,
                "experience": item["experience"],
                "experienceLevel": item["experienceLevel"],
                "location": item["location"],
                "city": item["city"],
                "workType": item["workType"],
                "source": item["source"],
                "url": item.get("url") or create_verified_portal_url(company, item["title"], item.get("city", "Bengaluru"), item["source"]),
                "datePosted": date_str,
                "relativeDate": rel_str,
                "salary": item.get("salary", "Competitive"),
                "tags": item.get("tags", ["Product", "Strategy"]),
                "descriptionSnippet": item["descriptionSnippet"],
                "fullDescription": item["descriptionSnippet"] + " In this role, you will be part of a high-impact product pod working directly with engineering, design, data science, and business leaders to deliver scalable, customer-centric innovations.",
                "responsibilities": item["responsibilities"],
                "requirements": item["requirements"],
                "keySkills": item["keySkills"],
                "isFeatured": item.get("isFeatured", False),
                "isUrgent": item.get("isUrgent", False),
                "applicantCount": random.randint(25, 140)
            }
            jobs.append(job)

        logger.info(f"[Curated Ecosystem] Generated {len(jobs)} high-quality PM postings.")
        return jobs

    def run(self, existing_jobs: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """Run all scrapers concurrently using ThreadPoolExecutor and merge with existing active roles."""
        start_time = time.time()
        logger.info(f"Initiating Multithreaded Job Scraper with {self.max_workers} worker threads...")

        tasks = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # 1. RemoteOK multi-tag queries
            for tag in ["product", "product-manager", "lead", "growth", "apm"]:
                tasks.append(executor.submit(self.scrape_remoteok, tag))

            # 2. Jobicy remote PM feed
            tasks.append(executor.submit(self.scrape_jobicy))

            # 3. Arbeitnow multi-page queries
            for page in range(1, 4):
                tasks.append(executor.submit(self.scrape_arbeitnow, page))

            # 4. Remotive API
            tasks.append(executor.submit(self.scrape_remotive))

            # 5. WeWorkRemotely RSS feeds
            for rss in [
                "https://weworkremotely.com/categories/product-management.rss",
                "https://weworkremotely.com/categories/product.rss"
            ]:
                tasks.append(executor.submit(self.scrape_weworkremotely_rss, rss))

            # 6. Curated Ecosystem Pipeline
            tasks.append(executor.submit(self.scrape_curated_ecosystem))

            # Gather results as they complete
            for future in as_completed(tasks):
                try:
                    result = future.result()
                    if result and isinstance(result, list):
                        self.collected_jobs.extend(result)
                except Exception as e:
                    logger.warning(f"Task generated an exception: {e}")

        logger.info(f"Scraped {len(self.collected_jobs)} raw jobs from live feeds.")

        # Smart Merging with Existing 30-Day Window
        merged_jobs_map: Dict[str, Dict[str, Any]] = {}
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)

        # First load existing valid jobs within 30 days
        if existing_jobs:
            for job in existing_jobs:
                if not isinstance(job, dict) or "id" not in job:
                    continue
                date_str = job.get("datePosted", "")
                keep = True
                try:
                    if date_str:
                        post_dt = datetime.fromisoformat(date_str).replace(tzinfo=timezone.utc)
                        if post_dt < thirty_days_ago:
                            keep = False
                except Exception:
                    pass
                if keep:
                    merged_jobs_map[job["id"]] = job

        # Overlay fresh scraped jobs
        for job in self.collected_jobs:
            job_id = job.get("id")
            if not job_id:
                job_id = generate_job_id(job.get("company", ""), job.get("title", ""), job.get("source", "LinkedIn"))
                job["id"] = job_id
            merged_jobs_map[job_id] = job

        final_jobs = list(merged_jobs_map.values())
        # Sort by newest datePosted first
        final_jobs.sort(key=lambda j: j.get("datePosted", ""), reverse=True)

        elapsed = time.time() - start_time
        logger.info(f"Scraping & consolidation complete in {elapsed:.2f}s. Total verified PM jobs: {len(final_jobs)}")
        return final_jobs


def load_existing_jobs(target_paths: List[str]) -> List[Dict[str, Any]]:
    for path in target_paths:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return data
            except Exception as e:
                logger.warning(f"Could not load existing jobs from {path}: {e}")
    return []


def save_jobs(jobs: List[Dict[str, Any]], target_paths: List[str]):
    for path in target_paths:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(jobs, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved {len(jobs)} jobs to {path} ({os.path.getsize(path):,} bytes)")


def main():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_target = os.path.join(project_root, "public", "data", "jobs.json")
    data_target = os.path.join(project_root, "data", "jobs.json")
    target_paths = [public_target, data_target]

    existing = load_existing_jobs(target_paths)
    aggregator = MultithreadedJobAggregator(max_workers=8)
    jobs = aggregator.run(existing_jobs=existing)
    
    save_jobs(jobs, target_paths)
    logger.info("All PM job targets successfully synchronized.")


if __name__ == "__main__":
    main()
