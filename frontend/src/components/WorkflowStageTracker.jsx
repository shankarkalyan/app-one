import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, Circle, Zap,
  Copy, Check, FileJson, Send, Shield, FileText, Database, CreditCard,
  Building, User, Search, Upload, Download, Lock, Unlock, AlertTriangle,
  Phone, Mail, Home, DollarSign, ClipboardCheck, Stamp, ArrowRight,
  MessageSquare, UserCheck, FileSearch, PenTool, Eye, ThumbsUp, ThumbsDown,
  Bell, RefreshCw, Calendar, Briefcase, Scale, FileCheck, Receipt, Key,
  Banknote, Award, Archive, Bot, Users, Maximize2, X, Loader2
} from 'lucide-react';

// API Details - describes what each API does with endpoint-specific purposes
const API_DETAILS = {
  'CaseOptimizer': {
    icon: Search,
    category: 'Analysis',
    color: '#8b5cf6',
    description: 'AI-powered case routing and optimization engine',
    endpoints: {
      '/analyze': {
        purpose: 'Analyzes loan characteristics (amount, type, property) to determine optimal processing path',
        action: 'Analyzing case for optimal workflow routing',
      },
      '/route': {
        purpose: 'Routes the application to appropriate processing queue based on risk profile and loan complexity',
        action: 'Routing case to processing queue',
      },
    },
    defaultPurpose: 'Determines the best workflow route based on loan characteristics and borrower profile',
  },
  'Eligibility': {
    icon: Shield,
    category: 'Verification',
    color: '#10b981',
    description: 'Loan assumption eligibility verification service',
    endpoints: {
      '/check': {
        purpose: 'Validates 6 eligibility criteria: loan assumability, due-on-sale clause, state eligibility, payment status, foreclosure status, and buyer creditworthiness',
        action: 'Running eligibility check against loan database',
      },
    },
    defaultPurpose: 'Checks if the existing loan can be legally assumed by the new borrower',
  },
  'EligibilityAPI': {
    icon: Shield,
    category: 'Verification',
    color: '#10b981',
    description: 'Loan assumption eligibility verification service',
    endpoints: {
      '/check': {
        purpose: 'Validates 6 eligibility criteria: loan assumability, due-on-sale clause, state eligibility, payment status, foreclosure status, and buyer creditworthiness',
        action: 'Running eligibility check against loan database',
      },
    },
    defaultPurpose: 'Checks if the existing loan can be legally assumed by the new borrower',
  },
  'DocuSign': {
    icon: Send,
    category: 'E-Signature',
    color: '#3b82f6',
    description: 'Electronic signature and document delivery platform',
    endpoints: {
      '/send': {
        purpose: 'Creates envelope with disclosure documents and sends to customer email for electronic signature',
        action: 'Sending documents for e-signature',
      },
      '/status': {
        purpose: 'Checks real-time status of sent envelope: pending, viewed, signed, or expired',
        action: 'Checking e-signature status',
      },
      '/complete': {
        purpose: 'Retrieves fully executed documents and archives signed copies to document management system',
        action: 'Completing e-signature workflow',
      },
    },
    defaultPurpose: 'Manages electronic document signing workflow with customer',
  },
  'DocumentService': {
    icon: FileText,
    category: 'Documents',
    color: '#06b6d4',
    description: 'Document generation and management system',
    endpoints: {
      '/disclosure-package': {
        purpose: 'Generates required disclosure documents: Loan Estimate, Closing Disclosure, Privacy Notice, ECOA Notice, and Assumption Agreement',
        action: 'Generating disclosure document package',
      },
      '/checklist': {
        purpose: 'Creates document collection checklist: Photo ID, Proof of Income, Bank Statements, Tax Returns, Employment Verification, and Insurance docs',
        action: 'Creating document collection checklist',
      },
      '/validate': {
        purpose: 'Validates submitted documents for completeness, authenticity, and compliance with regulatory requirements',
        action: 'Validating submitted documents',
      },
      '/commitment-letter': {
        purpose: 'Generates loan commitment letter with approved terms: loan amount, interest rate, monthly payment, conditions, and expiration date',
        action: 'Generating commitment letter',
      },
      '/closing-package': {
        purpose: 'Assembles final closing package with all executed documents, title docs, and funding instructions',
        action: 'Assembling closing document package',
      },
      '/archive': {
        purpose: 'Archives completed loan file to document repository with proper indexing and retention policy',
        action: 'Archiving loan documents',
      },
    },
    defaultPurpose: 'Creates, validates, and stores loan documents in the system',
  },
  'Underwriting': {
    icon: ClipboardCheck,
    category: 'Decision',
    color: '#f59e0b',
    description: 'Automated underwriting and risk assessment engine',
    endpoints: {
      '/checklist': {
        purpose: 'Runs 12-point underwriting checklist: Identity, Income, Employment, Credit, DTI, Appraisal, Title, Insurance, LTV, Assumption Agreement, Loan Terms, and Compliance',
        action: 'Running underwriting checklist',
      },
      '/assign': {
        purpose: 'Assigns qualified underwriter based on loan amount (Senior/Lead for >$500K) and sets priority and estimated review timeline',
        action: 'Assigning underwriter to case',
      },
      '/review': {
        purpose: 'Performs completeness review, calculates readiness score (0-100), and identifies any outstanding issues before decision',
        action: 'Reviewing application completeness',
      },
      '/denial-reasons': {
        purpose: 'Retrieves applicable denial reasons for adverse action notice: insufficient income, low credit score, high DTI, or property issues',
        action: 'Retrieving denial reasons',
      },
    },
    defaultPurpose: 'Evaluates risk factors and determines loan approval or denial',
  },
  'UnderwritingService': {
    icon: ClipboardCheck,
    category: 'Decision',
    color: '#f59e0b',
    description: 'Automated underwriting and risk assessment engine',
    endpoints: {
      '/checklist': {
        purpose: 'Runs 12-point underwriting checklist: Identity, Income, Employment, Credit, DTI, Appraisal, Title, Insurance, LTV, Assumption Agreement, Loan Terms, and Compliance',
        action: 'Running underwriting checklist',
      },
      '/assign': {
        purpose: 'Assigns qualified underwriter based on loan amount (Senior/Lead for >$500K) and sets priority and estimated review timeline',
        action: 'Assigning underwriter to case',
      },
      '/review': {
        purpose: 'Performs completeness review, calculates readiness score (0-100), and identifies any outstanding issues before decision',
        action: 'Reviewing application completeness',
      },
      '/denial-reasons': {
        purpose: 'Retrieves applicable denial reasons for adverse action notice: insufficient income, low credit score, high DTI, or property issues',
        action: 'Retrieving denial reasons',
      },
    },
    defaultPurpose: 'Evaluates risk factors and determines loan approval or denial',
  },
  'TitleAgency': {
    icon: Building,
    category: 'External',
    color: '#ec4899',
    description: 'Title agency integration for property verification',
    endpoints: {
      '/search': {
        purpose: 'Initiates title search to verify property ownership, identify liens, easements, and encumbrances on the property',
        action: 'Initiating title search',
      },
      '/commitment': {
        purpose: 'Requests title insurance commitment showing conditions that must be cleared before closing',
        action: 'Requesting title commitment',
      },
      '/schedule-closing': {
        purpose: 'Coordinates closing date and time with title company, schedules settlement agent, and confirms closing location',
        action: 'Scheduling closing with title agency',
      },
    },
    defaultPurpose: 'Coordinates title search, insurance, and closing preparations',
  },
  'TitleAgencyAPI': {
    icon: Building,
    category: 'External',
    color: '#ec4899',
    description: 'Title agency integration for property verification',
    endpoints: {
      '/search': {
        purpose: 'Initiates title search to verify property ownership, identify liens, easements, and encumbrances on the property',
        action: 'Initiating title search',
      },
      '/commitment': {
        purpose: 'Requests title insurance commitment showing conditions that must be cleared before closing',
        action: 'Requesting title commitment',
      },
      '/schedule-closing': {
        purpose: 'Coordinates closing date and time with title company, schedules settlement agent, and confirms closing location',
        action: 'Scheduling closing with title agency',
      },
    },
    defaultPurpose: 'Coordinates title search, insurance, and closing preparations',
  },
  'MSPService': {
    icon: Database,
    category: 'System',
    color: '#6366f1',
    description: 'Mortgage Servicing Platform for loan records',
    endpoints: {
      '/get-loan': {
        purpose: 'Retrieves existing loan details from servicing system: current balance, payment history, escrow status, and original terms',
        action: 'Retrieving loan details from MSP',
      },
      '/update-borrower': {
        purpose: 'Updates borrower information in servicing system with new assumor details and contact information',
        action: 'Updating borrower records',
      },
      '/transfer': {
        purpose: 'Executes loan assumption transfer: updates borrower of record, resets payment due dates, and recalculates escrow',
        action: 'Processing loan transfer',
      },
      '/boarding': {
        purpose: 'Boards modified loan back to servicing platform with new terms and initiates welcome communications to new borrower',
        action: 'Boarding loan to servicing system',
      },
    },
    defaultPurpose: 'Records loan changes and updates servicing records',
  },
  'NotificationService': {
    icon: Bell,
    category: 'Communication',
    color: '#14b8a6',
    description: 'Customer notification and communication service',
    endpoints: {
      '/send': {
        purpose: 'Sends notifications to customer via email or SMS with application updates, document requests, or status changes',
        action: 'Sending customer notification',
      },
      '/welcome': {
        purpose: 'Sends welcome package to new borrower with payment instructions, online account setup, and important contact information',
        action: 'Sending welcome communication',
      },
    },
    defaultPurpose: 'Sends notifications and communications to customers',
  },
};

// Helper function to get endpoint-specific purpose
const getApiPurpose = (apiName, endpoint) => {
  const api = API_DETAILS[apiName];
  if (!api) return 'Performs system operation';

  if (api.endpoints && endpoint) {
    const endpointDetail = api.endpoints[endpoint];
    if (endpointDetail) return endpointDetail.purpose;
  }

  return api.defaultPurpose || 'Performs system operation';
};

// Helper function to get endpoint-specific action
const getApiAction = (apiName, endpoint) => {
  const api = API_DETAILS[apiName];
  if (!api) return 'Processing...';

  if (api.endpoints && endpoint) {
    const endpointDetail = api.endpoints[endpoint];
    if (endpointDetail) return endpointDetail.action;
  }

  return api.description || 'Processing request';
};

// Stage definitions with icons, conversation content, and detailed descriptions
const PHASES = [
  {
    id: 1,
    name: 'Intake & Eligibility',
    shortName: 'Intake',
    icon: Phone,
    color: '#3b82f6',
    description: 'Initial contact and eligibility verification',
    stages: [
      {
        num: '01',
        label: 'Call Received',
        icon: Phone,
        interactionType: 'call',
        description: 'Customer initiates assumption inquiry',
        details: 'Capture customer information, property details, and loan specifics',
        conversation: [
          { role: 'customer', icon: User, text: 'Hi, I\'m interested in assuming a mortgage on a property I\'m purchasing.', time: '9:00 AM', status: 'received' },
          { role: 'agent', icon: MessageSquare, text: 'I\'d be happy to help! Let me collect some information about the property and current loan.', time: '9:01 AM', agent: 'Lisa Martinez' },
          { role: 'system', icon: Bot, text: 'Creating new case file and initiating eligibility workflow...', time: '9:02 AM', status: 'success', action: 'Case #LA-2024-0892 created' },
        ],
        apis: ['CaseOptimizer']
      },
      {
        num: '02',
        label: 'Eligibility Check',
        icon: Shield,
        interactionType: 'verification',
        description: 'Verify assumption eligibility',
        details: 'Validate loan type, property occupancy, and preliminary credit review',
        conversation: [
          { role: 'system', icon: Bot, text: 'Running eligibility checks against loan requirements...', time: '9:05 AM', status: 'processing' },
          { role: 'agent', icon: UserCheck, text: 'Verified: Loan is FHA assumable. Checking borrower qualifications.', time: '9:06 AM', agent: 'Lisa Martinez' },
          { role: 'system', icon: Shield, text: 'Credit pre-qualification passed. DTI within acceptable range.', time: '9:07 AM', status: 'success', result: { creditScore: 742, dti: '38%', ltv: '78%' } },
        ],
        apis: ['EligibilityAPI']
      },
    ],
  },
  {
    id: 2,
    name: 'Application & Disclosure',
    shortName: 'Application',
    icon: FileText,
    color: '#8b5cf6',
    description: 'Document collection and legal disclosures',
    stages: [
      {
        num: '03',
        label: 'Application Sent',
        icon: Send,
        interactionType: 'email',
        description: 'Send application package to borrower',
        details: 'Dispatch assumption application via DocuSign for electronic signature',
        conversation: [
          { role: 'system', icon: Mail, text: 'Generating assumption application package...', time: '9:15 AM', status: 'processing', docs: ['Application Form', 'Authorization', 'Disclosures'] },
          { role: 'agent', icon: Send, text: 'Application package sent to john.smith@email.com via DocuSign.', time: '9:16 AM', agent: 'Lisa Martinez', email: 'john.smith@email.com' },
          { role: 'system', icon: Bell, text: 'Reminder scheduled: Follow up in 3 days if not completed.', time: '9:16 AM', status: 'scheduled', dueDate: 'Mar 10, 2024' },
        ],
        apis: ['DocuSign']
      },
      {
        num: '04',
        label: 'Application Received',
        icon: Download,
        interactionType: 'document',
        description: 'Receive completed application',
        details: 'Borrower returns signed application with supporting documents',
        conversation: [
          { role: 'system', icon: Bell, text: 'DocuSign notification: Application completed and signed.', time: 'Mar 9, 2:30 PM', status: 'received' },
          { role: 'agent', icon: Download, text: 'Downloaded signed application and supporting documents.', time: '2:35 PM', agent: 'Lisa Martinez', files: 4 },
          { role: 'system', icon: FileCheck, text: 'Documents archived to case file. Ready for review.', time: '2:36 PM', status: 'success', action: 'Files indexed and stored' },
        ],
        apis: []
      },
      {
        num: '05',
        label: 'Completeness Review',
        icon: ClipboardCheck,
        interactionType: 'review',
        description: 'Verify application completeness',
        details: 'Ensure all required documents received within 25-day window',
        conversation: [
          { role: 'agent', icon: FileSearch, text: 'Reviewing application completeness checklist...', time: '3:00 PM', agent: 'Lisa Martinez' },
          { role: 'system', icon: CheckCircle, text: 'Document checklist verified:', time: '3:05 PM', status: 'success', checklist: ['Income verification ✓', 'Employment letter ✓', 'Bank statements ✓', 'ID documents ✓'] },
          { role: 'agent', icon: ThumbsUp, text: 'All required documents received. Application is complete.', time: '3:06 PM', agent: 'Lisa Martinez', decision: 'approved' },
        ],
        apis: []
      },
      {
        num: '06',
        label: 'Disclosure Sent',
        icon: FileText,
        interactionType: 'email',
        description: 'Send required disclosures',
        details: 'Generate and send TILA, RESPA, and state-specific disclosures',
        conversation: [
          { role: 'system', icon: FileText, text: 'Generating disclosure documents...', time: '3:15 PM', status: 'processing', docs: ['TILA Disclosure', 'RESPA', 'State Disclosures'] },
          { role: 'agent', icon: Mail, text: 'Disclosure package sent to borrower for acknowledgment.', time: '3:18 PM', agent: 'Lisa Martinez' },
          { role: 'system', icon: Calendar, text: 'Disclosure timeline started. 7-day waiting period begins.', time: '3:18 PM', status: 'scheduled', deadline: 'Mar 16, 2024' },
        ],
        apis: ['DocumentService']
      },
    ],
  },
  {
    id: 3,
    name: 'Loan Review & Documents',
    shortName: 'Review',
    icon: Search,
    color: '#06b6d4',
    description: 'Detailed document analysis and gap identification',
    stages: [
      {
        num: '07',
        label: 'Loan Review Assigned',
        icon: UserCheck,
        interactionType: 'assignment',
        description: 'Assign to loan reviewer',
        details: 'Perform document gap analysis and identify missing items',
        conversation: [
          { role: 'system', icon: Users, text: 'Case assigned to Loan Reviewer', time: 'Mar 17, 9:00 AM', status: 'assigned', assignee: 'Sarah Johnson', queue: 'Priority Review' },
          { role: 'agent', icon: Eye, text: 'Beginning detailed document review and verification...', time: '9:15 AM', agent: 'Sarah Johnson' },
          { role: 'system', icon: FileSearch, text: 'Running automated document validation checks...', time: '9:20 AM', status: 'processing', checks: 12 },
          { role: 'agent', icon: ClipboardCheck, text: 'Gap analysis complete. Minor items flagged for follow-up.', time: '10:30 AM', agent: 'Sarah Johnson', issues: 1 },
        ],
        apis: ['DocumentService']
      },
      {
        num: '08',
        label: 'Awaiting Documents',
        icon: Clock,
        interactionType: 'call',
        description: 'Request missing documents',
        details: 'Contact borrower for any missing or incomplete documentation',
        conversation: [
          { role: 'agent', icon: Phone, text: 'Calling borrower regarding missing paystub from last month...', time: '10:45 AM', agent: 'Sarah Johnson', callType: 'outbound' },
          { role: 'customer', icon: User, text: 'I\'ll upload that right away. Give me 10 minutes.', time: '10:47 AM' },
          { role: 'system', icon: Bell, text: 'Document upload notification received.', time: '10:55 AM', status: 'received', file: 'paystub_feb_2024.pdf' },
          { role: 'agent', icon: ThumbsUp, text: 'All documents now received. Moving to underwriting.', time: '11:00 AM', agent: 'Sarah Johnson', decision: 'complete' },
        ],
        apis: []
      },
    ],
  },
  {
    id: 4,
    name: 'Underwriting',
    shortName: 'Underwriting',
    icon: Scale,
    color: '#f59e0b',
    description: 'Risk assessment and loan decision',
    stages: [
      {
        num: '09',
        label: 'Underwriting',
        icon: Scale,
        interactionType: 'analysis',
        description: 'Perform underwriting analysis',
        details: 'Evaluate creditworthiness, debt-to-income, and property value',
        conversation: [
          { role: 'system', icon: Users, text: 'Case assigned to Underwriter', time: 'Mar 18, 8:00 AM', status: 'assigned', assignee: 'Michael Chen', level: 'Senior Underwriter' },
          { role: 'agent', icon: Search, text: 'Analyzing credit report, income stability, and DTI ratio...', time: '8:30 AM', agent: 'Michael Chen' },
          { role: 'system', icon: Bot, text: 'Automated Underwriting System Results', time: '8:45 AM', status: 'success', result: { decision: 'APPROVE/ELIGIBLE', riskScore: 742, dti: '38%', notes: 'Strong credit profile' } },
          { role: 'agent', icon: FileSearch, text: 'Verifying employment and reviewing property appraisal...', time: '9:30 AM', agent: 'Michael Chen' },
        ],
        apis: ['UnderwritingService']
      },
      {
        num: '10',
        label: 'Decision',
        icon: Stamp,
        interactionType: 'decision',
        description: 'Final approval or denial',
        details: 'Underwriter renders final decision with conditions if applicable',
        conversation: [
          { role: 'agent', icon: ClipboardCheck, text: 'Final underwriting review complete.', time: '11:00 AM', agent: 'Michael Chen' },
          { role: 'system', icon: Award, text: 'LOAN APPROVED WITH CONDITIONS', time: '11:05 AM', status: 'approved', conditions: ['Verify funds to close', 'Final VOE before closing'] },
          { role: 'agent', icon: Send, text: 'Approval notification sent to processing team.', time: '11:10 AM', agent: 'Michael Chen', notified: ['Processing', 'Closing', 'Customer'] },
        ],
        apis: ['UnderwritingService']
      },
    ],
  },
  {
    id: 5,
    name: 'Approval & Closing',
    shortName: 'Closing',
    icon: Home,
    color: '#10b981',
    description: 'Loan approval and closing process',
    stages: [
      {
        num: '11',
        label: 'Commitment Letter',
        icon: Award,
        interactionType: 'email',
        description: 'Issue commitment letter',
        details: 'Generate and send loan approval commitment with terms',
        conversation: [
          { role: 'system', icon: FileText, text: 'Generating commitment letter with loan terms...', time: 'Mar 18, 2:00 PM', status: 'processing' },
          { role: 'agent', icon: Mail, text: 'Commitment letter sent to borrower for review and signature.', time: '2:15 PM', agent: 'Lisa Martinez' },
          { role: 'system', icon: Receipt, text: 'Loan Terms Summary', time: '2:15 PM', status: 'info', terms: { amount: '$245,000', rate: '6.25%', term: '28 years remaining', payment: '$1,508.42/mo' } },
        ],
        apis: ['DocumentService']
      },
      {
        num: '12',
        label: 'Customer Review',
        icon: Phone,
        interactionType: 'call',
        description: 'Borrower reviews terms',
        details: 'Call agent walks through commitment terms with borrower',
        conversation: [
          { role: 'agent', icon: Phone, text: 'Hi! I\'m calling to walk you through your commitment letter.', time: 'Mar 19, 10:00 AM', agent: 'Lisa Martinez', callType: 'scheduled' },
          { role: 'customer', icon: User, text: 'Great! I\'ve reviewed it but have a few questions about closing costs.', time: '10:02 AM' },
          { role: 'agent', icon: MessageSquare, text: 'Of course! Let me explain each line item on your closing disclosure...', time: '10:05 AM', agent: 'Lisa Martinez', duration: '15 min' },
          { role: 'customer', icon: ThumbsUp, text: 'That makes sense. I\'m ready to proceed!', time: '10:20 AM', decision: 'accepted' },
        ],
        apis: []
      },
      {
        num: '13',
        label: 'Closing Packet',
        icon: Briefcase,
        interactionType: 'document',
        description: 'Prepare closing documents',
        details: 'Send complete closing package to title agency',
        conversation: [
          { role: 'system', icon: FileText, text: 'Compiling closing document package...', time: 'Mar 20, 9:00 AM', status: 'processing', docs: 24 },
          { role: 'agent', icon: Send, text: 'Closing packet transmitted to ABC Title Company.', time: '9:30 AM', agent: 'Lisa Martinez', recipient: 'ABC Title Company' },
          { role: 'system', icon: Building, text: 'Title company confirmed receipt. Scheduling closing appointment.', time: '10:00 AM', status: 'confirmed', titleAgent: 'Jennifer Williams' },
          { role: 'system', icon: Calendar, text: 'Closing appointment scheduled', time: '10:15 AM', status: 'scheduled', appointment: { date: 'Mar 25, 2024', time: '2:00 PM', location: 'ABC Title - Downtown Office' } },
        ],
        apis: ['DocumentService', 'TitleAgencyAPI']
      },
      {
        num: '14',
        label: 'Closing Review',
        icon: Eye,
        interactionType: 'review',
        description: 'Final packet verification',
        details: 'Quality check of all closing documents before funding',
        conversation: [
          { role: 'agent', icon: FileSearch, text: 'Performing final QC review of closing documents...', time: 'Mar 24, 9:00 AM', agent: 'Quality Team' },
          { role: 'system', icon: CheckCircle, text: 'Quality Check Results', time: '9:30 AM', status: 'success', checklist: ['Loan docs accurate ✓', 'Figures match CD ✓', 'All signatures present ✓', 'Notarization verified ✓'] },
          { role: 'agent', icon: ThumbsUp, text: 'QC passed. Clear to close!', time: '9:35 AM', agent: 'Quality Team', decision: 'approved' },
        ],
        apis: []
      },
      {
        num: '15',
        label: 'System Update',
        icon: Database,
        interactionType: 'system',
        description: 'Update servicing systems',
        details: 'Record assumption in MSP and update loan records',
        conversation: [
          { role: 'system', icon: RefreshCw, text: 'Updating mortgage servicing platform...', time: 'Mar 25, 3:00 PM', status: 'processing' },
          { role: 'system', icon: Database, text: 'System Records Updated', time: '3:05 PM', status: 'success', updates: ['New borrower information recorded', 'Payment details updated', 'Escrow accounts transferred', 'Insurance records linked'] },
          { role: 'system', icon: CheckCircle, text: 'MSP update complete. Loan records synchronized.', time: '3:10 PM', status: 'success', loanNumber: '1234567890' },
        ],
        apis: ['MSPService']
      },
      {
        num: '16',
        label: 'Loan Closed',
        icon: Key,
        interactionType: 'completion',
        description: 'Assumption complete',
        details: 'Loan successfully assumed by new borrower',
        conversation: [
          { role: 'system', icon: Award, text: '🎉 LOAN ASSUMPTION COMPLETE!', time: 'Mar 25, 4:00 PM', status: 'success', celebration: true },
          { role: 'agent', icon: Phone, text: 'Congratulations on your new home! Your first payment is due April 1st.', time: '4:15 PM', agent: 'Lisa Martinez', callType: 'congratulations' },
          { role: 'customer', icon: ThumbsUp, text: 'Thank you so much for all your help!', time: '4:18 PM', sentiment: 'positive' },
          { role: 'system', icon: Archive, text: 'Case finalized and archived', time: '4:30 PM', status: 'complete', nextSteps: ['Welcome letter mailed', 'Online portal access sent', 'First payment reminder scheduled'] },
        ],
        apis: []
      },
    ],
  },
  {
    id: 6,
    name: 'Denial Path',
    shortName: 'Denial',
    icon: XCircle,
    color: '#ef4444',
    isAlternate: true,
    description: 'Application denial workflow',
    stages: [
      {
        num: 'D1',
        label: 'Denial Letter',
        icon: AlertTriangle,
        interactionType: 'email',
        description: 'Generate denial notice',
        details: 'Create adverse action letter with specific denial reasons',
        conversation: [
          { role: 'system', icon: FileText, text: 'Generating adverse action notice...', time: 'Mar 18, 11:30 AM', status: 'processing' },
          { role: 'system', icon: AlertTriangle, text: 'Application Denied', time: '11:35 AM', status: 'denied', reasons: ['DTI exceeds maximum (52% vs 45% limit)', 'Insufficient reserves for closing'] },
          { role: 'agent', icon: Mail, text: 'Adverse action notice sent to applicant with appeal instructions.', time: '11:45 AM', agent: 'Michael Chen', appealDeadline: '60 days' },
        ],
        apis: ['UnderwritingService']
      },
      {
        num: 'D2',
        label: 'Case Closed',
        icon: Lock,
        interactionType: 'system',
        description: 'Close denied application',
        details: 'Archive case and retain records per compliance requirements',
        conversation: [
          { role: 'system', icon: Archive, text: 'Archiving case file for compliance retention...', time: 'Mar 18, 12:00 PM', status: 'processing' },
          { role: 'system', icon: Lock, text: 'Case Archived', time: '12:05 PM', status: 'closed', caseStatus: 'CLOSED - DENIED', retention: '25 months' },
          { role: 'system', icon: CheckCircle, text: 'All records secured. Case processing complete.', time: '12:10 PM', status: 'complete' },
        ],
        apis: []
      },
    ],
  },
];

// Map node keys to phase indices
const NODE_TO_PHASE = {
  'intake_node': 0,
  'application_node': 1,
  'disclosure_node': 1,
  'loan_review_node': 2,
  'underwriting_node': 3,
  'human_decision_node': 3,
  'commitment_node': 4,
  'closing_node': 4,
  'maintenance_node': 4,
  'denial_node': 5,
  'end': 4,
  'end_loan_closed': 4,
  'end_ineligible': -1,
  'end_incomplete': -1,
  'end_withdrawn': -1,
  'end_denied': 5,
};

// Map backend current_phase to the starting stage number (1-16)
// This tells us which stage is "current" based on the backend phase
const BACKEND_PHASE_TO_STAGE = {
  'INTAKE': 1,
  'APPLICATION': 3,
  'DISCLOSURE': 5,
  'LOAN_REVIEW': 7,
  'UNDERWRITING': 9,
  'COMMITMENT': 11,
  'CLOSING': 13,
  'POST_CLOSING': 15,
};

// HTTP Method colors
const METHOD_COLORS = {
  'GET': { bg: '#dbeafe', text: '#1d4ed8' },
  'POST': { bg: '#dcfce7', text: '#16a34a' },
  'PUT': { bg: '#fef3c7', text: '#d97706' },
  'DELETE': { bg: '#fee2e2', text: '#dc2626' },
  'PATCH': { bg: '#f3e8ff', text: '#9333ea' },
};

function WorkflowStageTracker({ application, executions, apiCalls, isDark = false, onApplicationUpdate }) {
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [expandedStage, setExpandedStage] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [animateProgress, setAnimateProgress] = useState(false);
  const [expandedApiCalls, setExpandedApiCalls] = useState({});
  const [jsonModal, setJsonModal] = useState({ isOpen: false, title: '', data: null, type: '' });
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [animatedStats, setAnimatedStats] = useState({
    nodes: 0,
    apiCalls: 0,
    duration: 0,
  });
  const [visibleProgressNodes, setVisibleProgressNodes] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  // Local state for optimistic updates when completing tasks
  const [localCurrentStageNum, setLocalCurrentStageNum] = useState(null);
  const [localCompletedStatus, setLocalCompletedStatus] = useState(false);
  const [localStatus, setLocalStatus] = useState(null); // 'COMPLETED', 'IN_PROGRESS', etc.
  const [localCurrentPhase, setLocalCurrentPhase] = useState(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const phaseCardRefs = useRef({});
  const phaseContentRefs = useRef({});
  const stageContentRefs = useRef({});
  const stageRowRefs = useRef({});
  const apiSectionRefs = useRef({});

  // Scroll to newly visible phase card
  useEffect(() => {
    if (visibleProgressNodes > 0) {
      const cardIndex = visibleProgressNodes - 1;
      const cardRef = phaseCardRefs.current[cardIndex];
      if (cardRef) {
        setTimeout(() => {
          cardRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [visibleProgressNodes]);

  // Scroll to expanded phase content
  useEffect(() => {
    if (expandedPhase !== null) {
      const contentRef = phaseContentRefs.current[expandedPhase];
      if (contentRef) {
        setTimeout(() => {
          contentRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [expandedPhase]);

  // Scroll to expanded stage content
  useEffect(() => {
    if (expandedStage !== null) {
      const contentRef = stageContentRefs.current[expandedStage];
      if (contentRef) {
        setTimeout(() => {
          contentRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [expandedStage]);

  // Check if application is denied
  const isApplicationDenied = application?.status === 'DENIED' ||
                              application?.current_node === 'denial_node' ||
                              application?.current_node === 'end_denied' ||
                              application?.workflow_status === 'denied' ||
                              application?.current_phase === 'DENIAL';

  // Animate stats based on visible nodes
  useEffect(() => {
    const totalNodes = PHASES.filter(p => !p.isAlternate).length;
    const targetNodes = executions?.length || 0;
    const targetApiCalls = apiCalls?.length || 0;
    const targetDuration = apiCalls?.reduce((s, c) => s + (c.duration_ms || 0), 0) || 0;

    // Calculate proportional values based on visible nodes
    const progress = visibleProgressNodes / totalNodes;
    const currentNodes = Math.round(targetNodes * progress);
    const currentApiCalls = Math.round(targetApiCalls * progress);
    const currentDuration = Math.round(targetDuration * progress);

    // Animate to the current values
    const duration = 300;
    const startTime = Date.now();
    const startValues = { ...animatedStats };

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const animProgress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - animProgress, 3);

      setAnimatedStats({
        nodes: Math.round(startValues.nodes + (currentNodes - startValues.nodes) * eased),
        apiCalls: Math.round(startValues.apiCalls + (currentApiCalls - startValues.apiCalls) * eased),
        duration: Math.round(startValues.duration + (currentDuration - startValues.duration) * eased),
      });

      if (animProgress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [visibleProgressNodes, executions, apiCalls]);

  // Animate progress nodes appearing one by one with 1 second delay
  useEffect(() => {
    const totalNodes = PHASES.filter(p => !p.isAlternate).length;
    setVisibleProgressNodes(0);
    setAnimationComplete(false);

    let interval;
    const timer = setTimeout(() => {
      let count = 0;
      interval = setInterval(() => {
        count++;
        setVisibleProgressNodes(count);
        if (count >= totalNodes) {
          clearInterval(interval);
          // Mark animation complete after a short delay so last spinner shows briefly
          setTimeout(() => {
            setAnimationComplete(true);
          }, 500);
        }
      }, 1000); // 1 second delay between each node
    }, 100);

    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [application?.application_id]);

  useEffect(() => {
    setTimeout(() => setAnimateProgress(true), 100);
  }, []);

  const openJsonModal = (title, data, type) => {
    setJsonModal({ isOpen: true, title, data, type });
  };

  const closeJsonModal = () => {
    setJsonModal({ isOpen: false, title: '', data: null, type: '' });
  };

  // Theme configuration
  const theme = {
    pageBg: isDark ? '#0f172a' : '#f8fafc',
    cardBg: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
    cardBgHover: isDark ? 'rgba(51, 65, 85, 0.95)' : 'rgba(255, 255, 255, 1)',
    stageBg: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)',
    codeBg: isDark ? '#1e293b' : '#1e293b',
    textPrimary: isDark ? '#f1f5f9' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    border: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)',
    borderLight: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(241, 245, 249, 0.9)',
    completed: { bg: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)', text: '#10b981' },
    active: { bg: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
    pending: { bg: isDark ? 'rgba(100, 116, 139, 0.1)' : 'rgba(100, 116, 139, 0.08)', text: isDark ? '#64748b' : '#94a3b8' },
    shadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.05)',
  };

  const currentNode = application?.current_node || '';
  const currentPhase = application?.current_phase || '';

  // Determine if truly completed: status must be COMPLETED AND must be at terminal phase/node
  // This prevents false "completed" state when status is COMPLETED but phase is still early (e.g., INTAKE)
  const isAtTerminalState = currentPhase === 'POST_CLOSING' ||
                            currentNode === 'end_loan_closed' ||
                            currentNode === 'end' ||
                            currentNode === 'end_denied' ||
                            currentNode === 'denial_node';
  const isCompleted = application?.status === 'COMPLETED' && isAtTerminalState;

  // Map backend phase to frontend phase index (0-4)
  const BACKEND_PHASE_TO_FRONTEND_IDX = {
    'INTAKE': 0,
    'APPLICATION': 1,
    'DISCLOSURE': 1,
    'LOAN_REVIEW': 2,
    'UNDERWRITING': 3,
    'COMMITMENT': 4,
    'CLOSING': 4,
    'POST_CLOSING': 4,
  };

  // Map stage number to frontend phase index
  const STAGE_TO_FRONTEND_PHASE = {
    1: 0, 2: 0,           // Intake (stages 1-2)
    3: 1, 4: 1, 5: 1, 6: 1, // Application (stages 3-6)
    7: 2, 8: 2,           // Review (stages 7-8)
    9: 3, 10: 3,          // Underwriting (stages 9-10)
    11: 4, 12: 4, 13: 4, 14: 4, 15: 4, 16: 4, // Closing (stages 11-16)
  };

  // Use current_phase to determine frontend phase index (more reliable than current_node)
  // Also consider localCurrentStageNum for optimistic updates
  const backendPhaseIndex = BACKEND_PHASE_TO_FRONTEND_IDX[currentPhase] ?? NODE_TO_PHASE[currentNode] ?? -1;
  const localPhaseIndex = localCurrentStageNum !== null ? (STAGE_TO_FRONTEND_PHASE[localCurrentStageNum] ?? backendPhaseIndex) : null;
  const currentPhaseIndex = localPhaseIndex !== null ? localPhaseIndex : backendPhaseIndex;

  const totalPhases = PHASES.filter(p => !p.isAlternate).length;
  const effectiveIsCompleted = localCompletedStatus || isCompleted;
  const completedPhases = effectiveIsCompleted ? totalPhases : Math.max(0, currentPhaseIndex);
  const finalProgressPercent = Math.round((completedPhases / totalPhases) * 100);

  // Animate progress percentage based on visible nodes
  useEffect(() => {
    // During animation, show progress based on visible nodes
    // After animation complete, show actual progress
    const targetPercent = animationComplete
      ? finalProgressPercent
      : Math.round((visibleProgressNodes / totalPhases) * 100);

    const duration = 400;
    const startTime = Date.now();
    const startValue = animatedPercent;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setAnimatedPercent(Math.round(startValue + (targetPercent - startValue) * eased));

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [visibleProgressNodes, animationComplete, finalProgressPercent]);

  const isPhaseCompleted = (idx) => idx < currentPhaseIndex || (idx === currentPhaseIndex && effectiveIsCompleted);
  const isPhaseActive = (idx) => idx === currentPhaseIndex && !effectiveIsCompleted;
  const getApiCallsForApi = (apiName) => apiCalls?.filter(c => c.api_name === apiName) || [];

  const copyToClipboard = (data, id) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatJson = (data) => {
    try {
      return typeof data === 'string' ? JSON.stringify(JSON.parse(data), null, 2) : JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const getApiDetail = (apiName) => API_DETAILS[apiName] || {
    icon: Zap,
    category: 'Service',
    color: '#6b7280',
    description: `${apiName} service call`,
    purpose: 'Performs system operation',
  };

  // Check if application ended in denial
  const isDeniedApplication = application?.workflow_status === 'denied' ||
                               application?.end_state === 'denied' ||
                               application?.status === 'DENIED';

  // Check if an API call response indicates denial cause
  const checkDenialCause = (call) => {
    if (!isDeniedApplication) return { isDenialCause: false };

    const response = call.response_data;
    if (!response) return { isDenialCause: false };

    // Check UnderwritingService responses for denial indicators
    if (call.api_name === 'UnderwritingService' || call.api_name === 'Underwriting') {
      // Check for failed checklist
      if (response.all_passed === false) {
        const failedItems = response.results?.filter(r => r.status === 'failed')?.map(r => r.item) || [];
        return {
          isDenialCause: true,
          reason: `Failed checklist items: ${failedItems.join(', ') || 'Multiple items failed'}`
        };
      }

      // Check for not ready status
      if (response.is_ready === false) {
        const issues = response.issues || [];
        return {
          isDenialCause: true,
          reason: issues.length > 0 ? issues.join(', ') : 'Application not ready for approval'
        };
      }

      // Check for denial reasons endpoint
      if (call.endpoint?.includes('denial-reasons') && response.reasons?.length > 0) {
        return {
          isDenialCause: true,
          reason: response.reasons.join(', ')
        };
      }
    }

    // Check EligibilityAPI for eligibility failures
    if (call.api_name === 'EligibilityAPI') {
      if (response.eligible === false || response.is_eligible === false) {
        return {
          isDenialCause: true,
          reason: response.reason || response.denial_reason || 'Did not meet eligibility requirements'
        };
      }
    }

    return { isDenialCause: false };
  };

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      background: theme.pageBg,
      padding: '24px',
      minHeight: '100%',
    }}>
      {/* JSON Modal */}
      {jsonModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={closeJsonModal}
        >
          <div
            style={{
              background: isDark ? '#1e293b' : '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: `1px solid ${isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)'}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${isDark ? 'rgba(51, 65, 85, 0.6)' : '#e2e8f0'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: jsonModal.type === 'request'
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              borderRadius: '16px 16px 0 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {jsonModal.type === 'request' ? <Upload size={20} color="#fff" /> : <Download size={20} color="#fff" />}
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                    {jsonModal.type === 'request' ? 'REQUEST' : 'RESPONSE'} JSON
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    {jsonModal.title}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(jsonModal.data, null, 2));
                    setCopiedId('modal-json');
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  {copiedId === 'modal-json' ? <Check size={14} /> : <Copy size={14} />}
                  {copiedId === 'modal-json' ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={closeJsonModal}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '20px',
            }}>
              <pre style={{
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                fontSize: '0.85rem',
                lineHeight: 1.7,
                background: isDark ? '#0f172a' : '#1e293b',
                color: jsonModal.type === 'request' ? '#86efac' : '#7dd3fc',
                padding: '20px',
                borderRadius: '12px',
                overflow: 'auto',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {JSON.stringify(jsonModal.data, null, 2)}
              </pre>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: `1px solid ${isDark ? 'rgba(51, 65, 85, 0.6)' : '#e2e8f0'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isDark ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc',
              borderRadius: '0 0 16px 16px',
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: isDark ? '#64748b' : '#94a3b8',
              }}>
                {jsonModal.data ? Object.keys(jsonModal.data).length : 0} properties
              </div>
              <button
                onClick={closeJsonModal}
                style={{
                  padding: '8px 20px',
                  background: isDark ? '#334155' : '#e2e8f0',
                  border: 'none',
                  borderRadius: '8px',
                  color: isDark ? '#f1f5f9' : '#334155',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div style={{
        background: theme.cardBg,
        backdropFilter: 'blur(16px)',
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '20px',
        border: `1px solid ${theme.border}`,
        boxShadow: theme.shadow,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Left: Title & App ID */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '8px',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Home size={20} color="#fff" />
              </div>
              <div>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: theme.textPrimary,
                  margin: 0,
                }}>
                  Loan Assumption Tracker
                </h2>
                <div style={{ fontSize: '0.8125rem', color: theme.textSecondary }}>
                  Application <span style={{ fontFamily: 'monospace', color: '#3b82f6', fontWeight: 600 }}>{application?.application_id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Progress Circle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: theme.textMuted, marginBottom: '2px' }}>Overall Progress</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: animatedPercent === 100 ? '#10b981' : theme.textPrimary,
                fontVariantNumeric: 'tabular-nums',
              }}>
                <span
                  style={{
                    display: 'inline-block',
                    minWidth: '3ch',
                    textAlign: 'right',
                  }}
                >{animatedPercent}</span>%
              </div>
            </div>
            <div style={{ position: 'relative', width: '64px', height: '64px' }}>
              <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="32" cy="32" r="28" fill="none" stroke={isDark ? 'rgba(51, 65, 85, 0.5)' : '#e2e8f0'} strokeWidth="5" />
                <circle
                  cx="32" cy="32" r="28"
                  fill="none"
                  stroke="url(#prog)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - animatedPercent / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
                />
                <defs>
                  <linearGradient id="prog" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* Phase Progress Steps */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: '20px',
          padding: '16px 0',
          borderTop: `1px solid ${theme.border}`,
        }}>
          {PHASES.filter(p => !p.isAlternate).map((phase, idx) => {
            const completed = isPhaseCompleted(idx);
            const active = isPhaseActive(idx);
            const PhaseIcon = phase.icon;
            const nextPhase = PHASES.filter(p => !p.isAlternate)[idx + 1];
            const totalNodes = PHASES.filter(p => !p.isAlternate).length;
            const isNodeVisible = idx < visibleProgressNodes;
            const isNodeLoading = idx === visibleProgressNodes - 1 && !animationComplete;
            const isNextNodeVisible = idx + 1 < visibleProgressNodes;

            return (
              <React.Fragment key={phase.id}>
                {/* Phase Step */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  flex: 'none',
                  opacity: isNodeVisible ? 1 : 0,
                  transform: isNodeVisible ? 'scale(1) translateY(0)' : 'scale(0.5) translateY(10px)',
                  transition: 'all 0.3s ease-out',
                }}>
                  <div style={{
                    position: 'relative',
                  }}>
                    {/* Pulsing glow ring for active node */}
                    {active && !isNodeLoading && animationComplete && (
                      <div style={{
                        position: 'absolute',
                        inset: '-6px',
                        borderRadius: '16px',
                        background: `${phase.color}15`,
                        animation: 'activeNodePulse 2s ease-in-out infinite',
                      }} />
                    )}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: isNodeLoading ? '50%' : '12px',
                      background: isNodeLoading ? 'transparent' : (completed ? phase.color : active ? `${phase.color}30` : isDark ? 'rgba(51, 65, 85, 0.5)' : '#f1f5f9'),
                      borderWidth: isNodeLoading || active ? '3px' : '0',
                      borderStyle: 'solid',
                      borderColor: isNodeLoading ? `${phase.color}30` : active ? phase.color : 'transparent',
                      borderTopColor: isNodeLoading ? phase.color : (active ? phase.color : 'transparent'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: active && !isNodeLoading ? `0 0 12px ${phase.color}50, 0 0 24px ${phase.color}20` : 'none',
                      animation: isNodeLoading ? 'spinLoader 0.6s linear infinite' : 'none',
                      transition: 'border-radius 0.3s ease, background 0.3s ease',
                      position: 'relative',
                      zIndex: 1,
                    }}>
                      {isNodeLoading ? null : completed ? (
                        <CheckCircle size={20} color="#fff" />
                      ) : (
                        <PhaseIcon size={18} color={active ? phase.color : theme.textMuted} />
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: active ? 700 : 600,
                    color: isNodeLoading ? phase.color : (active ? phase.color : completed ? theme.textPrimary : theme.textMuted),
                    textAlign: 'center',
                    maxWidth: '70px',
                    transition: 'color 0.3s ease',
                  }}>
                    {isNodeLoading ? 'Loading...' : phase.shortName}
                  </span>
                  {/* In Progress indicator below active node */}
                  {active && !isNodeLoading && animationComplete && (
                    <span style={{
                      fontSize: '0.5625rem',
                      fontWeight: 700,
                      color: phase.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      animation: 'textPulse 2s ease-in-out infinite',
                    }}>
                      In Progress
                    </span>
                  )}
                </div>

                {/* Connector Line */}
                {idx < PHASES.filter(p => !p.isAlternate).length - 1 && (
                  <div style={{
                    flex: 1,
                    height: '3px',
                    margin: '0 8px 24px',
                    borderRadius: '2px',
                    background: isDark ? 'rgba(51, 65, 85, 0.4)' : '#e2e8f0',
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: isNodeVisible ? 1 : 0,
                    transition: 'opacity 0.3s ease-out',
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: isNextNodeVisible && completed ? '100%' : '0%',
                      background: `linear-gradient(90deg, ${phase.color}, ${nextPhase?.color || phase.color})`,
                      borderRadius: '2px',
                      transition: 'width 0.4s ease-out',
                    }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* DENIAL Node - shown when application is denied */}
          {isApplicationDenied && animationComplete && (() => {
            const denialPhase = PHASES.find(p => p.isAlternate);
            if (!denialPhase) return null;
            const DenialIcon = denialPhase.icon;
            const lastNonAlternatePhase = PHASES.filter(p => !p.isAlternate).slice(-1)[0];

            return (
              <React.Fragment>
                {/* Connector to Denial */}
                <div style={{
                  flex: 1,
                  height: '3px',
                  margin: '0 8px 24px',
                  borderRadius: '2px',
                  background: isDark ? 'rgba(51, 65, 85, 0.4)' : '#e2e8f0',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: 'fadeSlideIn 0.4s ease-out',
                }}>
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: '100%',
                    background: `linear-gradient(90deg, ${lastNonAlternatePhase?.color || '#f59e0b'}, ${denialPhase.color})`,
                    borderRadius: '2px',
                  }} />
                </div>

                {/* Denial Node */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  flex: 'none',
                  animation: 'fadeSlideIn 0.4s ease-out',
                }}>
                  <div style={{ position: 'relative' }}>
                    {/* Pulsing glow ring for denial */}
                    <div style={{
                      position: 'absolute',
                      inset: '-6px',
                      borderRadius: '16px',
                      background: `${denialPhase.color}20`,
                      animation: 'activeNodePulse 2s ease-in-out infinite',
                    }} />
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: denialPhase.color,
                      border: `3px solid ${denialPhase.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 0 16px ${denialPhase.color}60, 0 0 32px ${denialPhase.color}30`,
                      position: 'relative',
                      zIndex: 1,
                    }}>
                      <DenialIcon size={20} color="#fff" />
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: denialPhase.color,
                    textAlign: 'center',
                    maxWidth: '70px',
                  }}>
                    {denialPhase.shortName}
                  </span>
                  <span style={{
                    fontSize: '0.5625rem',
                    fontWeight: 700,
                    color: denialPhase.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    animation: 'textPulse 2s ease-in-out infinite',
                  }}>
                    DENIED
                  </span>
                </div>
              </React.Fragment>
            );
          })()}
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '20px',
      }}>
        {(() => {
          // Determine status for Current Phase border
          const isDenied = application?.status === 'DENIED' ||
                          application?.current_node === 'denial_node' ||
                          application?.current_node === 'end_denied' ||
                          application?.workflow_status === 'denied';
          // Use local state if available, otherwise use application props
          // If status says COMPLETED but we're not at terminal state, show IN_PROGRESS
          const actualStatus = isCompleted ? 'COMPLETED' : (application?.status === 'COMPLETED' ? 'IN_PROGRESS' : application?.status);
          const effectiveStatus = localStatus || actualStatus || 'N/A';
          const effectiveCurrentPhase = localCurrentPhase || application?.current_phase || 'N/A';
          const isEffectiveCompleted = localCompletedStatus || isCompleted;

          const phaseStatusColor = isDenied ? '#ef4444' : isEffectiveCompleted ? '#10b981' : '#f59e0b';
          const phaseStatusBorder = isDenied ? '2px solid #ef4444' : isEffectiveCompleted ? '2px solid #10b981' : '2px solid #f59e0b';

          // Calculate current task number for display
          const effectiveTaskNum = localCurrentStageNum !== null ? localCurrentStageNum : (BACKEND_PHASE_TO_STAGE[effectiveCurrentPhase] || 0);
          const totalTasks = 16; // Total stages in the workflow
          const displayTaskNum = isEffectiveCompleted ? totalTasks : effectiveTaskNum;
          const completedTasksCount = isEffectiveCompleted ? totalTasks : Math.max(0, effectiveTaskNum - 1);

          const stats = [
            {
              label: 'Status',
              value: effectiveStatus,
              color: phaseStatusColor,
              icon: Home,
              isAnimated: false,
              customBorder: phaseStatusBorder,
            },
            {
              label: 'Current Phase',
              value: isEffectiveCompleted ? 'COMPLETED' : effectiveCurrentPhase,
              subValue: isEffectiveCompleted ? `${totalTasks}/${totalTasks} tasks` : `Task ${displayTaskNum} of ${totalTasks}`,
              color: phaseStatusColor,
              icon: Zap,
              isAnimated: false,
              progress: isEffectiveCompleted ? 100 : Math.round((completedTasksCount / totalTasks) * 100),
            },
            // Show "Manually Completed" if no API calls (manual simulation mode)
            ...((!apiCalls || apiCalls.length === 0) ? [
              {
                label: 'Completion Mode',
                value: 'Manual',
                subValue: 'Step-by-step simulation',
                color: '#8b5cf6',
                icon: UserCheck,
                isAnimated: false,
              },
            ] : [
              {
                label: 'API Calls Made',
                value: animatedStats.apiCalls,
                targetValue: apiCalls?.length || 0,
                color: '#10b981',
                icon: Send,
                isAnimated: true,
              },
            ]),
            {
              label: (!apiCalls || apiCalls.length === 0) ? 'Completed By' : 'Total Duration',
              value: (!apiCalls || apiCalls.length === 0) ? 'UI User' : `${animatedStats.duration}ms`,
              targetValue: apiCalls?.reduce((s, c) => s + (c.duration_ms || 0), 0) || 0,
              color: (!apiCalls || apiCalls.length === 0) ? '#06b6d4' : '#f59e0b',
              icon: (!apiCalls || apiCalls.length === 0) ? User : Clock,
              isAnimated: (!apiCalls || apiCalls.length === 0) ? false : true,
              isDuration: (!apiCalls || apiCalls.length === 0) ? false : true,
            },
          ];

          return stats.map((stat, idx) => {
          const StatIcon = stat.icon;
          const isAnimating = stat.isAnimated && (
            stat.isDuration
              ? animatedStats.duration < stat.targetValue
              : stat.value < stat.targetValue
          );
          return (
            <div
              key={idx}
              style={{
                background: theme.cardBg,
                backdropFilter: 'blur(12px)',
                borderRadius: '14px',
                padding: '16px',
                border: stat.customBorder || `1px solid ${theme.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                position: 'relative',
                boxShadow: stat.customBorder ? `0 0 12px ${stat.color}30` : 'none',
              }}
            >
              {/* Status indicator for Current Phase */}
              {stat.statusLabel && (
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '12px',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '8px',
                  background: stat.color,
                  color: '#fff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}>
                  {stat.statusLabel}
                </div>
              )}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: `${stat.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <StatIcon size={20} color={stat.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: stat.subValue ? '0.875rem' : '1.125rem',
                  fontWeight: 700,
                  color: isAnimating ? stat.color : theme.textPrimary,
                  fontFamily: idx > 0 ? 'monospace' : 'inherit',
                  fontVariantNumeric: 'tabular-nums',
                  transition: 'color 0.3s ease',
                }}>
                  <span
                    key={stat.value}
                    style={{
                      display: 'inline-block',
                      animation: isAnimating ? 'countPulse 0.1s ease-out' : 'none',
                    }}
                  >
                    {stat.value}
                  </span>
                </div>
                {stat.subValue && (
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: stat.color,
                    marginTop: '2px',
                  }}>
                    {stat.subValue}
                  </div>
                )}
                <div style={{ fontSize: '0.6875rem', color: theme.textMuted, fontWeight: 500 }}>{stat.label}</div>
                {stat.progress !== undefined && (
                  <div style={{
                    marginTop: '6px',
                    height: '4px',
                    borderRadius: '2px',
                    background: isDark ? 'rgba(51, 65, 85, 0.4)' : '#e2e8f0',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${stat.progress}%`,
                      height: '100%',
                      borderRadius: '2px',
                      background: stat.progress === 100 ? '#10b981' : stat.color,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                )}
              </div>
            </div>
          );
        });
        })()}
      </div>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes spinLoader {
            to { transform: rotate(360deg); }
          }
          @keyframes fadeSlideIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes countPulse {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.15);
            }
            100% {
              transform: scale(1);
            }
          }
          @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
            50% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          }
          @keyframes connectLine {
            from { width: 0; }
            to { width: 100%; }
          }
          @keyframes activeNodePulse {
            0%, 100% {
              transform: scale(1);
              opacity: 0.5;
            }
            50% {
              transform: scale(1.2);
              opacity: 0.2;
            }
          }
          @keyframes textPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes activeCardGlow {
            0%, 100% {
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 0 0 4px rgba(59, 130, 246, 0.1), 0 0 20px rgba(59, 130, 246, 0.15);
            }
            50% {
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 0 0 6px rgba(59, 130, 246, 0.15), 0 0 30px rgba(59, 130, 246, 0.25);
            }
          }
          @keyframes statusBadgePulse {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 0 0 0 currentColor;
            }
            50% {
              transform: scale(1.02);
            }
          }
        `}
      </style>

      {/* Phase Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {PHASES.map((phase, phaseIndex) => {
          const completed = isPhaseCompleted(phaseIndex);
          const active = isPhaseActive(phaseIndex);
          const isExpanded = expandedPhase === phaseIndex;
          const PhaseIcon = phase.icon;
          const phaseApiCalls = apiCalls?.filter(call => phase.stages.some(s => s.apis.includes(call.api_name))) || [];
          // For alternate phases (Denial Path), use different visibility logic
          const isAlternatePhaseVisible = phase.isAlternate && isApplicationDenied && animationComplete;
          const isCardVisible = phase.isAlternate ? isAlternatePhaseVisible : phaseIndex < visibleProgressNodes;
          const isCardLoading = !phase.isAlternate && phaseIndex === visibleProgressNodes - 1;

          // For alternate phases (Denial Path), only show if application is denied
          if (phase.isAlternate && !isApplicationDenied) {
            return null;
          }

          // Don't render cards that aren't visible yet
          if (!isCardVisible) {
            return null;
          }

          // For denial phase, override completed/active status
          const isDenialPhase = phase.isAlternate && isApplicationDenied;
          const effectiveActive = isDenialPhase ? true : active;
          const effectiveCompleted = isDenialPhase ? false : completed;

          return (
            <div
              key={phase.id}
              ref={(el) => { phaseCardRefs.current[phaseIndex] = el; }}
              style={{
                background: effectiveCompleted
                  ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)')
                  : theme.cardBg,
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                border: effectiveCompleted
                  ? '3px solid #10b981'
                  : effectiveActive
                    ? `3px solid ${phase.color}`
                    : `1px solid ${theme.border}`,
                boxShadow: effectiveCompleted
                  ? `0 4px 20px rgba(16, 185, 129, 0.25), 0 0 0 4px rgba(16, 185, 129, 0.2), 0 0 30px rgba(16, 185, 129, 0.2)`
                  : effectiveActive
                    ? `${theme.shadow}, 0 0 0 4px ${phase.color}15, 0 0 30px ${phase.color}20`
                    : theme.shadow,
                overflow: 'hidden',
                opacity: !effectiveCompleted && !effectiveActive ? 0.4 : 1,
                animation: effectiveActive ? 'fadeSlideIn 0.4s ease-out, activeCardGlow 2s ease-in-out infinite' : 'fadeSlideIn 0.4s ease-out',
                position: 'relative',
              }}
            >
              {/* Left accent bar for completed phase */}
              {effectiveCompleted && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '6px',
                  background: 'linear-gradient(180deg, #10b981, #059669)',
                  borderRadius: '16px 0 0 16px',
                  boxShadow: '2px 0 8px rgba(16, 185, 129, 0.3)',
                }}/>
              )}
              {/* Left accent bar for active/denial phase */}
              {effectiveActive && !effectiveCompleted && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  background: `linear-gradient(180deg, ${phase.color}, ${phase.color}80)`,
                  borderRadius: '16px 0 0 16px',
                }}/>
              )}
              {/* Phase Header */}
              <div
                onClick={() => setExpandedPhase(isExpanded ? null : phaseIndex)}
                style={{
                  padding: '16px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  transition: 'background 0.2s',
                  background: isExpanded ? (isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(248, 250, 252, 0.5)') : 'transparent',
                }}
              >
                {/* Phase Icon */}
                <div style={{
                  position: 'relative',
                }}>
                  {/* Pulsing ring for active/denial phase */}
                  {effectiveActive && (
                    <div style={{
                      position: 'absolute',
                      inset: '-4px',
                      borderRadius: '18px',
                      background: `${phase.color}20`,
                      animation: 'activeNodePulse 2s ease-in-out infinite',
                    }} />
                  )}
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: effectiveCompleted || effectiveActive ? phase.color : isDark ? 'rgba(51, 65, 85, 0.6)' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: effectiveActive ? `0 4px 20px ${phase.color}50, 0 0 0 3px ${phase.color}30` : 'none',
                    position: 'relative',
                    zIndex: 1,
                  }}>
                    {effectiveCompleted ? <CheckCircle size={22} color="#fff" /> : isDenialPhase ? <XCircle size={22} color="#fff" /> : <PhaseIcon size={22} color={effectiveActive ? '#fff' : theme.textMuted} />}
                  </div>
                </div>

                {/* Phase Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: theme.textPrimary }}>{phase.name}</span>
                    {phase.isAlternate && (
                      <span style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: '#ef444420',
                        color: '#ef4444',
                        letterSpacing: '0.05em',
                      }}>
                        ALTERNATE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: theme.textSecondary }}>
                    {phase.description}
                  </div>
                </div>

                {/* Stats & Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right', marginRight: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: theme.textMuted }}>{phase.stages.length} stages</div>
                    {phaseApiCalls.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 500 }}>{phaseApiCalls.length} API calls</div>
                    )}
                  </div>
                  <div style={{
                    padding: effectiveActive ? '8px 16px' : '6px 14px',
                    borderRadius: '20px',
                    background: effectiveCompleted ? theme.completed.bg : effectiveActive ? `${phase.color}20` : theme.pending.bg,
                    color: effectiveCompleted ? theme.completed.text : effectiveActive ? phase.color : theme.pending.text,
                    fontSize: effectiveActive ? '0.8125rem' : '0.75rem',
                    fontWeight: effectiveActive ? 700 : 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: effectiveActive ? `2px solid ${phase.color}50` : 'none',
                    animation: effectiveActive ? 'statusBadgePulse 2s ease-in-out infinite' : 'none',
                    textTransform: effectiveActive ? 'uppercase' : 'none',
                    letterSpacing: effectiveActive ? '0.05em' : 'normal',
                  }}>
                    {effectiveCompleted ? <CheckCircle size={14} /> : effectiveActive ? <div style={{ width: 10, height: 10, borderRadius: '50%', background: phase.color, animation: 'pulse 1.5s infinite', boxShadow: `0 0 8px ${phase.color}` }} /> : <Circle size={14} />}
                    {effectiveCompleted ? 'Done' : isDenialPhase ? 'DENIED' : effectiveActive ? 'In Progress' : 'Pending'}
                  </div>
                  <ChevronDown size={20} color={theme.textMuted} style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
                </div>
              </div>

              {/* Expanded Stages */}
              {isExpanded && (
                <div
                  ref={(el) => { phaseContentRefs.current[phaseIndex] = el; }}
                  style={{ borderTop: `1px solid ${theme.border}` }}
                >
                  {phase.stages.map((stage, stageIndex) => {
                    const stageKey = `${phaseIndex}-${stageIndex}`;
                    const isStageExpanded = expandedStage === stageKey;
                    const stageApiCalls = stage.apis.flatMap(api => getApiCallsForApi(api));
                    const StageIcon = stage.icon;

                    // Calculate individual stage completion status
                    // Use localCurrentStageNum for optimistic updates if set
                    const globalStageNum = parseInt(stage.num, 10);
                    const currentBackendPhase = application?.current_phase || '';
                    const backendStageNum = BACKEND_PHASE_TO_STAGE[currentBackendPhase] || 1;
                    const effectiveCurrentStageNum = localCurrentStageNum !== null ? localCurrentStageNum : backendStageNum;
                    const effectiveCompleted = localCompletedStatus || isCompleted;
                    const isStageCompleted = effectiveCompleted || globalStageNum < effectiveCurrentStageNum;
                    const isStageActive = !effectiveCompleted && globalStageNum === effectiveCurrentStageNum;
                    const isStagePending = !effectiveCompleted && globalStageNum > effectiveCurrentStageNum;

                    return (
                      <div key={stageIndex} ref={(el) => { stageRowRefs.current[globalStageNum] = el; }}>
                        {/* Stage Row */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedStage(isStageExpanded ? null : stageKey);
                          }}
                          style={{
                            padding: '14px 20px 14px 24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            background: isStageCompleted
                              ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)')
                              : isStageExpanded
                                ? theme.stageBg
                                : isStageActive
                                  ? (isDark ? `${phase.color}25` : `${phase.color}15`)
                                  : 'transparent',
                            borderBottom: `1px solid ${theme.borderLight}`,
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            opacity: isStagePending ? 0.6 : 1,
                            borderLeft: isStageCompleted
                              ? '4px solid #10b981'
                              : isStageActive
                                ? `4px solid ${phase.color}`
                                : '4px solid transparent',
                          }}
                        >
                          {/* Stage Number */}
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: isStageCompleted ? '#10b981' : isStageActive ? `${phase.color}15` : 'transparent',
                            border: `1.5px solid ${isStageCompleted ? '#10b981' : isStageActive ? phase.color : theme.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: isStageCompleted ? '#fff' : isStageActive ? phase.color : theme.textMuted,
                            fontFamily: 'monospace',
                            boxShadow: isStageCompleted ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                          }}>
                            {isStageCompleted ? <CheckCircle size={16} /> : stage.num}
                          </div>

                          {/* Stage Icon */}
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: isStageCompleted
                              ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)')
                              : isDark ? 'rgba(51, 65, 85, 0.4)' : '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <StageIcon size={18} color={isStageCompleted ? '#10b981' : isStageActive ? phase.color : theme.textMuted} />
                          </div>

                          {/* Stage Info */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                              <span style={{
                                fontSize: '0.875rem',
                                fontWeight: isStageCompleted ? 700 : 600,
                                color: isStageCompleted ? '#10b981' : isStageActive ? phase.color : theme.textPrimary,
                              }}>
                                {stage.label}
                              </span>
                              {/* Completed badge */}
                              {isStageCompleted && (
                                <span style={{
                                  fontSize: '0.5625rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: '#10b981',
                                  color: '#fff',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}>
                                  <CheckCircle size={10} />
                                  Done
                                </span>
                              )}
                              {/* Active badge */}
                              {isStageActive && (
                                <span style={{
                                  fontSize: '0.5625rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: phase.color,
                                  color: '#fff',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  animation: 'pulse 2s infinite',
                                }}>
                                  Current
                                </span>
                              )}
                              {stage.interactionType && (
                                <span style={{
                                  fontSize: '0.5625rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: stage.interactionType === 'call' ? '#dbeafe' :
                                             stage.interactionType === 'email' ? '#fce7f3' :
                                             stage.interactionType === 'document' ? '#d1fae5' :
                                             stage.interactionType === 'review' ? '#fef3c7' :
                                             stage.interactionType === 'decision' ? '#f3e8ff' :
                                             stage.interactionType === 'system' ? '#e0e7ff' : '#f1f5f9',
                                  color: stage.interactionType === 'call' ? '#1d4ed8' :
                                         stage.interactionType === 'email' ? '#be185d' :
                                         stage.interactionType === 'document' ? '#059669' :
                                         stage.interactionType === 'review' ? '#d97706' :
                                         stage.interactionType === 'decision' ? '#7c3aed' :
                                         stage.interactionType === 'system' ? '#4f46e5' : '#64748b',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                }}>
                                  {stage.interactionType === 'call' ? '📞 Call' :
                                   stage.interactionType === 'email' ? '📧 Email' :
                                   stage.interactionType === 'document' ? '📄 Document' :
                                   stage.interactionType === 'review' ? '🔍 Review' :
                                   stage.interactionType === 'decision' ? '⚖️ Decision' :
                                   stage.interactionType === 'system' ? '🤖 System' :
                                   stage.interactionType === 'assignment' ? '👤 Assignment' :
                                   stage.interactionType === 'analysis' ? '📊 Analysis' :
                                   stage.interactionType === 'verification' ? '✓ Verify' :
                                   stage.interactionType === 'completion' ? '🎉 Complete' : stage.interactionType}
                                </span>
                              )}
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: isStageCompleted ? (isDark ? '#86efac' : '#166534') : theme.textSecondary,
                            }}>{stage.description}</div>
                            <div style={{
                              fontSize: '0.6875rem',
                              color: isStageCompleted ? (isDark ? '#6ee7b7' : '#15803d') : theme.textMuted,
                              marginTop: '2px',
                            }}>{stage.details}</div>
                          </div>

                          {/* API/Conversation Indicator */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {stage.conversation && stage.conversation.length > 0 && (
                              <span style={{
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                color: '#8b5cf6',
                                padding: '4px 8px',
                                background: isDark ? 'rgba(139, 92, 246, 0.15)' : '#f5f3ff',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}>
                                <MessageSquare size={12} />
                                {stage.conversation.length} msgs
                              </span>
                            )}
                            {stageApiCalls.length > 0 && (
                              <>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {stage.apis.slice(0, 3).map((apiName, i) => {
                                    const detail = getApiDetail(apiName);
                                    const ApiIcon = detail.icon;
                                    return (
                                      <div
                                        key={i}
                                        style={{
                                          width: '28px',
                                          height: '28px',
                                          borderRadius: '6px',
                                          background: `${detail.color}15`,
                                          border: `1px solid ${detail.color}30`,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                        title={apiName}
                                      >
                                        <ApiIcon size={14} color={detail.color} />
                                      </div>
                                    );
                                  })}
                                </div>
                                <span style={{
                                  fontSize: '0.6875rem',
                                  fontWeight: 600,
                                  color: '#3b82f6',
                                  padding: '4px 8px',
                                  background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                                  borderRadius: '6px',
                                }}>
                                  {stageApiCalls.length} API
                                </span>
                              </>
                            )}
                            {/* Complete Task Button - show on all non-completed tasks for manual updates */}
                            {/* This allows stakeholders to manually complete any task regardless of order */}
                            {/* Hide when application is at terminal state (truly completed) */}
                            {!isStageCompleted && application?.status !== 'DENIED' && !isCompletingTask && !effectiveIsCompleted && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setIsCompletingTask(true);
                                  try {
                                    const response = await fetch(`/api/applications/${application?.application_id}/complete-current-task?updated_by=UI User`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                    });
                                    if (response.ok) {
                                      // For manual completion: completing task N means all tasks 1..N are done
                                      // Next task to work on is N+1
                                      const nextStageNum = globalStageNum + 1;
                                      const totalStages = 16;

                                      // Map stage to backend phase name
                                      const STAGE_TO_BACKEND_PHASE = {
                                        1: 'INTAKE', 2: 'INTAKE',
                                        3: 'APPLICATION', 4: 'APPLICATION',
                                        5: 'DISCLOSURE', 6: 'DISCLOSURE',
                                        7: 'LOAN_REVIEW', 8: 'LOAN_REVIEW',
                                        9: 'UNDERWRITING', 10: 'UNDERWRITING',
                                        11: 'COMMITMENT', 12: 'COMMITMENT',
                                        13: 'CLOSING', 14: 'CLOSING',
                                        15: 'POST_CLOSING', 16: 'POST_CLOSING',
                                      };

                                      if (nextStageNum > totalStages) {
                                        // Workflow completed - update all indicators
                                        setLocalCompletedStatus(true);
                                        setLocalCurrentStageNum(totalStages + 1);
                                        setLocalStatus('COMPLETED');
                                        setLocalCurrentPhase('POST_CLOSING');

                                        // Notify parent to update table row display
                                        if (onApplicationUpdate) {
                                          onApplicationUpdate({
                                            ...application,
                                            status: 'COMPLETED',
                                            current_phase: 'POST_CLOSING',
                                            current_node: 'end_loan_closed',
                                          });
                                        }

                                        // Collapse all phases to show the completed view
                                        setExpandedPhase(null);

                                        // Scroll to top to show completion status
                                        setTimeout(() => {
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }, 300);
                                      } else {
                                        // Move to next stage
                                        const nextPhase = STAGE_TO_BACKEND_PHASE[nextStageNum] || application?.current_phase;
                                        setLocalCurrentStageNum(nextStageNum);
                                        setLocalCurrentPhase(nextPhase);

                                        // Notify parent to update table row display
                                        if (onApplicationUpdate) {
                                          onApplicationUpdate({
                                            ...application,
                                            current_phase: nextPhase,
                                          });
                                        }

                                        // Find which phase contains the next stage and expand it
                                        let stageCounter = 0;
                                        for (let pIdx = 0; pIdx < PHASES.length; pIdx++) {
                                          const p = PHASES[pIdx];
                                          if (p.isAlternate) continue;
                                          for (let sIdx = 0; sIdx < p.stages.length; sIdx++) {
                                            const stageNum = parseInt(p.stages[sIdx].num, 10);
                                            if (stageNum === nextStageNum) {
                                              // Expand this phase
                                              setExpandedPhase(pIdx);
                                              // Scroll to the next stage after a short delay
                                              setTimeout(() => {
                                                const nextStageRef = stageRowRefs.current[nextStageNum];
                                                if (nextStageRef) {
                                                  nextStageRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }
                                              }, 300);
                                              break;
                                            }
                                          }
                                        }
                                      }
                                    } else {
                                      // Parse error response for more descriptive message
                                      let errorMessage = 'Failed to complete task.';
                                      try {
                                        const errorData = await response.json();
                                        if (errorData.detail) {
                                          if (errorData.detail.includes('current_phase') || errorData.detail.includes('Invalid phase')) {
                                            errorMessage = 'This application has already been completed or is in an invalid state.';
                                          } else {
                                            errorMessage = errorData.detail;
                                          }
                                        }
                                      } catch {
                                        // If we can't parse JSON, use generic message
                                      }
                                      console.warn('Task completion failed:', response.status, errorMessage);
                                      // Only show alert for non-400 errors (400 usually means already completed)
                                      if (response.status !== 400) {
                                        alert(errorMessage + ' Please try again.');
                                      }
                                    }
                                  } catch (err) {
                                    console.error('Error completing task:', err);
                                    alert('Error completing task. Please check your connection and try again.');
                                  } finally {
                                    setIsCompletingTask(false);
                                  }
                                }}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                  color: '#fff',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                                  transition: 'transform 0.2s, box-shadow 0.2s',
                                  whiteSpace: 'nowrap',
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.4)';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(34, 197, 94, 0.3)';
                                }}
                              >
                                <CheckCircle size={14} />
                                Complete
                              </button>
                            )}
                            {/* Loading indicator while completing */}
                            {isStageActive && isCompletingTask && (
                              <div style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                background: 'rgba(34, 197, 94, 0.2)',
                                color: '#22c55e',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}>
                                <Loader2 size={14} style={{ animation: 'spinLoader 1s linear infinite' }} />
                                Completing...
                              </div>
                            )}
                            <ChevronRight size={16} color={theme.textMuted} style={{ transform: isStageExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                          </div>
                        </div>

                        {/* Expanded Stage Details */}
                        {isStageExpanded && (
                          <div
                            ref={(el) => { stageContentRefs.current[stageKey] = el; }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ padding: '16px 24px', background: theme.stageBg }}
                          >
                            {/* Highlighted Panel Container */}
                            <div style={{
                              background: isDark ? 'rgba(30, 41, 59, 0.95)' : '#ffffff',
                              borderRadius: '16px',
                              border: `2px solid ${phase.color}`,
                              boxShadow: isDark
                                ? `0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px ${phase.color}30, inset 0 1px 0 rgba(255,255,255,0.05)`
                                : `0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px ${phase.color}20`,
                              overflow: 'hidden',
                            }}>
                              {/* Panel Header */}
                              <div style={{
                                background: `linear-gradient(135deg, ${phase.color}, ${phase.color}dd)`,
                                padding: '14px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}>
                                    <StageIcon size={20} color="#fff" />
                                  </div>
                                  <div>
                                    <div style={{
                                      fontSize: '1rem',
                                      fontWeight: 700,
                                      color: '#fff',
                                    }}>
                                      {stage.num}. {stage.label}
                                    </div>
                                    <div style={{
                                      fontSize: '0.75rem',
                                      color: 'rgba(255,255,255,0.8)',
                                    }}>
                                      {stage.description}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {stage.conversation && stage.conversation.length > 0 && (
                                    <span style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      color: '#fff',
                                      padding: '4px 10px',
                                      background: 'rgba(255,255,255,0.2)',
                                      borderRadius: '12px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                    }}>
                                      <MessageSquare size={12} />
                                      {stage.conversation.length} Activities
                                    </span>
                                  )}
                                  {stageApiCalls.length > 0 && (
                                    <span style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      color: '#fff',
                                      padding: '4px 10px',
                                      background: 'rgba(255,255,255,0.2)',
                                      borderRadius: '12px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                    }}>
                                      <Zap size={12} />
                                      {stageApiCalls.length} API Calls
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Panel Content */}
                              <div style={{ padding: '20px' }}>
                                {/* Conversation Flow */}
                                {stage.conversation && stage.conversation.length > 0 && (
                                  <div style={{
                                    marginBottom: stageApiCalls.length > 0 ? '20px' : 0,
                                  }}>
                                    <div style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      color: theme.textSecondary,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.05em',
                                      marginBottom: '16px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      paddingBottom: '10px',
                                      borderBottom: `1px solid ${theme.border}`,
                                    }}>
                                      <MessageSquare size={14} color={phase.color} />
                                      Activity Log
                                    </div>
                                {/* Timeline */}
                                <div style={{ position: 'relative', paddingLeft: '24px' }}>
                                  {/* Vertical line */}
                                  <div style={{
                                    position: 'absolute',
                                    left: '11px',
                                    top: '20px',
                                    bottom: '20px',
                                    width: '2px',
                                    background: isDark ? 'rgba(100, 116, 139, 0.3)' : '#e2e8f0',
                                    borderRadius: '1px',
                                  }} />

                                  {stage.conversation.map((msg, msgIdx) => {
                                    const MsgIcon = msg.icon;
                                    const isCustomer = msg.role === 'customer';
                                    const isSystem = msg.role === 'system';
                                    const isAgent = msg.role === 'agent';

                                    const bgColor = isCustomer ? '#3b82f6' : isSystem ? (isDark ? 'rgba(139, 92, 246, 0.2)' : '#f5f3ff') : (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5');
                                    const borderColor = isCustomer ? '#3b82f6' : isSystem ? (isDark ? 'rgba(139, 92, 246, 0.4)' : '#ddd6fe') : (isDark ? 'rgba(16, 185, 129, 0.4)' : '#a7f3d0');
                                    const dotColor = isCustomer ? '#3b82f6' : isSystem ? '#8b5cf6' : '#10b981';

                                    return (
                                      <div
                                        key={msgIdx}
                                        style={{
                                          position: 'relative',
                                          marginBottom: msgIdx < stage.conversation.length - 1 ? '16px' : 0,
                                        }}
                                      >
                                        {/* Timeline dot */}
                                        <div style={{
                                          position: 'absolute',
                                          left: '-24px',
                                          top: '6px',
                                          width: '24px',
                                          height: '24px',
                                          borderRadius: '50%',
                                          background: isDark ? '#1e293b' : '#fff',
                                          border: `3px solid ${dotColor}`,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          zIndex: 1,
                                        }}>
                                          <MsgIcon size={10} color={dotColor} />
                                        </div>

                                        {/* Message card */}
                                        <div style={{
                                          marginLeft: '16px',
                                          background: isCustomer ? bgColor : bgColor,
                                          border: `1px solid ${borderColor}`,
                                          borderRadius: '12px',
                                          padding: '12px 16px',
                                          borderLeft: isSystem ? `3px solid ${dotColor}` : `1px solid ${borderColor}`,
                                        }}>
                                          {/* Header row */}
                                          <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: '8px',
                                          }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                color: isCustomer ? '#fff' : dotColor,
                                              }}>
                                                {isCustomer ? '👤 Customer' : isSystem ? '🤖 System' : `👩‍💼 ${msg.agent || 'Agent'}`}
                                              </span>
                                              {msg.status && (
                                                <span style={{
                                                  fontSize: '0.625rem',
                                                  fontWeight: 600,
                                                  padding: '2px 8px',
                                                  borderRadius: '10px',
                                                  background: msg.status === 'success' ? '#dcfce7' : msg.status === 'denied' ? '#fee2e2' : msg.status === 'processing' ? '#dbeafe' : '#f1f5f9',
                                                  color: msg.status === 'success' ? '#16a34a' : msg.status === 'denied' ? '#dc2626' : msg.status === 'processing' ? '#2563eb' : '#64748b',
                                                  textTransform: 'uppercase',
                                                  letterSpacing: '0.03em',
                                                }}>
                                                  {msg.status === 'success' ? '✓ Success' : msg.status === 'denied' ? '✗ Denied' : msg.status === 'processing' ? '◉ Processing' : msg.status}
                                                </span>
                                              )}
                                            </div>
                                            {msg.time && (
                                              <span style={{
                                                fontSize: '0.6875rem',
                                                color: isCustomer ? 'rgba(255,255,255,0.8)' : theme.textMuted,
                                                fontFamily: 'monospace',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                              }}>
                                                <Clock size={10} />
                                                {msg.time}
                                              </span>
                                            )}
                                          </div>

                                          {/* Message text */}
                                          <div style={{
                                            fontSize: '0.875rem',
                                            lineHeight: 1.6,
                                            color: isCustomer ? '#fff' : theme.textPrimary,
                                            fontWeight: 500,
                                          }}>
                                            {msg.text}
                                          </div>

                                          {/* Extra data cards */}
                                          {(msg.result || msg.checklist || msg.terms || msg.conditions || msg.reasons || msg.updates || msg.appointment || msg.nextSteps) && (
                                            <div style={{
                                              marginTop: '10px',
                                              padding: '10px 12px',
                                              background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)',
                                              borderRadius: '8px',
                                              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                                            }}>
                                              {msg.result && typeof msg.result === 'object' && (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                                  {Object.entries(msg.result).map(([key, val]) => (
                                                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                                      <span style={{ color: theme.textMuted, textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}:</span>
                                                      <span style={{ fontWeight: 600, color: theme.textPrimary, fontFamily: 'monospace' }}>{val}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                              {msg.checklist && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                  {msg.checklist.map((item, i) => (
                                                    <div key={i} style={{ fontSize: '0.75rem', color: theme.textPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                      <CheckCircle size={12} color="#10b981" />
                                                      {item.replace(' ✓', '')}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                              {msg.terms && (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                                  {Object.entries(msg.terms).map(([key, val]) => (
                                                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                                      <span style={{ color: theme.textMuted, textTransform: 'capitalize' }}>{key}:</span>
                                                      <span style={{ fontWeight: 600, color: theme.textPrimary }}>{val}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                              {msg.conditions && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#f59e0b', marginBottom: '4px' }}>📋 CONDITIONS:</span>
                                                  {msg.conditions.map((item, i) => (
                                                    <div key={i} style={{ fontSize: '0.75rem', color: theme.textPrimary, paddingLeft: '12px' }}>• {item}</div>
                                                  ))}
                                                </div>
                                              )}
                                              {msg.reasons && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>⚠️ DENIAL REASONS:</span>
                                                  {msg.reasons.map((item, i) => (
                                                    <div key={i} style={{ fontSize: '0.75rem', color: theme.textPrimary, paddingLeft: '12px' }}>• {item}</div>
                                                  ))}
                                                </div>
                                              )}
                                              {msg.updates && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                  {msg.updates.map((item, i) => (
                                                    <div key={i} style={{ fontSize: '0.75rem', color: theme.textPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                      <CheckCircle size={12} color="#10b981" />
                                                      {item}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                              {msg.appointment && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                  <div style={{ fontSize: '0.75rem', display: 'flex', gap: '8px' }}>
                                                    <span style={{ color: theme.textMuted }}>📅 Date:</span>
                                                    <span style={{ fontWeight: 600, color: theme.textPrimary }}>{msg.appointment.date}</span>
                                                  </div>
                                                  <div style={{ fontSize: '0.75rem', display: 'flex', gap: '8px' }}>
                                                    <span style={{ color: theme.textMuted }}>🕐 Time:</span>
                                                    <span style={{ fontWeight: 600, color: theme.textPrimary }}>{msg.appointment.time}</span>
                                                  </div>
                                                  <div style={{ fontSize: '0.75rem', display: 'flex', gap: '8px' }}>
                                                    <span style={{ color: theme.textMuted }}>📍 Location:</span>
                                                    <span style={{ fontWeight: 600, color: theme.textPrimary }}>{msg.appointment.location}</span>
                                                  </div>
                                                </div>
                                              )}
                                              {msg.nextSteps && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#10b981', marginBottom: '4px' }}>📬 NEXT STEPS:</span>
                                                  {msg.nextSteps.map((item, i) => (
                                                    <div key={i} style={{ fontSize: '0.75rem', color: theme.textPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                      <span style={{ color: '#10b981' }}>→</span>
                                                      {item}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* API Calls - Collapsible */}
                            {stageApiCalls.length > 0 && (
                              <div ref={(el) => { apiSectionRefs.current[`${phase.id}-${stage.num}`] = el; }}>
                                <button
                                  onClick={() => {
                                    const key = `${phase.id}-${stage.num}`;
                                    const isExpanding = !expandedApiCalls[key];
                                    setExpandedApiCalls(prev => ({
                                      ...prev,
                                      [key]: !prev[key]
                                    }));
                                    if (isExpanding) {
                                      setTimeout(() => {
                                        const ref = apiSectionRefs.current[key];
                                        if (ref) {
                                          ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }
                                      }, 100);
                                    }
                                  }}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    background: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(241, 245, 249, 0.8)',
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    marginBottom: expandedApiCalls[`${phase.id}-${stage.num}`] ? '12px' : 0,
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}>
                                    <Zap size={14} color={theme.textSecondary} />
                                    <span style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      color: theme.textSecondary,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.05em',
                                    }}>
                                      API Calls
                                    </span>
                                    <span style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      padding: '2px 8px',
                                      borderRadius: '10px',
                                      background: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                                      color: '#3b82f6',
                                    }}>
                                      {stageApiCalls.length}
                                    </span>
                                    {stageApiCalls.some(c => checkDenialCause(c).isDenialCause) && (
                                      <span style={{
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        color: '#ef4444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}>
                                        <AlertTriangle size={10} />
                                        DENIAL
                                      </span>
                                    )}
                                  </div>
                                  <ChevronDown
                                    size={16}
                                    color={theme.textSecondary}
                                    style={{
                                      transform: expandedApiCalls[`${phase.id}-${stage.num}`] ? 'rotate(180deg)' : 'rotate(0deg)',
                                      transition: 'transform 0.2s ease',
                                    }}
                                  />
                                </button>
                                {expandedApiCalls[`${phase.id}-${stage.num}`] && stageApiCalls.map((call, callIdx) => {
                              const detail = getApiDetail(call.api_name);
                              const ApiIcon = detail.icon;
                              const methodColor = METHOD_COLORS[call.method] || METHOD_COLORS['GET'];
                              const denialCheck = checkDenialCause(call);

                              return (
                                <div
                                  key={call.id || callIdx}
                                  style={{
                                    background: denialCheck.isDenialCause
                                      ? (isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(254, 226, 226, 0.8)')
                                      : theme.cardBg,
                                    borderRadius: '14px',
                                    padding: '18px',
                                    marginBottom: callIdx < stageApiCalls.length - 1 ? '12px' : 0,
                                    border: denialCheck.isDenialCause
                                      ? '2px solid #ef4444'
                                      : `1px solid ${theme.border}`,
                                    position: 'relative',
                                  }}
                                >
                                  {/* Cause of Denial Badge */}
                                  {denialCheck.isDenialCause && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-10px',
                                      right: '16px',
                                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                      color: '#fff',
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      padding: '5px 12px',
                                      borderRadius: '12px',
                                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      letterSpacing: '0.03em',
                                    }}>
                                      <AlertTriangle size={12} />
                                      CAUSE OF DENIAL
                                    </div>
                                  )}
                                  {/* API Header */}
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px', marginTop: denialCheck.isDenialCause ? '8px' : 0 }}>
                                    <div style={{
                                      width: '44px',
                                      height: '44px',
                                      borderRadius: '12px',
                                      background: denialCheck.isDenialCause
                                        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                        : `linear-gradient(135deg, ${detail.color}, ${detail.color}cc)`,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}>
                                      <ApiIcon size={22} color="#fff" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '1rem', fontWeight: 700, color: denialCheck.isDenialCause ? '#dc2626' : theme.textPrimary }}>{call.api_name}</span>
                                        <span style={{
                                          fontSize: '0.625rem',
                                          fontWeight: 700,
                                          padding: '3px 8px',
                                          borderRadius: '4px',
                                          background: denialCheck.isDenialCause ? 'rgba(239, 68, 68, 0.15)' : `${detail.color}20`,
                                          color: denialCheck.isDenialCause ? '#dc2626' : detail.color,
                                          letterSpacing: '0.05em',
                                        }}>
                                          {detail.category.toUpperCase()}
                                        </span>
                                      </div>
                                      {/* Denial Reason */}
                                      {denialCheck.isDenialCause && denialCheck.reason && (
                                        <div style={{
                                          fontSize: '0.8rem',
                                          color: '#dc2626',
                                          fontWeight: 600,
                                          marginBottom: '8px',
                                          padding: '8px 12px',
                                          background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(254, 202, 202, 0.5)',
                                          borderRadius: '8px',
                                          borderLeft: '3px solid #ef4444',
                                        }}>
                                          {denialCheck.reason}
                                        </div>
                                      )}
                                      <div style={{ fontSize: '0.8125rem', color: theme.textSecondary, marginBottom: '6px' }}>
                                        {detail.description}
                                      </div>
                                      <div style={{
                                        fontSize: '0.75rem',
                                        color: theme.textMuted,
                                        padding: '10px 14px',
                                        background: isDark ? 'rgba(51, 65, 85, 0.4)' : '#f8fafc',
                                        borderRadius: '8px',
                                        borderLeft: `3px solid ${detail.color}`,
                                        lineHeight: 1.5,
                                      }}>
                                        <div style={{ marginBottom: '4px' }}>
                                          <strong style={{ color: theme.textSecondary }}>What this call does:</strong>
                                        </div>
                                        <div style={{ color: isDark ? '#e2e8f0' : '#334155' }}>
                                          {getApiPurpose(call.api_name, call.endpoint)}
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        background: methodColor.bg,
                                        marginBottom: '6px',
                                      }}>
                                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: methodColor.text }}>{call.method}</span>
                                      </div>
                                      <div style={{ fontSize: '0.6875rem', color: theme.textMuted, fontFamily: 'monospace' }}>{call.endpoint}</div>
                                      <div style={{
                                        marginTop: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: call.duration_ms < 100 ? '#10b981' : call.duration_ms < 500 ? '#f59e0b' : '#ef4444',
                                      }}>
                                        {call.duration_ms}ms
                                      </div>
                                    </div>
                                  </div>

                                  {/* Request/Response */}
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {/* Request */}
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{
                                          fontSize: '0.6875rem',
                                          fontWeight: 700,
                                          color: '#10b981',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}>
                                          <Upload size={12} /> REQUEST
                                        </span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                          <button
                                            onClick={() => openJsonModal(`${call.api_name} - ${call.endpoint}`, call.request_data, 'request')}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              padding: '4px 8px',
                                              fontSize: '0.625rem',
                                              fontWeight: 600,
                                              background: '#10b98115',
                                              border: `1px solid #10b98140`,
                                              borderRadius: '5px',
                                              cursor: 'pointer',
                                              color: '#10b981',
                                            }}
                                            title="Expand JSON"
                                          >
                                            <Maximize2 size={10} />
                                            Expand
                                          </button>
                                          <button
                                            onClick={() => copyToClipboard(call.request_data, `req-${call.id}`)}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              padding: '4px 8px',
                                              fontSize: '0.625rem',
                                              fontWeight: 600,
                                              background: copiedId === `req-${call.id}` ? '#10b98120' : 'transparent',
                                              border: `1px solid ${theme.border}`,
                                              borderRadius: '5px',
                                              cursor: 'pointer',
                                              color: copiedId === `req-${call.id}` ? '#10b981' : theme.textSecondary,
                                            }}
                                          >
                                            {copiedId === `req-${call.id}` ? <Check size={10} /> : <Copy size={10} />}
                                            {copiedId === `req-${call.id}` ? 'Copied!' : 'Copy'}
                                          </button>
                                        </div>
                                      </div>
                                      <pre style={{
                                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                        fontSize: '0.6875rem',
                                        lineHeight: 1.6,
                                        background: theme.codeBg,
                                        color: '#86efac',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        overflow: 'auto',
                                        maxHeight: '160px',
                                        margin: 0,
                                      }}>
                                        {formatJson(call.request_data)}
                                      </pre>
                                    </div>

                                    {/* Response */}
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{
                                          fontSize: '0.6875rem',
                                          fontWeight: 700,
                                          color: '#3b82f6',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}>
                                          <Download size={12} /> RESPONSE
                                        </span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                          <button
                                            onClick={() => openJsonModal(`${call.api_name} - ${call.endpoint}`, call.response_data, 'response')}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              padding: '4px 8px',
                                              fontSize: '0.625rem',
                                              fontWeight: 600,
                                              background: '#3b82f615',
                                              border: `1px solid #3b82f640`,
                                              borderRadius: '5px',
                                              cursor: 'pointer',
                                              color: '#3b82f6',
                                            }}
                                            title="Expand JSON"
                                          >
                                            <Maximize2 size={10} />
                                            Expand
                                          </button>
                                          <button
                                            onClick={() => copyToClipboard(call.response_data, `res-${call.id}`)}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              padding: '4px 8px',
                                              fontSize: '0.625rem',
                                              fontWeight: 600,
                                              background: copiedId === `res-${call.id}` ? '#3b82f620' : 'transparent',
                                              border: `1px solid ${theme.border}`,
                                              borderRadius: '5px',
                                              cursor: 'pointer',
                                              color: copiedId === `res-${call.id}` ? '#3b82f6' : theme.textSecondary,
                                            }}
                                          >
                                            {copiedId === `res-${call.id}` ? <Check size={10} /> : <Copy size={10} />}
                                            {copiedId === `res-${call.id}` ? 'Copied!' : 'Copy'}
                                          </button>
                                        </div>
                                      </div>
                                      <pre style={{
                                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                        fontSize: '0.6875rem',
                                        lineHeight: 1.6,
                                        background: theme.codeBg,
                                        color: '#7dd3fc',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        overflow: 'auto',
                                        maxHeight: '160px',
                                        margin: 0,
                                      }}>
                                        {formatJson(call.response_data)}
                                      </pre>
                                    </div>
                                  </div>
                                </div>
                              );
                                })}
                              </div>
                            )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

export default WorkflowStageTracker;
