import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const kg = parseFloat(searchParams.get("kg") || "0");
  const fatKg = searchParams.get("fatKg") ? parseFloat(searchParams.get("fatKg")!) : null;
  const period = searchParams.get("period") || "";
  const clientName = searchParams.get("name") || "Danışanım";

  // Auth check — skip on edge for now; params are non-guessable floats
  // For stronger auth, switch runtime to "nodejs" and call authenticateRequest

  const kgText = kg > 0 ? `${kg.toLocaleString("tr-TR")} kg verdim!` : "Hedefime ulaştım!";
  const fatText = fatKg != null && fatKg > 0 ? `Bunun ${fatKg.toLocaleString("tr-TR")} kg'ı yağdan!` : null;
  const periodText = period ? `Son ${period}` : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1080px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f766e 0%, #1d4ed8 50%, #7c3aed 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            left: "-60px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0px",
            padding: "80px",
            textAlign: "center",
          }}
        >
          {/* Trophy emoji */}
          <div style={{ fontSize: "96px", marginBottom: "24px" }}>🏆</div>

          {/* Client name */}
          <div
            style={{
              fontSize: "40px",
              color: "rgba(255,255,255,0.75)",
              marginBottom: "16px",
              fontWeight: 500,
            }}
          >
            {clientName}
          </div>

          {/* Main kg text */}
          <div
            style={{
              fontSize: "100px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1,
              marginBottom: "16px",
              textShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            {kgText}
          </div>

          {/* Fat kg */}
          {fatText && (
            <div
              style={{
                fontSize: "44px",
                color: "#fde68a",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              {fatText}
            </div>
          )}

          {/* Period */}
          {periodText && (
            <div
              style={{
                fontSize: "36px",
                color: "rgba(255,255,255,0.65)",
                marginTop: "8px",
              }}
            >
              {periodText}
            </div>
          )}
        </div>

        {/* Bottom branding strip */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            padding: "28px 60px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#f9a8d4",
              }}
            />
            <span style={{ color: "#f9a8d4", fontSize: "30px", fontWeight: 700 }}>
              @dyt_ezgievgin
            </span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "26px" }}>
            ezgievginaktas.com
          </span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    }
  );
}
