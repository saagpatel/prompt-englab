"use client";

import { useState, useEffect } from "react";
import { Autocomplete, Chip, TextField } from "@mui/material";

interface TagManagerProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagManager({ tags, onChange }: TagManagerProps) {
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then(setAllTags)
      .catch(() => {});
  }, []);

  return (
    <Autocomplete
      multiple
      freeSolo
      options={allTags}
      value={tags}
      onChange={(_e, newValue) => onChange(newValue as string[])}
      renderValue={(value, getItemProps) =>
        value.map((option, index) => (
          <Chip
            variant="outlined"
            label={option}
            size="small"
            {...getItemProps({ index })}
            key={option}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          label="Tags"
          placeholder="Add tag..."
          size="small"
        />
      )}
    />
  );
}
