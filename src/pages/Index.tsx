import { useState, useRef, useEffect, useMemo } from "react";
import { useClient } from "@/context/ClientContext";
import { useHistory } from "@/context/HistoryContext";
import { UploadCard } from "@/components/upload/UploadCard";
import { ProcessorUploadPanel } from "@/components/upload/ProcessorUploadPanel";
import { AnalysisResults } from "@/components/results/AnalysisResults";
import { DecisionProcessorResults } from "@/components/results/DecisionProcessorResults";
import { ValidatorResults } from "@/components/results/ValidatorResults";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { HelpDrawer } from "@/components/modals/HelpDrawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, FileText, Upload, Download, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { analyzeBleederReport } from "@/lib/bleederAnalyzer";
import { processDecisions } from "@/lib/decisionProcessor";
import { processDecision2File } from "@/lib/decision2Processor";
import { validateUploadFile } from "@/lib/validator";
import { detectFileType } from "@/lib/fileTypeDetector";
import { Bleeder2TrackResults } from "@/components/bleeders2/Bleeder2TrackResults";
import { Decision2ProcessorResults } from "@/components/results/Decision2ProcessorResults";
import { type Bleeder2Track } from "@/components/bleeders2/TrackSelector";
import { ThresholdConfig, type Bleeder2Thresholds } from "@/components/bleeders2/ThresholdConfig";
import { TrackUploader } from "@/components/bleeders2/TrackUploader";
import { LifetimeUploader } from "@/components/bleeders2/LifetimeUploader";
import { parseCommand } from "@/lib/commandParser";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { HomeScreen } from "@/components/layout/HomeScreen";
import { SessionLogView } from "@/components/history/SessionLogView";
import * as XLSX from "xlsx";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type ChatState = "initial" | "awaiting-upload" | "analyzing" | "results" | "confirming-reupload" | "confirming-reset";
type ProcessorType = "report-creator" | "decision-processor" | "validator" | null;

interface FileContext {
  fileName: string;
  tabsDetected: string[];
  uploadTime: string;
  fileHash: string;
}

interface TimelineEntry {
  fileName: string;
  stage: "report" | "processor" | "validator" | "validator — warning (proceeding)";
  status: "success" | "warning" | "error";
  timestamp: string;
}

const TRACK_LABELS_SHORT: Record<Bleeder2Track, string> = {
  SBSD: 'SB/SD Targets',
  SP: 'SP Search Terms',
  SP_KEYWORDS: 'SP Targets',
  ACOS100: '>100% ACoS',
};

const STAGE_LABELS: Record<string, string> = {
  picker: 'Select Track',
  thresholds: 'Thresholds',
  upload: 'Upload',
  results: 'Results',
  decision: 'Decision',
};

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatState, setChatState] = useState<ChatState>("initial");
  const [showUpload, setShowUpload] = useState(false);
  const [showProcessorUpload, setShowProcessorUpload] = useState(false);
  const [showValidatorUpload, setShowValidatorUpload] = useState(false);
  const [showStatusTimeline, setShowStatusTimeline] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [decisionResults, setDecisionResults] = useState<any>(null);
  const [validatorResults, setValidatorResults] = useState<any>(null);
  const [processorType, setProcessorType] = useState<ProcessorType>(null);
  const [fileContext, setFileContext] = useState<FileContext | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: "reupload" | "reset" | "duplicate" | null;
    data?: any;
  }>({ open: false, type: null, data: null });
  const [lastDecisionFileName, setLastDecisionFileName] = useState<string>("");
  const [decisionFailureCount, setDecisionFailureCount] = useState<number>(0);
  const [activeModule, setActiveModule] = useState<"bleeders_1" | "bleeders_2" | "lifetime_bleeders" | null>(null);
  const [bleederMode, setBleederMode] = useState<"standard" | "lifetime">("standard");
  const [showHelpDrawer, setShowHelpDrawer] = useState(false);
  // Bleeders 2.0 state
  type Bleeder2Stage = "picker" | "thresholds" | "upload" | "results" | "decision";
  const [bleeder2ActiveTrack, setBleeder2ActiveTrack] = useState<Bleeder2Track | null>(null);
  const [bleeder2Stage, setBleeder2Stage] = useState<Bleeder2Stage>("picker");
  const { activeClient, updateClient } = useClient();
  const { addEntry } = useHistory();
  const [bleeder2Thresholds, setBleeder2Thresholds] = useState<Bleeder2Thresholds>({
    targetACOS: activeClient.acosTarget,
    clickThreshold: 10,
    fewerThanOrders: activeClient.fewerThanOrders,
    excludeRanking: activeClient.excludeRanking,
  });
  const [trackCompletionStatus, setTrackCompletionStatus] = useState<Record<string, 'idle' | 'complete'>>({
    SBSD: 'idle',
    SP: 'idle',
    SP_KEYWORDS: 'idle',
    ACOS100: 'idle',
  });
  const [showHistoryView, setShowHistoryView] = useState(false);

  const [bleeder2TrackState, setBleeder2TrackState] = useState<
    Record<
      Bleeder2Track,
      {
        file: { name: string; size: number; uploadedAt: number } | null;
        isValidating: boolean;
        validationError: string | null;
        result: any | null;
        decisionFile: File | null;
        amazonFile: { workbook: any; fileName: string } | null;
      }
    >
  >({
    SBSD: { file: null, isValidating: false, validationError: null, result: null, decisionFile: null, amazonFile: null },
    SP: { file: null, isValidating: false, validationError: null, result: null, decisionFile: null, amazonFile: null },
    SP_KEYWORDS: { file: null, isValidating: false, validationError: null, result: null, decisionFile: null, amazonFile: null },
    ACOS100: { file: null, isValidating: false, validationError: null, result: null, decisionFile: null, amazonFile: null },
  });

  // Lifetime state
  type LifetimeStage = "upload" | "processing" | "results" | "decision-upload" | "decision-results";
  const [lifetimeStage, setLifetimeStage] = useState<LifetimeStage>("upload");
  const [lifetimeResult, setLifetimeResult] = useState<any | null>(null);
  const [lifetimeProcessing, setLifetimeProcessing] = useState(false);
  const [lifetimeDecisionResult, setLifetimeDecisionResult] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  const addTypingMessage = async (content: string, delay = 500) => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, delay));
    setIsTyping(false);
    addMessage("assistant", content);
  };

  // ── Handlers (unchanged logic) ──

  const handleReset = () => {
    setChatState("initial");
    setShowUpload(false);
    setShowProcessorUpload(false);
    setShowValidatorUpload(false);
    setShowStatusTimeline(false);
    setAnalysisResults(null);
    setDecisionResults(null);
    setValidatorResults(null);
    setProcessorType(null);
    setFileContext(null);
    setTimeline([]);
    setCompletedSteps([]);
    setCurrentStep(1);
    setMessages([]);
    setLastDecisionFileName("");
    setDecisionFailureCount(0);
    setActiveModule(null);
    setBleeder2ActiveTrack(null);
    setBleeder2Stage("picker");
    setBleeder2Thresholds({ targetACOS: 35, clickThreshold: 10, fewerThanOrders: 5, excludeRanking: true });
    setBleeder2TrackState({
      SBSD: { file: null, isValidating: false, validationError: null, result: null, decisionFile: null, amazonFile: null },
      SP: { file: null, isValidating: false, validationError: null, result: null, decisionFile: null, amazonFile: null },
      SP_KEYWORDS: { file: null, isValidating: false, validationError: null, result: null, decisionFile: null, amazonFile: null },
      ACOS100: { file: null, isValidating: false, validationError: null, result: null, decisionFile: null, amazonFile: null },
    });
    setTrackCompletionStatus({ SBSD: 'idle', SP: 'idle', SP_KEYWORDS: 'idle', ACOS100: 'idle' });
    setLifetimeStage("upload");
    setLifetimeResult(null);
    setLifetimeProcessing(false);
    setLifetimeDecisionResult(null);
    toast({ title: "Session reset complete", description: "You can start a new workflow anytime." });
  };

  const handleStartBleeder2 = () => {
    setActiveModule("bleeders_2");
    setBleeder2Stage("picker");
  };

  const handleSelectTrack = async (track: Bleeder2Track) => {
    if (bleeder2ActiveTrack && bleeder2ActiveTrack !== track) {
      setBleeder2TrackState((prev) => ({
        ...prev,
        [bleeder2ActiveTrack]: { file: null, isValidating: false, validationError: null, result: null, decisionFile: null, amazonFile: null },
      }));
    }
    setBleeder2ActiveTrack(track);
    setBleeder2Stage(track === "ACOS100" ? "upload" : "thresholds");
    setBleeder2TrackState((prev) => ({
      ...prev,
      [track]: { file: null, isValidating: false, validationError: null, result: null, decisionFile: null, amazonFile: null },
    }));
  };

  const handleResetTrack = (track: Bleeder2Track) => {
    setBleeder2TrackState((prev) => ({
      ...prev,
      [track]: { file: null, isValidating: false, validationError: null, result: null, decisionFile: null, amazonFile: null },
    }));
    setBleeder2Stage("upload");
    toast({ title: "Track reset", description: `${track} ready for new upload` });
  };

  const handleBleeder2ContinueFromThresholds = async () => {
    if (!bleeder2ActiveTrack) return;
    setBleeder2Stage("upload");
    updateClient({
      ...activeClient,
      acosTarget: bleeder2Thresholds.targetACOS,
      fewerThanOrders: bleeder2Thresholds.fewerThanOrders,
      excludeRanking: bleeder2Thresholds.excludeRanking,
    });
  };

  const handleBleeder2TrackUpload = async (file: File, track: Bleeder2Track) => {
    if (activeModule !== "bleeders_2") {
      toast({ title: "Wrong module", description: "Select Bleeders 2.0 first", variant: "destructive" });
      return;
    }
    if (!file) { toast({ title: "No file detected", variant: "destructive" }); return; }
    const isValidType = /\.(xlsx|xls|csv|zip)$/i.test(file.name);
    if (!isValidType) { toast({ title: "Invalid file type", description: "Use .xlsx, .xls, .csv, or .zip", variant: "destructive" }); return; }

    setBleeder2TrackState((prev) => ({
      ...prev,
      [track]: { ...prev[track], file: { name: file.name, size: file.size, uploadedAt: Date.now() }, isValidating: true, validationError: null, result: null },
    }));
    toast({ title: "File uploaded", description: file.name });
    setTimeout(() => { handleBleeder2TrackValidation(file, track); }, 300);
  };

  const handleBleeder2TrackValidation = async (file: File, track: Bleeder2Track) => {
    try {
      let result: any;
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const { buildBulkIdIndexFromWorkbook } = await import("@/lib/amazonBulkIdIndex");
      const bulkIndex = buildBulkIdIndexFromWorkbook(workbook);

      if (track === "SBSD") {
        const { analyzeSBSDTrack } = await import("@/lib/bleeder2TrackAnalyzer");
        result = await analyzeSBSDTrack(file, bleeder2Thresholds.targetACOS, 10, bleeder2Thresholds.clickThreshold, bleeder2Thresholds.fewerThanOrders, bleeder2Thresholds.excludeRanking, bulkIndex);
      } else if (track === "SP") {
        const { analyzeSPTrack } = await import("@/lib/bleeder2TrackAnalyzer");
        result = await analyzeSPTrack(file, bleeder2Thresholds.targetACOS, 20, 0, bleeder2Thresholds.fewerThanOrders, bleeder2Thresholds.excludeRanking, bulkIndex);
      } else if (track === "SP_KEYWORDS") {
        const { analyzeSPKeywordsTrack } = await import("@/lib/bleeder2TrackAnalyzer");
        result = await analyzeSPKeywordsTrack(file, bleeder2Thresholds.targetACOS, 20, 0, bleeder2Thresholds.fewerThanOrders, bleeder2Thresholds.excludeRanking, bulkIndex);
      } else if (track === "ACOS100") {
        const { analyzeACoS100Track } = await import("@/lib/bleeder2TrackAnalyzer");
        result = await analyzeACoS100Track(file, bleeder2Thresholds.excludeRanking, bulkIndex);
      } else {
        throw new Error("Unknown track type");
      }

      setBleeder2TrackState((prev) => ({ ...prev, [track]: { ...prev[track], isValidating: false, result } }));
      setBleeder2Stage("results");
    } catch (err: any) {
      setBleeder2TrackState((prev) => ({ ...prev, [track]: { ...prev[track], isValidating: false, validationError: err.message || "Validation failed" } }));
      toast({ title: "Validation failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDownloadDecisionSheet = async (track: Bleeder2Track) => {
    const result = bleeder2TrackState[track].result;
    if (!result?.decisionWorkbook) return;
    try {
      const buffer = await result.decisionWorkbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.decisionFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Decision sheet downloaded", description: result.decisionFileName });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  const handleBleeder2DecisionUpload = async (file: File, track: Bleeder2Track) => {
    try {
      const { processTrackDecisionFile } = await import("@/lib/bleeder2TrackDecisionProcessor");
      const result = await processTrackDecisionFile(file, track);
      if (result.validation.errors.length > 0) {
        toast({ title: "Processing failed", description: result.validation.errors[0], variant: "destructive" });
        return;
      }
      const amazonFileData = { workbook: result.workbook, fileName: result.fileName };
      setBleeder2TrackState((prevState) => ({
        ...prevState,
        [track]: { ...prevState[track], decisionFile: file, amazonFile: amazonFileData },
      }));
      if (result.autoRepairs.length > 0) {
        toast({ title: "Auto-repairs applied", description: `Fixed ${result.autoRepairs[0].count} typos in decisions` });
      }
      toast({ title: "Workflow Complete!", description: `Amazon file ready: ${result.summary.pausedCount} paused, ${result.summary.negativesCreated} negatives created` });
      setTrackCompletionStatus(prev => ({ ...prev, [track]: 'complete' }));
      addEntry({
        clientId: activeClient.id,
        clientName: activeClient.name,
        module: 'bleeders_2',
        track: track,
        fileName: file.name,
        bleedersFound: bleeder2TrackState[track].result?.bleeders.length ?? 0,
        atRiskSpend: bleeder2TrackState[track].result?.totalSpend ?? 0,
        decisionsMode: 'inline',
        pausedCount: result.summary.pausedCount,
        negativesCreated: result.summary.negativesCreated,
        bidsCutCount: result.summary.bidsCutCount,
      });
    } catch (err: any) {
      toast({ title: "Decision processing failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDownloadAmazonFile = async (track: Bleeder2Track) => {
    const amazonFile = bleeder2TrackState[track].amazonFile;
    if (!amazonFile?.workbook) return;
    try {
      const buffer = await amazonFile.workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = amazonFile.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Amazon file ready", description: amazonFile.fileName });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  // Lifetime handlers
  const handleLifetimeAnalysis = async (lifetimeReport: File, bulkFile: File) => {
    try {
      setLifetimeProcessing(true);
      const { analyzeLifetimeBleeders } = await import("@/lib/lifetimeBleederAnalysis");
      const result = await analyzeLifetimeBleeders(lifetimeReport, bulkFile);
      setLifetimeResult(result);
      setLifetimeStage("results");
      toast({ title: "Analysis complete", description: `${result.bleeders.length} lifetime bleeders found` });
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setLifetimeProcessing(false);
    }
  };

  const handleDownloadLifetimeDecisionSheet = async () => {
    if (!lifetimeResult?.decisionWorkbook) return;
    try {
      const buffer = await lifetimeResult.decisionWorkbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = lifetimeResult.decisionFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setLifetimeStage("decision-upload");
      toast({ title: "Decision file downloaded", description: "Edit the Decision column, then upload it back below." });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  const handleLifetimeDecisionUpload = async (file: File) => {
    try {
      setLifetimeProcessing(true);
      const { processLifetimeDecisionFile } = await import("@/lib/lifetimeBleederAnalysis");
      const result = await processLifetimeDecisionFile(file);
      setLifetimeDecisionResult(result);
      setLifetimeStage("decision-results");
      toast({ title: "Processing complete", description: `${result.pausedCount} targets to pause` });
    } catch (err: any) {
      toast({ title: "Processing failed", description: err.message, variant: "destructive" });
    } finally {
      setLifetimeProcessing(false);
    }
  };

  const handleDownloadLifetimeBulkUpdate = () => {
    if (!lifetimeDecisionResult?.workbook) return;
    try {
      const wbout = XLSX.write(lifetimeDecisionResult.workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = lifetimeDecisionResult.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Amazon Bulk Update downloaded", description: lifetimeDecisionResult.fileName });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  const handleProcessorReupload = () => {
    setDecisionResults(null);
    setValidatorResults(null);
    setShowProcessorUpload(true);
    setShowValidatorUpload(false);
    setProcessorType("decision-processor");
    setCompletedSteps([1]);
    setCurrentStep(2);
    toast({ title: "Ready for reupload", description: "Upload your edited Bleeders Report with decisions." });
  };

  const handleToolbarReupload = () => {
    if (currentStep === 3 && validatorResults) {
      setValidatorResults(null);
      setShowValidatorUpload(true);
      setProcessorType("validator");
    } else if (currentStep === 2 && decisionResults) {
      handleProcessorReupload();
    } else {
      setConfirmModal({ open: true, type: "reupload", data: null });
    }
  };

  const handleConfirmAction = async () => {
    if (confirmModal.type === "reupload") {
      setFileContext(null);
      setAnalysisResults(null);
      setDecisionResults(null);
      setValidatorResults(null);
      setProcessorType(null);
      setShowProcessorUpload(false);
      setShowValidatorUpload(false);
      setCompletedSteps([]);
      setCurrentStep(1);
      setChatState("awaiting-upload");
      setShowUpload(true);
    } else if (confirmModal.type === "reset") {
      handleReset();
    } else if (confirmModal.type === "duplicate") {
      if (confirmModal.data?.files) {
        await processFileUpload(confirmModal.data.files, true);
      }
    }
    setConfirmModal({ open: false, type: null, data: null });
  };

  const generateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const processFileUpload = async (files: File[], forceAnalysis: boolean = false) => {
    const now = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
    const fileHash = await generateFileHash(files[0]);

    if (!forceAnalysis && fileContext && fileContext.fileHash === fileHash) {
      setConfirmModal({ open: true, type: "duplicate", data: { files } });
      return;
    }

    setFileContext(null);
    setAnalysisResults(null);
    setDecisionResults(null);
    setValidatorResults(null);
    setProcessorType(null);
    setChatState("analyzing");
    setShowUpload(false);

    try {
      const fileType = await detectFileType(files[0]);

      if (fileType === "bleeders-report") {
        try {
          const validation = await validateUploadFile(files[0], "decision");
          if (!validation.passed) {
            toast({ title: "Validation Failed", description: "Decision file contains errors.", variant: "destructive" });
            setChatState("awaiting-upload");
            setShowProcessorUpload(true);
            return;
          }
          const results = await processDecisions(files[0]);
          setShowProcessorUpload(false);
          setProcessorType("decision-processor");
          setDecisionResults(results);
          setFileContext({ fileName: files[0].name, tabsDetected: [], uploadTime: now, fileHash });
          setCurrentStep(2);
          setChatState("results");
          return;
        } catch (err: any) {
          toast({ title: "Processing Error", description: err.message, variant: "destructive" });
          setDecisionFailureCount((prev) => prev + 1);
          setChatState("awaiting-upload");
          setShowProcessorUpload(true);
          return;
        }
      }

      if (fileType === "raw-bulk") {
        const results = await analyzeBleederReport(files[0], 10, bleederMode);
        setProcessorType("report-creator");
        setAnalysisResults(results);
        setFileContext({ fileName: files[0].name, tabsDetected: results.tabsDetected, uploadTime: now, fileHash });
        setCurrentStep(1);
        setCompletedSteps([1]);
        setShowProcessorUpload(false);
        setShowValidatorUpload(false);
        setTimeline((prev) => [...prev, { fileName: files[0].name, stage: "report", status: "success", timestamp: now }]);
        setChatState("results");
        return;
      }

      if (fileType === "unknown" || (fileType === "raw-bulk" && currentStep >= 2)) {
        try {
          const results = await validateUploadFile(files[0], "raw");
          setProcessorType("validator");
          setValidatorResults(results);
          setFileContext({ fileName: files[0].name, tabsDetected: [], uploadTime: now, fileHash });
          setCurrentStep(3);
          setShowValidatorUpload(false);
          const hasErrors = Object.values(results).some(
            (val) => typeof val === "object" && val !== null && "status" in val && (val as any).status === "error",
          );
          if (!hasErrors) {
            setCompletedSteps((prev) => [...new Set([...prev, 1, 2, 3])]);
          }
          setChatState("results");
          return;
        } catch (valError) {
          const errorMsg = valError instanceof Error ? valError.message : "Validation failed";
          toast({ title: "Validation Error", description: errorMsg, variant: "destructive" });
          setChatState("awaiting-upload");
          setShowValidatorUpload(true);
          return;
        }
      }

      setChatState("results");
    } catch (error) {
      setChatState("awaiting-upload");
      setShowUpload(true);
      toast({ title: "Processing failed", description: error instanceof Error ? error.message : "Unable to process file.", variant: "destructive" });
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    await processFileUpload(files, false);
  };

  // ── Module selection from sidebar ──

  const handleSidebarModuleSelect = (module: typeof activeModule) => {
    if (module === activeModule) return;
    if (module === 'bleeders_1') {
      setActiveModule('bleeders_1');
      setBleederMode('standard');
      setChatState('awaiting-upload');
      setShowUpload(true);
      setAnalysisResults(null);
      setDecisionResults(null);
      setValidatorResults(null);
      setProcessorType(null);
      setCompletedSteps([]);
      setCurrentStep(1);
    } else if (module === 'bleeders_2') {
      setActiveModule('bleeders_2');
      setBleeder2Stage('picker');
      setBleeder2ActiveTrack(null);
    } else if (module === 'lifetime_bleeders') {
      setActiveModule('lifetime_bleeders');
      setBleederMode('lifetime');
      setLifetimeStage('upload');
      setLifetimeResult(null);
      setLifetimeDecisionResult(null);
      setChatState('awaiting-upload');
      setShowUpload(false);
    } else {
      setActiveModule(null);
    }
  };

  // ── Track status for sidebar ──
  const trackStatus = useMemo(() => {
    const status: Record<Bleeder2Track, 'idle' | 'active' | 'done'> = {
      SBSD: 'idle', SP: 'idle', SP_KEYWORDS: 'idle', ACOS100: 'idle',
    };
    (['SBSD', 'SP', 'SP_KEYWORDS', 'ACOS100'] as Bleeder2Track[]).forEach(t => {
      if (bleeder2TrackState[t].amazonFile || bleeder2TrackState[t].result) {
        status[t] = bleeder2TrackState[t].amazonFile ? 'done' : 'active';
      }
      if (bleeder2ActiveTrack === t && bleeder2Stage !== 'picker') {
        status[t] = bleeder2TrackState[t].amazonFile ? 'done' : 'active';
      }
    });
    return status;
  }, [bleeder2TrackState, bleeder2ActiveTrack, bleeder2Stage]);

  // ── Status badge ──

  const getStatusBadge = () => {
    if (activeModule === 'bleeders_2' && bleeder2ActiveTrack) {
      const ts = bleeder2TrackState[bleeder2ActiveTrack];
      if (ts.result) {
        const count = ts.result.bleeders.length;
        const spend = ts.result.totalSpend;
        if (count > 0) {
          return { label: `${count} bleeders · $${spend.toFixed(0)} at risk`, variant: 'danger' as const };
        }
        return { label: '0 bleeders', variant: 'neutral' as const };
      }
    }
    if (activeModule === 'bleeders_1' && analysisResults) {
      const allRows = analysisResults.allRows || [];
      if (allRows.length > 0) {
        const totalSpend = allRows.reduce((s: number, r: any) => s + (r.spend || 0), 0);
        return { label: `${allRows.length} bleeders · $${totalSpend.toFixed(0)} at risk`, variant: 'danger' as const };
      }
    }
    return null;
  };

  const getPageTitle = () => {
    if (!activeModule) return 'Home';
    if (activeModule === 'bleeders_1') return 'Bleeders 1.0';
    if (activeModule === 'bleeders_2') return 'Bleeders 2.0';
    if (activeModule === 'lifetime_bleeders') return 'Lifetime Audit';
    return 'Home';
  };

  // ── Breadcrumbs ──
  const getBreadcrumbs = () => {
    const crumbs: { label: string; onClick?: () => void }[] = [];

    if (activeModule === 'bleeders_2') {
      if (bleeder2ActiveTrack) {
        crumbs.push({
          label: TRACK_LABELS_SHORT[bleeder2ActiveTrack],
          onClick: bleeder2Stage !== 'picker' ? () => {
            // Navigate back to track picker level is clicking track name when deeper
          } : undefined,
        });
        if (bleeder2Stage !== 'picker' && bleeder2Stage !== 'results') {
          crumbs.push({ label: STAGE_LABELS[bleeder2Stage] || bleeder2Stage });
        }
        if (bleeder2Stage === 'results') {
          crumbs.push({ label: 'Results' });
        }
      }
    }

    if (activeModule === 'bleeders_1') {
      if (analysisResults) {
        crumbs.push({ label: 'Results' });
      } else if (decisionResults) {
        crumbs.push({ label: 'Decision Processing' });
      } else if (validatorResults) {
        crumbs.push({ label: 'Validation' });
      }
    }

    if (activeModule === 'lifetime_bleeders') {
      if (lifetimeStage === 'results' || lifetimeStage === 'decision-upload') {
        crumbs.push({ label: 'Results' });
      } else if (lifetimeStage === 'decision-results') {
        crumbs.push({ label: 'Decision Results' });
      }
    }

    return crumbs;
  };

  // ── Determine which topbar actions to show ──
  const isUploadScreen = (
    (activeModule === 'bleeders_1' && !analysisResults && !decisionResults && !validatorResults) ||
    (activeModule === 'bleeders_2' && (bleeder2Stage === 'picker' || bleeder2Stage === 'thresholds' || bleeder2Stage === 'upload')) ||
    (activeModule === 'lifetime_bleeders' && lifetimeStage === 'upload')
  );

  const isResultsScreen = !isUploadScreen && activeModule !== null;

  // ── Track picker cards ──
  const TRACK_CARDS = [
    { id: 'SBSD' as const, name: 'SB/SD Bad Targets', desc: 'Sponsored Brands & Display targeting', accent: 'border-l-red-500' },
    { id: 'SP' as const, name: 'SP Bad Search Terms', desc: 'Sponsored Products search terms', accent: 'border-l-amber-500' },
    { id: 'SP_KEYWORDS' as const, name: 'SP Bad Targets', desc: 'Sponsored Products targets', accent: 'border-l-primary' },
    { id: 'ACOS100' as const, name: 'Campaigns >100% ACoS', desc: 'High ACoS campaign cleanup', accent: 'border-l-purple-500' },
  ];

  // ── Back navigation ──
  const getBackHandler = () => {
    if (!activeModule) return undefined;

    if (activeModule === 'bleeders_2') {
      if (bleeder2Stage === 'results' || bleeder2Stage === 'decision') return () => setBleeder2Stage('upload');
      if (bleeder2Stage === 'upload') return () => setBleeder2Stage(bleeder2ActiveTrack === 'ACOS100' ? 'picker' : 'thresholds');
      if (bleeder2Stage === 'thresholds') return () => { setBleeder2ActiveTrack(null); setBleeder2Stage('picker'); };
      if (bleeder2Stage === 'picker') return () => handleSidebarModuleSelect(null);
      return () => handleSidebarModuleSelect(null);
    }

    if (activeModule === 'bleeders_1') {
      if (validatorResults) return () => { setValidatorResults(null); setShowProcessorUpload(true); setShowValidatorUpload(false); setCurrentStep(2); };
      if (decisionResults) return () => { setDecisionResults(null); setProcessorType(null); setShowProcessorUpload(false); setAnalysisResults(null); setChatState('awaiting-upload'); setShowUpload(true); setCurrentStep(1); setCompletedSteps([]); };
      if (analysisResults) return () => { setAnalysisResults(null); setChatState('awaiting-upload'); setShowUpload(true); setProcessorType(null); setCurrentStep(1); setCompletedSteps([]); };
      return () => handleSidebarModuleSelect(null);
    }

    if (activeModule === 'lifetime_bleeders') {
      if (lifetimeStage === 'decision-results') return () => { setLifetimeDecisionResult(null); setLifetimeStage('decision-upload'); };
      if (lifetimeStage === 'decision-upload' || lifetimeStage === 'results') return () => { setLifetimeResult(null); setLifetimeStage('upload'); };
      return () => handleSidebarModuleSelect(null);
    }

    return () => handleSidebarModuleSelect(null);
  };

  // ── Render ──

  return (
    <div className="min-h-screen flex">
      <AppSidebar
        activeModule={activeModule}
        onSelectModule={(mod) => { setShowHistoryView(false); handleSidebarModuleSelect(mod); }}
        bleeder2ActiveTrack={bleeder2ActiveTrack}
        onSelectTrack={handleSelectTrack}
        showTracks={activeModule === 'bleeders_2'}
        onBackToTrackPicker={() => {
          setBleeder2ActiveTrack(null);
          setBleeder2Stage('picker');
        }}
        trackStatus={trackStatus}
        trackCompletionStatus={trackCompletionStatus}
        onReset={handleReset}
        showHistoryView={showHistoryView}
        setShowHistoryView={setShowHistoryView}
      />

      <div className="flex-1 flex flex-col min-h-screen">
        <Topbar
          title={getPageTitle()}
          breadcrumbs={getBreadcrumbs()}
          statusBadge={getStatusBadge()}
          onHelp={() => setShowHelpDrawer(true)}
          onReset={handleReset}
          onNewFile={isResultsScreen ? handleToolbarReupload : undefined}
          showNewFile={isResultsScreen}
          showReset={isResultsScreen}
          onBack={getBackHandler()}
        />

        <main className="flex-1 overflow-y-auto" style={{ padding: '24px 32px 40px' }}>
          <div className="max-w-[1240px] mx-auto page-enter" key={`${activeModule ?? 'home'}-${bleeder2Stage}-${bleeder2ActiveTrack ?? ''}-${showHistoryView}`}>
            {/* SESSION LOG */}
            {showHistoryView && (
              <SessionLogView />
            )}

            {/* HOME */}
            {!activeModule && !showHistoryView && (
              <HomeScreen onSelectModule={(mod) => { setShowHistoryView(false); handleSidebarModuleSelect(mod); }} />
            )}

            {/* BLEEDERS 1.0 — UPLOAD (centered hero) */}
            {activeModule === 'bleeders_1' && !analysisResults && !decisionResults && !validatorResults && (
              <div className="max-w-[640px] mx-auto pt-4">
                <div className="mb-5">
                  <h2 className="text-[22px] font-semibold text-foreground tracking-tight">Upload your bulk file</h2>
                  <p className="text-[13px] text-[hsl(var(--text-secondary))] mt-1.5">
                    Bleeders 1.0 — find high-spend, zero-conversion targets across all campaigns.
                  </p>
                </div>
                <UploadCard onFileUpload={handleFileUpload} isVisible={true} />
              </div>
            )}

            {activeModule === 'bleeders_1' && processorType === "report-creator" && analysisResults && (
              <AnalysisResults
                summary={analysisResults.summary}
                tables={analysisResults.tables}
                csvData={analysisResults.csvData}
                validation={analysisResults.validation}
                topSpenders={analysisResults.topSpenders}
                allRows={analysisResults.allRows}
                formattedWorkbook={analysisResults.formattedWorkbook}
                mode={analysisResults.mode || bleederMode}
                onProceedToProcessor={() => {
                  setShowProcessorUpload(true);
                  setShowUpload(false);
                  setCurrentStep(2);
                }}
              />
            )}

            {showProcessorUpload && !decisionResults && activeModule === 'bleeders_1' && (
              <ProcessorUploadPanel
                onFileUpload={handleFileUpload}
                title="Step 2 — Decision Processor"
                subtitle="Upload your Bleeders 1 Report with the Decision column filled in."
                checklist={["File includes a Decision column", "Tabs may include: SP/SB/SD Campaigns, SP/SB Search Term Reports", "Saved and closed (Excel/Sheets)"]}
                stepNumber={2}
                isExpanded={showProcessorUpload}
              />
            )}

            {processorType === "decision-processor" && decisionResults && (
              <DecisionProcessorResults
                fileName={decisionResults.fileName}
                summary={decisionResults.summary}
                workbook={decisionResults.workbook}
                validation={decisionResults.validation}
                autoRepairs={decisionResults.autoRepairs || []}
                onStartBleeders2={handleStartBleeder2}
                preFlight={decisionResults.preFlight || { fileReadable: true, recognizedSheets: [], decisionColumnFound: false, columnsNormalized: false, actionableRows: 0 }}
                onValidate={() => {
                  setShowValidatorUpload(true);
                  setShowProcessorUpload(false);
                  setCurrentStep(3);
                }}
                onReupload={handleProcessorReupload}
              />
            )}

            {processorType === "validator" && validatorResults && (
              <ValidatorResults validation={validatorResults} fileName={fileContext?.fileName} workbook={validatorResults.workbook} />
            )}

            {/* BLEEDERS 2.0 — Track picker */}
            {bleeder2Stage === "picker" && activeModule === "bleeders_2" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-[20px] font-semibold text-foreground">Select a Track</h2>
                  <p className="text-[13px] text-[hsl(var(--text-secondary))] mt-1">Choose which analysis to run.</p>
                </div>
                {Object.values(trackCompletionStatus).every(s => s === 'complete') ? (
                  <div style={{
                    background: '#F0FDF4', border: '1px solid #BBF7D0',
                    borderRadius: '8px', padding: '10px 16px',
                    fontSize: '13px', color: '#16A34A', fontWeight: '500',
                    marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <span>✓</span> All tracks complete — session ready to archive
                  </div>
                ) : (
                  <p style={{fontSize: '12px', color: '#9BA3AF', marginBottom: '0px'}}>
                    {Object.values(trackCompletionStatus).filter(s => s === 'complete').length} of 4 tracks complete
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {TRACK_CARDS.map(t => {
                    const isDone = trackCompletionStatus[t.id] === 'complete' || trackStatus[t.id] === 'done';
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTrack(t.id)}
                        className={`group text-left rounded-xl border border-border bg-card border-l-4 ${t.accent} card-hover btn-press relative p-5`}
                      >
                        {isDone && (
                          <span className="absolute top-3 right-3" style={{
                            background: '#F0FDF4', color: '#16A34A',
                            border: '1px solid #BBF7D0', borderRadius: '99px',
                            fontSize: '11px', fontWeight: '500', padding: '2px 8px'
                          }}>Done</span>
                        )}
                        <div className="text-[15px] font-semibold text-foreground">{t.name}</div>
                        <div className="text-[13px] text-[hsl(var(--text-secondary))] mt-1">{t.desc}</div>
                        <ArrowRight className="w-3.5 h-3.5 text-[hsl(var(--text-tertiary))] mt-3 opacity-0 group-hover:opacity-100" style={{ transition: 'opacity 150ms ease' }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BLEEDERS 2.0 — Thresholds */}
            {bleeder2Stage === "thresholds" && activeModule === "bleeders_2" && bleeder2ActiveTrack && (
              <div className="pt-4">
                <ThresholdConfig
                  thresholds={bleeder2Thresholds}
                  onChange={setBleeder2Thresholds}
                  onContinue={handleBleeder2ContinueFromThresholds}
                  clientName={activeClient.name}
                />
              </div>
            )}

            {/* BLEEDERS 2.0 — Upload */}
            {bleeder2Stage === "upload" && activeModule === "bleeders_2" && bleeder2ActiveTrack && (
              <div className="pt-4 space-y-4">
                <TrackUploader
                  track={bleeder2ActiveTrack}
                  onUpload={(track, file) => handleBleeder2TrackUpload(file, track)}
                  error={bleeder2TrackState[bleeder2ActiveTrack].validationError || undefined}
                  uploadedFile={bleeder2TrackState[bleeder2ActiveTrack].file}
                  isValidating={bleeder2TrackState[bleeder2ActiveTrack].isValidating}
                />
              </div>
            )}

            {/* BLEEDERS 2.0 — Results */}
            {bleeder2Stage === "results" && activeModule === "bleeders_2" && bleeder2ActiveTrack && bleeder2TrackState[bleeder2ActiveTrack].result && (
              <Bleeder2TrackResults
                result={bleeder2TrackState[bleeder2ActiveTrack].result!}
                onDownload={() => handleDownloadDecisionSheet(bleeder2ActiveTrack!)}
                onUploadDecision={(_, file) => handleBleeder2DecisionUpload(file, bleeder2ActiveTrack!)}
                onAdjustThresholds={() => setBleeder2Stage("thresholds")}
                onUploadNewFile={(track) => handleResetTrack(track)}
                decisionFile={bleeder2TrackState[bleeder2ActiveTrack].decisionFile}
                amazonFile={bleeder2TrackState[bleeder2ActiveTrack].amazonFile}
                onDownloadAmazon={() => handleDownloadAmazonFile(bleeder2ActiveTrack!)}
              />
            )}

            {/* LIFETIME BLEEDERS */}
            {activeModule === "lifetime_bleeders" && lifetimeStage === "upload" && (
              <div className="pt-4">
                <LifetimeUploader onAnalyze={handleLifetimeAnalysis} isProcessing={lifetimeProcessing} />
              </div>
            )}

            {activeModule === "lifetime_bleeders" && (lifetimeStage === "results" || lifetimeStage === "decision-upload" || lifetimeStage === "decision-results") && lifetimeResult && (
              <div className="space-y-4 pt-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-secondary p-4">
                    <div className="text-[22px] font-medium font-mono-nums text-foreground">{lifetimeResult.bleeders.length}</div>
                    <div className="text-[11px] text-[hsl(var(--text-tertiary))]">Bleeders Found</div>
                  </div>
                  <div className="rounded-lg bg-secondary p-4">
                    <div className="text-[22px] font-medium font-mono-nums text-destructive">${lifetimeResult.totalSpend.toFixed(2)}</div>
                    <div className="text-[11px] text-[hsl(var(--text-tertiary))]">Wasted Spend</div>
                  </div>
                  <div className="rounded-lg bg-secondary p-4">
                    <div className="text-[22px] font-medium font-mono-nums text-foreground">{lifetimeResult.excludedRankingCount}</div>
                    <div className="text-[11px] text-[hsl(var(--text-tertiary))]">Ranking Excluded</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleDownloadLifetimeDecisionSheet} className="flex-1 btn-press">
                    <Download className="mr-2 h-4 w-4" />
                    Download Decision File
                  </Button>
                </div>

                {/* Decision upload */}
                {(lifetimeStage === "decision-upload" || lifetimeStage === "results") && (
                  <div className="rounded-lg border border-dashed border-border/60 p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                    onDrop={(e) => { e.preventDefault(); if (lifetimeProcessing) return; const file = e.dataTransfer.files[0]; if (file) handleLifetimeDecisionUpload(file); }}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => { if (lifetimeProcessing) return; document.getElementById("lifetime-decision-input")?.click(); }}
                  >
                    <input id="lifetime-decision-input" type="file" accept=".xlsx,.xls" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleLifetimeDecisionUpload(file); e.target.value = ""; }} className="hidden" disabled={lifetimeProcessing} />
                    {lifetimeProcessing ? (
                      <div className="flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing decisions...
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-[13px] font-medium">Upload edited Decision File</p>
                        <p className="text-[12px] text-muted-foreground mt-1">Drag & drop or click to browse</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Decision results */}
                {lifetimeStage === "decision-results" && lifetimeDecisionResult && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-secondary p-4">
                        <div className="text-[22px] font-medium font-mono-nums text-destructive">{lifetimeDecisionResult.pausedCount}</div>
                        <div className="text-[11px] text-[hsl(var(--text-tertiary))]">Targets to Pause</div>
                      </div>
                      <div className="rounded-lg bg-secondary p-4">
                        <div className="text-[22px] font-medium font-mono-nums text-foreground">{lifetimeDecisionResult.keptCount}</div>
                        <div className="text-[11px] text-[hsl(var(--text-tertiary))]">Targets Kept</div>
                      </div>
                    </div>
                    <Button onClick={handleDownloadLifetimeBulkUpdate} className="w-full btn-press">
                      <Download className="mr-2 h-4 w-4" />
                      Download Amazon Bulk Update
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>
      </div>

      <ConfirmModal
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal({ open, type: null, data: null })}
        title={confirmModal.type === "reupload" ? "Replace File?" : confirmModal.type === "duplicate" ? "Duplicate File Detected" : "Reset Session?"}
        description={confirmModal.type === "reupload" ? "This will clear the current file and all results." : confirmModal.type === "duplicate" ? "This appears to be the same file. Re-analyze anyway?" : "This will clear all processed data and return you to the welcome screen."}
        confirmText={confirmModal.type === "reupload" ? "Replace" : confirmModal.type === "duplicate" ? "Yes, Re-analyze" : "Reset"}
        cancelText="Cancel"
        onConfirm={handleConfirmAction}
        variant={confirmModal.type === "reset" ? "destructive" : "default"}
      />

      <HelpDrawer open={showHelpDrawer} onClose={() => setShowHelpDrawer(false)} />
    </div>
  );
};

export default Index;
