"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
  Divider,
  IconButton,
} from "@mui/material";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import AddCircleOutlinedIcon from "@mui/icons-material/AddCircleOutlined";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import BarChartIcon from "@mui/icons-material/BarChart";
import SettingsIcon from "@mui/icons-material/Settings";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import ShortcutHelpDialog from "@/components/KeyboardShortcuts/ShortcutHelpDialog";

const DRAWER_WIDTH = 240;

const navItems = [
  { label: "Library", path: "/prompts", icon: <LibraryBooksIcon /> },
  { label: "New Prompt", path: "/prompts/new", icon: <AddCircleOutlinedIcon /> },
  { label: "Compare", path: "/compare", icon: <CompareArrowsIcon /> },
  { label: "Analytics", path: "/analytics", icon: <BarChartIcon /> },
  { label: "Settings", path: "/settings", icon: <SettingsIcon /> },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const handler = () => setHelpOpen(true);
    window.addEventListener("promptlab:help", handler);
    return () => window.removeEventListener("promptlab:help", handler);
  }, []);

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            bgcolor: "background.paper",
          },
        }}
      >
        <Toolbar>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", justifyContent: "space-between" }}>
            <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
              Prompt Lab
            </Typography>
            <IconButton size="small" onClick={() => setHelpOpen(true)} title="Keyboard shortcuts">
              <KeyboardIcon fontSize="small" />
            </IconButton>
          </Box>
        </Toolbar>
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={pathname === item.path || (item.path === "/prompts" && pathname.startsWith("/prompts/") && pathname !== "/prompts/new")}
                onClick={() => router.push(item.path)}
                sx={{
                  "&.Mui-selected": {
                    bgcolor: "rgba(144,202,249,0.08)",
                    borderRight: "3px solid",
                    borderColor: "primary.main",
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      <ShortcutHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

export { DRAWER_WIDTH };
