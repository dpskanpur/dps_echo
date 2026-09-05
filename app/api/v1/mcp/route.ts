import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/v1/mcp - MCP Manifest & Capabilities for Gemini Enterprise, Codex, and AGY agents
export async function GET() {
  return NextResponse.json({
    name: "dps-echo-mcp-server",
    version: "1.0.0",
    description: "DPS Echo Enterprise Model Context Protocol (MCP) Server for Delhi Public School Kanpur",
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: true,
      resources: true,
      prompts: true,
    },
    tools: [
      {
        name: "search_students",
        description: "Search student records across all DPS Kanpur campuses by name, Registration ID, or Scholar ID.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Name, Registration ID (REG-AZD-2026-XXXX), or Scholar ID" },
            campusId: { type: "string", description: "Optional campus filter ID" },
            status: { type: "string", enum: ["REGISTERED", "ACTIVE", "INACTIVE", "TRANSFER_OUT"] },
          },
        },
        endpoint: "/api/v1/students",
      },
      {
        name: "register_student",
        description: "Register a new applicant into Stage 1 Registration and issue a unique Registration ID.",
        inputSchema: {
          type: "object",
          properties: {
            campusId: { type: "string" },
            classId: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            dob: { type: "string", description: "YYYY-MM-DD" },
            gender: { type: "string", enum: ["MALE", "FEMALE", "OTHER"] },
            studentMobile: { type: "string" },
            fatherName: { type: "string" },
            fatherPhone: { type: "string" },
          },
          required: ["campusId", "classId", "firstName", "lastName", "dob", "gender"],
        },
        endpoint: "/api/v1/students",
      },
      {
        name: "get_campus_analytics",
        description: "Fetch campus-wise enrollment statistics, fee collection metrics, and class distributions.",
        inputSchema: {
          type: "object",
          properties: {
            campusId: { type: "string", description: "Optional campus ID" },
          },
        },
        endpoint: "/api/v1/analytics",
      },
    ],
    resources: [
      {
        uri: "dps://campuses",
        name: "DPS Kanpur Campuses",
        mimeType: "application/json",
        description: "List of all 4 official DPS Kanpur campuses",
      },
      {
        uri: "dps://fee-structures",
        name: "Academic Fee Structures 2026-27",
        mimeType: "application/json",
        description: "Campus & class-wise annual fee schedules",
      },
    ],
  });
}
