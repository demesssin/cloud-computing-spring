# PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Product Name:** "ProcureGuard" (Internal: Aibek's Assistant)
**Status:** Draft v1.0
**Owner:** Head of Cloud Transformation
**Target User:** "Aibek" (Procurement Specialist)

---

## 1. THE JOB TO BE DONE (JTBD)

**Core Job:**
"When I receive a new tender application from a vendor, I want to **instantly validate their technical documents against the requirements**, so that I can **reject bad applications immediately** without spending 4 hours manually reading 50 scanned pages, and avoid future audit fines."

---

## 2. PROBLEM & OPPORTUNITY

| The Problem | The Opportunity |
| :--- | :--- |
| **Manual OCR:** Specialists manually read unstructured PDFs/Scans. | **Auto-Extraction:** AI Vision models extract text/tables from scans. |
| **Complex Logic:** "Rules" are scattered across 10 different policy docs. | **Semantic Checking:** LLM compares extracted data vs. Policy Knowledge Base. |
| **Compliance Anxiety:** Fear of error causes paralysis and delays. | **Confidence Scoring:** AI flags "High Risk" items, letting humans focus only on the red flags. |

---

## 3. KEY FEATURES (MVP scope)

### F1: The "Smart Ingest"
*   **Requirement:** User drags-and-drops a folder of mixed vendor files (PDF, JPG, Docx).
*   **AI Action:** System classifies documents (e.g., "This is the ISO Cert," "This is the Tech Spec").
*   **Success Metric:** 95% classification accuracy.

### F2: The "Compliance Bot"
*   **Requirement:** System checks specific data points against the Tender Logic.
    *   *Check 1:* Does the "Certificate Date" > "Today"?
    *   *Check 2:* Does the "Manufacturer Name" match the "Authorized Dealer Letter"?
    *   *Check 3:* Does "Local Content %" calculation match the Samruk-Kazyna formula?
*   **AI Action:** LLM Reasoning chain to validate logic.

### F3: The "Risk Report"
*   **Requirement:** Output a 1-page summary for the Specialist.
*   **Output:**
    *   ✅ Green Light: "All critical docs present and valid."
    *   ❌ Red Flag: "Page 42: ST-KZ Certificate expired on 01.01.2025."
*   **UX:** Click the "Red Flag" to jump exactly to the highlighted snippet in the original PDF.

---

## 4. NON-FUNCTIONAL REQUIREMENTS

*   **Security:** Data must NOT leave Kazakhstan borders (Data Residency Law). Deployment: On-Premise or KTZ Private Cloud.
*   **Speed:** Analysis per vendor must handle < 60 seconds.
*   **Audit Trail:** Every AI decision must be logged ("Why did the AI say this was invalid?").

---

## 5. SUCCESS METRICS (KPIs)

1.  **Time Savings:** Reduce "Technical Compliance" phase from 5 days to 4 hours per tender.
2.  **Error Rate:** Catch 100% of expired certificates (vs 85% human baseline).
3.  **User Happiness:** Aibek stops working weekends.
