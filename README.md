# 🛡️ Distraction Blocker

> Take control of your online experience. Hide distracting UI elements on your favorite social media platforms and stay focused.

A powerful browser extension that helps you eliminate digital distractions by selectively hiding UI elements on Reddit, YouTube, Instagram, and Facebook. Customize exactly what you see with an intuitive popup interface.

---

## ✨ Features

- **🎯 Selective Content Hiding**: Choose precisely which UI elements to hide on each site
- **⚙️ Easy-to-Use Interface**: Simple toggle-based controls in a clean popup
- **💾 Persistent Settings**: Your preferences are automatically saved and remembered
- **🔄 Cross-Platform Support**: Works seamlessly across multiple popular social media sites
- **⚡ Lightweight & Fast**: Minimal performance impact with instant activation
- **🔒 Privacy-Focused**: All data stored locally—no external connections or tracking
- **🎨 Non-Invasive**: Hides elements while maintaining site functionality

---

## 🌐 Supported Platforms

| Platform | Hideable Elements |
|----------|------------------|
| **Reddit** | Header, Left Sidebar, Right Sidebar |
| **YouTube** | Header, Sidebar, Recommendations |
| **Instagram** | Stories, Suggested Posts, Post Recommendations |
| **Facebook** | News Feed Recommendations, Stories, Suggested Posts |

---

## 📦 Installation

### Method 1: Install from Browser Web Store
*(Coming soon to Chrome Web Store and Firefox Add-ons)*

### Method 2: Load as Developer Extension

#### Chrome/Chromium:
1. Clone or download this repository
2. Open `chrome://extensions/` in your browser
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `distraction-blocker` folder
6. The extension will appear in your toolbar

#### Firefox:
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Navigate to `manifest.json` and select it
4. The extension will be loaded (until Firefox restart)

---

## 🚀 Quick Start

1. **Install the extension** following the installation steps above
2. **Click the extension icon** in your browser toolbar
3. **You'll see the current website** with toggleable options
4. **Toggle elements on/off** to hide distracting content
5. **Settings are saved automatically** and applied every time you visit

### Example: YouTube Focus Mode

```
Visit YouTube → Click Distraction Blocker → Toggle:
  ☑️ Hide Header
  ☑️ Hide Sidebar  
  ☑️ Hide Recommendations
→ Enjoy a distraction-free video
```

---

## 🎛️ How It Works

### Architecture Overview

The extension uses a modular architecture with site-specific content scripts:

```
manifest.json (Extension configuration)
├── popup/ (User interface)
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── shared/ (Common utilities)
│   └── utils.js
├── sites/ (Site-specific implementations)
│   ├── reddit/
│   ├── youtube/
│   ├── instagram/
│   └── facebook/
└── docs/ (Documentation)
```

### File Structure

- **`manifest.json`**: Extension configuration and permissions
- **`popup/`**: Popup UI that appears when you click the extension icon
  - `popup.html`: Markup with dynamic toggle generation
  - `popup.js`: Logic for reading/writing settings
  - `popup.css`: Styling for the popup interface
- **`shared/utils.js`**: Shared utilities and default site configurations
- **`sites/{platform}/`**: Site-specific implementations
  - `content.js`: Content script that hides/shows elements
  - `styles.css`: CSS to hide elements
- **`docs/`**: Documentation and guides

### How Settings Are Stored

All preferences are stored in Chrome/Firefox's local storage:
```javascript
// Example storage structure
{
  "reddit": { header: true, leftSidebar: false, rightSidebar: true },
  "youtube": { header: false, sidebar: true, recommendations: true },
  // ... etc
}
```

---

## 🔧 Customization

### Adding a New Platform

1. Create a new folder in `sites/{platform_name}/`
2. Add `content.js` with your hiding logic
3. Add `styles.css` for CSS-based hiding
4. Update `manifest.json` to include the new content script
5. Add site configuration to `shared/utils.js`

### Modifying Hiding Behavior

Each site's `content.js` handles the specific element selection and hiding. You can:
- Adjust CSS selectors in `sites/{platform}/styles.css`
- Add more granular controls in `sites/{platform}/content.js`
- Modify toggle options in `shared/utils.js`

---



## 📖 Usage Tips

✅ **Best Practices:**
- Start by hiding recommendations to reduce algorithmic influence
- Hide sidebars to improve focus on main content
- Experiment with different combinations to find your ideal setup
- Use on one platform at a time initially to see the difference

❌ **Limitations:**
- Some elements may require tweaking if site layouts change
- Extremely dynamic content may not be fully hideable
- Mobile versions of sites may have different selectors

---

## 🎨 Screenshots

*Once you load the extension:*

1. **Popup Interface**: Clean, simple toggles for each section
2. **YouTube Focus**: Header, sidebar, and recommendations hidden
3. **Reddit Optimized**: Hide distracting sidebars and keep content focused
4. **Instagram Clean**: Minimal feed without recommendations

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report Bugs**: Found an element that isn't hiding? Open an issue with:
   - Website URL
   - Element description
   - Browser and version

2. **Suggest Features**: Ideas for new sites or controls?
   - Open an issue describing the feature
   - Explain the use case

3. **Submit Updates**:
   - Fork the repository
   - Create a feature branch
   - Make your changes
   - Submit a pull request

---

## 📝 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

---

## 🌟 Support

Having issues? Here are some common solutions:

| Problem | Solution |
|---------|----------|
| Extension not loading | Try incognito mode first; some extensions are disabled in private browsing |
| Hiding not working | The site layout may have changed. Check the console for errors |
| Settings not saving | Ensure the extension has storage permissions |
| Want to report a bug? | Open an issue on GitHub with details |

---

## 🎯 Roadmap

- [ ] Add more supported platforms
- [ ] Create custom hide rules interface
- [ ] Add keyboard shortcuts
- [ ] Statistics dashboard (time saved, distractions blocked)
- [ ] Sync settings across browsers
- [ ] Dark mode for popup
- [ ] Import/Export settings

---

## 💡 Philosophy

This extension is built on the belief that users should have complete control over their digital environment. By removing unnecessary distractions, you can focus on what truly matters—whether that's learning, creating, or connecting meaningfully.

**Take back your time. Block your distractions.**

---

<div align="center">

Made with ❤️ by developers, for developers and digital minimalists.

[⭐ Star this repo if you find it helpful](https://github.com/beingbalveer/distraction-blocker) | [Report Issues](https://github.com/beingbalveer/distraction-blocker/issues)

</div>
