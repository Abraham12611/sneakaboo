export default function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(160deg,#1b2540,#6c4ab6)",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div>
        <h1 style={{ fontSize: "3rem", margin: 0, color: "#ffc933" }}>SNEAKABOO</h1>
        <p style={{ opacity: 0.85 }}>The whole house is looking for you.</p>
        <p style={{ opacity: 0.6 }}>Coming soon. Sneak in again in a few days.</p>
      </div>
    </main>
  );
}
