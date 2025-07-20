# 🧰 Tools Used – SCALESTACK (YouTube Revenue Optimization Agent)

SCALESTACK leverages the following tools to fetch and analyze YouTube video data for Software & IT companies:

---

### 📺 YouTube Video Search Tool

**Purpose**:  
Searches YouTube for a relevant video based on a keyword or topic.

**How it Works**:  
- Accepts a query string (e.g., "How to Build AI APIs")
- Returns the top-ranked video with its `videoId` for further analysis

**Usage in Agent**:  
Used as the first step in the inference chain to dynamically locate a video for analysis.

---

### 📊 YouTube Video Stats Tool (Custom Tool)

**Purpose**:  
Retrieves metadata (`snippet`) and performance data (`statistics`) for a specific YouTube video.

**How it Works**:  
- Accepts `videoId` and API key
- Calls YouTube’s `/videos` endpoint with `part=snippet,statistics`
- Returns title, description, view count, likes, etc.

**Usage in Agent**:  
Enables the agent to extract performance signals (CTR, drop-off hints, engagement level) for further insight generation.

---

### 🧠 GPT-4 Model (LLM)

**Provider**: OpenAI (via Lyzr Studio)  
**Purpose**:  
Analyzes the video’s metadata and user comments to extract:
- Summary
- Engagement patterns
- Viewer confusion or churn signals
- Strategic recommendations

**Prompting Strategy**:  
The prompt is structured to ensure consistent, business-oriented output in a strict JSON format.

---

