"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Autocomplete,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Rating,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import DifferenceIcon from "@mui/icons-material/Difference";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CodeIcon from "@mui/icons-material/Code";
import ArticleIcon from "@mui/icons-material/Article";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import MarkdownRenderer from "@/components/MarkdownRenderer/MarkdownRenderer";

interface PromptOption {
  id: string;
  title: string;
}

interface ResponseItem {
  id: string;
  modelName: string;
  content: string;
  tokenCount: number | null;
  executionTime: number | null;
  source: string;
  rating: number | null;
  notes: string | null;
  createdAt: string;
  prompt: { id: string; title: string };
}

export default function CompareView() {
  const [prompts, setPrompts] = useState<PromptOption[]>([]);
  const [selectedPrompts, setSelectedPrompts] = useState<PromptOption[]>([]);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [selectedResponses, setSelectedResponses] = useState<ResponseItem[]>([]);
  const [renderModes, setRenderModes] = useState<Record<string, "raw" | "markdown">>({});
  const [showDiff, setShowDiff] = useState(false);
  const [winCounts, setWinCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/prompts?limit=200")
      .then((r) => r.json())
      .then((data) => setPrompts(data.data.map((p: PromptOption) => ({ id: p.id, title: p.title }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedPrompts.length === 0) {
      setResponses([]);
      return;
    }
    const ids = selectedPrompts.map((p) => p.id);
    Promise.all(ids.map((id) => fetch(`/api/responses/search?promptId=${id}`).then((r) => r.json())))
      .then((results) => setResponses(results.flat()))
      .catch(() => {});
  }, [selectedPrompts]);

  const loadWinCounts = useCallback(async () => {
    const counts: Record<string, number> = {};
    for (const r of selectedResponses) {
      const res = await fetch(`/api/ab-comparisons?responseId=${r.id}`);
      if (res.ok) {
        const data = await res.json();
        counts[r.id] = data.wins || 0;
      }
    }
    setWinCounts(counts);
  }, [selectedResponses]);

  useEffect(() => {
    if (selectedResponses.length >= 2) loadWinCounts();
  }, [selectedResponses.length, loadWinCounts]);

  const addResponse = (resp: ResponseItem) => {
    if (selectedResponses.find((r) => r.id === resp.id)) return;
    setSelectedResponses((prev) => [...prev, resp]);
  };

  const removeResponse = (id: string) => {
    setSelectedResponses((prev) => prev.filter((r) => r.id !== id));
  };

  const getMode = (id: string) => renderModes[id] || "raw";
  const toggleMode = (id: string, mode: "raw" | "markdown") => {
    if (mode !== null) setRenderModes((prev) => ({ ...prev, [id]: mode }));
  };

  const handlePickWinner = async (winnerId: string) => {
    if (selectedResponses.length !== 2) return;
    const [a, b] = selectedResponses;
    await fetch("/api/ab-comparisons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responseAId: a.id,
        responseBId: b.id,
        winnerId,
      }),
    });
    loadWinCounts();
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Compare Responses
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "flex-start" }}>
        <Autocomplete
          multiple
          options={prompts}
          getOptionLabel={(o) => o.title}
          value={selectedPrompts}
          onChange={(_e, val) => setSelectedPrompts(val)}
          sx={{ minWidth: 350, flex: 1 }}
          renderInput={(params) => (
            <TextField {...params} label="Select prompts to compare" size="small" />
          )}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
        />
      </Box>

      {responses.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Available responses ({responses.length}) — click to add to comparison
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {responses.map((r) => (
              <Chip
                key={r.id}
                label={`${r.prompt.title.slice(0, 20)}… — ${r.modelName}`}
                onClick={() => addResponse(r)}
                color={selectedResponses.find((s) => s.id === r.id) ? "primary" : "default"}
                variant={selectedResponses.find((s) => s.id === r.id) ? "filled" : "outlined"}
                size="small"
              />
            ))}
          </Box>
        </Box>
      )}

      {selectedResponses.length > 0 && (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <CompareArrowsIcon />
            <Typography variant="h6">
              Comparing {selectedResponses.length} responses
            </Typography>
            <Button size="small" onClick={() => setSelectedResponses([])}>
              Clear
            </Button>
            <Button
              size="small"
              startIcon={<DifferenceIcon />}
              variant={showDiff ? "contained" : "outlined"}
              disabled={selectedResponses.length !== 2}
              onClick={() => setShowDiff(!showDiff)}
            >
              Diff
            </Button>
          </Box>

          {selectedResponses.length === 2 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, p: 1.5, bgcolor: "background.paper", borderRadius: 1, border: "1px solid", borderColor: "divider" }}>
              <EmojiEventsIcon color="secondary" />
              <Typography variant="subtitle2">Pick Winner:</Typography>
              {selectedResponses.map((r, i) => (
                <Badge key={r.id} badgeContent={winCounts[r.id] || 0} color="primary">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handlePickWinner(r.id)}
                  >
                    {String.fromCharCode(65 + i)}: {r.modelName}
                  </Button>
                </Badge>
              ))}
            </Box>
          )}

          {showDiff && selectedResponses.length === 2 && (
            <Box sx={{ mb: 2, borderRadius: 1, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
              <ReactDiffViewer
                oldValue={selectedResponses[0].content}
                newValue={selectedResponses[1].content}
                splitView
                compareMethod={DiffMethod.WORDS}
                useDarkTheme
                leftTitle={`A: ${selectedResponses[0].modelName}`}
                rightTitle={`B: ${selectedResponses[1].modelName}`}
              />
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              gap: 2,
              overflowX: "auto",
              pb: 2,
              "&::-webkit-scrollbar": { height: 8 },
              "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 4 },
            }}
          >
            {selectedResponses.map((r) => (
              <Card
                key={r.id}
                sx={{ minWidth: 350, maxWidth: 500, flexShrink: 0 }}
              >
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip label={r.modelName} color="primary" size="small" />
                      {(winCounts[r.id] || 0) > 0 && (
                        <Chip
                          icon={<EmojiEventsIcon />}
                          label={`${winCounts[r.id]} wins`}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      )}
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <ToggleButtonGroup
                        value={getMode(r.id)}
                        exclusive
                        onChange={(_e, v) => toggleMode(r.id, v)}
                        size="small"
                        sx={{ "& .MuiToggleButton-root": { py: 0.25, px: 0.75 } }}
                      >
                        <ToggleButton value="raw"><CodeIcon sx={{ fontSize: 16 }} /></ToggleButton>
                        <ToggleButton value="markdown"><ArticleIcon sx={{ fontSize: 16 }} /></ToggleButton>
                      </ToggleButtonGroup>
                      <Button size="small" color="error" onClick={() => removeResponse(r.id)}>
                        Remove
                      </Button>
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    {r.prompt.title}
                  </Typography>
                  {r.rating !== null && (
                    <Rating value={r.rating} readOnly size="small" max={5} sx={{ mb: 1 }} />
                  )}
                  <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
                    <Chip label={r.source} size="small" variant="outlined" />
                    {r.tokenCount && (
                      <Chip label={`${r.tokenCount} tokens`} size="small" variant="outlined" />
                    )}
                    {r.executionTime && (
                      <Chip label={`${r.executionTime.toFixed(1)}s`} size="small" variant="outlined" />
                    )}
                  </Box>

                  {getMode(r.id) === "raw" ? (
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: "pre-wrap",
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                        maxHeight: 500,
                        overflow: "auto",
                        bgcolor: "rgba(0,0,0,0.2)",
                        p: 1.5,
                        borderRadius: 1,
                      }}
                    >
                      {r.content}
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        maxHeight: 500,
                        overflow: "auto",
                        bgcolor: "rgba(0,0,0,0.2)",
                        p: 1.5,
                        borderRadius: 1,
                      }}
                    >
                      <MarkdownRenderer content={r.content} />
                    </Box>
                  )}

                  {r.notes && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                      Notes: {r.notes}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        </>
      )}

      {selectedPrompts.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8, opacity: 0.5 }}>
          <CompareArrowsIcon sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6">Select prompts to compare their responses</Typography>
          <Typography color="text.secondary">
            Choose one or more prompts, then pick responses to view side-by-side
          </Typography>
        </Box>
      )}
    </Box>
  );
}
