import React, { useState, useEffect } from "react";
import { Octokit } from "@octokit/rest";

// Replace with your API key here
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY";
const GITHUB_PAT = process.env.REACT_APP_GITHUB_PAT || "YOUR_GITHUB_PAT";

const REPO_OWNER = "avival69";
const REPO_NAME = "leet-code-everyday";

function App() {
  const [questionLink, setQuestionLink] = useState("");
  const [solution, setSolution] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  // Loading bar animation logic
  const simulateLoading = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + 10));
    }, 200);
    return () => clearInterval(interval);
  };

  // Authentication check
  const checkAuth = () => {
    if (password === "aswin123") {
      setAuthenticated(true);
    } else {
      alert("Incorrect Password! Try again.");
    }
  };

  const fetchLeetCodeQuestionLink = async () => {
    try {
      setLoading(true);
      simulateLoading();
      const response = await fetch(
        "https://raw.githubusercontent.com/raiyansayeed/leetcode-download-questions/master/question_links.txt"
      );

      if (!response.ok) throw new Error("Failed to fetch question links");

      const text = await response.text();
      const links = text.split("\n").filter((link) => link.trim() !== "");

      if (!links.length) throw new Error("No question links found");

      const randomLink = links[Math.floor(Math.random() * links.length)];
      setQuestionLink(randomLink);
    } catch (error) {
      console.error("Error fetching question link:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateSolution = async () => {
    if (!questionLink) return alert("Please fetch a question first!");

    try {
      setLoading(true);
      simulateLoading();

      const questionTitle = questionLink.split("/").pop().replace(/-/g, " ");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Solve the following programming question in Python:\n\n${questionTitle}`,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate solution. Check API key!");

      const data = await response.json();
      const generatedSolution =
        data?.candidates?.[0]?.output || "Solution generation failed.";

      setSolution(generatedSolution);
    } catch (error) {
      console.error("Error generating solution:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const commitSolutionToGitHub = async () => {
    if (!solution) return alert("Generate a solution first!");

    try {
      setLoading(true);
      simulateLoading();
      const octokit = new Octokit({ auth: GITHUB_PAT });

      const fileName = `solutions/${new Date()
        .toISOString()
        .split("T")[0]}_${questionLink.split("/").pop().replace(/-/g, "_")}.py`;

      // Check if the file exists
      let sha;
      try {
        const { data } = await octokit.repos.getContent({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          path: fileName,
        });
        sha = data.sha;
      } catch {
        sha = undefined;
      }

      // Commit the solution
      await octokit.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: fileName,
        message: `Add solution for ${questionLink.split("/").pop()}`,
        content: btoa(solution),
        sha: sha,
      });

      setHistory((prev) => [
        ...prev,
        { questionLink, solution, fileName, timestamp: new Date().toLocaleString() },
      ]);
      alert("Solution committed to GitHub!");
    } catch (error) {
      console.error("Error committing solution:", error);
      alert("Error committing to GitHub");
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div style={styles.authContainer}>
        <h2>Login</h2>
        <input
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />
        <button onClick={checkAuth} style={styles.button}>
          Login
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>LeetCode Daily Automation</h1>
      <div style={styles.buttonContainer}>
        <button onClick={fetchLeetCodeQuestionLink} disabled={loading} style={styles.button}>
          Fetch Question
        </button>
        <button onClick={generateSolution} disabled={loading} style={styles.button}>
          Generate Solution
        </button>
        <button onClick={commitSolutionToGitHub} disabled={loading} style={styles.button}>
          Commit Solution
        </button>
      </div>
      {loading && <div style={{ ...styles.loadingBar, width: `${progress}%` }} />}
      <div style={styles.results}>
        <h3>Fetched Question:</h3>
        <p>{questionLink || "No question link fetched yet."}</p>
        <h3>Generated Solution:</h3>
        <pre style={styles.solutionBox}>{solution || "No solution generated yet."}</pre>
      </div>
    </div>
  );
}

const styles = {
  authContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "10%",
  },
  input: {
    padding: "10px",
    margin: "10px 0",
    width: "300px",
  },
  button: {
    padding: "10px",
    backgroundColor: "#4caf50",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    margin: "5px",
  },
  container: {
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f9f9f9",
    minHeight: "100vh",
  },
  title: {
    textAlign: "center",
    marginBottom: "20px",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
  },
  loadingBar: {
    height: "5px",
    backgroundColor: "#4caf50",
    marginTop: "10px",
    transition: "width 0.2s ease-in-out",
  },
  results: {
    marginTop: "20px",
  },
  solutionBox: {
    backgroundColor: "#e8e8e8",
    padding: "10px",
    whiteSpace: "pre-wrap",
    borderRadius: "5px",
  },
};

export default App;
