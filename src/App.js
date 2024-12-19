import React, { useState, useEffect } from "react";
import { Octokit } from "@octokit/rest";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; // Replace with your environment variable
const GITHUB_PAT = process.env.REACT_APP_GITHUB_PAT; // Replace with your environment variable

const REPO_OWNER = "avival69"; // Your GitHub username
const REPO_NAME = "leet-code-everyday"; // Repository name

function App() {
  const [questionLink, setQuestionLink] = useState("");
  const [solution, setSolution] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch a random LeetCode question link
  const fetchLeetCodeQuestionLink = async () => {
    try {
      setLoading(true);
      console.log("Fetching question links...");

      const response = await fetch(
        "https://raw.githubusercontent.com/raiyansayeed/leetcode-download-questions/master/question_links.txt"
      );

      if (!response.ok) {
        console.error("Failed to fetch links:", response.statusText);
        return;
      }

      const text = await response.text();
      const links = text.split("\n").filter((link) => link.trim() !== "");

      if (links.length === 0) {
        console.error("No links found in the file.");
        return;
      }

      const randomIndex = Math.floor(Math.random() * links.length);
      const randomLink = links[randomIndex];

      setQuestionLink(randomLink);
      console.log("Fetched Question Link:", randomLink);
    } catch (error) {
      console.error("Error fetching question link:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate a solution using Gemini API
  const generateSolution = async () => {
    if (!questionLink) {
      alert("Fetch a question link first!");
      return;
    }

    try {
      setLoading(true);
      const questionTitle = questionLink.split("/").pop().replace(/-/g, " ");

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: `Solve the following programming question in Python:\n\n${questionTitle}`,
          }),
        }
      );

      const geminiData = await geminiResponse.json();
      const generatedSolution =
        geminiData?.candidates?.[0]?.output || "Solution generation failed.";

      setSolution(generatedSolution);
      console.log("Generated Solution:", generatedSolution);
    } catch (error) {
      console.error("Error generating solution:", error);
    } finally {
      setLoading(false);
    }
  };

  // Commit solution to GitHub
  const commitSolutionToGitHub = async () => {
    if (!solution) {
      alert("Generate a solution first!");
      return;
    }

    try {
      setLoading(true);
      const octokit = new Octokit({ auth: GITHUB_PAT });
      const fileName = `solutions/${new Date()
        .toISOString()
        .split("T")[0]}_${questionLink.split("/").pop().replace(/-/g, "_")}.py`;

      // Check if the file already exists
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

      console.log(`Solution committed successfully: ${fileName}`);

      // Update history
      setHistory((prev) => [
        ...prev,
        { questionLink, solution, fileName, timestamp: new Date().toLocaleString() },
      ]);

      alert("Solution committed to GitHub!");
    } catch (error) {
      console.error("Error committing solution to GitHub:", error);
    } finally {
      setLoading(false);
    }
  };

  // Schedule daily uploads at 6 PM IST with 5 contributions
  const scheduleDailyUploads = () => {
    const now = new Date();
    const sixPMIST = new Date();

    sixPMIST.setUTCHours(12); // 6 PM IST in UTC
    sixPMIST.setUTCMinutes(0);
    sixPMIST.setUTCSeconds(0);

    // Calculate delay until 6 PM IST
    let delay = sixPMIST.getTime() - now.getTime();
    if (delay < 0) {
      // If 6 PM has already passed, schedule for the next day
      delay += 24 * 60 * 60 * 1000;
    }

    // Schedule the first execution
    setTimeout(async () => {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          fetchLeetCodeQuestionLink()
            .then(generateSolution)
            .then(commitSolutionToGitHub);
        }, i * 30 * 60 * 1000); // 30 minutes apart for each contribution
      }

      // Schedule recurring execution every 24 hours
      setInterval(() => {
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            fetchLeetCodeQuestionLink()
              .then(generateSolution)
              .then(commitSolutionToGitHub);
          }, i * 30 * 60 * 1000); // 30 minutes apart for each contribution
        }
      }, 24 * 60 * 60 * 1000);
    }, delay);
  };

  useEffect(() => {
    scheduleDailyUploads();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>LeetCode Daily Automation</h1>
      <button onClick={fetchLeetCodeQuestionLink} disabled={loading}>
        {loading && questionLink === "" ? "Fetching Question..." : "Fetch Question Link"}
      </button>
      <button onClick={generateSolution} disabled={loading}>
        {loading && solution === "" ? "Generating Solution..." : "Generate Solution"}
      </button>
      <button onClick={commitSolutionToGitHub} disabled={loading}>
        {loading ? "Committing Solution..." : "Commit to GitHub"}
      </button>

      <div style={{ marginTop: "20px" }}>
        <h3>Fetched Question Link:</h3>
        <p>{questionLink || "No question link fetched yet."}</p>

        <h3>Generated Solution:</h3>
        <pre style={{ background: "#f4f4f4", padding: "10px" }}>
          {solution || "No solution generated yet."}
        </pre>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>Commit History:</h3>
        <ul>
          {history.map((entry, index) => (
            <li key={index}>
              <strong>Question Link:</strong> {entry.questionLink} <br />
              <strong>Solution File:</strong> {entry.fileName} <br />
              <strong>Time:</strong> {entry.timestamp}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
