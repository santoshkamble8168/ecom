import { ImageResponse } from "next/og";

export const alt = "Ecom — shop tees and essentials";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#09090b",
          color: "#fafafa",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#ffe500",
            color: "#09090b",
            fontSize: 48,
            fontWeight: 800,
            padding: "8px 20px",
            width: "auto",
          }}
        >
          ECOM
        </div>
        <div style={{ marginTop: 32, fontSize: 56, fontWeight: 700 }}>Shop tees and essentials</div>
        <div style={{ marginTop: 16, fontSize: 28, color: "#d4d4d8" }}>Free shipping on orders above ₹999</div>
      </div>
    ),
    { ...size },
  );
}
