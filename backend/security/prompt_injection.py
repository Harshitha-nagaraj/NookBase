import re
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class InjectionPattern:
    id: str
    name: str
    category: str  # DIRECT_INSTRUCTION_OVERRIDE, ROLE_MANIPULATION, PROMPT_EXTRACTION, PRIORITY_MANIPULATION, TOOL_MANIPULATION, DATA_EXFILTRATION
    pattern: str
    severity: str  # "HIGH", "MEDIUM", "LOW"
    description: str
    explanation: str

class PromptInjectionDetector:
    """
    Deterministic prompt-injection detector for analyzing retrieved RAG document chunks.
    Identifies common prompt-injection patterns, role hijacking, exfiltration instructions,
    and priority overrides, surfacing security risk diagnostics without executing untrusted text.
    """

    PATTERNS: List[InjectionPattern] = [
        # A. DIRECT INSTRUCTION OVERRIDE
        InjectionPattern(
            id="ignore_instructions",
            name="Ignore Previous Instructions",
            category="DIRECT_INSTRUCTION_OVERRIDE",
            pattern=r"ignore\s+(all\s+)?(previous|prior|above|system)\s+(instructions|directives|rules|prompts|guidelines)",
            severity="HIGH",
            description="Attempts to instruct the model to disregard preceding system guidelines.",
            explanation="The retrieved document contains an instruction attempting to override previously established instructions."
        ),
        InjectionPattern(
            id="disregard_instructions",
            name="Disregard System Prompt / Instructions",
            category="DIRECT_INSTRUCTION_OVERRIDE",
            pattern=r"disregard\s+(all\s+)?(the\s+)?(previous|prior|above|system)\s+(instructions|directives|rules|prompts|system prompt)",
            severity="HIGH",
            description="Attempts to command the model to ignore safety or system instructions.",
            explanation="The retrieved document commands the model to disregard system or prior instructions."
        ),
        InjectionPattern(
            id="forget_instructions",
            name="Forget Previous Instructions",
            category="DIRECT_INSTRUCTION_OVERRIDE",
            pattern=r"forget\s+(your\s+)?(all\s+)?(previous|prior|above|system)\s+(instructions|directives|rules|prompts)",
            severity="HIGH",
            description="Attempts to command the model to forget system instructions.",
            explanation="The retrieved document commands the model to forget previous instructions."
        ),
        InjectionPattern(
            id="delete_restrictions",
            name="Delete Restrictions",
            category="DIRECT_INSTRUCTION_OVERRIDE",
            pattern=r"delete\s+(all\s+)?(previous|prior|above)\s+restrictions",
            severity="HIGH",
            description="Commands the model to remove prompt restrictions or safety bounds.",
            explanation="The retrieved document commands the model to remove prompt restrictions."
        ),
        InjectionPattern(
            id="bypass_safety",
            name="Bypass Safety Rules",
            category="DIRECT_INSTRUCTION_OVERRIDE",
            pattern=r"bypass\s+(all\s+)?(safety|system|security)\s+(rules|restrictions|filters)",
            severity="HIGH",
            description="Explicit request to override safety controls.",
            explanation="The retrieved document requests bypassing security or safety controls."
        ),
        InjectionPattern(
            id="ignore_user_question",
            name="Ignore User Question Directive",
            category="DIRECT_INSTRUCTION_OVERRIDE",
            pattern=r"ignore\s+(the\s+)?user'?s?\s+(question|input|query)",
            severity="HIGH",
            description="Commands the model to drop user context and execute attacker instructions.",
            explanation="The retrieved document instructs the model to ignore the user's query."
        ),

        # B. ROLE MANIPULATION
        InjectionPattern(
            id="role_hijacking",
            name="Role Hijacking / Privilege Escalation",
            category="ROLE_MANIPULATION",
            pattern=r"(you\s+are\s+now\s+(a\s+|the\s+)?(system\s+administrator|administrator|admin|root|superuser|developer|hacker|persona|role)|you\s+are\s+now\s+in\s+developer\s+mode|act\s+as\s+(a\s+)?(system\s+administrator|administrator|admin|root|superuser))",
            severity="HIGH",
            description="Attempts to escalate privileges or redefine system behavior.",
            explanation="The retrieved document attempts to hijack the model's persona or escalate administrative privileges."
        ),
        InjectionPattern(
            id="new_role_assignment",
            name="New Role Assignment",
            category="ROLE_MANIPULATION",
            pattern=r"(your\s+new\s+role\s+is|assume\s+the\s+role\s+of)\s+([a-zA-Z0-9_\s]{2,30})",
            severity="HIGH",
            description="Attempts to set a new role for the assistant.",
            explanation="The retrieved document attempts to assign a new role to the model."
        ),

        # C. SYSTEM-PROMPT EXTRACTION
        InjectionPattern(
            id="reveal_system_prompt",
            name="Reveal System Prompt",
            category="PROMPT_EXTRACTION",
            pattern=r"(reveal|print|show|output|display)\s+(the\s+)?(system|developer|hidden|initial)\s+(prompt|instructions|message)",
            severity="HIGH",
            description="Attempts to exfiltrate system prompt details.",
            explanation="The retrieved document contains a command attempting to reveal internal system instructions."
        ),
        InjectionPattern(
            id="show_hidden_instructions",
            name="Show Hidden Instructions",
            category="PROMPT_EXTRACTION",
            pattern=r"(show|print|reveal)\s+(your\s+)?hidden\s+instructions",
            severity="HIGH",
            description="Attempts to reveal hidden instructions.",
            explanation="The retrieved document requests displaying hidden system instructions."
        ),
        InjectionPattern(
            id="print_system_message",
            name="Print System Message",
            category="PROMPT_EXTRACTION",
            pattern=r"print\s+(out\s+)?(your\s+)?system\s+message",
            severity="HIGH",
            description="Attempts to extract system message text.",
            explanation="The retrieved document commands printing out the internal system message."
        ),

        # D. INSTRUCTION PRIORITY MANIPULATION
        InjectionPattern(
            id="higher_priority_instructions",
            name="Higher Priority Instruction Claim",
            category="PRIORITY_MANIPULATION",
            pattern=r"(these|the\s+following)\s+instructions\s+have\s+higher\s+priority",
            severity="HIGH",
            description="Claims higher instruction priority over existing system context.",
            explanation="The retrieved document attempts to assert higher priority over system context."
        ),
        InjectionPattern(
            id="system_header_impersonation",
            name="System Header Impersonation",
            category="PRIORITY_MANIPULATION",
            pattern=r"(important\s+system\s+message\s*:|\[system\s+directive\]|admin\s+override\s*:)",
            severity="HIGH",
            description="Impersonates authoritative system/admin channels.",
            explanation="The retrieved document uses system/admin headers to impersonate core instructions."
        ),
        InjectionPattern(
            id="system_instruction_header",
            name="System / Developer Instruction Header",
            category="PRIORITY_MANIPULATION",
            pattern=r"(system\s+instruction\s*:|developer\s+message\s*:)",
            severity="HIGH",
            description="Prefixed with system or developer instruction headers.",
            explanation="The retrieved document introduces mock system or developer instruction headers."
        ),
        InjectionPattern(
            id="override_previous_rules",
            name="Override Rules Directive",
            category="PRIORITY_MANIPULATION",
            pattern=r"override\s+(the\s+)?(previous|prior|above|system)\s+rules",
            severity="HIGH",
            description="Explicit request to override established system rules.",
            explanation="The retrieved document instructs the model to override previous rules."
        ),
        InjectionPattern(
            id="follow_instead_directive",
            name="Follow Alternate Instructions",
            category="PRIORITY_MANIPULATION",
            pattern=r"follow\s+these\s+instructions\s+instead",
            severity="HIGH",
            description="Attempts to redirect execution control away from the user query.",
            explanation="The retrieved document instructs the model to follow alternate instructions instead."
        ),

        # E. TOOL / ACTION MANIPULATION
        InjectionPattern(
            id="tool_execution",
            name="Tool / Command Execution Directive",
            category="TOOL_MANIPULATION",
            pattern=r"(call\s+this\s+tool|execute\s+this\s+command|run\s+this\s+command|execute\s+this\s+code)",
            severity="HIGH",
            description="Attempts to command the model to invoke tools or execute commands.",
            explanation="The retrieved document commands the system to execute an unverified tool or shell command."
        ),
        InjectionPattern(
            id="send_info_to_endpoint",
            name="Send Info To Destination",
            category="TOOL_MANIPULATION",
            pattern=r"send\s+this\s+information\s+to\s+",
            severity="HIGH",
            description="Instructs system to transmit information to an external recipient.",
            explanation="The retrieved document commands sending system information to an external target."
        ),

        # F. DATA EXFILTRATION
        InjectionPattern(
            id="exfiltrate_user_info",
            name="Exfiltrate User Information",
            category="DATA_EXFILTRATION",
            pattern=r"send\s+(the\s+)?user'?s?\s+(information|data|credentials|details)",
            severity="HIGH",
            description="Attempts to exfiltrate user data or session details.",
            explanation="The retrieved document commands sending confidential user details."
        ),
        InjectionPattern(
            id="reveal_confidential_info",
            name="Reveal Confidential Information",
            category="DATA_EXFILTRATION",
            pattern=r"reveal\s+confidential\s+information",
            severity="HIGH",
            description="Requests disclosure of confidential information.",
            explanation="The retrieved document requests revealing confidential information."
        ),
        InjectionPattern(
            id="return_private_data",
            name="Return Private Data",
            category="DATA_EXFILTRATION",
            pattern=r"return\s+private\s+data",
            severity="HIGH",
            description="Requests returning private or restricted data.",
            explanation="The retrieved document instructs returning private data."
        ),
        InjectionPattern(
            id="transmit_secret",
            name="Transmit Secret",
            category="DATA_EXFILTRATION",
            pattern=r"transmit\s+the\s+secret",
            severity="HIGH",
            description="Requests transmission of secret keys or credentials.",
            explanation="The retrieved document commands transmitting secret tokens or credentials."
        )
    ]

    def analyze_chunk(self, text: str, chunk_id: str = "unknown", source: str = "unknown") -> Dict[str, Any]:
        matched_patterns = []
        findings = []
        has_high = False
        has_medium = False
        has_low = False

        for pdef in self.PATTERNS:
            match = re.search(pdef.pattern, text, re.IGNORECASE)
            if match:
                matched_patterns.append(pdef.id)
                finding = {
                    "category": pdef.category,
                    "severity": pdef.severity,
                    "matched_text": match.group(0),
                    "source": source,
                    "chunk_id": chunk_id,
                    "explanation": pdef.explanation
                }
                findings.append(finding)
                if pdef.severity == "HIGH":
                    has_high = True
                elif pdef.severity == "MEDIUM":
                    has_medium = True
                elif pdef.severity == "LOW":
                    has_low = True

        if has_high:
            risk_level = "HIGH"
            is_suspicious = True
            reason = f"Chunk contains high-risk prompt injection patterns ({', '.join(matched_patterns)})."
        elif has_medium:
            risk_level = "MEDIUM"
            is_suspicious = True
            reason = f"Chunk contains medium-risk system impersonation patterns ({', '.join(matched_patterns)})."
        elif has_low:
            risk_level = "LOW"
            is_suspicious = True
            reason = f"Chunk contains low-risk prompt signals ({', '.join(matched_patterns)})."
        else:
            risk_level = "NONE"
            is_suspicious = False
            reason = "No suspicious prompt injection patterns detected."

        return {
            "chunk_id": chunk_id,
            "source": source,
            "is_suspicious": is_suspicious,
            "risk_level": risk_level,
            "matched_patterns": matched_patterns,
            "findings": findings,
            "reason": reason,
            "text_snippet": text[:100] + "..." if len(text) > 100 else text
        }

    def analyze_retrieved_chunks(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        findings = []
        affected_chunk_ids = set()
        categories_detected_set = set()
        matched_pattern_ids = set()
        chunk_details = []

        scanned_count = len(chunks)

        for idx, chunk in enumerate(chunks):
            cid = chunk.get("chunk_id", f"chunk_{idx+1}")
            source = chunk.get("source", "unknown")
            text = chunk.get("text", "")

            chunk_res = self.analyze_chunk(text, chunk_id=cid, source=source)
            chunk_details.append(chunk_res)

            if chunk_res["is_suspicious"]:
                affected_chunk_ids.add(cid)
                for f in chunk_res.get("findings", []):
                    findings.append(f)
                    categories_detected_set.add(f["category"])
                for pat in chunk_res.get("matched_patterns", []):
                    matched_pattern_ids.add(pat)

        affected_count = len(affected_chunk_ids)
        safe_count = scanned_count - affected_count
        categories_detected = sorted(list(categories_detected_set))

        has_high = any(f["severity"] == "HIGH" for f in findings)
        has_medium = any(f["severity"] == "MEDIUM" for f in findings)
        has_low = any(f["severity"] == "LOW" for f in findings)

        if has_high:
            risk_level = "HIGH"
            status = "HIGH_RISK"
        elif has_medium:
            risk_level = "MEDIUM"
            status = "SUSPICIOUS"
        elif has_low:
            risk_level = "LOW"
            status = "LOW_RISK"
        else:
            risk_level = "NONE"
            status = "SECURE"

        if len(categories_detected) > 1:
            recommendation = "Review retrieved content as untrusted input and enforce instruction boundaries before generation or tool execution."
        elif "DIRECT_INSTRUCTION_OVERRIDE" in categories_detected or "ROLE_MANIPULATION" in categories_detected or "PRIORITY_MANIPULATION" in categories_detected:
            recommendation = "Treat retrieved document content as untrusted data and keep application instructions outside retrieved context."
        elif "TOOL_MANIPULATION" in categories_detected:
            recommendation = "Do not allow retrieved text to directly invoke tools or privileged actions."
        elif "DATA_EXFILTRATION" in categories_detected or "PROMPT_EXTRACTION" in categories_detected:
            recommendation = "Do not allow retrieved content to request or expose secrets, credentials, or private data."
        else:
            recommendation = "Treat retrieved document content as untrusted data and prevent it from overriding system instructions."

        if risk_level == "HIGH":
            explanation = (
                f"Detected {affected_count} chunk(s) with high-severity prompt injection patterns "
                f"({', '.join(sorted(categories_detected))}). Retrieved text must be treated as untrusted data."
            )
        elif risk_level == "MEDIUM":
            explanation = (
                f"Detected {affected_count} chunk(s) with suspicious prompt manipulation patterns "
                f"({', '.join(sorted(categories_detected))}). Review retrieved context."
            )
        elif risk_level == "LOW":
            explanation = (
                f"Detected {affected_count} chunk(s) with low-severity prompt signals."
            )
        else:
            explanation = "No prompt injection patterns detected in retrieved context."

        all_matched_patterns = sorted(list(matched_pattern_ids.union(categories_detected_set)))

        return {
            "risk_level": risk_level,
            "finding_count": len(findings),
            "categories_detected": categories_detected,
            "findings": findings,
            "retrieved_chunks_scanned": scanned_count,
            "safe_chunks": safe_count,
            "affected_chunks": affected_count,
            "recommendation": recommendation,
            "status": status,
            "suspicious_chunks_count": affected_count,
            "matched_patterns": all_matched_patterns,
            "explanation": explanation,
            "chunk_details": chunk_details
        }

    def analyze_user_query(self, query: str) -> Dict[str, Any]:
        matched_patterns = []
        findings = []
        has_high = False
        has_medium = False
        has_low = False

        for pdef in self.PATTERNS:
            match = re.search(pdef.pattern, query, re.IGNORECASE)
            if match:
                matched_patterns.append(pdef.id)
                finding = {
                    "category": pdef.category,
                    "severity": pdef.severity,
                    "matched_text": match.group(0),
                    "source": "user_query",
                    "chunk_id": "query",
                    "explanation": pdef.explanation
                }
                findings.append(finding)
                if pdef.severity == "HIGH":
                    has_high = True
                elif pdef.severity == "MEDIUM":
                    has_medium = True
                elif pdef.severity == "LOW":
                    has_low = True

        if has_high:
            risk_level = "HIGH"
            status = "HIGH_RISK"
            reason = "User query contains high-risk prompt injection attempt."
        elif has_medium:
            risk_level = "MEDIUM"
            status = "SUSPICIOUS"
            reason = "User query contains medium-risk prompt manipulation signals."
        elif has_low:
            risk_level = "LOW"
            status = "LOW_RISK"
            reason = "User query contains low-risk prompt keywords."
        else:
            risk_level = "NONE"
            status = "SECURE"
            reason = "User query is clean and safe."

        return {
            "risk_level": risk_level,
            "status": status,
            "matched_patterns": matched_patterns,
            "findings": findings,
            "reason": reason,
            "is_prompt_injection": has_high or has_medium
        }

    def analyze_full_pipeline(self, query: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        query_res = self.analyze_user_query(query)
        context_res = self.analyze_retrieved_chunks(chunks)

        all_findings = query_res["findings"] + context_res["findings"]
        all_categories = sorted(list(set([f["category"] for f in all_findings])))
        all_matched = sorted(list(set(query_res.get("matched_patterns", []) + context_res.get("matched_patterns", []))))

        if query_res["risk_level"] == "HIGH":
            overall_status = "HIGH_RISK_QUERY"
            overall_risk = "HIGH"
            explanation = "User query contains direct prompt injection instructions."
            recommendation = "Reject or sanitize malicious user input before pipeline processing."
        elif context_res["risk_level"] == "HIGH":
            overall_status = "UNTRUSTED_CONTEXT"
            overall_risk = "HIGH"
            explanation = f"User query is safe, but retrieved document context contains {context_res['affected_chunks']} chunk(s) with suspicious prompt instructions."
            recommendation = "Treat retrieved document content as untrusted context data and enforce prompt instruction boundaries."
        elif context_res["risk_level"] in ["MEDIUM", "LOW"]:
            overall_status = "SUSPICIOUS_CONTEXT"
            overall_risk = context_res["risk_level"]
            explanation = "User query is safe, but retrieved context contains low/medium risk signals."
            recommendation = context_res["recommendation"]
        else:
            overall_status = "SECURE"
            overall_risk = "NONE"
            explanation = "No prompt injection patterns detected in user query or retrieved context."
            recommendation = "System context and user input are safe."

        return {
            "user_query_status": query_res["status"],
            "user_query_risk": query_res["risk_level"],
            "retrieved_context_status": context_res["status"],
            "retrieved_context_risk": context_res["risk_level"],
            "risk_level": overall_risk,
            "status": overall_status,
            "finding_count": len(all_findings),
            "categories_detected": all_categories,
            "findings": all_findings,
            "retrieved_chunks_scanned": context_res["retrieved_chunks_scanned"],
            "safe_chunks": context_res["safe_chunks"],
            "affected_chunks": context_res["affected_chunks"],
            "suspicious_chunks_count": context_res["affected_chunks"],
            "matched_patterns": all_matched,
            "recommendation": recommendation,
            "explanation": explanation,
            "chunk_details": context_res["chunk_details"]
        }
