# Claude Agent Skills Development Guide

> Complete guide for creating Claude agent skills that extend Claude's capabilities through modular, discoverable packages with progressive disclosure

## Table of Contents

1. [Overview](#overview)
2. [Progressive Disclosure Architecture](#progressive-disclosure-architecture)
3. [Skill Structure](#skill-structure)
4. [Creating Skills](#creating-skills)
5. [Best Practices](#best-practices)
6. [Pre-Built Anthropic Skills](#pre-built-anthropic-skills)
7. [Testing & Debugging](#testing--debugging)
8. [Sharing Skills](#sharing-skills)
9. [Examples](#examples)
10. [Limitations](#limitations)

---

## Overview

**Agent Skills** are modular capabilities that package instructions, metadata, and optional resources (scripts, templates) that Claude uses automatically when relevant. Skills operate within Claude's virtual machine environment with filesystem access.

### Key Characteristics

- **Autonomous Activation**: Claude decides when to use them based on description
- **Progressive Disclosure**: Three-stage loading system (metadata → instructions → resources)
- **Filesystem Access**: Run in Claude's VM with bash execution capability
- **Context Efficient**: Scripts run without consuming context tokens
- **Platform Agnostic**: Work across Claude API, Claude Code, Agent SDK, and Claude.ai

### Where Skills Work

- **Claude API**: Pre-built and custom skills via `/v1/skills` endpoints
- **Claude Code**: Filesystem-based custom skills in `.claude/skills/`
- **Claude Agent SDK**: Custom skills through configuration
- **Claude.ai**: Pre-built skills active automatically; custom skills uploaded as zip files

---

## Progressive Disclosure Architecture

Skills use a **three-stage loading system** to efficiently manage context:

### Level 1: Metadata (Always Loaded)

YAML frontmatter provides discovery information (~100 tokens per skill):

```yaml
---
name: skill-name
description: What this does and when to activate it (max 1024 chars)
---
```

**Loaded at:** Claude startup
**Purpose:** Skill discovery and activation decision
**Cost:** ~100 tokens per skill

### Level 2: Instructions (Loaded When Triggered)

The SKILL.md file's main body contains procedural knowledge, workflows, and best practices.

**Loaded at:** Skill activation (via bash `cat`)
**Purpose:** Detailed execution guidance
**Cost:** <5k tokens
**Target:** Keep SKILL.md under 500 lines

### Level 3: Resources & Code (Loaded As Needed)

Additional files (reference docs, scripts, templates) load only when referenced.

**Loaded at:** When Claude references them
**Purpose:** Detailed reference, executable scripts, templates
**Cost:** Scripts run via bash without consuming tokens; docs loaded on-demand
**Benefit:** Infinite context extension via executable code

---

## Skill Structure

### Minimal Structure

```
.claude/skills/skill-name/
└── SKILL.md
```

### Full Structure with Progressive Disclosure

```
.claude/skills/processing-pdfs/
├── SKILL.md              # Level 1 & 2: Metadata + high-level instructions
├── reference/            # Level 3: Detailed documentation
│   ├── extraction.md     # Loaded when Claude needs extraction details
│   ├── merging.md        # Loaded when Claude needs merging details
│   └── forms.md          # Loaded when Claude needs form-filling details
├── scripts/              # Level 3: Executable utilities
│   ├── extract.py        # Runs without consuming context
│   └── merge.sh          # Runs without consuming context
└── templates/            # Level 3: Output templates
    └── report.md         # Loaded when formatting output
```

### SKILL.md Format

```markdown
---
name: processing-pdfs
description: |
  Extracts text and tables from PDFs, fills forms, merges documents.
  Use when working with PDF files or document extraction tasks.
---

# Processing PDFs

Quick overview of what this skill does (keep brief).

## Quick Start

**Text Extraction:**
\`\`\`bash
python scripts/extract.py input.pdf
\`\`\`

**Merging PDFs:**
\`\`\`bash
bash scripts/merge.sh file1.pdf file2.pdf output.pdf
\`\`\`

## Detailed Guidance

For text extraction, see reference/extraction.md
For merging PDFs, see reference/merging.md
For form filling, see reference/forms.md

## When to Use

- User asks to extract text from PDF
- User needs to combine multiple PDFs
- User wants to fill PDF forms

## Error Handling

- If file not found: Ask user for correct path
- If extraction fails: Try alternative method in scripts/extract.py
- If unsupported format: List supported formats
```

---

## Creating Skills

### Field Requirements

**`name`** (required):
- Max 64 characters
- Lowercase letters, numbers, hyphens only
- Use **gerund form** (verb + -ing): `processing-pdfs`, `analyzing-spreadsheets`
- Avoid vague names: ❌ `helper`, `utils` | ✅ `validating-json`, `generating-reports`

**`description`** (required):
- Max 1024 characters
- Non-empty, no XML tags
- **Write in third person**
- Include **what** the skill does **and when** to use it
- Include key trigger terms

### Description Best Practices

❌ **Poor (too vague):**
```yaml
description: Helps with documents
```

✅ **Good (specific with triggers):**
```yaml
description: |
  Extracts text and tables from PDFs, fills forms, merges documents.
  Use when working with PDF files, document extraction tasks, or
  combining multiple PDFs. Handles multi-page documents with tables.
```

✅ **Good (third person, specific):**
```yaml
description: |
  Reviews code for security vulnerabilities, performance issues, and
  style violations. Activates when user asks for code review, security
  audit, or mentions improving code quality. Provides detailed reports
  with line numbers and severity ratings.
```

---

## Best Practices

### 1. Conciseness is Critical

> "The context window is a public good. Your Skill shares the context window with everything else Claude needs to know."

- **Keep SKILL.md under 500 lines**
- Only metadata pre-loads at startup
- Use progressive disclosure: SKILL.md → reference files → scripts

### 2. Assume Intelligence

Don't over-explain concepts Claude already understands. Challenge each piece of information for necessity.

❌ **Over-explaining:**
```markdown
Python is a programming language. To use it, you run commands.
First, import pandas, which is a data analysis library...
```

✅ **Assume intelligence:**
```markdown
Load CSV with pandas, analyze missing values, compute summary statistics.
```

### 3. Match Specificity to Task

**Low Freedom Tasks (Fragile):** Provide precise step-by-step instructions
```markdown
### Extracting Tables from PDFs
1. Use pdfplumber.open(path)
2. Call page.extract_tables() for each page
3. Validate table structure before returning
4. Format as JSON with headers and rows
```

**High Freedom Tasks (Context-Dependent):** Allow flexibility
```markdown
### Analyzing Data Quality
Assess data quality based on context: missing values, outliers,
type consistency. Report findings in format most useful for user's goal.
```

### 4. Progressive Disclosure Patterns

**Pattern 1: High-Level Guide → Detailed Files**
```markdown
# SKILL.md (brief overview)
For extraction: see reference/extraction.md
For merging: see reference/merging.md
```

**Pattern 2: Domain-Specific Organization**
```markdown
reference/
├── finance-reports.md
├── sales-analysis.md
└── marketing-metrics.md
```

**Pattern 3: Conditional Details**
```markdown
# SKILL.md (basic content)
For advanced usage, see reference/advanced.md
```

### 5. Avoid Nested References

Keep references **one level deep** from SKILL.md:

✅ **Good:**
```markdown
SKILL.md → reference/extraction.md (Claude reads full file)
```

❌ **Bad:**
```markdown
SKILL.md → reference/guide.md → reference/details.md (may not read details.md)
```

### 6. Structure Long Files

Include table of contents for files >100 lines:

```markdown
# Extraction Reference

## Table of Contents
- [Text Extraction](#text-extraction)
- [Table Extraction](#table-extraction)
- [Image Extraction](#image-extraction)

## Text Extraction
...
```

### 7. Maintain Terminology Consistency

Choose one term and use throughout:

❌ **Inconsistent:** "API endpoint", "URL", "API route"
✅ **Consistent:** Always "API endpoint"

### 8. Use Templates and Examples

Provide input/output pairs for quality:

```markdown
## Example: CSV Analysis

**Input:** sales_data.csv

**Output:**
\`\`\`json
{
  "total_rows": 1523,
  "missing_values": {"region": 12},
  "summary_stats": {
    "amount": {"mean": 145.23, "median": 120.00}
  }
}
\`\`\`
```

### 9. Workflows for Complex Tasks

Break operations into sequential steps with copyable checklists:

```markdown
## Workflow: API Integration

1. [ ] Fetch API documentation
2. [ ] Extract endpoint schemas
3. [ ] Generate TypeScript interfaces
4. [ ] Implement client class
5. [ ] Add authentication
6. [ ] Write tests
7. [ ] Generate usage docs
```

### 10. Implement Validation Loops

```markdown
## Build Process

1. Run build command
2. Run validator
3. If errors: fix and return to step 1
4. If success: proceed to deployment
```

### 11. Code & Scripts Best Practices

**Solve, Don't Delegate:** Handle errors explicitly
```python
# ✅ Good: Explicit error handling
try:
    df = pd.read_csv(path)
except FileNotFoundError:
    print(f"Error: File not found: {path}")
    sys.exit(1)

# ❌ Bad: Punting to Claude
# If file not found, Claude should handle it
```

**Provide Utility Scripts:** Pre-made scripts save tokens and ensure consistency

**Avoid Magic Numbers:** Justify all configuration values
```python
# ✅ Good: Explained
MAX_RETRIES = 3  # Balance between reliability and performance
TIMEOUT_MS = 5000  # Industry standard for API requests

# ❌ Bad: Magic numbers
retries = 3
timeout = 5000
```

**Create Verifiable Outputs:** Use intermediate validation
```bash
# Generate plan first
python generate_plan.py > plan.json

# Review plan (gives Claude chance to validate)
cat plan.json

# Execute plan
python execute_plan.py plan.json
```

### 12. Technical Considerations

**Use Forward Slashes:**
```markdown
✅ reference/guide.md
❌ reference\guide.md
```

**List Required Packages:**
```markdown
## Dependencies

Required packages (pre-installed in code execution):
- pandas
- pdfplumber
- requests
```

**Avoid Time-Sensitive Information:**
```markdown
❌ "Support for API v1 ends December 2024"
✅ "Use API v2 instead of deprecated v1 patterns"
```

---

## Pre-Built Anthropic Skills

Anthropic provides four foundational skills accessible via API:

### Available Skills

1. **PowerPoint (pptx)** - Create and modify presentations
2. **Excel (xlsx)** - Generate and analyze spreadsheets
3. **Word (docx)** - Create and edit documents
4. **PDF (pdf)** - Extract text, tables, fill forms

### Using Pre-Built Skills via API

**List Available Skills:**
```python
import anthropic

client = anthropic.Anthropic()
skills = client.beta.skills.list(
    source="anthropic",
    betas=["skills-2025-10-02"]
)

for skill in skills.data:
    print(f"{skill.id}: {skill.display_title}")
```

**Create Documents with Skills:**
```python
response = client.beta.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=4096,
    betas=["code-execution-2025-08-25", "skills-2025-10-02"],
    container={
        "skills": [
            {
                "type": "anthropic",
                "skill_id": "pptx",
                "version": "latest"
            }
        ]
    },
    messages=[{
        "role": "user",
        "content": "Create a presentation about renewable energy with 5 slides"
    }],
    tools=[{
        "type": "code_execution_20250825",
        "name": "code_execution"
    }]
)
```

**Download Generated Files:**
```python
file_id = None
for block in response.content:
    if block.type == 'tool_use' and block.name == 'code_execution':
        for result_block in block.content:
            if hasattr(result_block, 'file_id'):
                file_id = result_block.file_id

if file_id:
    file_content = client.beta.files.download(
        file_id=file_id,
        betas=["files-api-2025-04-14"]
    )
    with open("output.pptx", "wb") as f:
        file_content.write_to_file(f.name)
```

---

## Testing & Debugging

### Evaluation-Driven Development

**Build Evaluations First:** Create test scenarios before documentation

```python
# evaluations/test_pdf_extraction.py
test_cases = [
    {
        "input": "sample.pdf",
        "expected_output": {"pages": 5, "tables": 2},
        "description": "Multi-page PDF with tables"
    },
    {
        "input": "corrupted.pdf",
        "expected_error": "FileCorrupted",
        "description": "Handle corrupted files gracefully"
    }
]
```

### Iterative Development with Claude

1. **Develop with one Claude instance:** Write skill with Claude's help
2. **Test with fresh Claude instance:** Observe how it uses the skill
3. **Refine based on behavior:** Adjust structure and instructions

### Test Across Models

Validate with different Claude models:
- **Haiku**: Fast, basic tasks
- **Sonnet**: Balanced performance
- **Opus**: Complex reasoning

### Observe Navigation Patterns

Monitor how Claude accesses your skill structure:
- Which files does it read first?
- Does it find information easily?
- Are references intuitive?

### Activation Testing

```bash
# Test queries that should trigger the skill
"Extract text from report.pdf"
"Combine these three PDFs"
"Fill out this PDF form"

# Test queries that should NOT trigger
"What's the weather?"
"Explain recursion"
```

---

## Sharing Skills

### Claude Code: Project-Level (`.claude/skills/`)

For team collaboration via git:

```bash
# Create skill in project
mkdir -p .claude/skills/processing-pdfs
cat > .claude/skills/processing-pdfs/SKILL.md << 'EOF'
---
name: processing-pdfs
description: Extracts text and tables from PDFs. Use for PDF tasks.
---
# Processing PDFs
...
EOF

# Commit to git
git add .claude/skills/
git commit -m "Add PDF processing skill"
git push

# Team members get skill on next pull
git pull
```

### Claude.ai: Upload as Zip

1. Zip skill directory
2. Upload to Claude.ai
3. Skill available for individual user

### Claude API: Workspace-Wide

Skills registered via API are available workspace-wide.

### Sharing Scope

- **API**: Workspace-wide
- **Claude Code**: Project-level (via git)
- **Claude.ai**: Individual user
- **Skills don't sync** between platforms

---

## Examples

### Example 1: PDF Processor (Progressive Disclosure)

```
.claude/skills/processing-pdfs/
├── SKILL.md              # Brief overview, quick start
├── reference/
│   ├── extraction.md     # Detailed extraction guide
│   ├── merging.md        # Detailed merging guide
│   └── forms.md          # Form-filling guide
├── scripts/
│   ├── extract.py        # Executable extraction
│   └── merge.sh          # Executable merging
└── templates/
    └── report.md         # Output template
```

**SKILL.md (Level 1 & 2):**
```markdown
---
name: processing-pdfs
description: |
  Extracts text and tables from PDFs, fills forms, merges documents.
  Use when working with PDF files, document extraction, or combining
  multiple PDFs. Handles multi-page documents with embedded tables.
---

# Processing PDFs

Process PDF documents: extract content, merge files, fill forms.

## Quick Start

**Extract text:**
\`\`\`bash
python scripts/extract.py input.pdf
\`\`\`

**Merge PDFs:**
\`\`\`bash
bash scripts/merge.sh file1.pdf file2.pdf output.pdf
\`\`\`

## Detailed Guidance

- **Text/table extraction:** See reference/extraction.md
- **Merging PDFs:** See reference/merging.md
- **Form filling:** See reference/forms.md

## When to Use

- User provides PDF file to process
- User asks to extract, merge, or fill PDFs
- User needs tables from PDF documents

## Output Format

Use templates/report.md for consistent formatting.
```

**reference/extraction.md (Level 3):**
```markdown
# PDF Extraction Reference

## Text Extraction

Uses pdfplumber for high-quality text extraction:

\`\`\`python
import pdfplumber

with pdfplumber.open(path) as pdf:
    for i, page in enumerate(pdf.pages, 1):
        text = page.extract_text()
        print(f"# Page {i}\n\n{text}\n")
\`\`\`

## Table Extraction

Extract tables with structure preservation:

\`\`\`python
tables = []
for page in pdf.pages:
    page_tables = page.extract_tables()
    for table in page_tables:
        tables.append({
            "page": page.page_number,
            "headers": table[0],
            "rows": table[1:]
        })
\`\`\`

## Error Handling

If pdfplumber fails, fallback to PyPDF2:

\`\`\`python
try:
    with pdfplumber.open(path) as pdf:
        # ... extraction
except Exception as e:
    # Fallback to PyPDF2
    import PyPDF2
    # ... alternative extraction
\`\`\`
```

**scripts/extract.py (Level 3 - Executable):**
```python
#!/usr/bin/env python3
"""PDF text and table extraction utility.

Runs without consuming context tokens.
"""
import sys
import json
import pdfplumber

def extract_pdf(path):
    """Extract text and tables from PDF."""
    try:
        with pdfplumber.open(path) as pdf:
            result = {
                "text": [],
                "tables": []
            }

            for i, page in enumerate(pdf.pages, 1):
                # Extract text
                text = page.extract_text()
                result["text"].append({
                    "page": i,
                    "content": text
                })

                # Extract tables
                tables = page.extract_tables()
                for table in tables:
                    result["tables"].append({
                        "page": i,
                        "headers": table[0],
                        "rows": table[1:]
                    })

            return result
    except FileNotFoundError:
        print(f"Error: File not found: {path}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: Extraction failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: extract.py <pdf_path>", file=sys.stderr)
        sys.exit(1)

    result = extract_pdf(sys.argv[1])
    print(json.dumps(result, indent=2))
```

### Example 2: Code Reviewer (Read-Only)

```
.claude/skills/reviewing-code/
└── SKILL.md
```

**SKILL.md:**
```markdown
---
name: reviewing-code
description: |
  Reviews code for security vulnerabilities, performance issues, and
  style violations. Activates when user asks for code review, security
  audit, or mentions improving code quality. Provides detailed reports
  with line numbers and severity ratings.
---

# Reviewing Code

Read-only code review with security, performance, and style analysis.

## Review Checklist

### Security
- Hardcoded credentials or API keys
- Input validation on user inputs
- SQL injection prevention
- XSS prevention
- CSRF protection
- Secure authentication/authorization

### Performance
- N+1 query patterns
- Algorithm efficiency
- Caching opportunities
- Lazy loading
- Database indexing

### Style
- Naming conventions
- Error handling
- Code duplication (DRY)
- Function size and focus
- Comment quality
- Type safety

## Output Format

\`\`\`markdown
# Code Review Report

## Summary
- Files reviewed: X
- Issues found: Y
- Critical: Z

## Issues

### Security: SQL Injection Risk (Critical)
**File:** database.py:42
**Issue:** User input directly interpolated into query
**Fix:** Use parameterized queries

### Performance: N+1 Query (High)
**File:** api.py:78
**Issue:** Loop executes separate query per iteration
**Fix:** Use join or batch loading

## Recommendations
1. Add input validation middleware
2. Implement query result caching
3. Add type hints throughout
\`\`\`
```

### Example 3: API Integrator (Multi-Step Workflow)

```markdown
---
name: integrating-apis
description: |
  Builds complete API integrations from documentation: creates typed
  client, implements authentication, handles errors, writes tests.
  Use when user wants to integrate with external API or build API wrapper.
---

# Integrating APIs

Builds production-ready API clients from documentation.

## Workflow Checklist

1. [ ] Gather requirements (API docs, auth method, language)
2. [ ] Analyze API (endpoints, schemas, rate limits)
3. [ ] Generate client (base class, auth, methods, types)
4. [ ] Add tests (unit, integration, error scenarios)
5. [ ] Generate documentation (usage, auth setup, examples)

## Step 1: Gather Requirements

Ask user for:
- API documentation URL or OpenAPI spec
- Authentication method (API key, OAuth, JWT)
- Preferred language/framework
- Required endpoints

## Step 2: Analyze API

Fetch docs and extract:
- Base URL
- Available endpoints
- Request/response schemas
- Authentication requirements
- Rate limits

## Step 3: Generate Client

Create base client class:

**TypeScript:**
\`\`\`typescript
export class APIClient {
  constructor(private apiKey: string) {}

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(\`\${BASE_URL}\${endpoint}\`, {
      ...options,
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
    if (!response.ok) throw new APIError(response);
    return response.json();
  }
}
\`\`\`

## Step 4: Add Tests

Create test suite with mocked responses and error scenarios.

## Step 5: Documentation

Generate README with installation, auth setup, and usage examples.
```

---

## Limitations

### Network Access

❌ **Skills cannot make external API calls**

Skills run in isolated VM without network access. Use bash and filesystem operations only.

### Package Installation

❌ **Cannot install packages at runtime**

Only pre-installed packages available. Check package availability before using.

### Cross-Surface Isolation

❌ **Skills don't sync between platforms**

Skills created for Claude.ai don't automatically appear in Claude Code or API.

### Sharing Scope

- **API skills**: Workspace-wide
- **Claude.ai skills**: Individual user only
- **Claude Code skills**: Project-level (via git)

### Security Risks

⚠️ **Only use skills from trusted sources**

Malicious skills can:
- Direct Claude to execute harmful operations
- Access sensitive data via filesystem
- Leak information through tool usage

---

## Quality Checklist

Before finalizing a skill:

- [ ] SKILL.md under 500 lines
- [ ] Description is specific with key terms and triggers (third person)
- [ ] Name uses gerund form (`processing-pdfs`, not `pdf-processor`)
- [ ] Progressive disclosure: SKILL.md → reference files → scripts
- [ ] No nested references (max 1 level deep)
- [ ] Long files (>100 lines) have table of contents
- [ ] Consistent terminology throughout
- [ ] Templates and examples provided
- [ ] Scripts handle errors explicitly (solve, don't delegate)
- [ ] No magic numbers (all values justified)
- [ ] Forward slashes in paths (not backslashes)
- [ ] No time-sensitive information
- [ ] Three evaluation scenarios created
- [ ] Tested with Haiku, Sonnet, and Opus
- [ ] Validation loops for critical operations

---

## Skill Template

```markdown
---
name: doing-something
description: |
  What this skill does in third person. Include key trigger terms
  and specific use cases. Mention when user should expect this to
  activate (max 1024 characters).
---

# Doing Something

Brief overview (1-2 sentences).

## Quick Start

\`\`\`bash
# Common usage command
python scripts/main.py input.txt
\`\`\`

## Detailed Guidance

For advanced usage: see reference/advanced.md
For troubleshooting: see reference/troubleshooting.md

## When to Use

- User asks for [specific task]
- User mentions [key terms]
- User provides [file type or context]

## Output Format

Use templates/output.md for consistent formatting.

## Error Handling

- If [error condition]: [explicit resolution]
- If [another condition]: [alternative approach]
```

---

## Resources

### Documentation
- [Agent Skills Overview](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
- [Agent Skills Quickstart](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/quickstart)
- [Agent Skills Best Practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)
- [Claude API Reference](https://docs.anthropic.com/en/api)

### Skill Ideas (Gerund Form)
- `updating-dependencies` - Safely update package versions
- `generating-migrations` - Create database migrations
- `building-components` - Create React/Vue components
- `generating-tests` - Auto-generate unit tests
- `writing-documentation` - Generate docs from code
- `scanning-security` - Scan for vulnerabilities
- `profiling-performance` - Analyze code performance
- `refactoring-code` - Suggest refactoring opportunities
- `analyzing-spreadsheets` - Process Excel/CSV data
- `validating-json` - Validate and format JSON

---

*Last updated: 2025-10-24*
*Based on official Anthropic Agent Skills documentation*
