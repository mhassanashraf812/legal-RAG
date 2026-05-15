export interface LegalDocument {
  id: string;
  title: string;
  type: string;
  content: string;
  summary: string;
  keyTerms: string[];
}

export const legalKnowledgeBase: LegalDocument[] = [
  {
    id: "dataset_001",
    title: "CP 1092/2018 - Teaching Staff Induction Case",
    type: "Legal Judgment",
    content: "IN THE SUPREME COURT OF PAKISTAN (Appellate Jurisdiction). Civil Petition Nos. 1092 & 1093 of 2018. The petitioner, a civil servant (Teaching Staff), sought induction into the Secretariat Group and promotion based on 'Time Scale Formula' and 'Meritorious Service'.",
    summary: "The Supreme Court dismissed the petitions, ruling that horizontal movement into the Secretariat Group is limited to specific Occupational Groups. Time Scale Promotion is a policy benefit, not a vested right. Meritorious service promotion is an executive prerogative.",
    keyTerms: ["Civil Servants Act 1973", "Time Scale Promotion", "Secretariat Group", "Meritorious Service", "Deputation"]
  },
  {
    id: "dataset_002",
    title: "CP 1097-L/2020 - Jurisdiction Bar Case",
    type: "Legal Order",
    content: "Civil Petition No.1097-L of 2020. The Supreme Court set aside a Lahore High Court order regarding proforma promotion. Article 212 of the Constitution provides exclusive jurisdiction to Service Tribunals over terms and conditions of service.",
    summary: "Strict enforcement of Article 212. High Courts lack jurisdiction under Article 199 for matters falling within the Service Tribunal's domain (promotions, seniority, etc.). Eligibility vs Fitness distinction noted.",
    keyTerms: ["Article 212", "Article 199", "Service Tribunal", "Proforma Promotion", "Jurisdiction Bar"]
  },
  {
    id: "dataset_003",
    title: "CP 1165/2021 - ZTBL Fake Degree Case",
    type: "Legal Order",
    content: "Civil Petition No. 1165 of 2021. Employee of ZTBL charged with fake MBA degree. Supreme Court exercised Article 187 (Complete Justice) to set aside High Court directions that interfered with the inquiry's transparency.",
    summary: "Supreme Court prevents judicial interference in ongoing disciplinary inquiries. Fake degrees constitute severe misconduct. Article 187 used to ensure inquiry transparency.",
    keyTerms: ["Article 187", "Fake Degree", "Disciplinary Inquiry", "Complete Justice", "ZTBL"]
  },
  {
    id: "dataset_004",
    title: "CP 1276/2020 - PEEDA Act Vague Charges Case",
    type: "Legal Judgment",
    content: "Civil Petition No.1276 of 2020. Retired Education Officer's pension reduction set aside. Show cause notice under PEEDA Act 2006 was found to be vague, failing to satisfy natural justice.",
    summary: "Show cause notices must specify acts of omission/commission clearly. Vague charges violate natural justice and fair trial requirements under PEEDA Act 2006.",
    keyTerms: ["PEEDA Act 2006", "Show Cause Notice", "Natural Justice", "Fair Trial", "Vague Charges"]
  },
  {
    id: "dataset_005",
    title: "CA 3-K/2021 - Evidence in Embezzlement Case",
    type: "Legal Judgment",
    content: "Civil Appeal No.3-K of 2021. Federation's appeal dismissed. Department failed to produce witnesses or documentary evidence against a Pension Clerk accused of embezzlement.",
    summary: "In major penalty cases, the department bears the burden of proof. Trustworthy evidence is required; confession by another individual exonerates the accused if no other proof exists.",
    keyTerms: ["Burden of Proof", "Major Penalty", "Embezzlement", "Departmental Inquiry", "Standard of Proof"]
  }
];
