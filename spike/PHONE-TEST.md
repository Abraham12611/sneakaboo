# Phone test for the view spike

The dev server on `http://192.168.0.198:5173` answers from the PC itself, and Windows Firewall already allows Node on the Public profile (checked Nov 25). If a phone on the same Wi-Fi still can't open it, the cause is usually one of these:

1. **Router client isolation** (also called "AP isolation" or "guest mode"). Many 5G routers block Wi-Fi devices from talking to each other. Look in the router admin page (often `http://192.168.0.1`) for "AP isolation", "Client isolation" or "Wi-Fi isolation" and turn it off. Can't change it? Use option B.
2. The phone is on **mobile data**, a **VPN**, or **Private DNS** is forced. Turn those off and confirm the phone's IP starts with `192.168.0.`.
3. The phone is on a different SSID or band that the router isolates (for example a guest network).

## Option A: same Wi-Fi (fastest when it works)
```powershell
cd C:\Users\DELL\workspace\Slinka\spike
npm run dev
```
Open `http://192.168.0.198:5173/?debug=1` on the phone. The address can change; run `ipconfig` and use the Wi-Fi IPv4 address.

## Option B: public tunnel (works through any router)
This exposes only the static build for as long as the command runs. Press Ctrl+C when done.

Terminal 1:
```powershell
cd C:\Users\DELL\workspace\Slinka\spike
npm run build
npm run preview
```
Terminal 2, pick one:
```powershell
# Cloudflare quick tunnel (install once: winget install Cloudflare.cloudflared)
cloudflared tunnel --url http://localhost:4173

# or localtunnel (no install). The first visit asks for a "tunnel password"
# which is your public IP shown at https://loca.lt/mytunnelpassword
npx localtunnel --port 4173
```
Open the printed `https://...` address on the phone.

## What to try (2 minutes)
- Add `?debug=1` to the URL to see the FPS overlay. Note the FPS number while walking.
- Left thumb: drag the floating joystick. Push gently (sneak), medium (walk), fully (run).
- Pinch with two fingers to zoom. Use the `+` and `-` buttons.
- Press the `P` button to switch oblique and top-down.
- `?renderer=pixi` compares the Pixi renderer. `?stress=1` adds 10 seekers and 150 props.
- Rotate to portrait and back. Note anything that breaks.

Report: phone model, browser, FPS in normal and `?stress=1`, whether touch controls feel right.
