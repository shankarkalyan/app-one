import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, Plus, ChevronLeft, ChevronRight, Sun, Moon, Loader2, FileText, Layers, GitBranch, RefreshCw, Home } from 'lucide-react';
import { createApplication, healthCheck } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const STEPS = [
  { id: 0, label: 'Loan Info' },
  { id: 1, label: 'Personal' },
  { id: 2, label: 'Employment' },
  { id: 3, label: 'Income' },
  { id: 4, label: 'Assets' },
  { id: 5, label: 'Liabilities' },
  { id: 6, label: 'Property' },
  { id: 7, label: 'Declarations' },
  { id: 8, label: 'Review' },
];

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const DEFAULT_FORM_DATA = {
  // Loan Info
  loanType: 'Conventional',
  loanPurpose: 'Purchase',
  loanAmount: '250000',
  interestRate: '6.5%',
  loanTerm: '360',
  amortizationType: 'fixed',
  propertyStreet: '123 Main Street, Apt 4B',
  propertyCity: 'Springfield',
  propertyState: 'IL',
  propertyZip: '62701',
  propertyCounty: 'Sangamon',
  propertyUnits: '1',
  propertyUse: 'Primary Residence',
  propertyYearBuilt: '2005',
  // Personal
  firstName: 'John',
  middleName: 'Robert',
  lastName: 'Smith',
  suffix: '',
  dob: '1985-06-15',
  ssn: '1234',
  maritalStatus: 'Married',
  citizenship: 'U.S. Citizen',
  dependents: '2',
  dependentAges: '8, 12',
  homePhone: '5551234567',
  cellPhone: '5559876543',
  email: 'john.smith@example.com',
  currentStreet: '456 Oak Avenue',
  currentCity: 'Springfield',
  currentState: 'IL',
  currentZip: '62702',
  currentYears: '5',
  housingStatus: 'own',
  monthlyRent: '1500',
  hasCoBorrower: false,
  // Employment
  employerName: 'Acme Corporation',
  employerPhone: '5555551234',
  employerAddress: '789 Business Park Drive, Springfield, IL 62703',
  jobTitle: 'Senior Software Engineer',
  employmentStartDate: '2018-03-01',
  yearsInProfession: '12',
  employmentType: 'employed',
  monthlyBase: '8500',
  monthlyOvertime: '500',
  monthlyBonus: '1000',
  monthlyCommission: '0',
  monthlyDividend: '200',
  otherMonthlyIncome: '0',
  // Assets
  bankAccounts: [
    { institution: 'Chase Bank', type: 'Checking', accountNum: '4567', balance: '25000' },
    { institution: 'Bank of America', type: 'Savings', accountNum: '8901', balance: '75000' },
  ],
  otherAssets: [
    { description: '401k Retirement', type: 'Retirement (401k, IRA)', value: '150000' },
  ],
  // Liabilities
  debts: [
    { creditor: 'Toyota Financial', type: 'Auto Loan', accountNum: '1234', payment: '450', balance: '15000', months: '36' },
    { creditor: 'Visa', type: 'Credit Card', accountNum: '5678', payment: '200', balance: '5000', months: '0' },
  ],
  // Property Details
  purchasePrice: '300000',
  estimatedValue: '',
  downPayment: '50000',
  downPaymentSource: 'Savings',
  estimatedClosing: '8000',
  estimatedPrepaid: '3000',
  proposedMortgage: '1500',
  proposedOther: '0',
  proposedHazard: '150',
  proposedTaxes: '400',
  proposedPMI: '100',
  proposedHOA: '50',
  proposedFlood: '0',
  proposedOtherExpense: '0',
  // Declarations
  declarations: {
    a: 'no', b: 'no', c: 'no', d: 'no', e: 'no', f: 'no',
    g: 'no', h: 'no', i: 'no', j: 'yes', k: 'no', l: 'yes', m: 'yes'
  },
  ethnicity: '',
  race: '',
  sex: '',
  // Consent
  consent1: true,
  consent2: true,
  consent3: true,
  signatureName: 'John Robert Smith',
  signatureDate: new Date().toISOString().split('T')[0],
};

const INITIAL_FORM_DATA = {
  loanType: '', loanPurpose: '', loanAmount: '', interestRate: '', loanTerm: '', amortizationType: '',
  propertyStreet: '', propertyCity: '', propertyState: '', propertyZip: '', propertyCounty: '',
  propertyUnits: '1', propertyUse: '', propertyYearBuilt: '',
  firstName: '', middleName: '', lastName: '', suffix: '', dob: '', ssn: '', maritalStatus: '',
  citizenship: '', dependents: '', dependentAges: '', homePhone: '', cellPhone: '', email: '',
  currentStreet: '', currentCity: '', currentState: '', currentZip: '', currentYears: '',
  housingStatus: '', monthlyRent: '', hasCoBorrower: false,
  employerName: '', employerPhone: '', employerAddress: '', jobTitle: '', employmentStartDate: '',
  yearsInProfession: '', employmentType: '', monthlyBase: '', monthlyOvertime: '', monthlyBonus: '',
  monthlyCommission: '', monthlyDividend: '', otherMonthlyIncome: '',
  bankAccounts: [{ institution: '', type: 'Checking', accountNum: '', balance: '' }],
  otherAssets: [{ description: '', type: '', value: '' }],
  debts: [{ creditor: '', type: '', accountNum: '', payment: '', balance: '', months: '' }],
  purchasePrice: '', estimatedValue: '', downPayment: '', downPaymentSource: '', estimatedClosing: '', estimatedPrepaid: '',
  proposedMortgage: '', proposedOther: '', proposedHazard: '', proposedTaxes: '',
  proposedPMI: '', proposedHOA: '', proposedFlood: '', proposedOtherExpense: '',
  declarations: { a: '', b: '', c: '', d: '', e: '', f: '', g: '', h: '', i: '', j: '', k: '', l: '', m: '' },
  ethnicity: '', race: '', sex: '',
  consent1: false, consent2: false, consent3: false, signatureName: '', signatureDate: '',
};

function NewApplication() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState(null);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const autoAdvanceRef = useRef(null);
  const [processingStep, setProcessingStep] = useState(0);
  const processingStepRef = useRef(null);
  const [simulationType, setSimulationType] = useState(null);
  const [showSimulationOptions, setShowSimulationOptions] = useState(false);
  const submitButtonRef = useRef(null);

  // Focus submit button when reaching the last step
  useEffect(() => {
    if (currentStep === STEPS.length - 1 && submitButtonRef.current) {
      setTimeout(() => {
        submitButtonRef.current.focus();
        submitButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [currentStep]);

  // Processing steps animation
  const PROCESSING_STEPS = [
    'Validating application data...',
    'Creating loan application...',
    'Initiating workflow process...',
    'Starting eligibility checks...',
    'Application submitted successfully!',
  ];

  useEffect(() => {
    if (isSubmitting) {
      setProcessingStep(0);
      processingStepRef.current = setInterval(() => {
        setProcessingStep(prev => {
          if (prev < PROCESSING_STEPS.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 800);
    } else {
      if (processingStepRef.current) {
        clearInterval(processingStepRef.current);
      }
    }

    return () => {
      if (processingStepRef.current) {
        clearInterval(processingStepRef.current);
      }
    };
  }, [isSubmitting]);

  // Auto-advance through steps when populating defaults
  useEffect(() => {
    if (isAutoAdvancing && currentStep < STEPS.length - 1) {
      autoAdvanceRef.current = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 400);
    } else if (isAutoAdvancing && currentStep === STEPS.length - 1) {
      setIsAutoAdvancing(false);
    }

    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
      }
    };
  }, [isAutoAdvancing, currentStep]);

  // Chase Blue Theme - Dark mode aware
  const colors = isDark ? {
    navy: '#3b82f6',           // Lighter blue for dark mode
    navyLight: '#60a5fa',      // Light Blue
    navyMid: '#1e3a5f',        // Dark Blue bg
    gold: '#60a5fa',           // Accent Blue
    goldLight: '#1e293b',      // Dark tint
    goldDim: 'rgba(59,130,246,0.15)', // Blue Transparent
    cream: '#0f172a',          // Dark Background
    creamDark: '#1e293b',      // Slightly lighter dark
    white: '#1e293b',          // Card background
    text: '#f1f5f9',           // Light text
    textLight: '#94a3b8',      // Muted text
    red: '#ef4444',            // Error Red
    green: '#10b981',          // Success Green
    border: '#334155',         // Border
    inputBg: '#0f172a',        // Input background
  } : {
    navy: '#0060A9',           // Chase Primary Blue
    navyLight: '#0073CF',      // Chase Light Blue
    navyMid: '#004B87',        // Chase Dark Blue
    gold: '#117ACA',           // Chase Accent Blue
    goldLight: '#E8F4FC',      // Light Blue Tint
    goldDim: 'rgba(17,122,202,0.12)', // Blue Transparent
    cream: '#F5F7FA',          // Light Gray Background
    creamDark: '#E8ECF0',      // Darker Gray
    white: '#ffffff',
    text: '#1A1A1A',           // Near Black
    textLight: '#5A6872',      // Gray Text
    red: '#D03027',            // Error Red
    green: '#008649',          // Success Green
    border: '#D1D9E0',         // Border Gray
    inputBg: '#ffffff',        // Input background
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDeclarationChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      declarations: { ...prev.declarations, [key]: value }
    }));
  };

  const handleArrayChange = (arrayName, index, field, value) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addArrayItem = (arrayName, template) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], template]
    }));
  };

  const populateDefaults = (simType) => {
    setSimulationType(simType);
    setShowSimulationOptions(false);
    setFormData(DEFAULT_FORM_DATA);
    setCurrentStep(0);
    setIsAutoAdvancing(true);
  };

  const showSimulationSelector = () => {
    setShowSimulationOptions(true);
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = (step) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!formData.consent1 || !formData.consent2 || !formData.consent3) {
      setSubmitError('Please check all authorization boxes before submitting.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Map form data to API payload
      const payload = {
        customer_name: `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim(),
        customer_email: formData.email,
        customer_phone: formData.cellPhone.replace(/\D/g, ''),
        ssn_last_four: formData.ssn,
        property_address: `${formData.propertyStreet}, ${formData.propertyCity}, ${formData.propertyState} ${formData.propertyZip}`,
        loan_amount: parseFloat(formData.loanAmount.replace(/[^0-9.]/g, '')) || 0,
        original_borrower: `${formData.firstName} ${formData.lastName}`,
        simulation_type: simulationType,
      };

      const response = await createApplication(payload);

      if (response.application_id) {
        setApplicationId(response.application_id);
        setSubmitted(true);
      } else {
        throw new Error('No application ID returned');
      }
    } catch (error) {
      console.error('Failed to create application:', error);
      setSubmitError(error.response?.data?.detail || error.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Styles
  const styles = {
    container: {
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      backgroundColor: colors.cream,
      color: colors.text,
      minHeight: '100vh',
    },
    header: {
      background: colors.navy,
      padding: '0 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '72px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
    },
    logo: {
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
      color: colors.white,
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    logoSpan: {
      color: colors.goldLight,
      fontWeight: 600,
    },
    hero: {
      background: isDark
        ? 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)'
        : `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyMid} 100%)`,
      padding: '48px 40px 40px',
      textAlign: 'center',
      position: 'relative',
      borderBottom: isDark ? '1px solid #334155' : 'none',
    },
    heroTitle: {
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#fff',
      fontSize: '2.2rem',
      fontWeight: 700,
      marginBottom: '8px',
    },
    heroDesc: {
      color: isDark ? '#94a3b8' : colors.goldLight,
      fontSize: '0.95rem',
      opacity: 0.85,
      margin: 0,
    },
    progressContainer: {
      background: isDark ? '#1e293b' : colors.white,
      borderBottom: `1px solid ${colors.border}`,
      padding: '20px 40px',
      position: 'sticky',
      top: '64px',
      zIndex: 99,
      boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.04)',
    },
    progressSteps: {
      display: 'flex',
      justifyContent: 'center',
      gap: '4px',
      maxWidth: '900px',
      margin: '0 auto',
      flexWrap: 'wrap',
    },
    stepItem: (isActive, isCompleted) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '0.78rem',
      fontWeight: 500,
      color: isActive ? '#fff' : isCompleted ? colors.navy : colors.textLight,
      background: isActive ? (isDark ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' : colors.navy) : isCompleted ? (isDark ? 'rgba(59, 130, 246, 0.2)' : colors.goldDim) : 'transparent',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      transition: 'all 0.3s ease',
      border: 'none',
    }),
    stepNum: (isActive, isCompleted) => ({
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.72rem',
      fontWeight: 700,
      border: `2px solid ${isActive ? colors.gold : isCompleted ? colors.green : colors.border}`,
      background: isActive ? colors.gold : isCompleted ? colors.green : 'transparent',
      color: isActive ? (isDark ? '#fff' : colors.navy) : isCompleted ? '#fff' : colors.textLight,
      flexShrink: 0,
    }),
    formContainer: {
      maxWidth: '920px',
      margin: '0 auto',
      padding: '32px 40px 60px',
    },
    sectionTitle: {
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
      fontSize: '1.5rem',
      color: colors.navy,
      marginBottom: '4px',
      fontWeight: 700,
    },
    sectionDesc: {
      color: colors.textLight,
      fontSize: '0.85rem',
      marginBottom: '28px',
      lineHeight: 1.5,
    },
    card: {
      background: colors.white,
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
      padding: '28px',
      marginBottom: '20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
    },
    cardTitle: {
      fontSize: '0.92rem',
      fontWeight: 700,
      color: colors.navy,
      marginBottom: '20px',
      paddingBottom: '12px',
      borderBottom: `2px solid ${colors.goldDim}`,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    cardIcon: {
      width: '28px',
      height: '28px',
      background: colors.goldDim,
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.85rem',
    },
    formRow: (cols = 2) => ({
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: '16px',
      marginBottom: '4px',
    }),
    field: {
      marginBottom: '16px',
    },
    label: {
      display: 'block',
      fontSize: '0.78rem',
      fontWeight: 600,
      color: colors.text,
      marginBottom: '6px',
      letterSpacing: '0.02em',
    },
    req: {
      color: colors.red,
      marginLeft: '2px',
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '6px',
      fontFamily: "'Segoe UI', sans-serif",
      fontSize: '0.88rem',
      color: colors.text,
      background: colors.inputBg,
      outline: 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '10px 14px',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '6px',
      fontFamily: "'Segoe UI', sans-serif",
      fontSize: '0.88rem',
      color: colors.text,
      background: colors.inputBg,
      outline: 'none',
      appearance: 'none',
      backgroundImage: isDark
        ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")"
        : "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7b8d' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")",
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 12px center',
      paddingRight: '36px',
      boxSizing: 'border-box',
    },
    optionGroup: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      marginBottom: '16px',
    },
    optionItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 18px',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.84rem',
      transition: 'all 0.2s',
      background: colors.inputBg,
      color: colors.text,
    },
    toggleBar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 20px',
      background: isDark ? 'rgba(59, 130, 246, 0.15)' : colors.goldDim,
      borderRadius: '6px',
      marginBottom: '20px',
      fontSize: '0.85rem',
      fontWeight: 600,
      color: colors.navy,
      border: isDark ? `1px solid ${colors.border}` : 'none',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '0.82rem',
      marginBottom: '12px',
    },
    th: {
      background: isDark ? '#1e3a5f' : colors.navy,
      color: '#fff',
      padding: '10px 14px',
      textAlign: 'left',
      fontWeight: 600,
      fontSize: '0.76rem',
      letterSpacing: '0.03em',
    },
    td: {
      padding: '4px 6px',
      borderBottom: `1px solid ${colors.border}`,
    },
    addBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      border: `1.5px dashed ${colors.navy}`,
      borderRadius: '6px',
      background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
      color: colors.navy,
      fontFamily: "'Segoe UI', sans-serif",
      fontSize: '0.82rem',
      fontWeight: 600,
      cursor: 'pointer',
    },
    btnRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '32px',
      paddingTop: '24px',
      borderTop: `1px solid ${colors.border}`,
      opacity: isDark ? 0.9 : 1,
    },
    btn: {
      padding: '12px 32px',
      borderRadius: '6px',
      fontFamily: "'Segoe UI', sans-serif",
      fontSize: '0.88rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
    },
    btnPrimary: {
      background: isDark ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' : colors.navy,
      color: '#fff',
    },
    btnSecondary: {
      background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
      color: colors.navy,
      border: `1.5px solid ${isDark ? colors.navy : colors.border}`,
    },
    btnSubmit: {
      background: isDark ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : colors.navy,
      color: '#fff',
      padding: '14px 40px',
      fontSize: '0.95rem',
      boxShadow: isDark ? '0 4px 12px rgba(16,185,129,0.4)' : '0 4px 12px rgba(0,96,169,0.3)',
    },
    btnPopulate: {
      background: isDark ? 'rgba(59, 130, 246, 0.15)' : colors.goldDim,
      color: colors.navy,
      border: `1.5px solid ${colors.navy}`,
      marginBottom: '20px',
    },
    declQuestion: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginBottom: '14px',
    },
    declText: {
      fontSize: '0.85rem',
      fontWeight: 500,
      color: colors.text,
      lineHeight: 1.5,
    },
    declOptions: {
      display: 'flex',
      gap: '16px',
    },
    consentBox: {
      background: isDark ? colors.inputBg : colors.cream,
      border: `1px solid ${colors.border}`,
      borderRadius: '6px',
      padding: '20px',
      fontSize: '0.82rem',
      lineHeight: 1.65,
      color: colors.textLight,
      maxHeight: '180px',
      overflowY: 'auto',
      marginBottom: '16px',
    },
    declItem: {
      display: 'flex',
      gap: '12px',
      padding: '14px 16px',
      border: `1px solid ${colors.border}`,
      borderRadius: '6px',
      marginBottom: '10px',
      fontSize: '0.84rem',
      lineHeight: 1.55,
      alignItems: 'flex-start',
      color: colors.text,
      background: colors.inputBg,
    },
    successBox: {
      textAlign: 'center',
      padding: '60px 20px',
    },
    successIcon: {
      fontSize: '4rem',
      marginBottom: '16px',
    },
    appRef: {
      background: isDark ? 'rgba(59, 130, 246, 0.15)' : colors.goldDim,
      display: 'inline-block',
      padding: '14px 32px',
      borderRadius: '8px',
      fontFamily: "'Segoe UI', -apple-system, monospace",
      fontSize: '1.3rem',
      fontWeight: 700,
      color: colors.navy,
      letterSpacing: '0.02em',
      marginBottom: '24px',
      border: `2px solid ${colors.navy}`,
    },
    divider: {
      border: 'none',
      borderTop: `1px dashed ${colors.border}`,
      margin: '20px 0',
      opacity: isDark ? 0.5 : 1,
    },
    hint: {
      fontSize: '0.72rem',
      color: colors.textLight,
      marginTop: '4px',
      background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
      padding: isDark ? '8px 12px' : '0',
      borderRadius: isDark ? '6px' : '0',
    },
    errorBox: {
      background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
      border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'}`,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '20px',
      color: colors.red,
      fontSize: '0.88rem',
    },
    processingOverlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 96, 169, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    },
    spinnerContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '24px',
    },
    spinner: {
      width: '80px',
      height: '80px',
      border: '4px solid rgba(255,255,255,0.2)',
      borderTopColor: '#ffffff',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    processingText: {
      color: '#ffffff',
      fontSize: '1.5rem',
      fontWeight: 600,
      textAlign: 'center',
    },
    processingSubtext: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: '0.95rem',
      textAlign: 'center',
      maxWidth: '400px',
      lineHeight: 1.6,
    },
    processingSteps: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginTop: '20px',
    },
    processingStep: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      color: 'rgba(255,255,255,0.9)',
      fontSize: '0.9rem',
    },
    stepDot: (active) => ({
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      background: active ? '#4ade80' : 'rgba(255,255,255,0.3)',
      transition: 'background 0.3s ease',
    }),
    autoAdvanceIndicator: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: isDark ? 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' : colors.navy,
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '0.85rem',
      fontWeight: 500,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      zIndex: 1000,
      border: isDark ? '1px solid #3b82f6' : 'none',
    },
  };

  // Field component
  const Field = ({ label, required, children, style = {} }) => (
    <div style={{ ...styles.field, ...style }}>
      <label style={styles.label}>
        {label} {required && <span style={styles.req}>*</span>}
      </label>
      {children}
    </div>
  );

  // Input component
  const Input = ({ value, onChange, placeholder, type = 'text', ...props }) => (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        ...styles.input,
        '::placeholder': { color: colors.textLight },
      }}
      onFocus={(e) => {
        e.target.style.borderColor = colors.gold;
        e.target.style.boxShadow = `0 0 0 3px ${isDark ? 'rgba(59, 130, 246, 0.25)' : colors.goldDim}`;
      }}
      onBlur={(e) => {
        e.target.style.borderColor = colors.border;
        e.target.style.boxShadow = 'none';
      }}
      {...props}
    />
  );

  // Select component
  const Select = ({ value, onChange, options, placeholder }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={styles.select}
      onFocus={(e) => {
        e.target.style.borderColor = colors.gold;
        e.target.style.boxShadow = `0 0 0 3px ${isDark ? 'rgba(59, 130, 246, 0.25)' : colors.goldDim}`;
      }}
      onBlur={(e) => {
        e.target.style.borderColor = colors.border;
        e.target.style.boxShadow = 'none';
      }}
    >
      <option value="" style={{ background: colors.inputBg, color: colors.textLight }}>{placeholder || 'Select...'}</option>
      {options.map((opt, i) => (
        <option key={i} value={typeof opt === 'string' ? opt : opt.value} style={{ background: colors.inputBg, color: colors.text }}>
          {typeof opt === 'string' ? opt : opt.label}
        </option>
      ))}
    </select>
  );

  // Radio Group
  const RadioGroup = ({ name, value, onChange, options }) => (
    <div style={styles.optionGroup}>
      {options.map((opt, i) => (
        <label
          key={i}
          style={{
            ...styles.optionItem,
            borderColor: value === opt.value ? colors.gold : colors.border,
            background: value === opt.value ? (isDark ? 'rgba(59, 130, 246, 0.2)' : colors.goldDim) : colors.inputBg,
          }}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={(e) => onChange(e.target.value)}
            style={{ accentColor: colors.navy }}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );

  // Declaration Question
  const DeclQuestion = ({ letter, text, value, onChange }) => (
    <div style={styles.declQuestion}>
      <div style={{ ...styles.declText, color: colors.text }}>{letter}. {text}</div>
      <div style={styles.declOptions}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', cursor: 'pointer', color: colors.text }}>
          <input type="radio" name={`decl_${letter}`} value="yes" checked={value === 'yes'} onChange={() => onChange('yes')} style={{ accentColor: colors.navy }} /> Yes
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', cursor: 'pointer', color: colors.text }}>
          <input type="radio" name={`decl_${letter}`} value="no" checked={value === 'no'} onChange={() => onChange('no')} style={{ accentColor: colors.navy }} /> No
        </label>
      </div>
    </div>
  );

  // Render Success State
  if (submitted) {
    return (
      <div style={styles.container}>
        <header
          style={{
            height: '64px',
            background: isDark
              ? 'linear-gradient(135deg, #0B1929 0%, #112240 40%, #1A365D 100%)'
              : 'linear-gradient(135deg, #003B73 0%, #00508F 40%, #117ACA 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
          }}
        >
          <div style={{ ...styles.logo, color: '#fff' }}>Chase<span style={{ ...styles.logoSpan, color: isDark ? '#60a5fa' : colors.goldLight }}>Home</span> Lending</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#fff', fontSize: '0.82rem' }}>
            <span>Need help?</span>
            <span style={{ color: isDark ? '#60a5fa' : colors.goldLight, fontWeight: 600 }}>1-800-873-6577</span>
          </div>
        </header>
        <div style={styles.formContainer}>
          <div style={styles.card}>
            <div style={styles.successBox}>
              <div style={styles.successIcon}>&#127881;</div>
              <h2 style={{ ...styles.sectionTitle, textAlign: 'center', marginBottom: '12px' }}>Application Submitted!</h2>
              <p style={{ ...styles.sectionDesc, textAlign: 'center', maxWidth: '500px', margin: '0 auto 24px' }}>
                Your home loan application has been submitted successfully. Your application reference number is:
              </p>
              <div style={styles.appRef}>{applicationId}</div>
              <p style={{ color: colors.textLight, fontSize: '0.85rem', maxWidth: '460px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                Your application is now being processed through our automated workflow system.
                Track your application status and view real-time workflow progress below.
              </p>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/applications', { state: { expandApplicationId: applicationId } })}
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                >
                  View Application Status
                </button>
                <button
                  onClick={() => navigate('/applications')}
                  style={{ ...styles.btn, ...styles.btnSecondary }}
                >
                  View All Applications
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Processing Popup */}
      {isSubmitting && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <style>
            {`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}
          </style>
          <div style={{
            background: isDark ? '#1e293b' : colors.white,
            borderRadius: '16px',
            padding: '32px 40px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            maxWidth: '420px',
            width: '90%',
            textAlign: 'center',
            border: isDark ? '1px solid #334155' : 'none',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              border: `4px solid ${isDark ? '#334155' : colors.creamDark}`,
              borderTopColor: colors.navy,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px',
            }} />
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: colors.navy,
              marginBottom: '8px',
            }}>Processing Your Application</div>
            <div style={{
              fontSize: '0.85rem',
              color: colors.textLight,
              marginBottom: '20px',
              lineHeight: 1.5,
            }}>
              Please wait while we submit your application...
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              textAlign: 'left',
            }}>
              {PROCESSING_STEPS.map((step, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.82rem',
                  color: idx <= processingStep ? colors.navy : colors.textLight,
                  opacity: idx <= processingStep ? 1 : 0.4,
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: idx <= processingStep ? colors.green : (isDark ? '#334155' : colors.creamDark),
                    transition: 'background 0.3s ease',
                    flexShrink: 0,
                  }} />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Auto-advance indicator */}
      {isAutoAdvancing && (
        <div style={styles.autoAdvanceIndicator}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Auto-filling form... Step {currentStep + 1} of {STEPS.length}</span>
        </div>
      )}

      {/* Header Bar - Chase Blue Gradient */}
      <header
        style={{
          height: '64px',
          background: isDark
            ? 'linear-gradient(135deg, #0B1929 0%, #112240 40%, #1A365D 100%)'
            : 'linear-gradient(135deg, #003B73 0%, #00508F 40%, #117ACA 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Left Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Layers size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#fff',
              fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif'
            }}>
              Simulate New Application
            </h1>
          </div>
        </div>

        {/* Right Side - Tab Switcher & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Tab Switcher */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '3px'
            }}
          >
            {/* Applications */}
            <Link
              to="/applications"
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.2s'
              }}
            >
              <FileText size={14} />
              Applications
            </Link>
            {/* Agentic Workflow */}
            <Link
              to="/"
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.2s'
              }}
            >
              <Layers size={14} />
              Agentic Workflow
            </Link>
            {/* Flowchart Workflow */}
            <Link
              to="/"
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.2s'
              }}
            >
              <GitBranch size={14} />
              Workflow
            </Link>
            {/* Simulate - Active */}
            <span
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'rgba(255,255,255,0.18)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={14} />
              Simulate
            </span>
          </div>

          {/* Home */}
          <Link
            to="/applications"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
            title="Loan Assumption Applications"
          >
            <Home size={18} />
          </Link>

          {/* Refresh */}
          <button
            onClick={() => window.location.reload()}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Progress */}
      <div style={styles.progressContainer}>
        <div style={styles.progressSteps}>
          {STEPS.map((step, i) => (
            <button
              key={step.id}
              onClick={() => goToStep(i)}
              style={styles.stepItem(i === currentStep, i < currentStep)}
            >
              <span style={styles.stepNum(i === currentStep, i < currentStep)}>
                {i < currentStep ? <Check size={12} /> : i + 1}
              </span>
              {step.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form Container */}
      <div style={styles.formContainer}>
        {/* Simulation Options */}
        {!showSimulationOptions ? (
          <button onClick={showSimulationSelector} style={{ ...styles.btn, ...styles.btnPopulate }}>
            Populate Default Values (Demo)
          </button>
        ) : (
          <div style={{
            background: isDark ? 'rgba(59, 130, 246, 0.1)' : colors.goldDim,
            border: `2px solid ${colors.navy}`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
          }}>
            <div style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: colors.navy,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '1.2rem' }}>&#128640;</span>
              Select Simulation Scenario
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              <button
                onClick={() => populateDefaults('loan_closed')}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: `2px solid ${colors.green}`,
                  background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 134, 73, 0.1)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(0, 134, 73, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 134, 73, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>&#9989;</div>
                <div style={{ fontWeight: 700, color: colors.green, fontSize: '0.95rem' }}>Loan Closed</div>
                <div style={{ fontSize: '0.75rem', color: colors.textLight, marginTop: '4px' }}>
                  Complete approval flow
                </div>
              </button>

              <button
                onClick={() => populateDefaults('in_progress')}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: `2px solid ${colors.gold}`,
                  background: isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(17, 122, 202, 0.1)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(96, 165, 250, 0.25)' : 'rgba(17, 122, 202, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(17, 122, 202, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>&#9203;</div>
                <div style={{ fontWeight: 700, color: colors.gold, fontSize: '0.95rem' }}>In Progress</div>
                <div style={{ fontSize: '0.75rem', color: colors.textLight, marginTop: '4px' }}>
                  Paused at commitment
                </div>
              </button>

              <button
                onClick={() => populateDefaults('denied')}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: `2px solid ${colors.red}`,
                  background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(208, 48, 39, 0.1)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(208, 48, 39, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(208, 48, 39, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>&#10060;</div>
                <div style={{ fontWeight: 700, color: colors.red, fontSize: '0.95rem' }}>Denied</div>
                <div style={{ fontSize: '0.75rem', color: colors.textLight, marginTop: '4px' }}>
                  Denial letter path
                </div>
              </button>
            </div>
            <button
              onClick={() => setShowSimulationOptions(false)}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                color: colors.textLight,
                fontSize: '0.85rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Show selected simulation type indicator */}
        {simulationType && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '16px',
            background: simulationType === 'loan_closed' ? 'rgba(0, 134, 73, 0.15)' :
                       simulationType === 'in_progress' ? 'rgba(17, 122, 202, 0.15)' :
                       'rgba(208, 48, 39, 0.15)',
            color: simulationType === 'loan_closed' ? colors.green :
                   simulationType === 'in_progress' ? colors.gold :
                   colors.red,
            border: `1px solid ${simulationType === 'loan_closed' ? colors.green :
                                simulationType === 'in_progress' ? colors.gold :
                                colors.red}`,
          }}>
            <span>
              {simulationType === 'loan_closed' ? '✓' :
               simulationType === 'in_progress' ? '⏳' : '✗'}
            </span>
            Simulation: {simulationType === 'loan_closed' ? 'Loan Closed' :
                        simulationType === 'in_progress' ? 'In Progress' :
                        'Denied'}
          </div>
        )}

        {submitError && (
          <div style={styles.errorBox}>{submitError}</div>
        )}

        {/* Step 0: Loan Information */}
        {currentStep === 0 && (
          <div>
            <h2 style={styles.sectionTitle}>Loan Information</h2>
            <p style={styles.sectionDesc}>Tell us about the loan you are applying for and the property you wish to finance.</p>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#127968;</span> Type of Mortgage</div>
              <div style={styles.formRow(2)}>
                <Field label="Loan Type" required>
                  <Select value={formData.loanType} onChange={(v) => handleChange('loanType', v)} placeholder="Select loan type..."
                    options={['Conventional', 'FHA', 'VA', 'USDA / Rural Housing', 'Other']} />
                </Field>
                <Field label="Loan Purpose" required>
                  <Select value={formData.loanPurpose} onChange={(v) => handleChange('loanPurpose', v)} placeholder="Select purpose..."
                    options={['Purchase', 'Refinance', 'Construction', 'Construction-Permanent', 'Other']} />
                </Field>
              </div>
              <div style={styles.formRow(3)}>
                <Field label="Loan Amount Requested" required>
                  <Input value={formData.loanAmount} onChange={(v) => handleChange('loanAmount', v)} placeholder="$0.00" />
                </Field>
                <Field label="Interest Rate Requested">
                  <Input value={formData.interestRate} onChange={(v) => handleChange('interestRate', v)} placeholder="e.g. 6.5%" />
                </Field>
                <Field label="Loan Term (months)" required>
                  <Select value={formData.loanTerm} onChange={(v) => handleChange('loanTerm', v)} placeholder="Select term..."
                    options={[{ value: '360', label: '360 (30 years)' }, { value: '240', label: '240 (20 years)' }, { value: '180', label: '180 (15 years)' }, { value: '120', label: '120 (10 years)' }]} />
                </Field>
              </div>
              <Field label="Amortization Type" required>
                <RadioGroup name="amort" value={formData.amortizationType} onChange={(v) => handleChange('amortizationType', v)}
                  options={[{ value: 'fixed', label: 'Fixed Rate' }, { value: 'arm', label: 'Adjustable Rate (ARM)' }, { value: 'other', label: 'Other' }]} />
              </Field>
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#128205;</span> Subject Property Address</div>
              <div style={styles.formRow(1)}>
                <Field label="Street Address" required>
                  <Input value={formData.propertyStreet} onChange={(v) => handleChange('propertyStreet', v)} placeholder="123 Main Street, Apt 4B" />
                </Field>
              </div>
              <div style={styles.formRow(4)}>
                <Field label="City" required>
                  <Input value={formData.propertyCity} onChange={(v) => handleChange('propertyCity', v)} placeholder="City" />
                </Field>
                <Field label="State" required>
                  <Select value={formData.propertyState} onChange={(v) => handleChange('propertyState', v)} placeholder="State..." options={US_STATES} />
                </Field>
                <Field label="ZIP Code" required>
                  <Input value={formData.propertyZip} onChange={(v) => handleChange('propertyZip', v)} placeholder="ZIP" />
                </Field>
                <Field label="County">
                  <Input value={formData.propertyCounty} onChange={(v) => handleChange('propertyCounty', v)} placeholder="County" />
                </Field>
              </div>
              <div style={styles.formRow(3)}>
                <Field label="Number of Units">
                  <Select value={formData.propertyUnits} onChange={(v) => handleChange('propertyUnits', v)} options={['1', '2', '3', '4']} />
                </Field>
                <Field label="Property Will Be" required>
                  <Select value={formData.propertyUse} onChange={(v) => handleChange('propertyUse', v)} placeholder="Select..."
                    options={['Primary Residence', 'Secondary Residence', 'Investment Property']} />
                </Field>
                <Field label="Year Built">
                  <Input value={formData.propertyYearBuilt} onChange={(v) => handleChange('propertyYearBuilt', v)} placeholder="e.g. 2005" />
                </Field>
              </div>
            </div>

            <div style={styles.btnRow}>
              <button style={{ ...styles.btn, background: 'transparent', color: colors.textLight, textDecoration: 'underline', border: 'none' }}>Save Draft</button>
              <button onClick={nextStep} style={{ ...styles.btn, ...styles.btnPrimary }}>Continue <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div>
            <h2 style={styles.sectionTitle}>Personal Information</h2>
            <p style={styles.sectionDesc}>Borrower details. Please provide your legal name as it appears on your government-issued ID.</p>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#128100;</span> Borrower Information</div>
              <div style={styles.formRow(4)}>
                <Field label="First Name" required><Input value={formData.firstName} onChange={(v) => handleChange('firstName', v)} placeholder="First name" /></Field>
                <Field label="Middle Name"><Input value={formData.middleName} onChange={(v) => handleChange('middleName', v)} placeholder="Middle name" /></Field>
                <Field label="Last Name" required><Input value={formData.lastName} onChange={(v) => handleChange('lastName', v)} placeholder="Last name" /></Field>
                <Field label="Suffix"><Select value={formData.suffix} onChange={(v) => handleChange('suffix', v)} options={[{ value: '', label: 'None' }, 'Jr.', 'Sr.', 'II', 'III', 'IV']} /></Field>
              </div>
              <div style={styles.formRow(3)}>
                <Field label="Date of Birth" required><Input type="date" value={formData.dob} onChange={(v) => handleChange('dob', v)} /></Field>
                <Field label="SSN (Last 4 digits)" required><Input value={formData.ssn} onChange={(v) => handleChange('ssn', v)} placeholder="XXXX" maxLength={4} /></Field>
                <Field label="Marital Status" required><Select value={formData.maritalStatus} onChange={(v) => handleChange('maritalStatus', v)} options={['Married', 'Separated', 'Unmarried']} /></Field>
              </div>
              <div style={styles.formRow(3)}>
                <Field label="Citizenship Status" required><Select value={formData.citizenship} onChange={(v) => handleChange('citizenship', v)} options={['U.S. Citizen', 'Permanent Resident Alien', 'Non-Permanent Resident Alien']} /></Field>
                <Field label="Number of Dependents"><Input type="number" value={formData.dependents} onChange={(v) => handleChange('dependents', v)} placeholder="0" min="0" /></Field>
                <Field label="Ages of Dependents"><Input value={formData.dependentAges} onChange={(v) => handleChange('dependentAges', v)} placeholder="e.g. 5, 12, 16" /></Field>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#128231;</span> Contact Information</div>
              <div style={styles.formRow(3)}>
                <Field label="Home Phone"><Input type="tel" value={formData.homePhone} onChange={(v) => handleChange('homePhone', v)} placeholder="(555) 555-5555" /></Field>
                <Field label="Cell Phone" required><Input type="tel" value={formData.cellPhone} onChange={(v) => handleChange('cellPhone', v)} placeholder="(555) 555-5555" /></Field>
                <Field label="Email Address" required><Input type="email" value={formData.email} onChange={(v) => handleChange('email', v)} placeholder="you@email.com" /></Field>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#127969;</span> Current Address</div>
              <div style={styles.formRow(1)}>
                <Field label="Street Address" required><Input value={formData.currentStreet} onChange={(v) => handleChange('currentStreet', v)} placeholder="Current street address" /></Field>
              </div>
              <div style={styles.formRow(4)}>
                <Field label="City" required><Input value={formData.currentCity} onChange={(v) => handleChange('currentCity', v)} placeholder="City" /></Field>
                <Field label="State" required><Input value={formData.currentState} onChange={(v) => handleChange('currentState', v)} placeholder="State" /></Field>
                <Field label="ZIP" required><Input value={formData.currentZip} onChange={(v) => handleChange('currentZip', v)} placeholder="ZIP" /></Field>
                <Field label="Years at Address" required><Input value={formData.currentYears} onChange={(v) => handleChange('currentYears', v)} placeholder="e.g. 3" /></Field>
              </div>
              <div style={styles.formRow(2)}>
                <Field label="Housing Status" required>
                  <RadioGroup name="housing" value={formData.housingStatus} onChange={(v) => handleChange('housingStatus', v)}
                    options={[{ value: 'own', label: 'Own' }, { value: 'rent', label: 'Rent' }, { value: 'nopay', label: 'No primary housing expense' }]} />
                </Field>
                <Field label="Monthly Rent / Mortgage ($)"><Input value={formData.monthlyRent} onChange={(v) => handleChange('monthlyRent', v)} placeholder="$0.00" /></Field>
              </div>
            </div>

            <div style={styles.toggleBar}>
              <span>Is there a Co-Borrower on this loan?</span>
              <label style={{ position: 'relative', width: '48px', height: '26px', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.hasCoBorrower} onChange={(e) => handleChange('hasCoBorrower', e.target.checked)} style={{ display: 'none' }} />
                <span style={{
                  position: 'absolute', inset: 0, background: formData.hasCoBorrower ? colors.navy : colors.border,
                  borderRadius: '26px', transition: '0.3s'
                }} />
                <span style={{
                  position: 'absolute', width: '20px', height: '20px', left: formData.hasCoBorrower ? '25px' : '3px',
                  top: '3px', background: colors.white, borderRadius: '50%', transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </label>
            </div>

            <div style={styles.btnRow}>
              <button onClick={prevStep} style={{ ...styles.btn, ...styles.btnSecondary }}><ChevronLeft size={16} /> Back</button>
              <button onClick={nextStep} style={{ ...styles.btn, ...styles.btnPrimary }}>Continue <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 2: Employment */}
        {currentStep === 2 && (
          <div>
            <h2 style={styles.sectionTitle}>Employment Information</h2>
            <p style={styles.sectionDesc}>Provide your current and previous employment history for the past 2 years.</p>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#128188;</span> Current Employment</div>
              <div style={styles.formRow(2)}>
                <Field label="Employer Name" required><Input value={formData.employerName} onChange={(v) => handleChange('employerName', v)} placeholder="Company name" /></Field>
                <Field label="Employer Phone"><Input type="tel" value={formData.employerPhone} onChange={(v) => handleChange('employerPhone', v)} placeholder="(555) 555-5555" /></Field>
              </div>
              <div style={styles.formRow(1)}>
                <Field label="Employer Address"><Input value={formData.employerAddress} onChange={(v) => handleChange('employerAddress', v)} placeholder="Full employer address" /></Field>
              </div>
              <div style={styles.formRow(3)}>
                <Field label="Position / Title" required><Input value={formData.jobTitle} onChange={(v) => handleChange('jobTitle', v)} placeholder="Your job title" /></Field>
                <Field label="Start Date" required><Input type="date" value={formData.employmentStartDate} onChange={(v) => handleChange('employmentStartDate', v)} /></Field>
                <Field label="Years in Profession"><Input value={formData.yearsInProfession} onChange={(v) => handleChange('yearsInProfession', v)} placeholder="e.g. 10" /></Field>
              </div>
              <Field label="Employment Type" required>
                <RadioGroup name="emptype" value={formData.employmentType} onChange={(v) => handleChange('employmentType', v)}
                  options={[{ value: 'employed', label: 'Employed' }, { value: 'self', label: 'Self-Employed' }, { value: 'retired', label: 'Retired' }, { value: 'other', label: 'Other' }]} />
              </Field>
              <div style={styles.formRow(3)}>
                <Field label="Monthly Base Income" required><Input value={formData.monthlyBase} onChange={(v) => handleChange('monthlyBase', v)} placeholder="$0.00" /></Field>
                <Field label="Monthly Overtime"><Input value={formData.monthlyOvertime} onChange={(v) => handleChange('monthlyOvertime', v)} placeholder="$0.00" /></Field>
                <Field label="Monthly Bonus"><Input value={formData.monthlyBonus} onChange={(v) => handleChange('monthlyBonus', v)} placeholder="$0.00" /></Field>
              </div>
              <div style={styles.formRow(3)}>
                <Field label="Monthly Commission"><Input value={formData.monthlyCommission} onChange={(v) => handleChange('monthlyCommission', v)} placeholder="$0.00" /></Field>
                <Field label="Monthly Dividend / Interest"><Input value={formData.monthlyDividend} onChange={(v) => handleChange('monthlyDividend', v)} placeholder="$0.00" /></Field>
                <Field label="Other Monthly Income"><Input value={formData.otherMonthlyIncome} onChange={(v) => handleChange('otherMonthlyIncome', v)} placeholder="$0.00" /></Field>
              </div>
            </div>

            <div style={styles.btnRow}>
              <button onClick={prevStep} style={{ ...styles.btn, ...styles.btnSecondary }}><ChevronLeft size={16} /> Back</button>
              <button onClick={nextStep} style={{ ...styles.btn, ...styles.btnPrimary }}>Continue <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 3: Income */}
        {currentStep === 3 && (
          <div>
            <h2 style={styles.sectionTitle}>Monthly Income Summary</h2>
            <p style={styles.sectionDesc}>Summarize all sources of monthly income. Include any additional income not captured on the employment page.</p>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#128176;</span> Additional Income Sources</div>
              <p style={styles.hint}>Note: Alimony, child support, or separate maintenance income need not be revealed if you do not wish to have it considered as a basis for repaying this loan.</p>
            </div>

            <div style={styles.btnRow}>
              <button onClick={prevStep} style={{ ...styles.btn, ...styles.btnSecondary }}><ChevronLeft size={16} /> Back</button>
              <button onClick={nextStep} style={{ ...styles.btn, ...styles.btnPrimary }}>Continue <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 4: Assets */}
        {currentStep === 4 && (
          <div>
            <h2 style={styles.sectionTitle}>Assets</h2>
            <p style={styles.sectionDesc}>List all bank accounts, investments, and other assets.</p>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#127974;</span> Bank Accounts and Cash Deposits</div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, borderRadius: '6px 0 0 0' }}>Institution Name</th>
                    <th style={styles.th}>Account Type</th>
                    <th style={styles.th}>Account Number</th>
                    <th style={{ ...styles.th, borderRadius: '0 6px 0 0' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.bankAccounts.map((acc, i) => (
                    <tr key={i}>
                      <td style={styles.td}><input style={{ ...styles.input, padding: '8px 10px', fontSize: '0.82rem' }} value={acc.institution} onChange={(e) => handleArrayChange('bankAccounts', i, 'institution', e.target.value)} placeholder="Bank name" /></td>
                      <td style={styles.td}><select style={{ ...styles.select, padding: '8px 10px', fontSize: '0.82rem' }} value={acc.type} onChange={(e) => handleArrayChange('bankAccounts', i, 'type', e.target.value)}><option>Checking</option><option>Savings</option><option>Money Market</option><option>CD</option></select></td>
                      <td style={styles.td}><input style={{ ...styles.input, padding: '8px 10px', fontSize: '0.82rem' }} value={acc.accountNum} onChange={(e) => handleArrayChange('bankAccounts', i, 'accountNum', e.target.value)} placeholder="Last 4 digits" /></td>
                      <td style={styles.td}><input style={{ ...styles.input, padding: '8px 10px', fontSize: '0.82rem' }} value={acc.balance} onChange={(e) => handleArrayChange('bankAccounts', i, 'balance', e.target.value)} placeholder="$0.00" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => addArrayItem('bankAccounts', { institution: '', type: 'Checking', accountNum: '', balance: '' })} style={styles.addBtn}><Plus size={14} /> Add Account</button>
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#128200;</span> Other Assets</div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, borderRadius: '6px 0 0 0' }}>Asset Description</th>
                    <th style={styles.th}>Asset Type</th>
                    <th style={{ ...styles.th, borderRadius: '0 6px 0 0' }}>Estimated Value</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.otherAssets.map((asset, i) => (
                    <tr key={i}>
                      <td style={styles.td}><input style={{ ...styles.input, padding: '8px 10px', fontSize: '0.82rem' }} value={asset.description} onChange={(e) => handleArrayChange('otherAssets', i, 'description', e.target.value)} placeholder="Description" /></td>
                      <td style={styles.td}><select style={{ ...styles.select, padding: '8px 10px', fontSize: '0.82rem' }} value={asset.type} onChange={(e) => handleArrayChange('otherAssets', i, 'type', e.target.value)}><option value="">Select...</option><option>Stocks / Bonds</option><option>Retirement (401k, IRA)</option><option>Real Estate</option><option>Automobile</option><option>Life Insurance (cash value)</option><option>Business Owned</option><option>Gift Funds</option><option>Other</option></select></td>
                      <td style={styles.td}><input style={{ ...styles.input, padding: '8px 10px', fontSize: '0.82rem' }} value={asset.value} onChange={(e) => handleArrayChange('otherAssets', i, 'value', e.target.value)} placeholder="$0.00" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => addArrayItem('otherAssets', { description: '', type: '', value: '' })} style={styles.addBtn}><Plus size={14} /> Add Asset</button>
            </div>

            <div style={styles.btnRow}>
              <button onClick={prevStep} style={{ ...styles.btn, ...styles.btnSecondary }}><ChevronLeft size={16} /> Back</button>
              <button onClick={nextStep} style={{ ...styles.btn, ...styles.btnPrimary }}>Continue <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 5: Liabilities */}
        {currentStep === 5 && (
          <div>
            <h2 style={styles.sectionTitle}>Liabilities</h2>
            <p style={styles.sectionDesc}>List all outstanding debts including mortgages, auto loans, student loans, credit cards, and other obligations.</p>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#128179;</span> Current Debts and Obligations</div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, borderRadius: '6px 0 0 0' }}>Creditor Name</th>
                    <th style={styles.th}>Debt Type</th>
                    <th style={styles.th}>Acct #</th>
                    <th style={styles.th}>Monthly Payment</th>
                    <th style={styles.th}>Balance Owed</th>
                    <th style={{ ...styles.th, borderRadius: '0 6px 0 0' }}>Months Left</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.debts.map((debt, i) => (
                    <tr key={i}>
                      <td style={styles.td}><input style={{ ...styles.input, padding: '8px 10px', fontSize: '0.82rem' }} value={debt.creditor} onChange={(e) => handleArrayChange('debts', i, 'creditor', e.target.value)} placeholder="Creditor" /></td>
                      <td style={styles.td}><select style={{ ...styles.select, padding: '8px 10px', fontSize: '0.82rem' }} value={debt.type} onChange={(e) => handleArrayChange('debts', i, 'type', e.target.value)}><option value="">Select...</option><option>Mortgage</option><option>Auto Loan</option><option>Student Loan</option><option>Credit Card</option><option>Personal Loan</option><option>HELOC</option><option>Child Support</option><option>Other</option></select></td>
                      <td style={styles.td}><input style={{ ...styles.input, padding: '8px 10px', fontSize: '0.82rem' }} value={debt.accountNum} onChange={(e) => handleArrayChange('debts', i, 'accountNum', e.target.value)} placeholder="Acct #" /></td>
                      <td style={styles.td}><input style={{ ...styles.input, padding: '8px 10px', fontSize: '0.82rem' }} value={debt.payment} onChange={(e) => handleArrayChange('debts', i, 'payment', e.target.value)} placeholder="$0.00" /></td>
                      <td style={styles.td}><input style={{ ...styles.input, padding: '8px 10px', fontSize: '0.82rem' }} value={debt.balance} onChange={(e) => handleArrayChange('debts', i, 'balance', e.target.value)} placeholder="$0.00" /></td>
                      <td style={styles.td}><input style={{ ...styles.input, padding: '8px 10px', fontSize: '0.82rem' }} value={debt.months} onChange={(e) => handleArrayChange('debts', i, 'months', e.target.value)} placeholder="# months" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => addArrayItem('debts', { creditor: '', type: '', accountNum: '', payment: '', balance: '', months: '' })} style={styles.addBtn}><Plus size={14} /> Add Liability</button>
            </div>

            <div style={styles.btnRow}>
              <button onClick={prevStep} style={{ ...styles.btn, ...styles.btnSecondary }}><ChevronLeft size={16} /> Back</button>
              <button onClick={nextStep} style={{ ...styles.btn, ...styles.btnPrimary }}>Continue <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 6: Property Details */}
        {currentStep === 6 && (
          <div>
            <h2 style={styles.sectionTitle}>Property Details</h2>
            <p style={styles.sectionDesc}>Provide additional details about the property and the transaction.</p>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#128209;</span> Purchase Details</div>
              <div style={styles.formRow(3)}>
                <Field label="Purchase Price" required><Input value={formData.purchasePrice} onChange={(v) => handleChange('purchasePrice', v)} placeholder="$0.00" /></Field>
                <Field label="Estimated Value (if refi)"><Input value={formData.estimatedValue} onChange={(v) => handleChange('estimatedValue', v)} placeholder="$0.00" /></Field>
                <Field label="Down Payment Amount" required><Input value={formData.downPayment} onChange={(v) => handleChange('downPayment', v)} placeholder="$0.00" /></Field>
              </div>
              <div style={styles.formRow(3)}>
                <Field label="Down Payment Source" required><Select value={formData.downPaymentSource} onChange={(v) => handleChange('downPaymentSource', v)} options={['Savings', 'Gift', 'Sale of Property', 'Equity on Subject Property', 'Borrower Contribution', 'Other']} /></Field>
                <Field label="Estimated Closing Costs"><Input value={formData.estimatedClosing} onChange={(v) => handleChange('estimatedClosing', v)} placeholder="$0.00" /></Field>
                <Field label="Estimated Prepaid Items"><Input value={formData.estimatedPrepaid} onChange={(v) => handleChange('estimatedPrepaid', v)} placeholder="$0.00" /></Field>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#127968;</span> Monthly Housing Expenses (Proposed)</div>
              <div style={styles.formRow(4)}>
                <Field label="First Mortgage (P&I)" required><Input value={formData.proposedMortgage} onChange={(v) => handleChange('proposedMortgage', v)} placeholder="$0.00" /></Field>
                <Field label="Other Financing (P&I)"><Input value={formData.proposedOther} onChange={(v) => handleChange('proposedOther', v)} placeholder="$0.00" /></Field>
                <Field label="Hazard Insurance"><Input value={formData.proposedHazard} onChange={(v) => handleChange('proposedHazard', v)} placeholder="$0.00" /></Field>
                <Field label="Real Estate Taxes"><Input value={formData.proposedTaxes} onChange={(v) => handleChange('proposedTaxes', v)} placeholder="$0.00" /></Field>
              </div>
              <div style={styles.formRow(4)}>
                <Field label="Mortgage Insurance (PMI)"><Input value={formData.proposedPMI} onChange={(v) => handleChange('proposedPMI', v)} placeholder="$0.00" /></Field>
                <Field label="HOA Dues"><Input value={formData.proposedHOA} onChange={(v) => handleChange('proposedHOA', v)} placeholder="$0.00" /></Field>
                <Field label="Flood Insurance"><Input value={formData.proposedFlood} onChange={(v) => handleChange('proposedFlood', v)} placeholder="$0.00" /></Field>
                <Field label="Other"><Input value={formData.proposedOtherExpense} onChange={(v) => handleChange('proposedOtherExpense', v)} placeholder="$0.00" /></Field>
              </div>
            </div>

            <div style={styles.btnRow}>
              <button onClick={prevStep} style={{ ...styles.btn, ...styles.btnSecondary }}><ChevronLeft size={16} /> Back</button>
              <button onClick={nextStep} style={{ ...styles.btn, ...styles.btnPrimary }}>Continue <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 7: Declarations */}
        {currentStep === 7 && (
          <div>
            <h2 style={styles.sectionTitle}>Declarations</h2>
            <p style={styles.sectionDesc}>Please answer the following questions truthfully. These declarations are required by federal lending regulations.</p>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#9888;</span> Borrower Declarations</div>
              <DeclQuestion letter="A" text="Are there any outstanding judgments against you?" value={formData.declarations.a} onChange={(v) => handleDeclarationChange('a', v)} />
              <DeclQuestion letter="B" text="Have you been declared bankrupt within the past 7 years?" value={formData.declarations.b} onChange={(v) => handleDeclarationChange('b', v)} />
              <DeclQuestion letter="C" text="Have you had property foreclosed upon or given title or deed in lieu thereof in the last 7 years?" value={formData.declarations.c} onChange={(v) => handleDeclarationChange('c', v)} />
              <DeclQuestion letter="D" text="Are you a party to a lawsuit?" value={formData.declarations.d} onChange={(v) => handleDeclarationChange('d', v)} />
              <DeclQuestion letter="E" text="Have you directly or indirectly been obligated on any loan which resulted in foreclosure, transfer of title, or short sale?" value={formData.declarations.e} onChange={(v) => handleDeclarationChange('e', v)} />
              <DeclQuestion letter="F" text="Are you presently delinquent or in default on any Federal debt or any other loan, mortgage, financial obligation, bond, or loan guarantee?" value={formData.declarations.f} onChange={(v) => handleDeclarationChange('f', v)} />
              <DeclQuestion letter="G" text="Are you obligated to pay alimony, child support, or separate maintenance?" value={formData.declarations.g} onChange={(v) => handleDeclarationChange('g', v)} />
              <DeclQuestion letter="H" text="Is any part of the down payment borrowed?" value={formData.declarations.h} onChange={(v) => handleDeclarationChange('h', v)} />
              <DeclQuestion letter="I" text="Are you a co-maker or endorser on a note?" value={formData.declarations.i} onChange={(v) => handleDeclarationChange('i', v)} />
              <DeclQuestion letter="J" text="Are you a U.S. citizen?" value={formData.declarations.j} onChange={(v) => handleDeclarationChange('j', v)} />
              <DeclQuestion letter="K" text="Are you a permanent resident alien?" value={formData.declarations.k} onChange={(v) => handleDeclarationChange('k', v)} />
              <DeclQuestion letter="L" text="Do you intend to occupy the property as your primary residence?" value={formData.declarations.l} onChange={(v) => handleDeclarationChange('l', v)} />
              <DeclQuestion letter="M" text="Have you had an ownership interest in a property in the last three years?" value={formData.declarations.m} onChange={(v) => handleDeclarationChange('m', v)} />
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#128221;</span> Demographic Information (Optional)</div>
              <p style={{ fontSize: '0.82rem', color: colors.textLight, marginBottom: '16px', lineHeight: 1.55 }}>The following information is requested by the Federal Government for monitoring compliance. You are not required to furnish this information.</p>
              <div style={styles.formRow(3)}>
                <Field label="Ethnicity"><Select value={formData.ethnicity} onChange={(v) => handleChange('ethnicity', v)} options={['Hispanic or Latino', 'Not Hispanic or Latino', 'Prefer not to answer']} /></Field>
                <Field label="Race"><Select value={formData.race} onChange={(v) => handleChange('race', v)} options={['American Indian or Alaska Native', 'Asian', 'Black or African American', 'Native Hawaiian or Other Pacific Islander', 'White', 'Two or more races', 'Prefer not to answer']} /></Field>
                <Field label="Sex"><Select value={formData.sex} onChange={(v) => handleChange('sex', v)} options={['Male', 'Female', 'Prefer not to answer']} /></Field>
              </div>
            </div>

            <div style={styles.btnRow}>
              <button onClick={prevStep} style={{ ...styles.btn, ...styles.btnSecondary }}><ChevronLeft size={16} /> Back</button>
              <button onClick={nextStep} style={{ ...styles.btn, ...styles.btnPrimary }}>Continue <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {/* Step 8: Review & Submit */}
        {currentStep === 8 && (
          <div>
            <h2 style={styles.sectionTitle}>Review & Submit</h2>
            <p style={styles.sectionDesc}>Please review the information you have provided, acknowledge the terms, and sign your application.</p>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#128220;</span> Acknowledgment and Agreement</div>
              <div style={styles.consentBox}>
                <strong>Certification:</strong> Each of the undersigned specifically represents to Lender and to Lender's actual or potential agents, brokers, processors, attorneys, insurers, servicers, successors and assigns and agrees and acknowledges that:<br /><br />
                1. The information provided in this application is true and correct as of the date set forth opposite my signature and that any intentional or negligent misrepresentation of this information contained in this application may result in civil liability, including monetary damages, to any person who may suffer any loss due to reliance upon any misrepresentation that I have made on this application, and/or in criminal penalties including, but not limited to, fine or imprisonment or both under the provisions of Title 18, United States Code, Sec. 1001, et seq.<br /><br />
                2. The loan requested pursuant to this application (the "Loan") will be secured by a mortgage or deed of trust on the property described in this application.<br /><br />
                3. The property will not be used for any illegal or prohibited purpose or use.<br /><br />
                4. All statements made in this application are made for the purpose of obtaining a residential mortgage loan.<br /><br />
                5. The property will be occupied as indicated in this application.
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#9997;</span> Authorization</div>
              <div style={{ ...styles.declItem, borderColor: colors.navy, background: colors.goldDim }}>
                <input type="checkbox" checked={formData.consent1} onChange={(e) => handleChange('consent1', e.target.checked)} style={{ accentColor: colors.navy, transform: 'scale(1.2)', marginTop: '3px' }} />
                <label style={{ cursor: 'pointer', fontSize: '0.84rem' }}>I/We certify that the information provided is true, complete, and correct to the best of my/our knowledge and belief. I/We authorize the Lender to verify any information provided in this application.</label>
              </div>
              <div style={styles.declItem}>
                <input type="checkbox" checked={formData.consent2} onChange={(e) => handleChange('consent2', e.target.checked)} style={{ accentColor: colors.navy, transform: 'scale(1.2)', marginTop: '3px' }} />
                <label style={{ cursor: 'pointer', fontSize: '0.84rem' }}>I/We authorize the Lender to obtain a credit report and verify employment, deposit, and mortgage information.</label>
              </div>
              <div style={styles.declItem}>
                <input type="checkbox" checked={formData.consent3} onChange={(e) => handleChange('consent3', e.target.checked)} style={{ accentColor: colors.navy, transform: 'scale(1.2)', marginTop: '3px' }} />
                <label style={{ cursor: 'pointer', fontSize: '0.84rem' }}>I/We acknowledge receipt of the privacy notice and consent to electronic delivery of disclosures.</label>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}><span style={styles.cardIcon}>&#128396;</span> Signatures</div>
              <div style={styles.formRow(2)}>
                <Field label="Borrower Signature" required>
                  <Input value={formData.signatureName} onChange={(v) => handleChange('signatureName', v)} placeholder="Type your full legal name as signature" />
                </Field>
                <Field label="Date" required>
                  <Input type="date" value={formData.signatureDate} onChange={(v) => handleChange('signatureDate', v)} />
                </Field>
              </div>
            </div>

            <div style={{ ...styles.btnRow, justifyContent: 'center', gap: '16px' }}>
              <button onClick={prevStep} style={{ ...styles.btn, ...styles.btnSecondary }}><ChevronLeft size={16} /> Back to Review</button>
              <button
                ref={submitButtonRef}
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{ ...styles.btn, ...styles.btnSubmit, opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '30px', color: colors.textLight, fontSize: '0.75rem', lineHeight: 1.6, maxWidth: '700px', margin: '0 auto', borderTop: `1px solid ${colors.border}` }}>
        <div style={{ color: colors.navy, fontFamily: "'Segoe UI', -apple-system, sans-serif", fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>Chase Home Lending</div>
        Equal Housing Lender &bull; NMLS# 399798 &bull; All loans subject to credit approval<br />
        JPMorgan Chase Bank, N.A. Member FDIC<br />
        &copy; 2026 JPMorgan Chase & Co. All rights reserved.
      </div>
    </div>
  );
}

export default NewApplication;
