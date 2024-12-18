import React, { useState, useEffect } from "react";
import { Octokit } from "@octokit/rest";

const GEMINI_API_KEY = "AIzaSyC78S7o56Pb3lKpFHtrBAXdUOfl4EVUovU";
const GITHUB_PAT = "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"; // Replace with your Personal Access Token
const REPO_OWNER = "avival69"; // Your GitHub username
const REPO_NAME = "leet-code-everyday"; // Repository name
const BASIC_AUTH = btoa("aswin:aswin123"); // Basic Authentication (encoded)

function App() {
  const [questionLink, setQuestionLink] = useState("");
  const [solution, setSolution] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch a random LeetCode question link
  const fetchLeetCodeQuestionLink = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://raw.githubusercontent.com/raiyansayeed/leetcode-download-questions/master/question_links.txt",
        {
          headers: {
            Authorization: `Basic ${BASIC_AUTH}`,
          },
        }
      );
      const text = await response.text();
      const links = text.split("\n").filter((link) => link.trim() !== "");

      // Pick a random link
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
      setLoading(true); // Start loading
      const questionTitle = questionLink.split("/").pop().replace(/-/g, " ");

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${BASIC_AUTH}`,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Solve the following programming question I found on LeetCode in Python:\n\n${questionTitle}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const geminiData = await geminiResponse.json();
      const generatedSolution =
        geminiData.candidates[0]?.content?.parts[0]?.text || "Solution generation failed";

      setSolution(generatedSolution);
      console.log("Generated Solution:", generatedSolution);
    } catch (error) {
      console.error("Error generating solution:", error);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  // Commit solution to GitHub
  const commitSolutionToGitHub = async () => {
    if (!solution) {
      alert("Generate a solution first!");
      return;
    }

    try {
      setLoading(true); // Start loading
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
        sha = data.sha; // File exists, get its SHA
      } catch {
        sha = undefined; // File does not exist
      }

      // Commit the solution
      await octokit.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: fileName,
        message: `Add solution for ${questionLink.split("/").pop()}`,
        content: btoa(solution), // Encode content in Base64
        sha: sha, // Required if file exists
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
      setLoading(false); // Stop loading
    }
  };

  // Function to automate daily upload at 6 PM IST
  const scheduleDailyUpload = () => {
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
    setTimeout(() => {
      fetchLeetCodeQuestionLink()
        .then(generateSolution)
        .then(commitSolutionToGitHub);

      // Schedule recurring execution every 24 hours
      setInterval(() => {
        fetchLeetCodeQuestionLink()
          .then(generateSolution)
          .then(commitSolutionToGitHub);
      }, 24 * 60 * 60 * 1000);
    }, delay);
  };

  // Initialize daily upload automation on component mount
  useEffect(() => {
    scheduleDailyUpload();
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
