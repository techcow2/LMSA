
##### 3. Find Your Computer's IP Address
You need to find your computer's local network IP address:

**Windows:**
- Open Command Prompt and type: `ipconfig`
- Look for "Wireless LAN adapter Wi-Fi" or "Ethernet adapter"
- Note the "IPv4 Address" (usually starts with 192.168.x.x or 10.x.x.x)

**macOS:**
- Go to System Preferences > Network
- Select your active connection (Wi-Fi or Ethernet)
- Note the IP address

**Linux:**
- Open Terminal and type: `ip addr show` or `ifconfig`
- Look for your active network interface
- Note the IP address (usually starts with 192.168.x.x or 10.x.x.x)

##### 4. Access LMSA from Your Android Device
1. Open the web browser on your Android device
2. Navigate to: `http://[YOUR_COMPUTER_IP]:8000`
   - Replace `[YOUR_COMPUTER_IP]` with your computer's actual IP address
   - Example: `http://192.168.1.100:8000`
3. The LMSA interface will load in your browser

</details>


<h2 id="how-it-works">💻 How It Works</h2>

### Setting up LM Studio (Desktop)
<p align="left">
  <a href="https://lmsa.app/Images/lmstudiotutorial.gif">
    <img src="https://lmsa.app/Images/lmstudiotutorial.gif" alt="LM Studio Setup Tutorial" width="400" style="display:inline-block" />
  </a>
</p>

1. Start LM Studio on your computer and load your favorite language model using your phone. **Don't load the first model using your computer, go to Models > Load (near your desired model) on your Android Device** (including vision language models).
2. Activate the server feature in LM Studio (usually on port 1234)
3. **Enable CORS in LM Studio** - This is critical for LMSA to work properly:
   - In LM Studio, go to the server settings
   - Find and enable the "Enable CORS" option
   - Without CORS enabled, LMSA will not be able to communicate with your LM Studio server
4. **Enable "Serve on Local Host"** - After starting the server:
   - In LM Studio server settings, locate and enable the "Serve on Local Host" option
   - This allows the server to accept connections from devices on your local network
   - Without this enabled, the connection will not reach any device on the network
5. Connect the Android app to your computer using your local network
6. Start chatting with your AI models from anywhere in your home

### Setting up LMSA (Android)
<p align="left">
  <a href="https://lmsa.app/Images/apptutorial.gif">
    <img src="https://lmsa.app/Images/apptutorial.gif" alt="LMSA App Tutorial" width="200" style="display:inline-block" />
  </a>
</p>

LMSA connects to LM Studio running on your computer, allowing you to:
- Access powerful AI language models from your mobile device
- Chat with AI models using a simple, intuitive interface
- Upload documents for the AI to analyze and discuss
- Upload images for vision language models to analyze and discuss
- Customize AI behavior through temperature and system prompt settings

<h2 id="technical-requirements">🔧 Technical Requirements</h2>

- Android 6.0 or higher
- LM Studio installed and running on a computer with a suitable language model (text or vision)
- Both devices connected to the same network
- CORS enabled in LM Studio server settings (required for proper functionality)
- "Serve on Local Host" enabled in LM Studio server settings (required for network connectivity)

<h2 id="troubleshooting-connection-issues">🔍 Troubleshooting Connection Issues</h2>

If you're having trouble connecting LMSA to your LM Studio server, follow these steps:

### Verify Server Settings
- In LM Studio, go to server settings and confirm "Enable CORS" is checked
- Verify that "Serve on Local Host" is enabled in LM Studio settings - this is required for the server to accept connections from devices on your network

<img width="461" height="353" alt="image" src="https://github.com/user-attachments/assets/8434daa1-e7d5-48b8-bc38-9461db47c99d" />


### Verify IP Address
- The IP address shown in LM Studio may sometimes be incorrect
- Manually check your computer's Wi-Fi adapter IP address:
  - **Windows**: Open Command Prompt and type `ipconfig`, look for "Wireless LAN adapter Wi-Fi" and use the IPv4 Address listed there
  - **Mac**: Go to System Preferences > Network, select Wi-Fi, and note the IP address
  - **Linux**: Open Terminal and type `ip addr show` or `ifconfig`
- Enter this IP address from your Wi-Fi adapter into LMSA

<img width="699" height="190" alt="image" src="https://github.com/user-attachments/assets/550bad6b-1cea-4bee-8307-fc01f464aaf7" />


### Network Configuration
- Ensure both your computer and Android phone are on the same network
- Avoid guest networks, which often isolate devices from each other
- Check if your router has VLAN isolation or AP isolation enabled (disable if present)
- Disable VPN on both devices, as VPNs typically isolate local network connections

### Firewall Settings
- Check Windows Firewall to ensure LM Studio is allowed through:
  - Go to Windows Security > Firewall & network protection > Allow an app through firewall
  - Verify LM Studio has checkmarks for both Private and Public networks (or whichever profile you're using)
  - If LM Studio isn't listed, click "Allow another app" and add it manually

### Port Configuration
- Try using different ports if the default (1234) doesn't work
- Common alternatives: 8080, 5000, 3000
- Ensure the port you choose isn't blocked by your firewall or used by another application

### Test Network Connectivity
- **From Android to Computer**:
  - Download a networking app with ping functionality (e.g., PingTools, Network Utilities)
  - Ping your computer's IP address to verify connectivity
- **From Computer to Android**:
  - Find your Android phone's IP address in your router's connected devices list or in phone settings
  - Open Command Prompt (Windows) or Terminal (Mac/Linux) and run `tracert [phone-ip]` (Windows) or `traceroute [phone-ip]` (Mac/Linux)
  - If the traceroute fails, there may be network isolation preventing communication

If none of these steps resolve the issue, visit our support center for additional help.

<h2 id="need-help">🔧 Need Help?</h2>

Having trouble with LMSA? Visit our **[comprehensive support center](https://lmsa.app/support.html)** for detailed setup guides, troubleshooting steps, and answers to frequently asked questions.

<h2 id="disclaimer">⚠️ Disclaimer</h2>

LMSA is a third-party application and is not affiliated with LM Studio or its developers. This app is independently developed to provide an Android front-end interface for interacting with LM Studio. Use of this app is at your own discretion, and the developers of LMSA are not responsible for any issues arising from its use.

---

<h2 id="credits">🙏 Credits</h2>

- **Image Generation**: Powered by [Pollinations.ai](https://pollinations.ai/) - providing the text-to-image API for AI-generated visuals

---

Google Play is a trademark of Google LLC.
