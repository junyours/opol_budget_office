import { FileText, ShieldCheck } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/src/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/src/components/ui/tabs";

const BRAND = "#111";

const TERMS_OF_USE = [
  { heading: "1. Acceptance of Terms", body: "By logging into the Municipal Budget Office (MBO) Annual Budget Preparation System of the Local Government Unit (LGU) of Opol, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Use and the accompanying Privacy Policy. If you do not agree, you must not access or use this System." },
  { heading: "2. Authorized Use", body: "This System is intended solely for use by authorized personnel of the LGU of Opol — including department heads, budget office staff, and other designated officials — for preparing, submitting, reviewing, and consolidating annual budget proposals and Local Expenditure Programs (LEP)." },
  { heading: "3. Account and Access", body: "Access is granted through a unique username and password issued or approved by the Municipal Budget Office. You are responsible for keeping your credentials confidential and for all activity under your account. Report any suspected unauthorized use to the Municipal Budget Office immediately." },
  { heading: "4. Ownership and Use of Submitted Data", body: "All budget proposals, allocations, and related data submitted through this System form part of the official records of the Municipal Budget Office and the LGU of Opol, and will be used exclusively for legitimate government purposes — budget planning, evaluation, consolidation, and reporting." },
  { heading: "5. Prohibited Conduct", body: "Users must not access data outside their authorized department, tamper with system security, submit false or misleading budget information, or use the System for any purpose other than official budget preparation." },
  { heading: "6. System Availability", body: "The Municipal Budget Office reserves the right to modify, suspend, or restrict access to the System at any time for maintenance, security, or administrative purposes, with or without prior notice." },
  { heading: "7. Amendments", body: "These Terms may be revised from time to time. Continued use of the System after such changes constitutes acceptance of the revised terms." },
  { heading: "8. Governing Law", body: "These Terms are governed by the applicable laws, rules, and regulations of the Republic of the Philippines, including relevant issuances of the Commission on Audit (COA) and the Department of Budget and Management (DBM), as applied to local government units." },
];

const PRIVACY_POLICY = [
  { heading: "1. Information We Collect", body: "The System collects only what is necessary for account access and budget processing: your assigned username and password, name, department/office, designated role, and the budget proposal data you submit (program/project details, cost estimates, allocations, and supporting figures). The System does not require or collect personal email addresses or mobile phone numbers." },
  { heading: "2. Purpose of Collection", body: "Login credentials are used solely to authenticate and identify authorized users. Budget proposal data submitted by departments is used by the Municipal Budget Office to review, consolidate, and prepare the LGU of Opol's Annual Budget Plan and Local Expenditure Program." },
  { heading: "3. Data Sharing", body: "Information entered in the System is accessible only to authorized Municipal Budget Office personnel and relevant approving officials of the LGU of Opol. Data is not sold, shared with third parties, or used outside official budget preparation and government reporting requirements." },
  { heading: "4. Data Storage and Security", body: "Reasonable administrative and technical measures protect submitted data from unauthorized access, alteration, or disclosure. Passwords are stored securely and are not visible to Municipal Budget Office staff." },
  { heading: "5. Data Retention", body: "Budget proposal records are retained in accordance with the LGU of Opol's records retention policies and applicable government auditing requirements (e.g., COA regulations)." },
  { heading: "6. Your Responsibilities", body: "Users must ensure the information and budget data they submit are accurate and complete. Requests to correct, update, or remove account information should be coursed through the Municipal Budget Office." },
  { heading: "7. Changes to This Policy", body: "This Privacy Policy may be updated periodically to reflect changes in data practices. Continued use of the System after updates constitutes acceptance of the revised policy." },
  { heading: "8. Contact", body: "For questions or concerns regarding this Privacy Policy or your data, please contact the Municipal Budget Office of the LGU of Opol directly." },
];

export type LegalTab = "terms" | "privacy";

interface LegalDialogProps {
  open: LegalTab | null;
  onOpenChange: (tab: LegalTab | null) => void;
}

function LegalSections({ sections }: { sections: typeof TERMS_OF_USE }) {
  return (
    <div className="space-y-5">
      {sections.map((section, i) => (
        <div key={section.heading}>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-[10px] font-bold tabular-nums flex-shrink-0 text-zinc-300">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="text-[13px] font-semibold text-zinc-800 leading-snug">
              {section.heading.replace(/^\d+\.\s*/, "")}
            </p>
          </div>
          <p className="text-[12.5px] text-zinc-500 leading-relaxed pl-[22px]">
            {section.body}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function LegalDialog({ open, onOpenChange }: LegalDialogProps) {
  return (
    <Dialog open={!!open} onOpenChange={(v) => !v && onOpenChange(null)}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <DialogHeader
          className="px-6 py-5 flex-row items-start gap-3 space-y-0"
          style={{ background: BRAND }}
        >
          <div
            className="flex-shrink-0 rounded-lg flex items-center justify-center"
            style={{ width: 34, height: 34, background: "rgba(255,255,255,0.12)" }}
          >
            {open === "terms" ? (
              <FileText className="w-4 h-4 text-white" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <DialogTitle className="text-white font-bold text-base leading-tight">
              {open === "terms" ? "Terms of Use" : "Privacy Policy"}
            </DialogTitle>
            <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
              Municipal Budget Office · Annual Budget Preparation System · LGU of Opol
            </p>
          </div>
        </DialogHeader>

        <Tabs value={open ?? "terms"} onValueChange={(v) => onOpenChange(v as LegalTab)}>
          <TabsList className="w-full justify-start rounded-none border-b bg-zinc-50 h-auto p-0 px-2">
            <TabsTrigger
              value="terms"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none data-[state=active]:bg-transparent px-4 py-2.5 text-xs font-semibold"
            >
              Terms of Use
            </TabsTrigger>
            <TabsTrigger
              value="privacy"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:shadow-none data-[state=active]:bg-transparent px-4 py-2.5 text-xs font-semibold"
            >
              Privacy Policy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="terms" className="px-6 py-5 max-h-[52vh] overflow-y-auto mt-0">
            <LegalSections sections={TERMS_OF_USE} />
          </TabsContent>
          <TabsContent value="privacy" className="px-6 py-5 max-h-[52vh] overflow-y-auto mt-0">
            <LegalSections sections={PRIVACY_POLICY} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t border-zinc-100 flex-row items-center justify-between gap-4 sm:justify-between">
          <p className="text-[11px] text-zinc-400 leading-snug hidden sm:block">
            Logging in constitutes acceptance of this {open === "terms" ? "Terms of Use" : "Privacy Policy"}.
          </p>
          <Button
            className="h-9 text-sm font-semibold px-5 flex-shrink-0"
            style={{ background: BRAND }}
            onClick={() => onOpenChange(null)}
          >
            I understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
