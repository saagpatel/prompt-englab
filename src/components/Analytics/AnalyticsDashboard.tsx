"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Typography,
} from "@mui/material";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  PieLabelRenderProps,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#90caf9", "#ce93d8", "#80cbc4", "#ffab91", "#a5d6a7", "#ef9a9a", "#fff59d", "#b0bec5"];

interface AnalyticsData {
  totals: {
    prompts: number;
    responses: number;
    versions: number;
  };
  totalCost: number;
  costByModel: { model: string; cost: number }[];
  promptsByCategory: { category: string; count: number }[];
  responsesByModel: { model: string; count: number }[];
  avgRatingByModel: { model: string; avgRating: number }[];
  promptsByDate: { date: string; count: number }[];
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent sx={{ textAlign: "center", py: 2 }}>
        <Typography variant="h3" color="primary" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>Analytics</Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[0, 1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Skeleton variant="text" width="60%" sx={{ mx: "auto", fontSize: "2rem" }} />
                  <Skeleton variant="text" width="40%" sx={{ mx: "auto" }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Card><CardContent><Skeleton variant="rectangular" height={250} /></CardContent></Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card><CardContent><Skeleton variant="rectangular" height={250} /></CardContent></Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card><CardContent><Skeleton variant="rectangular" height={250} /></CardContent></Card>
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ textAlign: "center", py: 8, opacity: 0.5 }}>
        <Typography variant="h6">Failed to load analytics</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Analytics
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard label="Total Prompts" value={data.totals.prompts} />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard label="Total Responses" value={data.totals.responses} />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard label="Total Versions" value={data.totals.versions} />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard label="Estimated Cost" value={`$${data.totalCost.toFixed(4)}`} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Prompts Over Time */}
        {data.promptsByDate.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Prompts Over Time
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data.promptsByDate}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="rgba(255,255,255,0.5)" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="rgba(255,255,255,0.5)" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e1e1e", border: "1px solid #333" }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#90caf9" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Responses by Model */}
        {data.responsesByModel.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Responses by Model
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.responsesByModel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="model" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.5)" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="rgba(255,255,255,0.5)" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e1e1e", border: "1px solid #333" }}
                    />
                    <Bar dataKey="count" fill="#90caf9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Avg Rating by Model */}
        {data.avgRatingByModel.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Average Rating by Model
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.avgRatingByModel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="model" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.5)" />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} stroke="rgba(255,255,255,0.5)" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e1e1e", border: "1px solid #333" }}
                    />
                    <Bar dataKey="avgRating" fill="#ce93d8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Cost by Model */}
        {data.costByModel.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Cost by Model
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.costByModel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="model" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.5)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="rgba(255,255,255,0.5)" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e1e1e", border: "1px solid #333" }}
                      formatter={(value) => [`$${Number(value).toFixed(4)}`, "Cost"]}
                    />
                    <Bar dataKey="cost" fill="#80cbc4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Category Breakdown */}
        {data.promptsByCategory.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Category Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.promptsByCategory}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(props: PieLabelRenderProps) => `${props.name || ""} (${props.value})`}
                      labelLine={{ stroke: "rgba(255,255,255,0.3)" }}
                    >
                      {data.promptsByCategory.map((_entry, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e1e1e", border: "1px solid #333" }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
