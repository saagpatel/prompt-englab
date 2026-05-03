"use client";

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import type {
  BatchRunRequest,
  BatchRunResult,
  TestProvider,
} from "@/lib/contracts/testCases";

interface BatchRunDialogProps {
  open: boolean;
  onClose: () => void;
  promptId: string;
  onComplete: () => void;
}

export default function BatchRunDialog({
  open,
  onClose,
  promptId,
  onComplete,
}: BatchRunDialogProps) {
  const [providerTab, setProviderTab] = useState(0);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BatchRunResult[]>([]);

  const providers = ["ollama", "openai", "anthropic"];
  const provider = providers[providerTab] as TestProvider;

  useEffect(() => {
    if (open && providerTab === 0) {
      fetch("/api/ollama/models")
        .then((r) => r.json())
        .then((data) => {
          const names = data.map?.((m: { name: string }) => m.name) || [];
          setOllamaModels(names);
          if (names.length > 0 && !selectedModel) setSelectedModel(names[0]);
        })
        .catch(() => {});
    }
  }, [open, providerTab, selectedModel]);

  useEffect(() => {
    if (providerTab === 1) setSelectedModel("gpt-4o-mini");
    else if (providerTab === 2) setSelectedModel("claude-haiku-4-5");
  }, [providerTab]);

  const handleRun = async () => {
    setRunning(true);
    setResults([]);
    try {
      const payload: BatchRunRequest = {
        promptId,
        provider,
        modelName: selectedModel,
      };
      const res = await fetch("/api/test-cases/batch-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        onComplete();
      }
    } catch {
      // error handled silently
    } finally {
      setRunning(false);
    }
  };

  const modelOptions = () => {
    if (providerTab === 0) return ollamaModels;
    if (providerTab === 1) return ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini"];
    return ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"];
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Batch Run Test Cases</DialogTitle>
      <DialogContent>
        <Tabs
          value={providerTab}
          onChange={(_e, v) => setProviderTab(v)}
          aria-label="Batch Run Providers"
          sx={{ mb: 2 }}
        >
          <Tab label="Ollama" data-testid="batch-run-tab-ollama" />
          <Tab label="OpenAI" data-testid="batch-run-tab-openai" />
          <Tab label="Anthropic" data-testid="batch-run-tab-anthropic" />
        </Tabs>

        <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Model</InputLabel>
            <Select
              value={selectedModel}
              label="Model"
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {modelOptions().map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            data-testid="batch-run-run-all-button"
            variant="contained"
            startIcon={
              running ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <PlayArrowIcon />
              )
            }
            onClick={handleRun}
            disabled={running || !selectedModel}
          >
            {running ? "Running..." : "Run All"}
          </Button>
        </Box>

        {results.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Test Case</TableCell>
                  <TableCell>Output</TableCell>
                  <TableCell>Expected</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.testCaseName}</TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{
                          maxWidth: 200,
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.output}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{
                          maxWidth: 150,
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.expectedOutput || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {r.passed === null ? (
                        <Chip label="N/A" size="small" variant="outlined" />
                      ) : r.passed ? (
                        <Chip label="Pass" size="small" color="success" />
                      ) : (
                        <Chip label="Fail" size="small" color="error" />
                      )}
                    </TableCell>
                    <TableCell>
                      {r.executionTime != null
                        ? `${r.executionTime.toFixed(1)}s`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
}
