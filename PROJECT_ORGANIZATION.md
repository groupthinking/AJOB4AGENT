# AJOB4AGENT Project Organization Guide

## 🎯 **Project Scope & Boundaries**
**This file belongs ONLY in:** `/RESUME/AJOB4AGENT/`  
**Never create duplicates at:** `/RESUME/` root level

## 📁 **File Location Rules**

### **Project Files (AJOB4AGENT folder only):**
- `docker-compose.yml` → **ONLY** in `/RESUME/AJOB4AGENT/`
- `architecture.mmd` → **ONLY** in `/RESUME/AJOB4AGENT/`
- `PRD.md` → **ONLY** in `/RESUME/AJOB4AGENT/`
- `LICENSE` → **ONLY** in `/RESUME/AJOB4AGENT/`

### **Service Files (services/ subfolder):**
- `services/agent-orchestrator/` → Node.js/TypeScript orchestrator
- `services/llm-service/` → Python AI/ML service
- `services/dashboard-service/` → React frontend
- `services/agent-monitoring-service/` → Python monitoring

### **Configuration Files:**
- `migrations/` → Database schema files
- `files/` → Project documentation and assets

## 🚫 **Anti-Duplication Rules**

1. **NEVER create files at `/RESUME/` root level** that belong to specific projects
2. **NEVER duplicate project files** across different directory levels
3. **ALWAYS verify file location** before creation
4. **Use this guide** to determine where new files belong

## ✅ **File Creation Checklist**

Before creating ANY new file, ask:
- [ ] Does this file belong to AJOB4AGENT specifically?
- [ ] Is there already a similar file somewhere else?
- [ ] Am I creating this in the correct subdirectory?
- [ ] Will this create duplication or confusion?

## 🔍 **Current Clean Structure**

```
/RESUME/
├── AJOB4AGENT/                    ← PROJECT ROOT
│   ├── docker-compose.yml         ← ONLY HERE
│   ├── architecture.mmd           ← ONLY HERE
│   ├── services/                  ← Service implementations
│   ├── migrations/                ← Database schemas
│   └── files/                     ← Project assets
├── automation/                     ← Separate automation project
├── Job Applications/               ← Resume organization
└── [other resume-related folders] ← Resume management
```

## 📝 **Notes for Future Development**

- **New services** → Create in `services/` subfolder
- **New configs** → Create in appropriate service folder
- **New docs** → Create in `files/` or appropriate service folder
- **Database changes** → Create in `migrations/`

## 🚨 **What NOT to Do**

- ❌ Don't create `docker-compose.yml` at `/RESUME/` level
- ❌ Don't create `architecture.mmd` at `/RESUME/` level  
- ❌ Don't duplicate project files across directories
- ❌ Don't create files without knowing their exact purpose and location

## 📋 **Maintenance**

- **Review this file** before adding new files
- **Update this guide** when project structure changes
- **Use as reference** for all file organization decisions

---
**Last Updated:** $(date)  
**Purpose:** Prevent file duplication and maintain clean project structure  
**Scope:** AJOB4AGENT project only

