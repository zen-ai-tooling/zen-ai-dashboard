import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { UploadCard } from "@/components/upload/UploadCard";
import { ProcessorUploadPanel } from "@/components/upload/ProcessorUploadPanel";
import { AnalysisResults } from "@/components/results/AnalysisResults";
import { DecisionProcessorResults } from "@/components/results/DecisionProcessorResults";
import { ValidatorResults } from "@/components/results/ValidatorResults";
import { HeaderToolbar } from "@/components/toolbar/HeaderToolbar";
import { StatusTimeline } from "@/components/toolbar/StatusTimeline";
import { ProgressSteps } from "@/components/ui/progress-steps";
import { ProgressTracker } from "@/components/ui/progress-tracker";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { HelpDrawer } from "@/components/modals/HelpDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, CheckCircle2, AlertCircle, FileText, Upload, Download, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { analyzeBleederReport } from "@/lib/bleederAnalyzer";
import { processDecisions } from "@/lib/decisionProcessor";
import { processDecision2File } from "@/lib/decision2Processor";
import { validateUploadFile } from "@/lib/validator";
import { detectFileType } from "@/lib/fileTypeDetector";
import { Bleeder2TrackResults } from "@/components/bleeders2/Bleeder2TrackResults";
import { Decision2ProcessorResults } from "@/components/results/Decision2ProcessorResults";
import { TrackSelector, type Bleeder2Track } from "@/components/bleeders2/TrackSelector";
import { ThresholdConfig, type Bleeder2Thresholds } from "@/components/bleeders2/ThresholdConfig";
import { TrackUploader } from "@/components/bleeders2/TrackUploader";
import { LifetimeUploader } from "@/components/bleeders2/LifetimeUploader";
import { parseCommand } from "@/lib/commandParser";
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

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "**Hello, operator 👋**\n\nRun automated workflows for campaign analysis, decision processing, and bulk file management.\n\nType **'bleeders 1.0'**, **'bleeders 2.0'**, **'bleeding lifetime targets'**, or **'help'** to begin.",
    },
  ]);
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
  // Bleeders 2.0 state - per-track state machine
  type Bleeder2Stage = "picker" | "thresholds" | "upload" | "results" | "decision";
  const [bleeder2ActiveTrack, setBleeder2ActiveTrack] = useState<Bleeder2Track | null>(null);
  const [bleeder2Stage, setBleeder2Stage] = useState<Bleeder2Stage>("picker");
  const [bleeder2Thresholds, setBleeder2Thresholds] = useState<Bleeder2Thresholds>({
    targetACOS: 35,
    clickThreshold: 10,
    fewerThanOrders: 5,
    excludeRanking: true,
  });

  // Per-track isolated state
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
    SBSD: {
      file: null,
      isValidating: false,
      validationError: null,
      result: null,
      decisionFile: null,
      amazonFile: null,
    },
    SP: { file: null, isValidating: false, validationError: null, result: null, decisionFile: null, amazonFile: null },
    SP_KEYWORDS: {
      file: null,
      isValidating: false,
      validationError: null,
      result: null,
      decisionFile: null,
      amazonFile: null,
    },
    ACOS100: {
      file: null,
      isValidating: false,
      validationError: null,
      result: null,
      decisionFile: null,
      amazonFile: null,
    },
  });

  // Lifetime Bleeders two-file workflow state
  type LifetimeStage = "upload" | "processing" | "results" | "decision-upload" | "decision-results";
  const [lifetimeStage, setLifetimeStage] = useState<LifetimeStage>("upload");
  const [lifetimeResult, setLifetimeResult] = useState<any | null>(null);
  const [lifetimeProcessing, setLifetimeProcessing] = useState(false);
  const [lifetimeDecisionResult, setLifetimeDecisionResult] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, analysisResults]);

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  const addTypingMessage = async (content: string, delay = 500) => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, delay));
    setIsTyping(false);
    addMessage("assistant", content);
  };

  // Levenshtein distance for fuzzy matching
  const editDistance = (a: string, b: string): number => {
    const matrix: number[][] = Array(b.length + 1)
      .fill(null)
      .map(() => Array(a.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + cost);
      }
    }

    return matrix[b.length][a.length];
  };

  const semanticMatch = (text: string, patterns: string[], maxDistance = 2): boolean => {
    const normalized = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "");
    const words = normalized.split(/\s+/);

    // Direct contains match
    if (patterns.some((pattern) => normalized.includes(pattern))) {
      return true;
    }

    // Edit distance match for single words
    if (words.length === 1) {
      return patterns.some((pattern) => {
        const patternWords = pattern.split(/\s+/);
        return patternWords.some((pw) => editDistance(words[0], pw) <= maxDistance);
      });
    }

    // Multi-word phrase match
    const joined = words.join("");
    return patterns.some((pattern) => {
      const patternJoined = pattern.replace(/\s+/g, "");
      return editDistance(joined, patternJoined) <= maxDistance;
    });
  };

  const fuzzyMatchBleeders = (text: string): boolean => {
    const patterns = [
      /\bbleeder(s)?\s*(1|one|1\.0)\b/i,
      /\bzero.?sale/i,
      /\bwasted\s+spend/i,
      /\brun\s+bleeder(s)?\s*(1|one)\b/i,
      /\bstart\s+bleeder(s)?\s*(1|one)\b/i,
      /\bbleder(s)?\s*(1|one)\b/i,
      /\bbleadar(s)?\s*(1|one)\b/i,
    ];
    return patterns.some((p) => p.test(text));
  };

  const fuzzyMatchBleeders2 = (text: string): boolean => {
    const patterns = [
      /\bbleeder(s)?\s*(2|two|2\.0)\b/i,
      /\blow.?sales?\s*(report|optimizer)?\b/i,
      /\bhigh.?acos\b/i,
      /\bacos\s+optimizer/i,
      /\brun\s+bleeder(s)?\s*(2|two)\b/i,
      /\bstart\s+bleeder(s)?\s*(2|two)\b/i,
      /\bbleder(s)?\s*(2|two)\b/i,
      /\bbleadar(s)?\s*(2|two)\b/i,
    ];
    return patterns.some((p) => p.test(text));
  };

  const isAmbiguousBleeder = (text: string): boolean => {
    const ambiguousPattern = /\bbleeder(s)?\b(?!\s*(1|2|one|two|1\.0|2\.0))/i;
    return ambiguousPattern.test(text) && !fuzzyMatchBleeders(text) && !fuzzyMatchBleeders2(text);
  };

  const fuzzyMatchReupload = (text: string): boolean =>
    semanticMatch(text, [
      "reupload",
      "reuplod",
      "replace",
      "uploadnew",
      "uploadnewfile",
      "wrongfile",
      "useanother",
      "newupload",
    ]);

  const fuzzyMatchReset = (text: string): boolean =>
    semanticMatch(text, ["reset", "resset", "restart", "rest", "startover", "newrun", "beginagain", "clear"]);

  const fuzzyMatchStatus = (text: string): boolean =>
    semanticMatch(text, ["status", "state", "info", "context", "whatfile", "whatsloaded"]);

  const fuzzyMatchHelp = (text: string): boolean =>
    semanticMatch(text, [
      "help",
      "instructions",
      "guide",
      "howto",
      "wheretofind",
      "commands",
      "modules",
      "showcommands",
    ]);

  const fuzzyMatchCancel = (text: string): boolean => semanticMatch(text, ["cancel", "stop", "abort"]);

  const fuzzyMatchYes = (text: string): boolean =>
    semanticMatch(text, ["yes", "y", "ok", "proceed", "sure", "confirm"]);

  const fuzzyMatchNo = (text: string): boolean => semanticMatch(text, ["no", "n", "nope", "nevermind"]);

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
    // Reset Bleeders 2.0
    setBleeder2ActiveTrack(null);
    setBleeder2Stage("picker");
    setBleeder2Thresholds({
      targetACOS: 35,
      clickThreshold: 10,
      fewerThanOrders: 5,
      excludeRanking: true,
    });
    setBleeder2TrackState({
      SBSD: {
        file: null,
        isValidating: false,
        validationError: null,
        result: null,
        decisionFile: null,
        amazonFile: null,
      },
      SP: {
        file: null,
        isValidating: false,
        validationError: null,
        result: null,
        decisionFile: null,
        amazonFile: null,
      },
      SP_KEYWORDS: {
        file: null,
        isValidating: false,
        validationError: null,
        result: null,
        decisionFile: null,
        amazonFile: null,
      },
      ACOS100: {
        file: null,
        isValidating: false,
        validationError: null,
        result: null,
        decisionFile: null,
        amazonFile: null,
      },
    });
    // Reset Lifetime Bleeders
    setLifetimeStage("upload");
    setLifetimeResult(null);
    setLifetimeProcessing(false);
    setLifetimeDecisionResult(null);

    toast({
      title: "Session reset complete",
      description: "You can start a new workflow anytime.",
    });
  };

  // Bleeders 2.0 handlers
  const handleStartBleeder2 = async () => {
    setActiveModule("bleeders_2");
    setBleeder2Stage("picker");
    await addTypingMessage(
      "🧩 **Bleeders 2.0 — Low Orders & High ACoS Cleanup**\n\nChoose a track to run now. You can run the others afterward.",
      500,
    );
  };

  const handleSelectTrack = async (track: Bleeder2Track) => {
    // Track isolation: Reset previous track state when switching tracks
    if (bleeder2ActiveTrack && bleeder2ActiveTrack !== track) {
      console.log(`[Track Isolation] Switching from ${bleeder2ActiveTrack} to ${track}`);
      setBleeder2TrackState((prev) => ({
        ...prev,
        [bleeder2ActiveTrack]: {
          file: null,
          isValidating: false,
          validationError: null,
          result: null,
          decisionFile: null,
          amazonFile: null,
        },
      }));
    }

    setBleeder2ActiveTrack(track);
    // Skip thresholds for ACOS100 track - go directly to upload
    setBleeder2Stage(track === "ACOS100" ? "upload" : "thresholds");

    // Reset only this track's state
    setBleeder2TrackState((prev) => ({
      ...prev,
      [track]: {
        file: null,
        isValidating: false,
        validationError: null,
        result: null,
        decisionFile: null,
        amazonFile: null,
      },
    }));

    const trackNames: Record<Bleeder2Track, string> = {
      SBSD: "SB/SD Bad Keywords",
      SP: "SP Bad Search Terms",
      SP_KEYWORDS: "SP Bad Keywords (Targeting)",
      ACOS100: "Campaigns >100% ACoS",
    };

    if (track === "ACOS100") {
      await addTypingMessage(
        `Starting **${trackNames[track]}** track...\n\nThis track automatically finds all campaigns with ACoS ≥ 100%. Upload your Campaign Performance report.`,
        500,
      );
    } else {
      await addTypingMessage(`Starting **${trackNames[track]}** track...`, 300);
    }
  };

  const handleResetTrack = (track: Bleeder2Track) => {
    console.log(`[Track Isolation] Resetting track ${track}`);
    setBleeder2TrackState((prev) => ({
      ...prev,
      [track]: {
        file: null,
        isValidating: false,
        validationError: null,
        result: null,
        decisionFile: null,
        amazonFile: null,
      },
    }));
    setBleeder2Stage("upload");
    toast({
      title: "Track reset",
      description: `${track} ready for new upload`,
    });
  };

  const handleBleeder2ContinueFromThresholds = async () => {
    if (!bleeder2ActiveTrack) return;
    setBleeder2Stage("upload");
    const sbsdThreshold = bleeder2Thresholds.targetACOS + 10;
    const spThreshold = bleeder2Thresholds.targetACOS + 20;
    await addTypingMessage(
      `✅ Thresholds saved:\n- **SB/SD:** ${sbsdThreshold}% ACoS (${bleeder2Thresholds.targetACOS}% + 10%)\n- **SP:** ${spThreshold}% ACoS (${bleeder2Thresholds.targetACOS}% + 20%)\n- Orders ≤ ${bleeder2Thresholds.fewerThanOrders}\n\nNow upload your report.`,
      500,
    );
  };

  const handleBleeder2TrackUpload = async (file: File, track: Bleeder2Track) => {
    if (activeModule !== "bleeders_2") {
      toast({
        title: "Wrong module",
        description: "Type: run bleeders 2",
        variant: "destructive",
      });
      return;
    }

    if (!file) {
      toast({
        title: "No file detected",
        variant: "destructive",
      });
      return;
    }

    const isValidType = /\.(xlsx|xls|csv|zip)$/i.test(file.name);
    if (!isValidType) {
      toast({
        title: "Invalid file type",
        description: "Use .xlsx, .xls, .csv, or .zip",
        variant: "destructive",
      });
      return;
    }

    // Update state: file uploaded, start validating
    setBleeder2TrackState((prev) => ({
      ...prev,
      [track]: {
        ...prev[track],
        file: { name: file.name, size: file.size, uploadedAt: Date.now() },
        isValidating: true,
        validationError: null,
        result: null,
      },
    }));

    toast({
      title: "File uploaded",
      description: `${file.name}`,
    });

    // Trigger validation after a small delay
    setTimeout(() => {
      handleBleeder2TrackValidation(file, track);
    }, 300);
  };

  const handleBleeder2TrackValidation = async (file: File, track: Bleeder2Track) => {
    try {
      await addTypingMessage(`Analyzing Amazon Bulk Operations file for ${track}...`, 300);

      let result: any;
      console.log("[UI] B2 run", { track, fileName: file?.name, thresholds: bleeder2Thresholds });

      // Build BulkIdIndex from the uploaded file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const { buildBulkIdIndexFromWorkbook } = await import("@/lib/amazonBulkIdIndex");
      const bulkIndex = buildBulkIdIndexFromWorkbook(workbook);

      if (track === "SBSD") {
        const { analyzeSBSDTrack } = await import("@/lib/bleeder2TrackAnalyzer");
        await addTypingMessage(`Analyzing SB/SD campaigns...`, 300);
        result = await analyzeSBSDTrack(
          file,
          bleeder2Thresholds.targetACOS,
          10,
          bleeder2Thresholds.clickThreshold,
          bleeder2Thresholds.fewerThanOrders,
          bleeder2Thresholds.excludeRanking,
          bulkIndex,
        );
      } else if (track === "SP") {
        const { analyzeSPTrack } = await import("@/lib/bleeder2TrackAnalyzer");
        await addTypingMessage(`Analyzing SP Search Terms...`, 300);
        result = await analyzeSPTrack(
          file,
          bleeder2Thresholds.targetACOS,
          20,
          0,
          bleeder2Thresholds.fewerThanOrders,
          bleeder2Thresholds.excludeRanking,
          bulkIndex,
        );
      } else if (track === "SP_KEYWORDS") {
        const { analyzeSPKeywordsTrack } = await import("@/lib/bleeder2TrackAnalyzer");
        await addTypingMessage(`Analyzing SP Keywords/Targeting...`, 300);
        result = await analyzeSPKeywordsTrack(
          file,
          bleeder2Thresholds.targetACOS,
          20,
          0,
          bleeder2Thresholds.fewerThanOrders,
          bleeder2Thresholds.excludeRanking,
          bulkIndex,
        );
      } else if (track === "ACOS100") {
        const { analyzeACoS100Track } = await import("@/lib/bleeder2TrackAnalyzer");
        await addTypingMessage(`Analyzing Campaigns >= 100% ACOS...`, 300);
        result = await analyzeACoS100Track(file, bleeder2Thresholds.excludeRanking, bulkIndex);
      } else {
        throw new Error("Unknown track type");
      }

      // Update state with result
      setBleeder2TrackState((prev) => ({
        ...prev,
        [track]: {
          ...prev[track],
          isValidating: false,
          result,
        },
      }));

      // Always move to results stage (even for 0 bleeders)
      setBleeder2Stage("results");

      // Log event for analytics
      const eventName =
        result.bleeders.length === 0
          ? `no_bleeders_${track}_${new Date().toISOString()}`
          : `bleeders_found_${track}_${new Date().toISOString()}`;
      console.log(`[Analytics] ${eventName}`, {
        count: result.bleeders.length,
        spend: result.totalSpend,
        threshold: result.acosThreshold,
      });

      if (result.bleeders.length === 0) {
        await addTypingMessage(
          `✅ ${track} complete — **No action needed** (0 bleeders found under current thresholds)`,
          300,
        );
      } else {
        await addTypingMessage(
          `✅ ${track} complete — ${result.bleeders.length} bleeders found, $${result.totalSpend.toFixed(2)} at risk`,
          300,
        );
      }
    } catch (err: any) {
      setBleeder2TrackState((prev) => ({
        ...prev,
        [track]: {
          ...prev[track],
          isValidating: false,
          validationError: err.message || "Validation failed",
        },
      }));

      await addTypingMessage(`❌ ${track} validation failed: ${err.message}`, 300);

      toast({
        title: "Validation failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadDecisionSheet = async (track: Bleeder2Track) => {
    const result = bleeder2TrackState[track].result;
    if (!result?.decisionWorkbook) return;

    try {
      // Use ExcelJS serialization (Bleeders 2.0 decision templates are ExcelJS workbooks)
      const buffer = await result.decisionWorkbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.decisionFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Decision sheet downloaded",
        description: result.decisionFileName,
      });
    } catch (err: any) {
      console.error("[handleDownloadDecisionSheet] Download failed:", err);
      toast({
        title: "Download failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleBleeder2DecisionUpload = async (file: File, track: Bleeder2Track) => {
    try {
      console.log(`[DEBUG] handleBleeder2DecisionUpload called for track: ${track}`);
      const { processTrackDecisionFile } = await import("@/lib/bleeder2TrackDecisionProcessor");
      const result = await processTrackDecisionFile(file, track);
      
      console.log(`[DEBUG] processTrackDecisionFile result:`, {
        trackType: result.trackType,
        hasWorkbook: !!result.workbook,
        fileName: result.fileName,
        summary: result.summary,
        validationErrors: result.validation.errors.length,
      });

      if (result.validation.errors.length > 0) {
        toast({
          title: "Processing failed",
          description: result.validation.errors[0],
          variant: "destructive",
        });
        return;
      }

      const amazonFileData = { workbook: result.workbook, fileName: result.fileName };
      console.log(`[DEBUG] Creating amazonFile object:`, {
        hasWorkbook: !!amazonFileData.workbook,
        fileName: amazonFileData.fileName,
        workbookType: typeof amazonFileData.workbook,
      });

      // Use functional update to ensure we have latest state
      setBleeder2TrackState((prevState) => {
        const updatedTrackState = {
          ...prevState[track],
          decisionFile: file,
          amazonFile: amazonFileData,
        };
        
        console.log(`[DEBUG] Updating state for track ${track}:`, {
          before: { hasAmazonFile: !!prevState[track].amazonFile },
          after: { hasAmazonFile: !!updatedTrackState.amazonFile, fileName: updatedTrackState.amazonFile?.fileName },
        });
        
        const newState = {
          ...prevState,
          [track]: updatedTrackState,
        };
        
        // Verify the update
        console.log(`[DEBUG] New state for track ${track}:`, newState[track]);
        console.log(`[DEBUG] Full bleeder2TrackState keys:`, Object.keys(newState));
        
        return newState;
      });
      
      // Verify state after update (async)
      setTimeout(() => {
        console.log(`[DEBUG] State verification after 100ms - bleeder2TrackState[${track}]:`, bleeder2TrackState[track]);
      }, 100);

      if (result.autoRepairs.length > 0) {
        toast({
          title: "Auto-repairs applied",
          description: `Fixed ${result.autoRepairs[0].count} typos in decisions`,
        });
      }

      // Log success event
      console.log(`[Analytics] workflow_complete_${track}_${new Date().toISOString()}`, {
        paused: result.summary.pausedCount,
        negatives: result.summary.negativesCreated,
      });

      toast({
        title: "🎉 Workflow Complete!",
        description: `Amazon file ready: ${result.summary.pausedCount} paused, ${result.summary.negativesCreated} negatives created`,
      });
    } catch (err: any) {
      console.error(`[DEBUG] handleBleeder2DecisionUpload error for track ${track}:`, err);
      toast({
        title: "Decision processing failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadAmazonFile = async (track: Bleeder2Track) => {
    const amazonFile = bleeder2TrackState[track].amazonFile;
    if (!amazonFile?.workbook) return;

    try {
      const buffer = await amazonFile.workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = amazonFile.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Amazon file ready",
        description: amazonFile.fileName,
      });
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Lifetime Bleeders two-file analysis handler
  const handleLifetimeAnalysis = async (lifetimeReport: File, bulkFile: File) => {
    try {
      setLifetimeProcessing(true);
      await addTypingMessage("⏳ Analyzing lifetime bleeders...\n\nBuilding ID map from bulk file, then filtering lifetime report.", 500);

      const { analyzeLifetimeBleeders } = await import("@/lib/lifetimeBleederAnalysis");
      const result = await analyzeLifetimeBleeders(lifetimeReport, bulkFile);

      setLifetimeResult(result);
      setLifetimeStage("results");

      const unmappableWarning = result.unmappableCount > 0 
        ? `\n⚠️ ${result.unmappableCount} targets could not be mapped (missing from bulk file).` 
        : "";

      await addTypingMessage(
        `✅ **Lifetime Analysis Complete**\n\n` +
        `• **${result.bleeders.length}** bleeders found (10+ clicks, 0 sales)\n` +
        `• **$${result.totalSpend.toFixed(2)}** total wasted spend\n` +
        `• **${result.excludedRankingCount}** ranking campaigns excluded` +
        unmappableWarning +
        `\n\nDownload the Decision File below. All rows are pre-filled with "Pause".`,
        500
      );

      toast({
        title: "Analysis complete",
        description: `${result.bleeders.length} lifetime bleeders found`,
      });
    } catch (err: any) {
      console.error("[LIFETIME] Analysis failed:", err);
      toast({
        title: "Analysis failed",
        description: err.message,
        variant: "destructive",
      });
      await addTypingMessage(`❌ Analysis failed: ${err.message}`, 300);
    } finally {
      setLifetimeProcessing(false);
    }
  };

  const handleDownloadLifetimeDecisionSheet = async () => {
    if (!lifetimeResult?.decisionWorkbook) return;

    try {
      const buffer = await lifetimeResult.decisionWorkbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = lifetimeResult.decisionFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Auto-advance to decision upload stage
      setLifetimeStage("decision-upload");

      toast({
        title: "Decision file downloaded",
        description: "Edit the Decision column, then upload it back below.",
      });
      
      await addTypingMessage(
        "📥 **Decision file downloaded!**\n\n" +
        "**Next steps:**\n" +
        "1. Open the file and review each tab (SP, SB, SD)\n" +
        "2. Change any 'Pause' to 'Keep' for targets you want to preserve\n" +
        "3. Save the file\n" +
        "4. Upload it below to generate the Amazon Bulk Update file",
        500
      );
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleLifetimeDecisionUpload = async (file: File) => {
    try {
      setLifetimeProcessing(true);
      await addTypingMessage(`🔄 Processing decisions from **${file.name}**...`, 300);

      const { processLifetimeDecisionFile } = await import("@/lib/lifetimeBleederAnalysis");
      const result = await processLifetimeDecisionFile(file);

      setLifetimeDecisionResult(result);
      setLifetimeStage("decision-results");

      if (result.warnings.length > 0) {
        for (const warning of result.warnings.slice(0, 3)) {
          console.warn("[LIFETIME DECISION]", warning);
        }
      }

      await addTypingMessage(
        `✅ **Decision Processing Complete**\n\n` +
        `• **${result.pausedCount}** targets will be paused\n` +
        `• **${result.keptCount}** targets kept (no action)\n\n` +
        `Download the Amazon Bulk Update file below.`,
        500
      );

      toast({
        title: "Processing complete",
        description: `${result.pausedCount} targets to pause`,
      });
    } catch (err: any) {
      console.error("[LIFETIME DECISION] Processing failed:", err);
      toast({
        title: "Processing failed",
        description: err.message,
        variant: "destructive",
      });
      await addTypingMessage(`❌ Processing failed: ${err.message}`, 300);
    } finally {
      setLifetimeProcessing(false);
    }
  };

  const handleDownloadLifetimeBulkUpdate = () => {
    if (!lifetimeDecisionResult?.workbook) return;

    try {
      const wbout = XLSX.write(lifetimeDecisionResult.workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = lifetimeDecisionResult.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Amazon Bulk Update downloaded",
        description: lifetimeDecisionResult.fileName,
      });
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleRunBleeders1 = () => {
    handleReset();
    setTimeout(() => {
      setInput("run bleeders 1.0");
      const form = document.querySelector("form");
      if (form) {
        form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
      }
    }, 500);
  };

  const handleToolbarStatus = () => {
    console.log("[Intent] status (toolbar)");
    setShowStatusTimeline(!showStatusTimeline);
  };

  const handleProcessorReupload = () => {
    console.log("[Intent] reupload (processor)");

    // Clear processor & validator, keep Step 1
    setDecisionResults(null);
    setValidatorResults(null);
    setShowProcessorUpload(true);
    setShowValidatorUpload(false);
    setProcessorType("decision-processor");
    setCompletedSteps([1]);
    setCurrentStep(2);

    toast({
      title: "Ready for reupload",
      description: "Upload your edited Bleeders Report with decisions.",
    });

    // Scroll to processor upload
    setTimeout(() => {
      const processorElement = document.getElementById("step-2");
      if (processorElement) {
        processorElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleToolbarReupload = () => {
    console.log("[Intent] reupload (toolbar)");

    // Context-aware reupload based on current step
    if (currentStep === 3 && validatorResults) {
      // In validator: clear validator only, keep processor
      setValidatorResults(null);
      setShowValidatorUpload(true);
      setProcessorType("validator");
      toast({
        title: "Ready for reupload",
        description: "Upload a new file to validate.",
      });
    } else if (currentStep === 2 && decisionResults) {
      handleProcessorReupload();
    } else {
      // Default: full reupload confirmation
      setConfirmModal({ open: true, type: "reupload", data: null });
    }
  };

  const handleToolbarReset = () => {
    console.log("[Intent] reset (toolbar)");
    setConfirmModal({ open: true, type: "reset" });
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
      await addTypingMessage(
        "Previous data cleared. Please upload your Amazon Bulk Operations export.\n\n💡 Use the toolbar buttons above for Status, Reupload, and Reset.",
        500,
      );
    } else if (confirmModal.type === "reset") {
      handleReset();
      await addTypingMessage(
        "💬 Welcome to the **Amazon Ad Ops Assistant**.\n\nYou can type:\n• 'Run Bleeders 1.0' → Zero-sales wasted spend report\n• 'Run Bleeders 2.0' → Low-sales high-ACoS optimizer\n• 'Bleeding Lifetime Targets' → Monthly lifetime audit\n• 'Show modules' → View all available tools\n• 'Reset session' → Start over\n\n💡 Upload your file after selecting a workflow.",
        500,
      );
    } else if (confirmModal.type === "duplicate") {
      // User confirmed re-analysis of duplicate file
      if (confirmModal.data?.files) {
        await processFileUpload(confirmModal.data.files, true);
      }
    }
    setConfirmModal({ open: false, type: null, data: null });
  };

  const handleStatusCommand = async () => {
    if (!fileContext) {
      await addTypingMessage(
        "No file loaded yet.\n\n💡 Use the toolbar buttons above for Status, Reupload, and Reset.",
        500,
      );
    } else {
      const bleederCount = analysisResults
        ? Object.entries(analysisResults.tables)
            .filter(([_, table]) => typeof table === "string" && table.includes("|"))
            .reduce((sum, [_, table]) => sum + (table as string).split("\n").length - 2, 0)
        : 0;

      const statusMsg = `**Current Status:**
• File: ${fileContext.fileName}
• Tabs detected: ${fileContext.tabsDetected.join(", ")}
• Uploaded: ${fileContext.uploadTime} PT
• Bleeders found: ${bleederCount > 0 ? bleederCount : "Analysis pending"}
• Results: ${analysisResults ? "Available for download" : "Not yet analyzed"}

💡 Use the toolbar buttons above for Status, Reupload, and Reset.`;
      await addTypingMessage(statusMsg, 500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    addMessage("user", userMessage);
    setInput("");

    // Try parsing command first
    const cmd = parseCommand(userMessage);

    // Handle cancel intent (high priority in confirmation states)
    if (fuzzyMatchCancel(userMessage) && (chatState === "confirming-reupload" || chatState === "confirming-reset")) {
      console.log("[Intent] cancel");
      setChatState(analysisResults ? "results" : fileContext ? "awaiting-upload" : "initial");
      await addTypingMessage("Cancelled.\n\n💡 Use the toolbar buttons above for Status, Reupload, and Reset.", 500);
      return;
    }

    // Handle confirmation states
    if (chatState === "confirming-reupload") {
      if (fuzzyMatchYes(userMessage)) {
        console.log("[Intent] confirm-reupload");
        setFileContext(null);
        setAnalysisResults(null);
        setChatState("awaiting-upload");
        setShowUpload(true);
        await addTypingMessage("File cleared. Please upload your Amazon Bulk Operations export.", 500);
      } else if (fuzzyMatchNo(userMessage)) {
        console.log("[Intent] deny-reupload");
        setChatState(fileContext ? "results" : "awaiting-upload");
        await addTypingMessage(
          "Keeping current file.\n\n💡 Use the toolbar buttons above for Status, Reupload, and Reset.",
          500,
        );
      } else {
        await addTypingMessage("Please answer 'yes' or 'no', or type 'cancel'.", 300);
      }
      return;
    }

    if (chatState === "confirming-reset") {
      if (fuzzyMatchYes(userMessage)) {
        console.log("[Intent] confirm-reset");
        handleReset();
        await addTypingMessage(
          "💬 Welcome to the **Amazon Ad Ops Assistant**.\n\nYou can type:\n• 'Run Bleeders 1.0' → Zero-sales wasted spend report\n• 'Run Bleeders 2.0' → Low-sales high-ACoS optimizer\n• 'Show modules' → View all available tools\n• 'Reset session' → Start over\n\n💡 Upload your file after selecting a workflow.",
          500,
        );
      } else if (fuzzyMatchNo(userMessage)) {
        console.log("[Intent] deny-reset");
        setChatState(analysisResults ? "results" : fileContext ? "awaiting-upload" : "initial");
        await addTypingMessage(
          "Reset cancelled.\n\n💡 Use the toolbar buttons above for Status, Reupload, and Reset.",
          500,
        );
      } else {
        await addTypingMessage("Please answer 'yes' or 'no', or type 'cancel'.", 300);
      }
      return;
    }

    // Help command
    if (cmd === "HELP" || fuzzyMatchHelp(userMessage)) {
      console.log("[Intent] help");
      setShowHelpDrawer(true);
      await addTypingMessage("Opening Help & SOP Reference...", 300);
      return;
    }

    // Status command
    if (cmd === "STATUS" || fuzzyMatchStatus(userMessage)) {
      console.log("[Intent] status");
      await handleStatusCommand();
      return;
    }

    // Cancel command (outside confirmation states)
    if (fuzzyMatchCancel(userMessage)) {
      console.log("[Intent] cancel");
      await addTypingMessage("Cancelled.\n\n💡 Use the toolbar buttons above for Status, Reupload, and Reset.", 500);
      return;
    }

    // Reupload command
    if (cmd === "REUPLOAD" || fuzzyMatchReupload(userMessage)) {
      console.log("[Intent] reupload");
      if (!fileContext) {
        await addTypingMessage(
          "No file loaded yet.\n\n💡 Use the toolbar buttons above for Status, Reupload, and Reset.",
          500,
        );
        return;
      }
      setChatState("confirming-reupload");
      await addTypingMessage("Replace the current file with a new one? (yes/no)", 500);
      return;
    }

    // Reset command
    if (cmd === "RESET" || fuzzyMatchReset(userMessage)) {
      console.log("[Intent] reset");
      setChatState("confirming-reset");
      await addTypingMessage("This will clear the loaded file and results. Proceed? (yes/no)", 500);
      return;
    }

    // Initial state - start bleeders or bleeders 2
    if (chatState === "initial") {
      // Handle parsed commands first
      if (cmd === "B2") {
        console.log("[Intent] bleeders 2.0");
        handleStartBleeder2();
        return;
      }

      if (cmd === "LIFETIME") {
        console.log("[Intent] bleeding lifetime targets");
        setBleederMode("lifetime");
        setActiveModule("lifetime_bleeders");
        setLifetimeStage("upload");
        setLifetimeResult(null);
        setChatState("awaiting-upload");

        await addTypingMessage(
          "🕰️ **Bleeding Lifetime Targets — Extended Click Audit**\n\nThis track requires **two files** to map IDs and generate Amazon-compliant output.",
          800,
        );

        // Don't show the old upload card - the LifetimeUploader component will handle it
        setShowUpload(false);
        return;
      }

      if (cmd === "B1") {
        console.log("[Intent] bleeders 1.0");
        setBleederMode("standard");
        setActiveModule("bleeders_1");
        setChatState("awaiting-upload");

        await addTypingMessage(
          "Got it 👌 — I'll build your Bleeders 1.0 report to find items with Clicks > 10 and Sales = 0.",
          800,
        );

        await addTypingMessage(
          `Please upload your Amazon Bulk Operations export (.xlsx/.csv/.zip).

To download it:
📍 Amazon Ads → Campaign Manager → Bulk Operations → Create Spreadsheet (60-day range)
📋 Select: SP, SB, SD, SP Search Terms, SB Search Terms

💡 Use the toolbar buttons above for Status, Reupload, and Reset.`,
          1000,
        );

        setShowUpload(true);
        return;
      }

      if (cmd === "ACOS100") {
        console.log("[Intent] acos 100");
        handleStartBleeder2();
        // Auto-select ACOS100 track
        setTimeout(() => handleSelectTrack("ACOS100"), 100);
        return;
      }

      // Check for ambiguous "bleeder" command (fuzzy logic fallback)
      if (isAmbiguousBleeder(userMessage)) {
        console.log("[Intent] ambiguous bleeder");
        await addTypingMessage(
          "Would you like to run **Bleeders 1.0** (zero-sale spend) or **Bleeders 2.0** (low orders & high ACoS cleanup)?",
          500,
        );
        return;
      }

      // Fallback for completely unrecognized input (only if NO command matched)
      if (!cmd) {
        await addTypingMessage(
          "I didn't catch that. You can type:\n• 'Run Bleeders 1.0' → Zero-sale wasted spend\n• 'Run Bleeders 2.0' → Low orders & high ACoS cleanup\n• 'Bleeding Lifetime Targets' → Monthly lifetime audit\n• 'Help' or 'Modules' → View all available tools",
          500,
        );
      }
      return;
    } else if (chatState === "awaiting-upload") {
      // Re-parse command to allow switching workflows while awaiting upload
      const switchCmd = parseCommand(userMessage);
      
      if (switchCmd === "B1") {
        console.log("[Intent] bleeders 1.0 (switching from awaiting-upload)");
        handleReset();
        setBleederMode("standard");
        setActiveModule("bleeders_1");
        setChatState("awaiting-upload");
        await addTypingMessage(
          "Got it 👌 — I'll build your Bleeders 1.0 report to find items with Clicks > 10 and Sales = 0.",
          500,
        );
        await addTypingMessage(
          `Please upload your Amazon Bulk Operations export (.xlsx/.csv/.zip).

To download it:
📍 Amazon Ads → Campaign Manager → Bulk Operations → Create Spreadsheet (60-day range)
📋 Select: SP, SB, SD, SP Search Terms, SB Search Terms

💡 Use the toolbar buttons above for Status, Reupload, and Reset.`,
          800,
        );
        setShowUpload(true);
        return;
      }

      if (switchCmd === "B2") {
        console.log("[Intent] bleeders 2.0 (switching from awaiting-upload)");
        handleReset();
        handleStartBleeder2();
        return;
      }

      if (switchCmd === "LIFETIME") {
        console.log("[Intent] bleeding lifetime targets (switching from awaiting-upload)");
        handleReset();
        setBleederMode("lifetime");
        setActiveModule("lifetime_bleeders");
        setLifetimeStage("upload");
        setLifetimeResult(null);
        setChatState("awaiting-upload");
        setShowUpload(false);
        await addTypingMessage(
          "🕰️ **Bleeding Lifetime Targets — Extended Click Audit**\n\nThis track requires **two files** to map IDs and generate Amazon-compliant output.",
          500,
        );
        return;
      }

      if (switchCmd === "HELP") {
        setShowHelpDrawer(true);
        await addTypingMessage("Opening Help & SOP Reference...", 300);
        return;
      }

      if (switchCmd === "MODULES") {
        await addTypingMessage("Use the 'Modules' button in the toolbar above to see available workflows.", 300);
        return;
      }

      if (switchCmd === "RESET") {
        handleReset();
        return;
      }

      // Default: prompt for file upload
      await addTypingMessage(
        "Please upload your Amazon Bulk Operations file using the upload card above.\n\n💡 Use the toolbar buttons above for Status, Reupload, and Reset.",
        500,
      );
    } else if (chatState === "results") {
      if (cmd === "B2") {
        console.log("[Intent] bleeders 2.0 (new run)");
        handleReset();
        handleStartBleeder2();
        return;
      }

      if (cmd === "B1") {
        console.log("[Intent] bleeders 1.0 (new run)");
        setChatState("awaiting-upload");
        setFileContext(null);
        setAnalysisResults(null);
        setShowUpload(true);
        await addTypingMessage(
          "Starting new analysis. Please upload your file.\n\n💡 Use the toolbar buttons above for Status, Reupload, and Reset.",
          500,
        );
        return;
      }

      if (cmd === "LIFETIME") {
        console.log("[Intent] bleeding lifetime targets (new run)");
        handleReset();
        setBleederMode("lifetime");
        setActiveModule("lifetime_bleeders");
        setLifetimeStage("upload");
        setLifetimeResult(null);
        setChatState("awaiting-upload");
        setShowUpload(false);
        await addTypingMessage(
          "🕰️ **Bleeding Lifetime Targets — Extended Click Audit**\n\nThis track requires **two files** to map IDs and generate Amazon-compliant output.",
          500,
        );
        return;
      }

      if (isAmbiguousBleeder(userMessage)) {
        await addTypingMessage(
          "Would you like to run **Bleeders 1.0** (zero-sale spend) or **Bleeders 2.0** (low orders & high ACoS cleanup)?",
          500,
        );
        return;
      }

      // Only show fallback if no command matched
      if (!cmd) {
        await addTypingMessage(
          "I didn't catch that. You can type:\n• 'Run Bleeders 1.0' → Zero-sale wasted spend\n• 'Run Bleeders 2.0' → Low-sales high-ACoS optimizer\n• 'Bleeding Lifetime Targets' → Monthly lifetime audit\n• 'Help' or 'Modules' → View all available tools",
          500,
        );
      }
    }
  };

  // Helper function to generate file hash
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

    if (fileContext) {
      await addTypingMessage("✅ Fresh analysis started for " + files[0].name + " — previous file cleared.", 300);
    }

    setFileContext(null);
    setAnalysisResults(null);
    setDecisionResults(null);
    setValidatorResults(null);
    setProcessorType(null);

    addMessage("user", `📎 Uploaded ${files.length} file(s): ${files.map((f) => f.name).join(", ")}`);
    setChatState("analyzing");
    setIsTyping(true);
    setShowUpload(false);

    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      // 🔍 Single source of truth: classify the file
      const fileType = await detectFileType(files[0]);
      console.log("[DEBUG] detectFileType=", fileType, "file=", files[0].name);

      // ─────────────────────────────────────
      // 1) BLEEDERS-REPORT → Decision Processor (Step 2)
      // ─────────────────────────────────────
      if (fileType === "bleeders-report") {
        console.log("[UPLOAD ROUTER] → Decision Processor (Bleeders 1 Decisions)");

        setIsTyping(false);
        addMessage("assistant", `🔄 Validating decision file **${files[0].name}**`);
        setIsTyping(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        try {
          // Strict validation for decision file
          const validation = await validateUploadFile(files[0], "decision");

          if (!validation.passed) {
            setIsTyping(false);
            addMessage(
              "assistant",
              `❌ Decision file validation failed. Here are the details:\n\n` +
                `\`\`\`json\n${JSON.stringify(validation.debugOutput, null, 2)}\n\`\`\`` +
                `\n\nPlease fix the issues and re-upload.`,
            );
            toast({
              title: "Validation Failed",
              description: "Decision file contains errors. See chat for details.",
              variant: "destructive",
            });
            setChatState("awaiting-upload");
            setShowProcessorUpload(true);
            setIsTyping(false);
            return;
          }

          toast({
            title: "Validation Complete",
            description: "✅ Decision file validated. Generating Bulk Upload File...",
          });

          addMessage("assistant", `🔄 Processing decisions from **${files[0].name}**`);
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const results = await processDecisions(files[0]);
          const hasErrors = results.validation?.errors?.length > 0;

          setShowProcessorUpload(false);
          setProcessorType("decision-processor");
          setDecisionResults(results);
          setFileContext({ fileName: files[0].name, tabsDetected: [], uploadTime: now, fileHash });
          setCurrentStep(2);

          if (hasErrors) {
            setDecisionFailureCount((prev) => prev + 1);

            if (decisionFailureCount >= 2) {
              setTimeout(() => {
                toast({
                  title: "Processing failed again",
                  description: "Consider reviewing the uploaded file format or decision values.",
                  variant: "destructive",
                });
              }, 1000);
            }

            setCompletedSteps((prev) => [...new Set([...prev, 1])]);
            toast({
              title: "Processing Complete (with errors)",
              description: `Found ${results.validation?.errors?.length} issue(s). Check the results panel.`,
              variant: "destructive",
            });
          } else {
            setDecisionFailureCount(0);
            setCompletedSteps((prev) => [...new Set([...prev, 1, 2])]);
            toast({
              title: "Processing Complete",
              description: "✅ Bulk Upload File is ready to download.",
            });
          }

          setChatState("results");
          setIsTyping(false);

          // Timeline entry
          setTimeline((prev) => [
            ...prev,
            {
              fileName: files[0].name,
              stage: "processor",
              status: hasErrors ? "warning" : "success",
              timestamp: now,
            },
          ]);

          return; // ✅ Done – do NOT fall through to validator
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          setIsTyping(false);
          addMessage(
            "assistant",
            `❌ Error processing decision file: ${errorMsg}\n\nPlease check the file and try again.`,
          );

          if (errorMsg.includes("EBUSY") || errorMsg.includes("locked")) {
            toast({
              title: "File Locked",
              description: "⚠️ Please close the file in Excel/Sheets and try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Processing Error",
              description: errorMsg,
              variant: "destructive",
            });
          }

          setDecisionFailureCount((prev) => prev + 1);
          setChatState("awaiting-upload");
          setShowProcessorUpload(true);
          setIsTyping(false);
          return;
        }
      }

      // ─────────────────────────────────────
      // 2) RAW BULK → Bleeders 1 Report Creator (Step 1)
      // ─────────────────────────────────────
      if (fileType === "raw-bulk") {
        const modeLabel = bleederMode === "lifetime" ? "Lifetime Bleeders" : "Bleeders";
        const consolePrefix = bleederMode === "lifetime" ? "[B1 LIFETIME]" : "[B1]";
        console.log(`${consolePrefix} Creating report for ${files[0].name}`);

        setIsTyping(false);
        addMessage("assistant", `🔄 Creating ${modeLabel} Report for **${files[0].name}**`);
        setIsTyping(true);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const results = await analyzeBleederReport(files[0], 10, bleederMode);
        setProcessorType("report-creator");
        setAnalysisResults(results);
        setFileContext({ fileName: files[0].name, tabsDetected: results.tabsDetected, uploadTime: now, fileHash });
        setCurrentStep(1);
        setCompletedSteps([1]);
        setShowProcessorUpload(false);
        setShowValidatorUpload(false);

        setTimeline((prev) => [
          ...prev,
          {
            fileName: files[0].name,
            stage: "report",
            status: "success",
            timestamp: now,
          },
        ]);

        setIsTyping(false);
        setChatState("results");
        addMessage(
          "assistant",
          "✅ Processing complete.\n💡 Use the toolbar buttons above for Status, Reupload, and Reset.",
        );
        return;
      }

      // ─────────────────────────────────────
      // 3) BLEEDERS 2.0 decision files (separate flow)
      // ─────────────────────────────────────
      if (bleeder2Stage === "decision" && showProcessorUpload) {
        console.log("[UPLOAD] Bleeders 2.0 decision file");
        setShowProcessorUpload(false);
        setIsTyping(false);
        addMessage("assistant", `🔄 Processing Bleeders 2.0 decisions from **${files[0].name}**`);
        setIsTyping(true);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (bleeder2ActiveTrack) {
          await handleBleeder2DecisionUpload(files[0], bleeder2ActiveTrack);
        }
        setIsTyping(false);
        return;
      }

      // ─────────────────────────────────────
      // 4) VALIDATOR (Step 3) – unknown OR raw-bulk uploaded after Step 2
      // ─────────────────────────────────────
      if (fileType === "unknown" || (fileType === "raw-bulk" && currentStep >= 2)) {
        console.log("[UPLOAD] File detected for validation (Step 3), type:", fileType);
        setIsTyping(false);
        addMessage("assistant", `🔍 Validating upload file **${files[0].name}**`);
        setIsTyping(true);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        try {
          const results = await validateUploadFile(files[0], "raw");
          setProcessorType("validator");
          setValidatorResults(results);
          setFileContext({ fileName: files[0].name, tabsDetected: [], uploadTime: now, fileHash });
          setCurrentStep(3);
          setShowValidatorUpload(false);

          const hasErrors = Object.values(results).some(
            (val) => typeof val === "object" && val !== null && "status" in val && val.status === "error",
          );

          if (hasErrors && results.debugOutput) {
            setIsTyping(false);
            addMessage(
              "assistant",
              `❌ Validation failed. Here are the details:\n\n` +
                `\`\`\`json\n${JSON.stringify(results.debugOutput, null, 2)}\n\`\`\`` +
                `\n\nUpload a corrected Bulk file and try again.`,
            );
          }

          if (!hasErrors) {
            setCompletedSteps((prev) => [...new Set([...prev, 1, 2, 3])]);
            toast({
              title: "Validation Complete",
              description: "✅ Raw file validated. Ready to analyze.",
            });
          }

          const hasWarnings = Object.values(results).some(
            (val) => typeof val === "object" && val !== null && "status" in val && val.status === "warning",
          );

          setTimeline((prev) => [
            ...prev,
            {
              fileName: files[0].name,
              stage: hasErrors ? "validator" : hasWarnings ? "validator — warning (proceeding)" : "validator",
              status: hasErrors ? "error" : hasWarnings ? "warning" : "success",
              timestamp: now,
            },
          ]);

          setIsTyping(false);
          setChatState("results");
          if (!hasErrors) {
            addMessage(
              "assistant",
              "✅ Processing complete.\n💡 Use the toolbar buttons above for Status, Reupload, and Reset.",
            );
          }
          return;
        } catch (valError) {
          const errorMsg = valError instanceof Error ? valError.message : "Validation failed";

          if (errorMsg.includes("Decision Report")) {
            toast({
              title: "Wrong File Type",
              description:
                "⚠️ This looks like a Decision Report. Please upload the Bleeders 1 Upload file produced by the Decision Processor.",
              variant: "destructive",
            });
          } else if (errorMsg.includes("corrupt")) {
            toast({
              title: "Corrupt File",
              description: "❌ We can't read this file (corrupt/unsupported). Please re-export and try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Validation Error",
              description: errorMsg,
              variant: "destructive",
            });
          }

          setChatState("awaiting-upload");
          setShowValidatorUpload(true);
          setIsTyping(false);
          return;
        }
      }

      // ─────────────────────────────────────
      // 5) Fallback – truly unknown classification
      // ─────────────────────────────────────
      setIsTyping(false);
      setChatState("results");
      addMessage(
        "assistant",
        "⚠️ Unexpected file classification. Please upload either:\n\n" +
          "• Raw Amazon Bulk Operations file for Step 1\n" +
          "• Bleeders 1 Decisions file with a Decision column for Step 2\n" +
          "• Amazon-ready upload file for Step 3 validation.",
      );
    } catch (error) {
      setIsTyping(false);
      setChatState("awaiting-upload");
      setShowUpload(true);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Unable to process file.",
        variant: "destructive",
      });
      addMessage(
        "assistant",
        "❌ Processing failed. Please upload a valid file.\n\n💡 Use the toolbar buttons above for Status, Reupload, and Reset.",
      );
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    await processFileUpload(files, false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderToolbar
        onStatus={handleToolbarStatus}
        onReupload={handleToolbarReupload}
        onReset={handleToolbarReset}
        onHelp={() => setShowHelpDrawer(true)}
        onStartBleeder={() => {
          if (chatState === "initial") {
            setBleederMode("standard");
            setActiveModule("bleeders_1");
            setChatState("awaiting-upload");
            setShowUpload(true);
            addTypingMessage(
              "Got it 👌 — I'll build your Bleeders 1.0 report to find items with Clicks > 10 and Sales = 0.\n\nPlease upload your Amazon Bulk Operations export (.xlsx/.csv/.zip).",
              500,
            );
          }
        }}
        onStartLifetimeBleeders={() => {
          if (chatState === "initial") {
            setBleederMode("lifetime");
            setActiveModule("lifetime_bleeders");
            setLifetimeStage("upload");
            setLifetimeResult(null);
            setChatState("awaiting-upload");
            setShowUpload(false);
            addTypingMessage(
              "🕰️ **Bleeding Lifetime Targets — Extended Click Audit**\n\nThis track requires **two files** to map IDs and generate Amazon-compliant output.",
              500,
            );
          }
        }}
      />

      {/* Progress Tracker */}
      {(analysisResults || decisionResults || validatorResults) && (
        <div className="px-4 py-4 bg-muted/30 border-b">
          <ProgressSteps
            steps={[
              {
                label: "Analyze",
                status: completedSteps.includes(1) ? "complete" : currentStep === 1 ? "current" : "upcoming",
              },
              {
                label: "Decision Prep",
                status: completedSteps.includes(1) ? "complete" : "upcoming",
              },
              {
                label: "Process Decisions",
                status: completedSteps.includes(2) ? "complete" : currentStep === 2 ? "current" : "upcoming",
              },
              {
                label: "Upload to Amazon",
                status:
                  completedSteps.includes(2) && validatorResults?.passed
                    ? "complete"
                    : currentStep === 3
                      ? "current"
                      : "upcoming",
              },
            ]}
          />
        </div>
      )}

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-[900px] mx-auto space-y-5">
          {messages.length === 0 && chatState === "initial" && (
            <div className="text-center py-12 space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">💬 Welcome to the Amazon Ad Ops Assistant</h2>
              <div className="max-w-xl mx-auto space-y-3 text-left">
                <p className="text-muted-foreground">You can type:</p>
                <ul className="space-y-2 text-sm text-muted-foreground ml-6">
                  <li>• "Run Bleeders 1.0" → Zero-sales wasted spend report</li>
                  <li>• "Run Bleeders 2.0" → Low-sales high-ACoS optimizer</li>
                  <li>• "Bleeding Lifetime Targets" → Monthly lifetime audit</li>
                  <li>• "Show modules" → View all available tools</li>
                  <li>• "Reset session" → Start over</li>
                </ul>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-4">
                  💡 Upload your file after selecting a workflow.
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-6">
                Hint: Type "help" or "modules" anytime to see available tools.
              </p>
            </div>
          )}

          {/* Status Timeline (toggle) */}
          {showStatusTimeline && timeline.length > 0 && <StatusTimeline entries={timeline} />}

          {messages.map((msg, idx) => (
            <MessageBubble key={idx} role={msg.role} content={msg.content} />
          ))}

          {isTyping && <TypingIndicator />}

          {showUpload && <UploadCard onFileUpload={handleFileUpload} isVisible={showUpload} />}

          {processorType === "report-creator" && analysisResults && (
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
                setTimeout(() => {
                  const processorElement = document.getElementById("step-2");
                  if (processorElement) {
                    processorElement.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }, 300);
              }}
            />
          )}

          {/* Decision Processor Upload Panel */}
          {showProcessorUpload && !decisionResults && (
            <ProcessorUploadPanel
              onFileUpload={handleFileUpload}
              title="Step 2 — Decision Processor"
              subtitle="Upload your Bleeders 1 Report with the Decision column filled in. We'll convert your choices into an Amazon-ready upload file."
              checklist={[
                "File includes a Decision column",
                "Tabs may include: SP/SB/SD Campaigns, SP/SB Search Term Reports",
                "Saved and closed (Excel/Sheets)",
              ]}
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
              onStartBleeders2={() => {
                handleStartBleeder2();
              }}
              preFlight={
                decisionResults.preFlight || {
                  fileReadable: true,
                  recognizedSheets: [],
                  decisionColumnFound: false,
                  columnsNormalized: false,
                  actionableRows: 0,
                }
              }
              onValidate={() => {
                setShowValidatorUpload(true);
                setShowProcessorUpload(false);
                setCurrentStep(3);
                toast({
                  title: "Ready to validate",
                  description: "Upload the Bleeders_1_Upload file you just downloaded to begin validation.",
                });
                const validatorElement = document.getElementById("step-3");
                if (validatorElement) {
                  setTimeout(() => {
                    validatorElement.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 100);
                }
              }}
              onReupload={handleProcessorReupload}
            />
          )}

          {/* Validator Results */}
          {processorType === "validator" && validatorResults && (
            <ValidatorResults
              validation={validatorResults}
              fileName={fileContext?.fileName}
              workbook={validatorResults.workbook}
            />
          )}

          {/* Lifetime Bleeders Two-File Workflow */}
          {activeModule === "lifetime_bleeders" && lifetimeStage === "upload" && (
            <LifetimeUploader
              onAnalyze={handleLifetimeAnalysis}
              isProcessing={lifetimeProcessing}
            />
          )}

          {/* Lifetime Bleeders Results - Step 1 Complete */}
          {activeModule === "lifetime_bleeders" && (lifetimeStage === "results" || lifetimeStage === "decision-upload" || lifetimeStage === "decision-results") && lifetimeResult && (
            <Card className="border-green-500/30">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Step 1: Lifetime Analysis Complete</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{lifetimeResult.bleeders.length}</div>
                    <div className="text-xs text-muted-foreground">Bleeders Found</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">${lifetimeResult.totalSpend.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Wasted Spend</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{lifetimeResult.excludedRankingCount}</div>
                    <div className="text-xs text-muted-foreground">Ranking Excluded</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">{lifetimeResult.unmappableCount}</div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                  </div>
                </div>

                {/* Skipped items warning and download - only show if unmappableCount > 0 */}
                {lifetimeResult.unmappableCount > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-800">
                        <strong>{lifetimeResult.unmappableCount}</strong> targets could not be mapped. 
                        These are usually "Expanded" auto-targets or items not present in your active bulk file. 
                        You can audit them using the log below, but they generally do not require manual action.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        import("@/lib/lifetimeBleederAnalysis").then(({ downloadSkippedItemsLog }) => {
                          downloadSkippedItemsLog(lifetimeResult.skippedItems);
                          toast({
                            title: "Skipped Items Log downloaded",
                            description: `${lifetimeResult.skippedItems.length} items exported to CSV`,
                          });
                        });
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2"
                    >
                      <Info className="h-3.5 w-3.5" />
                      Download Skipped Items Log (.csv)
                    </button>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={handleDownloadLifetimeDecisionSheet} className="flex-1" variant={lifetimeStage === "results" ? "default" : "outline"}>
                    <FileText className="mr-2 h-4 w-4" />
                    {lifetimeStage === "results" ? "Download Decision File" : "Re-download Decision File"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setLifetimeStage("upload");
                      setLifetimeResult(null);
                      setLifetimeDecisionResult(null);
                    }}
                  >
                    Start Over
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  All rows require manual review. Type "Pause" in the Decision column for targets you want to pause.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Lifetime Decision File Uploader - Step 2 */}
          {activeModule === "lifetime_bleeders" && lifetimeStage === "decision-upload" && !lifetimeDecisionResult && (
            <Card className="border-primary/30 mt-4">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
                  <span className="font-semibold">Upload Decision File</span>
                </div>

                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                    lifetimeProcessing 
                      ? "border-muted bg-muted/20 cursor-not-allowed" 
                      : "border-primary/50 bg-primary/5 hover:border-primary hover:bg-primary/10"
                  }`}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (lifetimeProcessing) return;
                    const file = e.dataTransfer.files[0];
                    if (file) handleLifetimeDecisionUpload(file);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => {
                    if (lifetimeProcessing) return;
                    document.getElementById("lifetime-decision-input")?.click();
                  }}
                >
                  <input
                    id="lifetime-decision-input"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLifetimeDecisionUpload(file);
                      e.target.value = "";
                    }}
                    className="hidden"
                    disabled={lifetimeProcessing}
                  />
                  
                  {lifetimeProcessing ? (
                    <>
                      <Loader2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
                      <p className="font-medium">Processing decisions...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="font-medium mb-1">Upload your edited Decision File</p>
                      <p className="text-sm text-muted-foreground">Drag & drop or click to browse</p>
                    </>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>✓ Edit the Decision column (Pause → Keep for targets to preserve)</p>
                  <p>✓ Save and close the file in Excel</p>
                  <p>✓ Upload the file here</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lifetime Decision Results - Step 3 */}
          {activeModule === "lifetime_bleeders" && lifetimeStage === "decision-results" && lifetimeDecisionResult && (
            <Card className="border-green-500/30 mt-4">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Step 2: Decision Processing Complete</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600">{lifetimeDecisionResult.pausedCount}</div>
                    <div className="text-xs text-muted-foreground">Targets to Pause</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{lifetimeDecisionResult.keptCount}</div>
                    <div className="text-xs text-muted-foreground">Targets Kept</div>
                  </div>
                </div>

                {lifetimeDecisionResult.warnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-amber-700 mb-1">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium text-sm">Warnings</span>
                    </div>
                    <ul className="text-xs text-amber-600 space-y-1">
                      {lifetimeDecisionResult.warnings.slice(0, 3).map((w: string, i: number) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={handleDownloadLifetimeBulkUpdate} className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Download Amazon Bulk Update
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setLifetimeDecisionResult(null);
                      setLifetimeStage("decision-upload");
                    }}
                  >
                    Re-upload
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Upload this file to Amazon Ads → Bulk Operations → Upload Spreadsheet.
                </p>
              </CardContent>
            </Card>
          )}

          {bleeder2Stage === "picker" && activeModule === "bleeders_2" && (
            <Card className="border-primary/30">
              <CardContent className="pt-6 space-y-3">
                <Button
                  onClick={() => handleSelectTrack("SBSD")}
                  className="w-full h-20 text-lg justify-start"
                  variant="outline"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">SB/SD Bad Targets</span>
                    <span className="text-xs text-muted-foreground">Sponsored Brands & Display targeting</span>
                  </div>
                </Button>

                <Button
                  onClick={() => handleSelectTrack("SP")}
                  className="w-full h-20 text-lg justify-start"
                  variant="outline"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">SP Bad Search Terms</span>
                    <span className="text-xs text-muted-foreground">Sponsored Products search terms</span>
                  </div>
                </Button>

                <Button
                  onClick={() => handleSelectTrack("SP_KEYWORDS")}
                  className="w-full h-20 text-lg justify-start"
                  variant="outline"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">SP Bad Targets</span>
                    <span className="text-xs text-muted-foreground">Sponsored Products targets</span>
                  </div>
                </Button>

                <Button
                  onClick={() => handleSelectTrack("ACOS100")}
                  className="w-full h-20 text-lg justify-start"
                  variant="outline"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">Campaigns &gt;100% ACoS</span>
                    <span className="text-xs text-muted-foreground">High ACoS campaign</span>
                  </div>
                </Button>
              </CardContent>
            </Card>
          )}

          {bleeder2Stage === "thresholds" && activeModule === "bleeders_2" && bleeder2ActiveTrack && (
            <ThresholdConfig
              thresholds={bleeder2Thresholds}
              onChange={setBleeder2Thresholds}
              onContinue={handleBleeder2ContinueFromThresholds}
            />
          )}

          {bleeder2Stage === "upload" && activeModule === "bleeders_2" && bleeder2ActiveTrack && (
            <div className="space-y-4">
              <TrackUploader
                track={bleeder2ActiveTrack}
                onUpload={(track, file) => handleBleeder2TrackUpload(file, track)}
                error={bleeder2TrackState[bleeder2ActiveTrack].validationError || undefined}
                uploadedFile={bleeder2TrackState[bleeder2ActiveTrack].file}
                isValidating={bleeder2TrackState[bleeder2ActiveTrack].isValidating}
              />

              {bleeder2TrackState[bleeder2ActiveTrack].file && (
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">
                          {bleeder2TrackState[bleeder2ActiveTrack].file!.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({(bleeder2TrackState[bleeder2ActiveTrack].file!.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetTrack(bleeder2ActiveTrack!)}
                        disabled={bleeder2TrackState[bleeder2ActiveTrack].isValidating}
                      >
                        Reupload
                      </Button>
                    </div>

                    {bleeder2TrackState[bleeder2ActiveTrack].isValidating && (
                      <div className="mt-3 flex items-center gap-2 text-blue-700 text-sm">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                        <span>⏳ Validating...</span>
                      </div>
                    )}

                    {bleeder2TrackState[bleeder2ActiveTrack].validationError && (
                      <div className="mt-3 flex items-center gap-2 text-red-700 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{bleeder2TrackState[bleeder2ActiveTrack].validationError}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {bleeder2Stage === "results" &&
            activeModule === "bleeders_2" &&
            bleeder2ActiveTrack &&
            bleeder2TrackState[bleeder2ActiveTrack].result && (
              <div className="space-y-4">
                {(() => {
                  const trackState = bleeder2TrackState[bleeder2ActiveTrack];
                  console.log(`[DEBUG] Rendering Bleeder2TrackResults for ${bleeder2ActiveTrack}:`, {
                    hasResult: !!trackState.result,
                    hasDecisionFile: !!trackState.decisionFile,
                    hasAmazonFile: !!trackState.amazonFile,
                    amazonFileName: trackState.amazonFile?.fileName,
                  });
                  
                  return (
                    <Bleeder2TrackResults
                      result={trackState.result!}
                      onDownload={() => handleDownloadDecisionSheet(bleeder2ActiveTrack!)}
                      onUploadDecision={(_, file) => {
                        // Force using the active track to avoid mismatched keys (SP vs SP_KEYWORDS)
                        handleBleeder2DecisionUpload(file, bleeder2ActiveTrack!);
                      }}
                      onAdjustThresholds={() => setBleeder2Stage("thresholds")}
                      onUploadNewFile={(track) => {
                        handleResetTrack(track);
                      }}
                      decisionFile={trackState.decisionFile}
                      amazonFile={trackState.amazonFile}
                      onDownloadAmazon={() => handleDownloadAmazonFile(bleeder2ActiveTrack!)}
                    />
                  );
                })()}

                {/* Navigation after results */}
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="pt-6 space-y-3">
                    <p className="text-sm font-medium mb-2">What do you want to do next?</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => handleSelectTrack("SBSD")} className="justify-start">
                        Run SB/SD Bad Keywords
                      </Button>
                      <Button variant="outline" onClick={() => handleSelectTrack("SP")} className="justify-start">
                        Run SP Bad Search Terms
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleSelectTrack("SP_KEYWORDS")}
                        className="justify-start"
                      >
                        Run SP Bad Keywords (Targeting)
                      </Button>
                      <Button variant="outline" onClick={() => handleSelectTrack("ACOS100")} className="justify-start">
                        Run Campaigns &gt;100% ACoS
                      </Button>
                      <Button variant="outline" onClick={() => setBleeder2Stage("picker")} className="justify-start">
                        Back to Track Picker
                      </Button>
                    </div>

                    <Button variant="secondary" onClick={handleReset} className="w-full">
                      Finish / Go to Modules
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="border-t border-border bg-background py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Type "Bleeders 1.0", "Bleeders 2.0", "Bleeding Lifetime Targets", or "help"...'
                className="w-full h-14 md:h-16 px-5 md:px-6 pr-16 text-base md:text-[17px] rounded-2xl border-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
                style={{ caretColor: "hsl(var(--primary))" }}
                disabled={isTyping || chatState === "analyzing"}
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 md:h-11 md:w-11 rounded-xl bg-primary hover:bg-primary/90"
                disabled={isTyping || chatState === "analyzing"}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </form>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Quick commands:</span>
            <code className="px-2 py-1 bg-muted rounded">bleeders 1.0</code>
            <span>•</span>
            <code className="px-2 py-1 bg-muted rounded">bleeders 2.0</code>
            <span>•</span>
            <code className="px-2 py-1 bg-muted rounded">bleeding lifetime targets</code>
            <span>•</span>
            <code className="px-2 py-1 bg-muted rounded">help</code>
          </div>
        </div>
      </footer>

      <ConfirmModal
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal({ open, type: null, data: null })}
        title={
          confirmModal.type === "reupload"
            ? "Replace File?"
            : confirmModal.type === "duplicate"
              ? "Duplicate File Detected"
              : "Reset Session?"
        }
        description={
          confirmModal.type === "reupload"
            ? "This will clear the current file and all results. You'll need to start from Step 1."
            : confirmModal.type === "duplicate"
              ? "This appears to be the same file. Re-analyze anyway?"
              : "This will clear all processed data and return you to the welcome screen."
        }
        confirmText={
          confirmModal.type === "reupload" ? "Replace" : confirmModal.type === "duplicate" ? "Yes, Re-analyze" : "Reset"
        }
        cancelText="Cancel"
        onConfirm={handleConfirmAction}
        variant={confirmModal.type === "reset" ? "destructive" : "default"}
      />

      <HelpDrawer open={showHelpDrawer} onClose={() => setShowHelpDrawer(false)} />
    </div>
  );
};

export default Index;
