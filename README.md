# LMSA - LM Studio Android 
![Status: Open Source](https://img.shields.io/badge/Status-Open%20Source-brightgreen)
![Version: 8.6](https://img.shields.io/badge/Version-8.6-blue)
![Release: Community](https://img.shields.io/badge/Release-Community%20Driven-blue)

<p align="left">
  <a href="https://play.google.com/store/apps/details?id=com.lmsa.app">
    <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" height="80">
  </a>
  <a href="https://github.com/techcow2/LMSA/releases">
    <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="Get it on GitHub" height="80">
  </a>
</p>

## Table of Contents

- [🆕 What's New](#whats-new)
- [📸 Screenshots](#screenshots)
- [📋 What is LMSA?](#what-is-lmsa)
- [🌟 Features Overview](#features-overview)
- [📱 Getting Started](#getting-started)
- [💻 How It Works](#how-it-works)
- [🔧 Technical Requirements](#technical-requirements)
- [🔍 Troubleshooting Connection Issues](#troubleshooting-connection-issues)
- [🔧 Need Help?](#need-help)
- [⚠️ Disclaimer](#disclaimer)

<h2 id="whats-new">🆕 What's New</h2>

### 🎉 Latest Update: Version 8.6 - Now Available!

#### Network Change Validation Checklist
Added a network change validation checklist that prompts users to verify important LM Studio server settings, such as enabling CORS.

#### Minimum SDK Version Update
Updated minimum SDK version to 23 (Android 6.0), expanding Play Store availability to more users.

#### CSS Bug Fixes
Fixed CSS bugs affecting the color of certain elements and icons.

#### General UI Improvements
Implemented various UI enhancements for a better user experience.

---

<h2 id="screenshots">📸 Screenshots</h2>
<p align="left">
  <img src="https://github.com/user-attachments/assets/ba437aee-6bc4-4442-948b-777cb34adea8" width="150" style="display:inline-block" />
  <img src="https://github.com/user-attachments/assets/67f86d21-dccb-4f1c-b4c9-ebe22551cac3" width="150" style="display:inline-block" />
  <img src="https://github.com/user-attachments/assets/673fad48-bd93-42df-91e2-8a7927002c86" width="150" style="display:inline-block" />
  <img src="https://github.com/user-attachments/assets/0eec29a7-35d2-474a-af63-ba05522adac8" width="150" style="display:inline-block" />
</p>

<h2 id="what-is-lmsa">📋 What is LMSA?</h2>

LMSA (LM Studio Assistant) is an Android front-end application for LM Studio that provides a clean, user-friendly interface to interact with language models on your Android device. It's designed with privacy in mind, offering a tracking-free experience for users who want to leverage the power of large language models on mobile.

### Key Functionality:
- Connect to LM Studio running on your computer
- Chat with AI models through a mobile-optimized interface
- Upload and analyze documents using AI
- Upload and analyze images with vision language models
- Customize AI behavior with system prompts and temperature settings

<h2 id="features-overview">🌟 Features Overview</h2>

### Privacy & Security
- **Community updates** improving app security and stability
- **Privacy-focused design** with no unnecessary tracking
- **Secure connections** to your LM Studio instance
- **Privacy First** - Your conversations never leave your personal network as models run locally

### AI Capabilities
- **Document analysis** - Chat with your files
- **Image analysis** - Upload and discuss images with vision language models
- **Multimodal interactions** - Combine text, documents, and images in conversations
- **Custom instructions** - Personalize AI responses
- **Precision tuning** - Adjust response creativity and accuracy
- **System prompt** - Set context for more relevant responses
- **AI Reasoning Visibility** - Toggle the ability to see the model's "thinking" process before generating responses
- **File Processing** - Upload and process files to include in your prompts for more context-aware responses

### User Experience
- **Clean interface** - Intuitive design for effortless interaction
- **Model information** - View details about the loaded AI model
- **Tablet optimization** - Enhanced layout for larger screens
- **Sidebar navigation** - Quick access to conversations and settings
- **Dark Mode Support** - Chat comfortably day or night with full UI theme support
- **Mobile-Responsive Design** - Optimized for both phones and tablets of various screen sizes
- **Quick Navigation** - "Scroll to Bottom" button for faster movement in long chats

### Conversation Management
- **Multiple Conversations** - Create and manage separate chat threads for different topics
- **Comprehensive History** - Save, browse, and continue previous conversations with organized chat management
- **Automatic Titles** - Saved chats are automatically titled for easy identification
- **Import/Export** - Easily backup and transfer your saved conversations between devices
- **Response Management** - Copy, edit, delete, and regenerate messages with ease
- **Message Control** - Delete individual user messages from chat history for better conversation management

### Connection & Configuration
- **Simple Connection** - Connect to your LM Studio server with just an IP address and port
- **Advanced Customization** - Adjust temperature, system prompts, and other model parameters directly from your phone

<h2 id="getting-started">📱 Getting Started</h2>

<details>
<summary><strong>Option 1: Android App (Recommended)</strong> (Click to expand/collapse)</summary>

The easiest way to use LMSA is by installing the official Android app from the Google Play Store:

**Get it on Google Play:**
<a href="https://play.google.com/store/apps/details?id=com.lmsa.app">
  <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" height="80">
</a>

The Android app provides the best experience with:
- Native performance and optimized interface
- Push notifications for new messages
- Offline access to chat history
- Easy integration with Android file system
- Regular updates and improvements

</details>

<details>
<summary><strong>Option 2: Web Browser Alternative (No App Installation Required)</strong> (Click to expand/collapse)</summary>

If you don't want to install the Android app, you can run LMSA directly in your web browser using a simple Python HTTP server. This allows you to access LMSA from any device on your local network, including Android phones, tablets, and computers.

#### Prerequisites
- Python 3 installed on your computer
- LM Studio running and configured (see setup instructions below)
- Both devices connected to the same local network

#### Setup Instructions

##### 1. Clone the Repository
First, clone the LMSA repository to your computer:
```bash
git clone https://github.com/techcow2/LMSA.git
cd LMSA
```

##### 2. Start the Python HTTP Server
Open a command prompt or terminal on the same computer where LM Studio is running:

**For Windows:**
```cmd
cd "C:\path\to\your\LMSA\folder"
python -m http.server 8000
```

**For macOS/Linux:**
```bash
cd /path/to/your/LMSA/folder
python3 -m http.server 8000
```

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

Google Play is a trademark of Google LLC.