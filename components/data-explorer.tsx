"use client";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Claim, Scheme, Language } from "@/lib/types";
export default function DataExplorer({
  claims,
  schemes,
  language,
  onEvidence,
}: {
  claims: Claim[];
  schemes: Scheme[];
  language: Language;
  onEvidence: (c: Claim[]) => void;
}) {
  const ta = language === "ta";
  const [scheme, setScheme] = useState("all");
  const [metric, setMetric] = useState("all");
  const [period, setPeriod] = useState("all");
  const [population, setPopulation] = useState("all");
  const quantitative = claims.filter((c) => c.metric_value !== null);
  const data = quantitative.filter(
    (c) =>
      (scheme === "all" || c.scheme_id === scheme) &&
      (metric === "all" || c.metric_name === metric) &&
      (period === "all" || c.reporting_period === period) &&
      (population === "all" || c.population_scope === population),
  );
  const homogeneous =
    new Set(
      data.map((c) =>
        [
          c.scheme_id,
          c.metric_name,
          c.unit,
          c.population_scope,
          c.geographical_scope,
        ].join("|"),
      ),
    ).size === 1;
  const chart = data.map((c) => ({
    label: `${c.reporting_period} · ${c.document?.title}`,
    value: c.metric_value,
    claim: c,
  }));
  return (
    <>
      <div className="filters">
        <label>
          {ta ? "திட்டம்" : "Scheme"}
          <select value={scheme} onChange={(e) => setScheme(e.target.value)}>
            <option value="all">{ta ? "அனைத்தும்" : "All schemes"}</option>
            {schemes.map((s) => (
              <option value={s.id} key={s.id}>
                {ta ? s.name_ta : s.name_en}
              </option>
            ))}
          </select>
        </label>
        <label>
          {ta ? "அளவீடு" : "Metric"}
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            <option value="all">{ta ? "அனைத்தும்" : "All metrics"}</option>
            {[...new Set(quantitative.map((c) => c.metric_name))].map((m) => (
              <option key={m} value={m ?? ""}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label>
          {ta ? "காலப்பகுதி" : "Reporting period"}
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="all">{ta ? "அனைத்தும்" : "All periods"}</option>
            {[...new Set(quantitative.map((c) => c.reporting_period))].map(
              (p) => (
                <option key={p}>{p}</option>
              ),
            )}
          </select>
        </label>
        <label>
          {ta ? "பயனாளர் குழு" : "Population"}
          <select
            value={population}
            onChange={(e) => setPopulation(e.target.value)}
          >
            <option value="all">{ta ? "அனைத்தும்" : "All populations"}</option>
            {[...new Set(quantitative.map((c) => c.population_scope))].map(
              (p) => (
                <option key={p}>{p}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <div className="panel">
        <h2>{ta ? "புள்ளிவிவர ஆதாரங்கள்" : "Quantitative evidence"}</h2>
        {!data.length ? (
          <div className="empty">
            <p>
              {ta
                ? "சரிபார்க்கப்பட்ட புள்ளிவிவரங்கள் இதுவரை சேர்க்கப்படவில்லை. காணப்படாத தரவு பூஜ்யமாகக் காட்டப்படாது."
                : "No verified quantitative data matches this selection. Missing values are never shown as zero."}
            </p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <caption>
                  {ta
                    ? "ஆதாரங்களுடன் பதிவான அளவீடுகள்"
                    : "Reported measures with their source and reporting period"}
                </caption>
                <thead>
                  <tr>
                    {(ta
                      ? [
                          "அளவீடு",
                          "மதிப்பு",
                          "காலப்பகுதி",
                          "பயனாளர் குழு",
                          "ஆதாரம்",
                        ]
                      : ["Metric", "Value", "Period", "Population", "Source"]
                    ).map((t) => (
                      <th key={t}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((c) => (
                    <tr key={c.id}>
                      <td>{c.metric_name}</td>
                      <td>
                        {c.metric_value} {c.unit}
                      </td>
                      <td>{c.reporting_period}</td>
                      <td>
                        {c.population_scope} · {c.geographical_scope}
                      </td>
                      <td>
                        <button
                          className="citation"
                          onClick={() => onEvidence([c])}
                        >
                          {c.document?.title} · p.{c.source_page}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {homogeneous && data.length > 1 ? (
              <>
                <h3>
                  {ta
                    ? "ஆதாரங்களில் கூறப்பட்ட மதிப்புகள்"
                    : "Source-reported values"}
                </h3>
                <div
                  style={{ height: 300 }}
                  aria-label="Bar chart of reported values; exact values and citations are in the preceding table"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart}>
                      <XAxis dataKey="label" hide />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#006a63" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p>
                  {ta
                    ? "ஒவ்வொரு பட்டையும் தனி ஆதாரப் பதிவைக் குறிக்கிறது; மதிப்புகள் கூட்டப்படவில்லை."
                    : "Each bar represents a separate source record. Figures are not summed, and gaps are not interpolated."}
                </p>
                <div className="answer-actions">
                  {data.map((c) => (
                    <button key={c.id} onClick={() => onEvidence([c])}>
                      {c.document?.title} · {c.reporting_period}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p>
                {ta
                  ? "ஒப்பிடத்தக்க அளவீடுகளுக்கே வரைபடம் காட்டப்படும்."
                  : "Charts appear only for comparable measures with the same unit, scheme and population scope."}
              </p>
            )}
          </>
        )}
      </div>
      <div className="panel">
        <h2>{ta ? "மாவட்டத் தரவு" : "District-level data"}</h2>
        <p>
          {ta
            ? "சரிபார்க்கப்பட்ட மாவட்டத் தரவுகள் இதுவரை சேர்க்கப்படவில்லை."
            : "No verified district-level dataset has been added yet."}
        </p>
      </div>
    </>
  );
}
