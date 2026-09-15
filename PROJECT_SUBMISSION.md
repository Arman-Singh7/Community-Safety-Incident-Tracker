# 1M1B AI for Sustainability Virtual Internship
## Final Project Submission

> Replace the bracketed personal details and reflection prompts before submitting.

## Project Description

### Title

**Nagrik Suraksha: AI-Assisted Community Safety and Incident Tracker**

### Student and Institution

- **Student:** [Your full name]
- **College:** [Your college name]
- **Internship:** 1M1B AI for Sustainability Virtual Internship, in collaboration with IBM SkillsBuild and AICTE

### SDG Alignment

**Primary SDG: SDG 11 - Sustainable Cities and Communities**

The project supports safer, more inclusive, and resilient communities by helping authorized community members report incidents, share verified information, coordinate responses, and maintain a transparent record of actions.

**Secondary alignment:** SDG 16 - Peace, Justice and Strong Institutions, through role-based access, audit logs, controlled visibility, and accountable incident handling.

## Problem Statement

Community safety information is often scattered across informal messages, phone calls, and social media. This makes it difficult for residents and local coordinators to distinguish urgent incidents from routine reports, find patterns, communicate with the right people, and preserve an accountable record of decisions.

**How might we use responsible AI and a secure digital reporting workflow to help communities organize, prioritize, and communicate safety incidents so that local response becomes faster, more transparent, and more sustainable?**

## Who Is Affected?

- Residents who need a clear way to report and follow up on incidents
- Community volunteers and analysts who review reports and coordinate action
- Local administrators who need controlled access, reliable records, and auditability
- Vulnerable community members who can be harmed by delayed, inaccurate, or publicly exposed information

## Current Prototype

The working web prototype provides:

- Secure login with admin, analyst, and viewer roles
- Role-based access to public and internal incidents
- Incident creation, editing, filtering, and status tracking
- Optional image/file attachments for incident evidence
- Live alert ticker using Server-Sent Events
- Internal direct and broadcast messaging
- Audit logs for important actions
- JSON/CSV export and administrator-controlled import
- Responsive dashboard with light and dark themes
- Explainable AI-assisted triage suggestions for analysts, including priority, signals, confidence, and missing information

The prototype uses Node.js, Express, SQLite, JWT authentication, bcrypt password hashing, Multer for uploads, and vanilla HTML/CSS/JavaScript. It can be run locally with `npm install` followed by `npm start`.

## AI Solution Overview

The prototype now includes a local, explainable **AI-assisted incident triage workflow**. It uses transparent keyword and severity signals to demonstrate the human-in-the-loop interaction without sending incident data to an external service. A production version could replace the local classifier with a validated language model or retrieval workflow after privacy and accuracy testing. AI supports trained analysts; it does not make final decisions or replace emergency services.

### 1. Report understanding

When an authorized analyst reviews a report, an AI model can extract structured fields from free-text notes and attachments:

- Incident category
- Location references, only when the reporter has permission to share them
- Time references
- Potential urgency indicators
- Missing information that should be clarified

The extracted fields are shown as suggestions for human review before they are saved.

### 2. Priority recommendation

The system can combine the reviewed incident fields with transparent rules and historical patterns to recommend a review priority: low, medium, high, or critical. The recommendation includes the factors that influenced it. It is a decision-support signal, not an automatic emergency classification.

### 3. Pattern and trend summaries

For an authorized time range, AI can summarize recurring incident types, unresolved cases, and possible concentration by area or time period. Summaries should use aggregated data and should not identify individuals.

### 4. Grounded safety guidance

A retrieval-augmented generation workflow can answer questions using approved local resources such as community response procedures, reporting contacts, and public safety guidance. The assistant must cite the source document or return that it cannot find a verified answer. It must direct emergencies to official emergency services rather than attempting to handle them.

## Example AI Workflow

```text
Incident report and optional attachment
        |
        v
Permission check and removal of unnecessary personal data
        |
        v
AI extraction of category, urgency signals, and missing details
        |
        v
Analyst reviews, corrects, or rejects suggestions
        |
        v
Transparent priority recommendation with explanation
        |
        v
Authorized alert, assignment, status update, and audit entry
        |
        v
Aggregated trend summary for planning and prevention
```

## Example Prompt Workflow

**System instruction:**

> You assist an authorized community safety analyst. Extract only information present in the report. Do not identify, accuse, or infer protected characteristics. Do not invent locations, causes, suspects, or emergency instructions. Return valid JSON with `category`, `urgency_signals`, `missing_information`, `suggested_priority`, `reasoning`, and `confidence`. The priority is only a recommendation for analyst review.

**User input:**

> Reported near the community hall at about 8 pm. A parked bicycle was damaged and a broken lock was found. No person was identified. The reporter has not provided a photograph.

**Illustrative output:**

```json
{
  "category": "vandalism",
  "urgency_signals": ["property damage", "recent event"],
  "missing_information": ["exact date", "more precise location", "optional evidence"],
  "suggested_priority": "medium",
  "reasoning": "The report describes property damage but no immediate threat or identified person.",
  "confidence": "moderate"
}
```

## AI Elements and Tools

- Prompt engineering for structured extraction and safe responses
- Classification of authorized incident text using the local explainable triage prototype
- Optional future language-model summarization only after validation and privacy review
- Retrieval-augmented generation over approved community guidance documents
- Human-in-the-loop review before an AI suggestion affects a record or alert
- Existing prototype stack: Node.js, Express, SQLite, JWT, bcrypt, Multer, HTML, CSS, and JavaScript
- **Model/provider used for the final demonstration:** Local explainable triage rules; no external model or IBM BOB dependency

IBM BOB is not required for this project and is not claimed as a dependency.

## Responsible AI Considerations

- **Human oversight:** AI suggestions require analyst review. The system does not dispatch emergency services, accuse people, or make enforcement decisions.
- **Fairness:** Evaluate extraction and priority suggestions across different neighborhoods, writing styles, languages, and levels of digital access. Avoid using demographic or other sensitive attributes as a proxy for risk.
- **Transparency:** Show the input factors, confidence, source documents, and reviewer decision behind each suggestion.
- **Privacy:** Collect only necessary information, restrict internal incidents by role, avoid publishing personal data, and define retention and deletion rules for attachments and reports.
- **Security:** Use strong secrets in deployment, least-privilege accounts, validated uploads, access-controlled exports, and audit logs. Demo credentials must not be used in production.
- **Reliability:** Handle uncertainty explicitly, allow correction, and provide a fallback manual workflow when the model is unavailable or the report is ambiguous.
- **Safety:** The interface should display official emergency contact guidance and clearly state that an AI assistant is not an emergency response service.

## Expected Impact

If implemented with a community partner, the solution could:

- Reduce the time required to organize incoming reports
- Help analysts identify unresolved or recurring issues earlier
- Improve coordination between residents, volunteers, and administrators
- Reduce duplicated reporting and fragmented communication
- Create a clearer record for accountability and prevention planning
- Support safer communities without requiring constant manual review of every report

Impact should be measured through pilot metrics such as report processing time, percentage of reports needing correction, time to acknowledge high-priority reports, unresolved case age, user accessibility feedback, and false-priority rates. No impact numbers are claimed until measured in a real pilot.

## Prototype or Demo Link

- **Repository:** [Paste your GitHub repository link]
- **Live demo:** [Paste deployed link, if available]
- **Demo video:** [Paste video link, if available]
- **Screenshots:** Use screenshots of login, incident reporting, filters, live alerts, audit logs, and the AI workflow output.

### Demo Steps

1. Run `npm install`.
2. Run `npm start`.
3. Open `http://localhost:3000`.
4. Sign in with a demo account from the README.
5. Demonstrate reporting, filtering, role restrictions, alerts, messaging, and audit logs.
6. Present the AI prompt and sample output as the proposed analyst-assistance workflow, clearly labelled as a recommendation layer unless it has been connected to a real model.

## Additional Information

I chose this problem because community safety depends not only on emergency response, but also on everyday information quality: whether a report is recorded, whether the right people see it, whether follow-up is visible, and whether the community can learn from recurring patterns. The project began as a practical full-stack system and was then mapped to sustainability through safer and more resilient communities.

The design also recognizes that technology can create harm if it exposes sensitive reports, treats an uncertain model output as fact, or amplifies bias. For that reason, access control, auditability, analyst review, privacy, and clear limitations are part of the solution rather than afterthoughts.

## Reflection Responses

### Which session, mentor interaction, or activity had the biggest impact on your learning journey, and why?

**Suggested response to personalize:**

> The activity that had the biggest impact on me was the session on connecting AI with real-world sustainability challenges. It helped me move beyond thinking of AI as only a coding tool and instead focus on the people affected, the data involved, and the risks of using automation. That perspective shaped my decision to build a community safety tracker with human review, transparent reasoning, and privacy safeguards.

### How has IBM SkillsBuild impacted your learning, skills, career, or personal growth?

**Suggested response to personalize:**

> IBM SkillsBuild helped me strengthen my understanding of AI, sustainability, responsible technology, and problem-solving. I learned to explain the purpose and limitations of a system, not just its technical implementation. The learning experience also improved my confidence in presenting a project, thinking about users, and connecting technical skills to a career focused on meaningful real-world impact.

### A little reflection about your life: what has been your biggest challenge, and how did you overcome it?

**Write this in your own voice. Suggested structure:**

> One of the biggest challenges in my life has been [challenge]. It affected me by [brief effect]. I worked through it by [specific actions, support, or habit]. The experience taught me [lesson], and I now apply that lesson by [how it influences your studies or work].

### What moments or achievements are you most proud of?

**Suggested response to personalize:**

> I am proud of completing a working full-stack project that addresses a real community problem and includes authentication, role-based access, incident management, live alerts, messaging, audit logs, and data portability. I am also proud of participating in the 1M1B AI for Sustainability internship because it challenged me to connect software development with sustainability, responsible AI, and measurable community impact.

## Submission Checklist

- [ ] Add your name and college
- [ ] Add the actual repository, demo, and video links
- [ ] Replace the personal reflection placeholders with truthful experiences
- [ ] Add screenshots or a short screen recording
- [ ] Label the AI workflow as implemented or proposed, whichever is accurate
- [ ] Add the actual model/provider only if you used one
- [ ] Verify that no real personal incident data, passwords, or private attachments appear in screenshots
- [ ] Export this document or adapt it into the required PPT/PDF format
