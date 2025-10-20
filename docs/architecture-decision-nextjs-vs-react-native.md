# Architecture Decision: Next.js vs React Native (Web)

## Executive Summary

**Recommendation: Next.js with App Router**

For a browser-based home automation dashboard demo at CodeMash 2026, **Next.js** is the recommended choice. While React
Native with React Native Web offers cross-platform capabilities, the project requirements explicitly favor a
browser-based demo, making Next.js the optimal solution for performance, developer experience, and presentation
reliability.

---

## Context

The project requires a frontend for a home automation dashboard that:

- Integrates with MQTT broker for real-time device control
- Uses LangChain + Ollama for natural language processing
- Implements Auth0 authentication
- Will be demonstrated live at CodeMash 2026 (January 12, 2026)
- **Key Constraint**: User specified browser-based demo is preferred (docs/questions.md, Q7)
- **Time Constraint**: One-hour presentation format
- **Target Devices**: Raspberry Pi 5 for backend, browser for frontend demo

---

## Option 1: Next.js (Recommended)

### Overview

Next.js is a React framework optimized for web applications with server-side rendering (SSR), static site generation (
SSG), and modern App Router architecture.

### Pros

#### 1. **Web-Optimized Performance**

- Native SSR and SSG capabilities for faster initial page loads
- Automatic code splitting and optimization
- Built-in image optimization
- Optimized specifically for browser environments
- Better Core Web Vitals scores out of the box

#### 2. **Superior Developer Experience for Web**

- Intuitive file-based routing with App Router
- Built-in API routes for backend integration
- Excellent TypeScript support
- Server Components for reduced client-side JavaScript
- Hot Module Replacement (HMR) for rapid development

#### 3. **Real-Time Communication Support**

- WebSocket support for MQTT integration
- Server-Sent Events for live updates
- React Server Components for efficient data fetching
- Excellent library ecosystem for real-time features

#### 4. **Dashboard-Specific Advantages**

- Better suited for data visualization libraries (Recharts, D3.js, etc.)
- Superior desktop/laptop experience
- Better browser DevTools integration
- Easier debugging for live demo scenarios

#### 5. **Deployment & Demo Reliability**

- Simpler deployment (single target platform)
- More predictable performance on different browsers
- Easier to troubleshoot during live presentation
- Better localhost development experience for demos

#### 6. **Documentation & Community**

- Comprehensive official documentation
- Large community with web-specific solutions
- Extensive examples for dashboard applications
- Active development by Vercel

#### 7. **Auth0 Integration**

- First-class support with `@auth0/nextjs-auth0`
- Well-documented authentication patterns
- Built-in middleware for protected routes

#### 8. **LangChain Integration**

- LangChain.js designed primarily for Node.js environments
- Better integration with server-side AI processing
- Can leverage Server Actions for AI interactions

### Cons

#### 1. **Platform Limitation**

- Web-only (no native mobile apps)
- Would require separate codebase for iOS/Android if needed later
- Cannot leverage native mobile device features

#### 2. **Mobile Experience**

- While responsive, not optimized for mobile interactions
- No native mobile gestures or feel
- Relies on mobile browser experience

#### 3. **Offline Support**

- More complex to implement true offline functionality
- Service Workers required for PWA features
- Not as seamless as native mobile apps

### Technical Architecture with Next.js

```
┌─────────────────────────────────────┐
│      Next.js App (Port 3000)        │
│  ┌─────────────────────────────┐   │
│  │  App Router (/app)          │   │
│  │  - page.tsx (Dashboard)     │   │
│  │  - layout.tsx               │   │
│  │  - api/routes               │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  Server Components          │   │
│  │  - Device List              │   │
│  │  - Status Overview          │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  Client Components          │   │
│  │  - MQTT Client (WebSocket)  │   │
│  │  - Voice Input              │   │
│  │  - Real-time Updates        │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  LangChain.js Integration   │   │
│  │  - Ollama Client            │   │
│  │  - MQTT Tool                │   │
│  │  - Device Control Tool      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
              │
         ┌────┴────┐
         │         │
    ┌────▼────┐ ┌──▼──────┐
    │  MQTT   │ │ Ollama  │
    │ Broker  │ │  (Pi 5) │
    └─────────┘ └─────────┘
```

---

## Option 2: React Native + React Native Web

### Overview

React Native with React Native Web allows building cross-platform applications (iOS, Android, Web) from a single
codebase using React components.

### Pros

#### 1. **Cross-Platform Capability**

- Single codebase for iOS, Android, AND Web
- Reusable components across all platforms
- Consistent user experience across devices
- Future-proofing for mobile app development

#### 2. **MQTT Integration**

- Well-documented MQTT support (`react-native-mqtt`, `@d11/react-native-mqtt`)
- Proven track record for IoT applications
- Real-time communication capabilities
- Efficient battery management for mobile devices

#### 3. **Mobile-First Design**

- Better touch interactions and gestures
- Native mobile app feel
- Access to device features (camera, microphone, sensors)
- Better mobile performance

#### 4. **Unified Development Experience**

- Single development workflow for all platforms
- Shared state management and logic
- Reusable custom hooks
- Consistent component library

#### 5. **Voice Commands**

- Better native audio API access
- Microphone permission handling built-in
- Could leverage platform-specific voice features

### Cons

#### 1. **Web Performance & Optimization**

- Not optimized specifically for web browsers
- Larger bundle sizes for web deployments
- Less efficient rendering compared to Next.js
- Potential performance issues on older browsers

#### 2. **Development Complexity**

- More complex build setup for web target
- Need to manage platform-specific code
- Web-specific issues in a mobile-first framework
- Steeper learning curve for web optimizations

#### 3. **Dashboard Experience**

- Less optimal for desktop/laptop interfaces
- Mobile-first design patterns may not suit dashboard UX
- Limited data visualization library support
- Responsive design more challenging

#### 4. **Demo Risks**

- More potential points of failure during live demo
- Browser compatibility issues
- Complex debugging during presentation
- May need polyfills for web features

#### 5. **SEO & Server-Side Rendering**

- Limited SSR support compared to Next.js
- SEO challenges (though not critical for authenticated dashboard)
- Slower initial page loads on web

#### 6. **Community & Resources**

- Smaller community for React Native Web specifically
- Fewer examples of dashboard applications
- Documentation primarily focused on mobile
- Less tooling support for web deployment

#### 7. **Integration Challenges**

- LangChain.js integration more complex
- Auth0 SDK not optimized for React Native Web
- Need platform-specific handling for many features
- Potential issues with Node.js libraries on web

### Technical Architecture with React Native Web

```
┌────────────────────────────────────────┐
│   React Native App + RN Web            │
│  ┌─────────────────────────────────┐  │
│  │  App Entry (index.web.js)       │  │
│  │  - Navigation Setup             │  │
│  │  - Platform Detection           │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │  Screens                        │  │
│  │  - DashboardScreen.tsx          │  │
│  │  - DeviceControlScreen.tsx      │  │
│  │  - SettingsScreen.tsx           │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │  Platform-Specific Components   │  │
│  │  - MQTTClient.web.tsx           │  │
│  │  - MQTTClient.native.tsx        │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │  Shared Business Logic          │  │
│  │  - MQTT Service                 │  │
│  │  - LangChain Client (polyfills) │  │
│  │  - State Management             │  │
│  └─────────────────────────────────┘  │
└────────────────────────────────────────┘
```

---

## Detailed Comparison Matrix

| Factor                       | Next.js                                    | React Native Web                             | Winner       |
|------------------------------|--------------------------------------------|----------------------------------------------|--------------|
| **Performance (Web)**        | Excellent - Native SSR, optimized bundling | Good - Requires optimization, larger bundles | ✅ Next.js    |
| **Performance (Mobile)**     | N/A - Not applicable                       | Excellent - Native mobile                    | React Native |
| **Real-Time MQTT**           | Excellent - WebSocket, SSE support         | Excellent - react-native-mqtt libraries      | 🟰 Tie       |
| **Dashboard UX**             | Excellent - Web-optimized layouts          | Good - Mobile-first patterns                 | ✅ Next.js    |
| **Cross-Platform**           | Web only                                   | iOS + Android + Web                          | React Native |
| **Developer Experience**     | Excellent for web                          | Good but more complex                        | ✅ Next.js    |
| **Auth0 Integration**        | First-class SDK                            | Requires custom implementation               | ✅ Next.js    |
| **LangChain.js Integration** | Native Node.js support                     | Requires polyfills                           | ✅ Next.js    |
| **Documentation**            | Comprehensive for web                      | Limited for web scenarios                    | ✅ Next.js    |
| **Demo Reliability**         | High - Single target platform              | Medium - Multi-platform complexity           | ✅ Next.js    |
| **Voice Input**              | Browser API (good enough)                  | Better native access                         | React Native |
| **Deployment Complexity**    | Low - Standard web hosting                 | Medium - Platform-specific builds            | ✅ Next.js    |
| **Bundle Size (Web)**        | Optimized                                  | Larger                                       | ✅ Next.js    |
| **TypeScript Support**       | Excellent                                  | Good                                         | ✅ Next.js    |
| **Data Visualization**       | Extensive library support                  | Limited options                              | ✅ Next.js    |
| **Learning Curve**           | Moderate                                   | Steeper for web                              | ✅ Next.js    |
| **Debugging (Live Demo)**    | Easier with browser DevTools               | More complex                                 | ✅ Next.js    |
| **Future Mobile Apps**       | Would need new codebase                    | Already supported                            | React Native |
| **Browser Compatibility**    | Excellent                                  | Good but requires testing                    | ✅ Next.js    |
| **Offline Support**          | PWA with Service Workers                   | Better with AsyncStorage                     | React Native |
| **Community Solutions**      | Large for web dashboards                   | Smaller for RN Web                           | ✅ Next.js    |

### Score: Next.js 15 | React Native Web 5 | Tie 1

---

## Decision Factors Specific to This Project

### 1. **User's Explicit Preference**

From `docs/questions.md`, Question 7:
> "I think for demo reasons using the browser is the way to go. We can mention normally this could be done within a
> network and not exposed but I feel like that is the simplest way to demo it."

**Impact**: User explicitly favors browser-based approach → **Strongly favors Next.js**

### 2. **Presentation Time Constraint**

- One-hour presentation
- Need simple, reliable demo
- Less complexity = less that can go wrong

**Impact**: Simpler deployment and fewer potential issues → **Favors Next.js**

### 3. **No Mobile Requirement Stated**

- Requirements focus on web dashboard
- Demo will be shown on projector/screen
- Raspberry Pi 5 backend, browser frontend

**Impact**: No need for mobile cross-platform benefits → **Favors Next.js**

### 4. **MQTT Real-Time Requirements**

- Both frameworks support MQTT effectively
- Next.js can use `mqtt.js` (same as Node.js)
- React Native uses `react-native-mqtt`

**Impact**: Both equally capable → **Neutral**

### 5. **LangChain + Ollama Integration**

- LangChain.js is Node.js-first
- Next.js provides native Node.js environment (Server Components, API Routes)
- React Native Web would require polyfills and workarounds

**Impact**: Cleaner integration → **Strongly favors Next.js**

### 6. **Dashboard UI Requirements**

- Home automation dashboards are typically desktop/laptop experiences
- Need to display multiple devices, sensor data, charts
- Desktop layouts work better than mobile-first responsive

**Impact**: Better dashboard UX → **Favors Next.js**

### 7. **Voice Commands (Stretch Goal)**

- Browser Web Speech API sufficient for demo
- React Native native APIs better but not required
- Voice input is stretch goal, not critical

**Impact**: Browser API adequate → **Slight favor to Next.js** (simpler)

---

## Addressing User's Hypothesis

User suggested:
> "react native would be the cleaner approach making everything simpler. Check my logic on this but this would allow us
> to run on more devices in more ways."

### Analysis:

**"Cleaner and simpler":**

- ❌ For a **web-focused project**, React Native Web adds complexity, not simplicity
- ✅ React Native Web is simpler **IF** you need iOS + Android + Web
- ✅ Next.js is simpler for **web-only** (which matches user's Q7 preference)

**"Run on more devices in more ways":**

- ✅ Technically true - React Native Web supports iOS, Android, and browsers
- ❌ BUT: Project requirements don't mention mobile apps
- ❌ Demo explicitly prefers browser-based (Q7)
- ⚠️ Adding mobile support adds complexity without clear benefit for this project

**Conclusion:**
React Native Web's cross-platform benefits are valuable when you **need** mobile apps. However, when the user explicitly
states browser-based demo is preferred, and no mobile requirement exists, Next.js provides a cleaner, simpler solution
for the actual project needs.

---

## Recommendation: Next.js with App Router

### Primary Reasons:

1. **Aligns with User's Browser-Based Preference** (docs/questions.md Q7)
2. **Simpler for One-Hour Live Demo** (less complexity = less risk)
3. **Superior Web Dashboard Experience** (desktop-optimized UI)
4. **Native LangChain.js Integration** (Server Components + API Routes)
5. **Better Auth0 Support** (first-class Next.js SDK)
6. **Optimized Web Performance** (faster load times, better UX)
7. **Easier Debugging During Live Demo** (browser DevTools, simpler architecture)
8. **Extensive Dashboard Examples** (larger community for this use case)

### Implementation Path:

```bash
# Create Next.js project with App Router
npx create-next-app@latest oracle --typescript --tailwind --app --eslint

# Key dependencies
npm install @auth0/nextjs-auth0
npm install mqtt
npm install langchain
npm install @langchain/ollama
npm install prisma @prisma/client
npm install zod
npm install zustand  # or jotai for state management
```

### Project Structure:

```
oracle/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout with Auth0 provider
│   │   ├── page.tsx                      # Dashboard homepage
│   │   ├── api/
│   │   │   ├── auth/[auth0]/route.ts    # Auth0 callback routes
│   │   │   ├── chat/route.ts             # LangChain chat endpoint
│   │   │   ├── devices/route.ts          # Device list/control API
│   │   │   └── mqtt/route.ts             # MQTT WebSocket handler
│   │   ├── dashboard/
│   │   │   └── page.tsx                  # Main dashboard UI
│   │   └── devices/
│   │       └── [id]/page.tsx             # Individual device control
│   ├── components/
│   │   ├── DeviceCard.tsx                # Device display component
│   │   ├── ChatInterface.tsx             # Natural language input
│   │   ├── VoiceInput.tsx                # Voice command component
│   │   └── MQTTStatus.tsx                # Connection status indicator
│   ├── lib/
│   │   ├── langchain/
│   │   │   ├── agent.ts                  # LangChain agent setup
│   │   │   ├── tools/
│   │   │   │   ├── mqtt-tool.ts          # MQTT publish/subscribe tool
│   │   │   │   └── device-tool.ts        # Device control tool
│   │   │   └── prompts.ts                # System prompts
│   │   ├── mqtt/
│   │   │   ├── client.ts                 # MQTT client singleton
│   │   │   └── topics.ts                 # Topic mappings
│   │   ├── db/
│   │   │   └── prisma.ts                 # Prisma client
│   │   └── auth/
│   │       └── auth0.ts                  # Auth0 configuration
│   └── hooks/
│       ├── useMQTT.ts                    # MQTT connection hook
│       ├── useDevices.ts                 # Device state hook
│       └── useChat.ts                    # Chat interface hook
├── prisma/
│   └── schema.prisma                     # Database schema
├── public/
└── package.json
```

### Next Steps:

1. Initialize Next.js project with App Router
2. Set up Auth0 authentication
3. Implement MQTT client with WebSocket support
4. Create LangChain agent with MQTT tools
5. Build dashboard UI components
6. Integrate Ollama for natural language processing
7. Add voice input as stretch goal
8. Test thoroughly for live demo reliability

---

## Alternative: React Native Web (If Mobile Apps Become a Requirement)

If future requirements include native iOS/Android apps, React Native Web becomes more attractive. However, for the
current scope:

- ✅ **Use Next.js for MVP and CodeMash demo**
- 🔄 **Evaluate mobile apps post-presentation**
- 🎯 **Can build React Native apps later if needed** (APIs remain the same)

This approach minimizes risk for the live demo while keeping options open for future platform expansion.

---

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [React Native Web](https://necolas.github.io/react-native-web/)
- [Building Real-Time Applications with MQTT and React Native](https://reactnativeexpert.com/blog/mqtt-with-react-native-for-efficient-communication/)
- [Guide to connecting React Native with Mosquitto (MQTT)](https://cedalo.com/blog/mqtt-react-native-guide/)
- [LangChain.js Documentation](https://js.langchain.com/)
- [Auth0 Next.js SDK](https://auth0.com/docs/quickstart/webapp/nextjs)

---

## Decision Log Entry

| Date       | Question # | Decision                    | Rationale                                                                                                                                                                |
|------------|------------|-----------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 2025-09-29 | Q2         | **Next.js with App Router** | Browser-based demo preference (Q7), web-optimized performance, simpler architecture for live presentation, better LangChain/Auth0 integration, no mobile app requirement |