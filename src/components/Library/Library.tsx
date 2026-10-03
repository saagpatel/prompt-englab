"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Fab,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
  Snackbar,
  TextField,
  Typography,
  Stack,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { formatDistanceToNow } from "date-fns";

interface PromptSummary {
  id: string;
  title: string;
  content: string;
  category: string | null;
  isFavorite: boolean;
  updatedAt: string;
  tags: { id: string; tag: string }[];
  _count: { responses: number; versions: number };
}

interface PaginatedResult {
  data: PromptSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const CATEGORIES = [
  "General",
  "Code Generation",
  "Analysis",
  "Creative Writing",
  "Data Extraction",
  "Summarization",
  "Translation",
  "Other",
];

export default function Library() {
  const router = useRouter();
  const [result, setResult] = useState<PaginatedResult | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prompt-lab-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: "Library exported", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Export failed", severity: "error" });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      if (!res.ok) throw new Error("Import failed");
      const data = await res.json();
      setSnackbar({ open: true, message: `Imported ${data.count} prompts`, severity: "success" });
      fetchPrompts();
    } catch {
      setSnackbar({ open: true, message: "Import failed — check file format", severity: "error" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (tag) params.set("tag", tag);
    if (favoritesOnly) params.set("isFavorite", "true");
    params.set("page", String(page));

    const res = await fetch(`/api/prompts?${params}`);
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }, [search, category, tag, favoritesOnly, page]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then(setAllTags)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = () => searchInputRef.current?.focus();
    window.addEventListener("promptlab:search", handler);
    return () => window.removeEventListener("promptlab:search", handler);
  }, []);

  // Debounce search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">Prompt Library</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button size="small" startIcon={<FileDownloadIcon />} onClick={handleExport}>
            Export
          </Button>
          <Button size="small" startIcon={<FileUploadIcon />} onClick={() => fileInputRef.current?.click()}>
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            hidden
            onChange={handleImport}
          />
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField
          inputRef={searchInputRef}
          placeholder="Search prompts..."
          value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
          size="small"
          sx={{ minWidth: 250 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={category}
            label="Category"
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          >
            <MenuItem value="">All</MenuItem>
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Tag</InputLabel>
          <Select
            value={tag}
            label="Tag"
            onChange={(e) => { setTag(e.target.value); setPage(1); }}
          >
            <MenuItem value="">All</MenuItem>
            {allTags.map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton
          onClick={() => { setFavoritesOnly(!favoritesOnly); setPage(1); }}
          color={favoritesOnly ? "error" : "default"}
        >
          <FavoriteIcon />
        </IconButton>
      </Box>

      {loading && !result && (
        <Grid container spacing={2}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Skeleton variant="text" width="70%" sx={{ fontSize: "1.2rem", mb: 1 }} />
                  <Skeleton variant="rectangular" height={60} sx={{ mb: 1.5, borderRadius: 1 }} />
                  <Box sx={{ display: "flex", gap: 0.5, mb: 1 }}>
                    <Skeleton variant="rounded" width={80} height={24} />
                    <Skeleton variant="rounded" width={60} height={24} />
                  </Box>
                  <Skeleton variant="text" width="50%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {result && result.data.length === 0 && !loading && (
        <Box sx={{ textAlign: "center", py: 8, opacity: 0.6 }}>
          <Typography variant="h6">No prompts found</Typography>
          <Typography color="text.secondary">
            {search || category || tag
              ? "Try different filters"
              : "Create your first prompt to get started"}
          </Typography>
        </Box>
      )}

      <Grid container spacing={2}>
        {result?.data.map((prompt) => (
          <Grid key={prompt.id} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Card
              sx={{
                height: "100%",
                "&:hover": { borderColor: "primary.main" },
                transition: "border-color 0.2s",
              }}
            >
              <CardActionArea onClick={() => router.push(`/prompts/${prompt.id}`)} sx={{ height: "100%" }}>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                    <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600, flex: 1, mr: 1 }}>
                      {prompt.title}
                    </Typography>
                    {prompt.isFavorite && <FavoriteIcon color="error" sx={{ fontSize: 16 }} />}
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                    }}
                  >
                    {prompt.content}
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: "wrap", gap: 0.5 }}>
                    {prompt.category && (
                      <Chip label={prompt.category} size="small" color="primary" variant="outlined" />
                    )}
                    {prompt.tags.slice(0, 3).map((t) => (
                      <Chip key={t.id} label={t.tag} size="small" variant="outlined" />
                    ))}
                    {prompt.tags.length > 3 && (
                      <Chip label={`+${prompt.tags.length - 3}`} size="small" />
                    )}
                  </Stack>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" color="text.secondary">
                      {prompt._count.responses} responses | v{prompt._count.versions}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(new Date(prompt.updatedAt), { addSuffix: true })}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {result && result.totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={result.totalPages}
            page={page}
            onChange={(_e, v) => setPage(v)}
            color="primary"
          />
        </Box>
      )}

      <Fab
        color="primary"
        onClick={() => router.push("/prompts/new")}
        sx={{ position: "fixed", bottom: 24, right: 24 }}
      >
        <AddIcon />
      </Fab>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
